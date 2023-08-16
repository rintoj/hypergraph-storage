# Hypergraph Storage

- [Hypergraph Storage](#hypergraph-storage)
  - [Install](#install)
  - [Usage](#usage)
  - [Fetch Records](#fetch-records)
    - [find](#find)
    - [findById](#findbyid)
    - [findByIds](#findbyids)
    - [findAll](#findall)
    - [findOne](#findone)
  - [Query Builder](#query-builder)
    - [Query](#query)
    - [PaginatedQuery](#paginatedquery)
  - [Insert \& Update](#insert--update)
    - [save](#save)
    - [saveMany](#savemany)
    - [insert](#insert)
    - [insertMany](#insertmany)
    - [update](#update)
    - [updateMany](#updatemany)
  - [Count](#count)
  - [Increment](#increment)
  - [Delete \& Restore](#delete--restore)
  - [Using with Cloud Firestore](#using-with-cloud-firestore)
    - [Queries](#queries)
    - [Modification API](#modification-api)
  - [Using Cache](#using-cache)
  - [TypeORM DataSource](#typeorm-datasource)
  - [Testing](#testing)
    - [Testing with firestore](#testing-with-firestore)

This is a package for accessing databases using TypeORM, that comes with the following benefits:

- Built for TypeScript and typing support
- Works best with GraphQL especially libraries like [TypeGraphQL](https://typegraphql.com/)
- Comes with easy to use [Query](#query-builder) builder with elegant and convenient syntax with
  typing support
- Supports pagination through [PaginatedQuery](#paginatedquery) builder
- Built on top of [TypeORM](https://typeorm.io/), hence comes with all the benefits that it
  provides:
  - Supports MySQL / MariaDB / Postgres / CockroachDB / SQLite / Microsoft SQL Server / Oracle / SAP
    Hana / sql.js.
  - Works in NodeJS / Browser / Ionic / Cordova / React Native / NativeScript / Expo / Electron
    platforms.
  - Entities and columns.
  - Database-specific column types.
  - Entity manager.
  - Clean object relational model.
  - Associations (relations).
  - Eager and lazy relations.
  - Uni-directional, bi-directional and self-referenced relations.
  - Supports multiple inheritance patterns.
  - Cascades.
  - Indices.
  - Transactions.
  - Migrations and automatic migrations generation.
  - Connection pooling.
  - Replication.
  - Using multiple database instances.
  - Working with multiple databases types.
  - Cross-database and cross-schema queries.
  - Left and inner joins.
  - Proper pagination for queries using joins.
  - Query caching.
  - Streaming raw results.
  - Logging.
  - Listeners and subscribers (hooks).
  - Supports MongoDB NoSQL database.
  - TypeScript and JavaScript support.
  - ESM and CommonJS support.
  - Produced code is performant, flexible, clean and maintainable.

## Install

Using npm:

```sh
npm install @hgraph/storage
```

Using yarn:

```sh
yarn add @hgraph/storage
```

## Usage

Define entity class. See [this](docs/entities.md) for more examples.

```ts
import { Repository } from '@hgraph/storage'
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
await initializeDataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'test',
  username: 'postgres',
  password: '',
  entities: [User],
  synchronize: true,
})
```

Or you can use environment variables

```sh
DB_TYPE: postgres
DB_HOST: localhost
DB_PORT: "5432"
DB_NAME: test
DB_USER: postgres
DB_PASSWORD:
DB_SYNCHRONIZE: "true"
```

and then initialize

```ts
await initializeDataSource({
  entities: [User],
})

// or use

await initializeDataSource({
  entities: [`${__dirname}/**/*-entity.{ts,js}`],
})
await
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

## Fetch Records

The repository class comes with `.find*` methods that you can use to query data using
[`Query`](#query-builder) builder:

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

## Query Builder

Query class provides an easy to use implementation for constructing complex SQL query. It allows you
to build SQL queries using elegant and convenient syntax with typing support. Here is the
[entity setup](docs/entities.md) for this example.

### Query

```ts
import { Query } from '@hgraph/storage'

const repo = new UserRepository()
const query = new Query(repo)

  // select columns
  .select('bio')
  .select('id')
  .select('email')

  // where conditions
  .whereEqualTo('id', 'id1')
  .whereNotEqualTo('id', 'id1')

  // numeric checks
  .whereMoreThan('version', 1)
  .whereMoreThanOrEqual('version', 1)
  .whereLessThan('version', 1)
  .whereLessThanOrEqual('version', 1)
  .whereBetween('version', 1, 2)

  // numeric "NOT" operators
  .whereNotMoreThan('version', 1)
  .whereNotMoreThanOrEqual('version', 1)
  .whereNotLessThan('version', 0)
  .whereNotLessThanOrEqual('version', 1)

  // search
  .whereTextContains('bio', 'true')
  .whereTextStartsWith('bio', 'any')
  .whereTextEndsWith('bio', 'any')

  // case insensitive search
  .whereTextInAnyCaseContains('bio', 'any')
  .whereTextInAnyCaseStartsWith('bio', 'any')
  .whereTextInAnyCaseEndsWith('bio', 'any')

  // "IN" operator
  .whereIn('role', [UserRole.ADMIN, UserRole.USER])

  // null checks
  .whereIsNull('name')
  .whereIsNotNull('name')

  // array operations
  .whereArrayContains('tags', 'new')
  .whereArrayContainsAny('tags', ['new', 'trending'])

  // search on related tables
  .whereJoin('photos', q => q.whereIsNotNull('url'))

  // build "OR" condition
  .whereOr(
    query => query.whereEqualTo('id', '10'),
    query => query.whereEqualTo('id', '10'),
  )

  // sort
  .orderByAscending('version')
  .orderByDescending('createdAt')

  // fetch related entities
  .fetchRelation('photos', 'album')
  .loadRelationIds() // load only 'id', not required with `fetchRelation`

  // enable or set timeout for `cache`
  .cache(5000 ?? true)
```

### PaginatedQuery

`PaginatedQuery`, in addition to the following, supports all the methods in `Query`.

```ts
import { PaginatedQuery } from '@hgraph/storage'

const repo = new UserRepository()
const query = new PaginatedQuery(repo)

  // use individual methods
  .next('token')
  .limit(10)

  // or use this method
  .pagination({ next: 'token', limit: 10 })
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

## Using with Cloud Firestore

This library comes with support for [firestore](https://firebase.google.com/docs/firestore), however
you will have to initialize the datasource and repositories as show below. Most of the APIs are
compatible with each other.

```ts
import { initializeFirestore, FirestoreRepository } from '@hgraph/storage'

await initializeFirestore({
  serviceAccountConfig: 'string', // path to the file where service account config (JSON) is placed
})

// and create repositories from
export class UserRepository extends FirestoreRepository<UserEntity> {
  constructor() {
    super(UserEntity)
  }
}
```

### Queries

The following apis are supported

```ts
import { Query } from '@hgraph/storage'

const repo = new UserRepository()
const query = new Query(repo)

  // select columns
  .select('bio')
  .select('id')
  .select('email')

  // where conditions
  .whereEqualTo('id', 'id1')
  .whereNotEqualTo('id', 'id1')

  // numeric checks
  .whereMoreThan('version', 1)
  .whereMoreThanOrEqual('version', 1)
  .whereLessThan('version', 1)
  .whereLessThanOrEqual('version', 1)
  .whereBetween('version', 1, 2)

  // numeric "NOT" operators
  .whereNotMoreThan('version', 1)
  .whereNotMoreThanOrEqual('version', 1)
  .whereNotLessThan('version', 0)
  .whereNotLessThanOrEqual('version', 1)

  // search
  // .whereTextContains('bio', 'true')                    // NOT SUPPORTED
  .whereTextStartsWith('bio', 'any')
  // .whereTextEndsWith('bio', 'any')                     // NOT SUPPORTED

  // case insensitive search
  // .whereTextInAnyCaseContains('bio', 'any')            // NOT SUPPORTED
  // .whereTextInAnyCaseStartsWith('bio', 'any')          // NOT SUPPORTED
  // .whereTextInAnyCaseEndsWith('bio', 'any')            // NOT SUPPORTED

  // "IN" operator
  .whereIn('role', [UserRole.ADMIN, UserRole.USER])

  // null checks
  .whereIsNull('name')
  .whereIsNotNull('name')

  // array operations
  .whereArrayContains('tags', 'new')
  .whereArrayContainsAny('tags', ['new', 'trending'])

  // search on related tables
  // .whereJoin('photos', q => q.whereIsNotNull('url'))   // NOT SUPPORTED YET

  // build "OR" condition
  .whereOr(
    query => query.whereEqualTo('id', '10'),
    query => query.whereEqualTo('id', '10'),
  )

  // sort
  .orderByAscending('version')
  .orderByDescending('createdAt')

  // fetch related entities
  // .fetchRelation('photos', 'album')                 // NOT SUPPORTED YET
  .loadRelationIds()

  // enable or set timeout for `cache`
  .cache(5000 ?? true) // NOT EFFECT
```

### Modification API

```ts
// save a user
const user = await userRepository.save({ id: 'user1', name: 'John Doe', username: 'johnd' })

// save multiple users
const users = await userRepository.saveMany([
  { id: 'user1', name: 'John Doe', username: 'johndoe' },
  { id: 'user2', name: 'Mejia Henderso', username: 'mh' },
])

// update a user
const user = await userRepository.update({ id: 'user1', username: 'john' })

// update multiple records at once using a query
const users = await userRepository.updateMany(query => query.whereEqualTo('username', 'johndoe'), {
  verified: true,
})

// count all users
const count = await userRepository.count()

// count all users with a query
const count = await userRepository.count(query => query.whereEqualTo('name', 'John Doe'))

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

// safest way to add an entity to an array "following" is as below
const user = await userRepository.addToArray('following', {
  id: 'user2',
  name: 'Mejia Henderso',
  username: 'mh',
})

// safest way to remove an entity from an array "following" is as below
const user = await userRepository.removeFromArray('following', {
  id: 'user2',
  name: 'Mejia Henderso',
  username: 'mh',
})

// delete a user
await userRepository.delete('user1') // delete by id
await userRepository.delete(query => query.whereEqualTo('verified', false)) // delete by query

// soft delete a user - NOT SUPPORTED
// await userRepository.delete('user1', { softDelete: true }) // soft delete by id
// await userRepository.delete(query => query.whereEqualTo('verified', false), { softDelete: true }) // soft delete by query

// restore a user if soft deleted - NOT SUPPORTED YET
// await userRepository.restore('user1') // restore by id
// await userRepository.restore(query => query.whereEqualTo('verified', false)) // restore by query
```

## Using Cache

Id cache is very important for the performance of queries especially when using it with GraphQL.
Therefor Hypergraph uses officially recommended library
[dataloader](https://github.com/graphql/dataloader) to gain performance via batching and caching.

```ts
import { RepositoryWithIdCache } from '@hgraph/storage'

class UserRepository extends RepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}
```

or if you are using firestore do the following

```ts
import { FirestoreRepositoryWithIdCache } from '@hgraph/storage'

class UserRepository extends FirestoreRepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}
```

Alternatively you can build your own cache-by-a-property using the following code.

```ts
import { Repository, RepositoryOptions, WithCache } from '@hgraph/storage'
import { ObjectLiteral } from 'typeorm'
import { ClassType } from 'tsds-tools'

@WithCache('name')
class RepositoryWithNameCache<Entity extends ObjectLiteral> extends Repository<Entity> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: RepositoryOptions,
  ) {
    super(entity, options)
  }
}

class UserRepository extends RepositoryWithNameCache<User> {
  constructor() {
    super(User)
  }
}
```

For firestore:

```ts
import {
  FirestoreRepository,
  FirestoreRepositoryOptions,
  WithFirestoreCache,
} from '@hgraph/storage'
import { ObjectLiteral } from 'typeorm'
import { ClassType } from 'tsds-tools'

@WithFirestoreCache('name')
class FirestoreRepositoryWithNameCache<
  Entity extends ObjectLiteral,
> extends FirestoreRepository<Entity> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: FirestoreRepositoryOptions,
  ) {
    super(entity, options)
  }
}

class UserRepository extends FirestoreRepositoryWithNameCache<User> {
  constructor() {
    super(User)
  }
}
```

## TypeORM DataSource

You can access TypeORM DataSource directly, to tap on to any TypeORM feature that is not covered by
this library by using the following code:

```ts
import { initializeDataSource } from '@hgraph/storage'
import { container } from 'tsyringe'
import { DataSource } from 'typeorm'

async function run() {
  await initializeDataSource({
    type: 'postgres',
    ...
  })

  const dataSource = container.resolve(DataSource)
}
```

## Testing

This package comes with an in-memory implementation of the database based on
[pg-mem](https://github.com/oguimbal/pg-mem) to support testing. Use `initializeMockDataSource` to
initialize in-memory database.

```ts
import { initializeMockDataSource } from '@hgraph/storage/dist/typeorm-mock'

describe('Test suite', () => {
  let dataSource: MockTypeORMDataSource

  class UserRepository extends Repository<UserEntity> {
    constructor() {
      super(UserEntity)
    }
  }

  class PhotoRepository extends Repository<PhotoEntity> {
    constructor() {
      super(PhotoEntity)
    }
  }

  beforeEach(async () => {
    dataSource = await initializeMockDataSource({
      type: 'postgres',
      database: 'test',
      entities: [UserEntity, PhotoEntity],
      synchronize: false,
      retry: 0,
    })
    await container.resolve(UserRepository).saveMany(data.users as any)
    await container.resolve(PhotoRepository).saveMany(data.photos)
  })

  afterEach(async () => {
    dataSource?.destroy()
  })

  test('should pass sanity test', async () => {
    const repository = container.resolve(PhotoRepository)
    const result = await repository.count()
    expect(result).toEqual(data.photos.length)
  })
})
```

### Testing with firestore

```ts
import { initializeMockFirestore } from '@hgraph/storage/dist/firestore-repository/firestore-mock'

describe('Test suite', () => {
  let dataSource: MockTypeORMDataSource

  class UserRepository extends Repository<UserEntity> {
    constructor() {
      super(UserEntity)
    }
  }

  class PhotoRepository extends Repository<PhotoEntity> {
    constructor() {
      super(PhotoEntity)
    }
  }

  async function saveAll() {
    await Promise.all([
      container.resolve(UserRepository).saveMany(data.users as any),
      container.resolve(PhotoRepository).saveMany(data.photos),
    ])
  }

  async function deleteAll() {
    await Promise.all([
      container.resolve(UserRepository).delete(query => query),
      container.resolve(PhotoRepository).delete(query => query),
    ])
  }

  beforeAll(async () => {
    // OPTION 1: RUN WITH EMULATOR
    // const firestore = admin.initializeApp({ projectId: 'test-e9d5b' }).firestore()
    // firestore.settings({ host: 'localhost:8080', ssl: false })
    // container.registerInstance(FIRESTORE_INSTANCE, firestore)

    // OPTION 2: RUN WITH MOCK
    initializeMockFirestore()
  })

  beforeEach(async () => {
    await deleteAll()
    await saveAll()
  })

  afterAll(async () => {
    await deleteAll()
  })

  test('should pass sanity test', async () => {
    const repository = container.resolve(PhotoRepository)
    const result = await repository.count()
    expect(result).toEqual(data.photos.length)
  })
})
```
