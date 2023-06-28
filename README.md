# hypergraph-storage

This is a package for accessing databases using TypeORM, that comes with the following benefits:

- Build for TypeScript and typing support
- Works best with GraphQL especially libraries like [TypeGraphQL](https://typegraphql.com/)
- Comes with easy to use [Query](./docs/query.md) builder with elegant and convenient syntax with
  typing support
- Supports pagination through [PaginatedQuery](./docs/query.md#paginatedquery) builder

## Install

Using npm:

```sh
npm install hypergraph-storage
```

Using yarn:

```sh
yarn add hypergraph-storage
```

## Usage

Define entity class. See [this](./docs/entities.md) for more examples.

```ts
import { Repository } from 'hypergraph-storage'
import { Column, PrimaryColumn } from 'typeorm'

@Entity()
class User {
  @PrimaryColumn()
  id!: string

  @Column()
  name!: string

  @Column()
  username!: string

  @Column({ nullable: true })
  bio?: string

  @Column({ nullable: true })
  verified?: boolean

  @Column({ nullable: true })
  followers?: number
}
```

Define repository class

```ts
class UserRepository extends Repository<User> {
  constructor() {
    super(User)
  }
}
```

Initialize the data source

```ts
await initializeMockDataSource({
  type: 'postgres',
  host: 'localhost', // "host.docker.internal", if you are using docker
  port: 5432,
  database: 'hypergraph', // your db name
  username: 'postgres', // your db username
  password: '********', // your db password
  entities: [User],
  synchronize: true,
})
```

Get instance of the user repository.

```ts
const userRepository = new UserRepository()
```

If you are using dependency injection library like
[`tsyringe`](https://www.npmjs.com/package/tsyringe) use the following. This works best for us when
using it with GraphQL's per query cache.

```ts
import { container } from 'tsyringe'

const userRepository = container.resolve(UserRepository)
```

## Insert & Update

You can insert and update records using the following methods:

- [save](#save)
- [saveMany](#savemany)
- [insert](#insert)
- [insertMany](#insertmany)
- [update](#update)
- [updateMany](#updatemany)

### save

This method will insert if the `id` (if provided) does not exist in the database, or will update the
existing record.

```ts
const user = await userRepository.save({ id: 'user1', name: 'John Doe', username: 'johnd' })
```

### saveMany

You can insert or update more than one record using in a step using `saveMany`. Just like `save` the
record will inserted if `id` does not record.

```ts
const users = await userRepository.saveMany([
  { id: 'user1', name: 'John Doe', username: 'johndoe' },
  { id: 'user2', name: 'Mejia Henderso', username: 'mh' },
])
```

### insert

You can insert a record using `insert` method. "id" will be auto populated, if omitted.

```ts
const user = await userRepository.insert({ name: 'John Done', username: 'johndoe' })
```

### insertMany

You can insert multiple users at once using `insertMany`.

```ts
const users = await userRepository.insertMany([
  { name: 'John Doe', username: 'johndoe' },
  { name: 'Mejia Henderso', username: 'mh' },
])
```

### update

Use this method to update a record, "id" is mandatory input.

```ts
const user = await userRepository.update({ id: 'user1', username: 'john' })
```

### updateMany

You can update more than one record using a query using `updateMany`.

```ts
// update multiple records at once using a query
const users = await userRepository.updateMany(query => query.whereEqualTo('username', 'johndoe'), {
  verified: true,
})
```

## Query

The repository class comes with `.find*` methods that you can use to query data using
[`Query`](./docs/query.md):

- [find](#find)
- [findById](#findbyid)
- [findByIds](#findbyids)
- [findAll](#findall)
- [findOne](#findone)

### find

You can fetch multiple records from a table using `find` method. This method supports pagination.

```ts
// find using a query, but paginate
const { next, items } = await userRepository.find(query =>
  query.whereEqualTo('name', 'John Doe').next(nextTokenFromBefore).limit(200),
)
```

will execute the following sql query and return first `200` records and a `next` token that you can
use for next page. `OFFSET` will be calculated from `nextTokenFromBefore`

```sql
SELECT * FROM "user"
WHERE "name" = 'John Doe'
OFFSET <OFFSET>
LIMIT 200
```

### findById

You can query a record by id directly using `findById` method.

```ts
const user = await userRepository.findById('user1')
```

will execute a query

```sql
SELECT * FROM "user"
WHERE "id" = 'user1'
```

### findByIds

You can find more than one record by its ids by using `findByIds`.

```ts
// find many by ids
const users = await userRepository.findByIds(['user1', 'user2'])
```

will execute a query

```sql
SELECT * FROM "user"
WHERE "id" IN ('user1', 'user2')
```

### findAll

You can use `findAll` to get all records without pagination. This method provides support for in
memory filter and pagination callback.

```ts
// find all from the entity table
const users = await userRepository.findAll()

// find all using a query
const users = await userRepository.findAll(query => query.whereEqualTo('name', 'John Doe'))

// find all using a query, filter and a pagination callback
const users = await userRepository.findAll(
  query => query.whereEqualTo('name', 'John Doe'),
  item => someLogicToFilter(item),
  (items, next) => console.log('fetched a page', items, next),
)
```

### findOne

This method works just like `findAll` but returns only the first record.

```ts
// find one from the top
const user = await userRepository.findOne()

// find one using a query
const user = await userRepository.findOne(query => query.whereEqualTo('name', 'John Doe'))
```

## Count

This method counts entities that match query (if provided) and returns a numeric value.

```ts
// count all users
const count = await userRepository.count()

// count all users with a query
const count = await userRepository.count(query => query.whereEqualTo('name', 'John Doe'))
```

## Increment

You can increment or decrement the value of a numeric column using an id or a query using this
method.

```ts
// increment by id
const user = await userRepository.increment('user1', 'followers', 1)

// decrement by id
const user = await userRepository.increment('user1', 'followers', -1)

// increment by query
const user = await userRepository.increment(
  query => query.whereEqualTo('name', 'John Doe'),
  'followers',
  1,
)
```

## Delete & Restore

You can permanently delete a record from the table using `delete`. Alternatively you may choose to
use soft delete by passing `{ softDelete: true }` option. This will keep the record in the table,
however will populate `deletedAt` column with the current time stamp. TypeORM will inject
`"deletedAt" IS NULL` to all queries by default, thus eliminating any records that were soft
deleted. `restore` will remove `deletedAt` value.

```ts
// delete a user
await userRepository.delete('user1') // delete by id
await userRepository.delete(query => query.whereEqualTo('verified', false)) // delete by query

// soft delete a user
await userRepository.delete('user1', { softDelete: true }) // soft delete by id
await userRepository.delete(query => query.whereEqualTo('verified', false), { softDelete: true }) // soft delete by query

// restore a user if soft deleted
await userRepository.restore('user1') // restore by id
await userRepository.restore(query => query.whereEqualTo('verified', false)) // restore by query
```
