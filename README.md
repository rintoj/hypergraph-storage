# Hypergraph Storage

- [Hypergraph Storage](#hypergraph-storage)
  - [Install](#install)
  - [Usage](#usage)
  - [Usage with NestJS (Recommended)](#usage-with-nestjs-recommended)
    - [Step 1: Configure the `StorageModule` as a Root Module](#step-1-configure-the-storagemodule-as-a-root-module)
    - [Step 2: Configure Entities in Feature Modules](#step-2-configure-entities-in-feature-modules)
    - [Step 3: Use Repositories in Your Services](#step-3-use-repositories-in-your-services)
  - [Usage without NestJS](#usage-without-nestjs)
    - [Step 1: Initialize the Data Source](#step-1-initialize-the-data-source)
    - [Step 2: Define a Repository Class](#step-2-define-a-repository-class)
    - [Step 3: Get an Instance of the Repository](#step-3-get-an-instance-of-the-repository)
    - [Step 4: Use Dependency Injection with Libraries like `tsyringe`](#step-4-use-dependency-injection-with-libraries-like-tsyringe)
  - [Fetch Records](#fetch-records)
    - [find](#find)
    - [findById](#findbyid)
    - [findByIds](#findbyids)
    - [findAll](#findall)
    - [findOne](#findone)
  - [Query Builder](#query-builder)
    - [Query](#query)
    - [PaginatedQuery](#paginatedquery)
    - [Terminal Query Pattern](#terminal-query-pattern)
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
    - [Using with NestJS](#using-with-nestjs)
      - [Key Points:](#key-points)
    - [Using without NestJS](#using-without-nestjs)
      - [Key Points:](#key-points-1)
    - [Additional Notes](#additional-notes)
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

## Usage with NestJS (Recommended)

To integrate the `StorageModule` into your NestJS application effectively, follow the steps below.
The `StorageModule` provides a convenient way to manage repositories and entities within your NestJS
ecosystem. For more information on NestJS modules, refer to the
[NestJS Module Documentation](https://docs.nestjs.com/modules).

### Step 1: Configure the `StorageModule` as a Root Module

Begin by setting up the `StorageModule` in your root module (commonly `AppModule`). This
configuration initializes the storage layer and connects to the database using parameters from your
environment configuration:

```ts
import { Module } from '@nestjs/common'
import { StorageModule, RepositoryType } from '@hgraph/storage/nestjs'
import { AppController } from './app.controller'
import { UserModule } from './user/user.module'
import { AuthModule } from './auth/auth.module'
import config from './config'

@Module({
  imports: [
    StorageModule.forRoot({
      repositoryType: RepositoryType.TypeORM, // Specify the repository type (e.g., TypeORM).
      url: config.DATABASE_URL, // Database connection URL.
      type: config.DATABASE_TYPE as any, // Database type (e.g., PostgreSQL, MySQL).
      synchronize: config.DB_SYNCHRONIZE, // Synchronize schema with the database.
    }),
    UserModule, // Import your feature modules.
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### Step 2: Configure Entities in Feature Modules

Each feature module should declare its entities to be managed by the `StorageModule`. This ensures
that the necessary database schema and repository are available within the scope of the feature
module:

```ts
import { Module } from '@nestjs/common'
import { StorageModule } from '@hgraph/storage/nestjs'
import { User } from './user.entity'

@Module({
  imports: [StorageModule.forFeature([User])], // Declare entities specific to this module.
})
export class CustomModule {}
```

### Step 3: Use Repositories in Your Services

Once the `StorageModule` is configured, you can inject repositories into your services using the
`@InjectRepo` decorator. This simplifies access to your database operations:

```ts
import { Injectable } from '@nestjs/common'
import { InjectRepo, Repository } from '@hgraph/storage/nestjs'
import { User } from './user.entity'

@Injectable()
export class UserService {
  constructor(
    @InjectRepo(User) // Inject the repository for the User entity.
    private readonly userRepository: Repository<User>,
  ) {}

  // Example method for retrieving all users.
  async findAll(): Promise<User[]> {
    return this.userRepository.find()
  }
}
```

By following these steps, you can seamlessly manage your application’s data layer using the
`StorageModule` while adhering to NestJS’s modular architecture.

## Usage without NestJS

To use this library independently of NestJS, follow these steps to initialize your data source,
configure repositories, and integrate dependency injection if required.

### Step 1: Initialize the Data Source

You can initialize the data source programmatically using the `initializeDataSource` function.
Specify the database type, connection URL, and synchronization settings:

```ts
import { initializeDataSource } from '@hgraph/storage'

await initializeDataSource({
  type: process.env.DATABASE_TYPE as any, // Specify the database type (e.g., postgres, mysql).
  url: process.env.DATABASE_URL, // Database connection URL.
  synchronize: process.env.DB_SYNCHRONIZE, // Synchronize schema with the database.
})
```

Alternatively, use environment variables to configure the database connection. This approach
simplifies deployment and avoids hardcoding sensitive information:

```sh
DATABASE_TYPE=postgres
DATABASE_URL=<database_type>://<username>:<password>@<host>:<port>/<database_name>
DATABASE_SYNCHRONIZE="true"
```

Then initialize the data source with the specified entities:

```ts
await initializeDataSource({
  entities: [User], // Declare your application entities.
})
```

### Step 2: Define a Repository Class

Create a custom repository class for managing your entities. This class extends the base
`Repository` class and specifies the entity type:

```ts
import { Repository } from '@hgraph/storage'
import { User } from './user.entity'

class UserRepository extends Repository<User> {
  constructor() {
    super(User) // Initialize the repository with the User entity.
  }
}
```

### Step 3: Get an Instance of the Repository

To interact with the `UserRepository`, create an instance of the repository. This allows you to
perform database operations:

```ts
const userRepository = new UserRepository()
```

### Step 4: Use Dependency Injection with Libraries like `tsyringe`

If you’re using a dependency injection library such as
[`tsyringe`](https://www.npmjs.com/package/tsyringe), you can manage repository instances
efficiently. This approach is especially useful for caching and GraphQL integrations:

```ts
import { container } from 'tsyringe'

const userRepository = container.resolve(UserRepository) // Resolve the repository from the DI container.
```

By following these steps, you can configure and use the this library outside of a NestJS application
while maintaining flexibility and scalability.

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

### Terminal Query Pattern

To prevent "Unsupported FindOperator" runtime errors from TypeORM, the query builder enforces safe
ordering using a **Terminal Query Pattern**. Certain methods (`whereIn` and `whereOr`) return a
`TerminalQuery` that only exposes safe methods.

#### Rules

1. **`whereIn` must be last** - No other where methods can be chained after it.

```ts
// CORRECT
q.whereEqualTo('status', 'active')
 .whereIn('groupId', groupIds)

// COMPILE ERROR
q.whereIn('groupId', groupIds)
 .whereEqualTo('status', 'active')  // TypeScript error!
```

2. **`whereOr` must be last** - Same restriction applies.

```ts
// CORRECT
q.whereEqualTo('status', 'active')
 .whereOr(
   q1 => q1.whereEqualTo('role', 'admin'),
   q2 => q2.whereEqualTo('role', 'mod')
 )

// COMPILE ERROR
q.whereOr(...)
 .whereEqualTo('status', 'active')  // TypeScript error!
```

3. **Never use `whereIn` inside `whereJoin`** - Throws runtime error.

```ts
// RUNTIME ERROR
q.whereJoin('group', gq => gq.whereIn('id', groupIds))

// CORRECT - use explicit foreign key
q.whereIn('groupId', groupIds)
```

4. **Never use `whereIn` inside `whereOr`** - Throws runtime error.

```ts
// RUNTIME ERROR
q.whereOr(q1 => q1.whereIn('status', ['a', 'b']), ...)

// CORRECT - use multiple whereEqualTo
q.whereOr(
  q1 => q1.whereEqualTo('status', 'a'),
  q2 => q2.whereEqualTo('status', 'b')
)
```

#### Safe Methods After Terminal Operations

After `whereIn()` or `whereOr()`, you can still chain:

- `orderByAscending()` / `orderByDescending()`
- `select()`, `fetchRelation()`, `loadRelationIds()`
- `cache()`, `toQuery()`
- For paginated: `limit()`, `next()`, `pagination()`

See [docs/query-builder.md](docs/query-builder.md) for complete documentation.

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

---

## Using with Cloud Firestore

This library offers robust support for
[Cloud Firestore](https://firebase.google.com/docs/firestore), making it easier to integrate with
your applications. Whether you are using NestJS or a standalone setup, this guide will walk you
through the initialization process and demonstrate how to configure the data source and repositories
for seamless integration. Most APIs provided by this library are designed to be compatible with each
other, ensuring a consistent development experience.

### Using with NestJS

If you're working with NestJS, integrating this library is straightforward. The following example
demonstrates how to set up the `StorageModule` with Firestore as the repository type. Ensure you
have your Firebase service account configuration and storage bucket details ready:

```typescript
import { Module } from '@nestjs/common'
import { StorageModule, RepositoryType } from '@hgraph/storage'
import { UserModule } from './user/user.module'
import { AuthModule } from './auth/auth.module'
import { AppController } from './app.controller'

@Module({
  imports: [
    StorageModule.forRoot({
      repositoryType: RepositoryType.Firestore, // Specify Firestore as the repository type
      serviceAccountConfig: process.env.FIREBASE_SERVICE_ACCOUNT, // Path or JSON object containing your service account details
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Optional: Specify your Firebase Storage bucket
    }),
    UserModule, // Import additional modules as needed
    AuthModule,
  ],
  controllers: [AppController], // Define application controllers
})
export class AppModule {}
```

#### Key Points:

- Replace `process.env.FIREBASE_SERVICE_ACCOUNT` with the appropriate path or JSON content for your
  Firebase service account.
- The `storageBucket` parameter is optional but can be included if your application uses Firebase
  Storage.

### Using without NestJS

For non-NestJS applications, you can initialize the Firestore data source and define repositories
directly. This provides flexibility for various use cases:

```typescript
import { initializeFirestore, FirestoreRepository } from '@hgraph/storage'

// Initialize Firestore with service account configuration
await initializeFirestore({
  serviceAccountConfig: 'string', // Path to the JSON file containing your service account configuration
})

// Define a repository for a specific entity
export class UserRepository extends FirestoreRepository<UserEntity> {
  constructor() {
    super(UserEntity) // Pass the entity class to the repository
  }
}
```

#### Key Points:

- Ensure the `serviceAccountConfig` points to a valid Firebase service account JSON file.
- Extend `FirestoreRepository` to create custom repositories for your entities, making it easier to
  manage Firestore collections.

### Additional Notes

- Ensure you have installed the necessary Firebase SDK and dependencies before proceeding.
- Always validate your service account credentials and configurations to avoid runtime errors.
- For more advanced usage, refer to the library’s API documentation and Firestore’s official
  guidelines.

```sh
npm install firebase-admin
```

---

### Queries

The following apis are supported

```ts
import { FirestoreQuery } from '@hgraph/storage'

const repo = new UserRepository()
const query = new FirestoreQuery(repo)

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
