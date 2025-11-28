# @hgraph/storage

A powerful, type-safe database abstraction layer built on TypeORM with first-class TypeScript support.

[![npm version](https://img.shields.io/npm/v/@hgraph/storage.svg)](https://www.npmjs.com/package/@hgraph/storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why @hgraph/storage?

- **Type-Safe Query Builder** - Catch query errors at compile time, not runtime
- **Elegant API** - Fluent, chainable methods that read like natural language
- **Framework Flexible** - Works seamlessly with NestJS or standalone
- **Multi-Database Support** - PostgreSQL, MySQL, SQLite, SQL Server, Oracle, and Cloud Firestore
- **Built-in Pagination** - First-class support for cursor-based pagination
- **GraphQL Ready** - Optimized for GraphQL with DataLoader caching support

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage with NestJS](#usage-with-nestjs)
- [Usage without NestJS](#usage-without-nestjs)
- [Query Builder](#query-builder)
  - [Basic Queries](#basic-queries)
  - [Where Conditions](#where-conditions)
  - [Text Search](#text-search)
  - [Array Operations](#array-operations)
  - [Relations and Joins](#relations-and-joins)
  - [Sorting and Pagination](#sorting-and-pagination)
  - [Terminal Query Pattern](#terminal-query-pattern)
- [CRUD Operations](#crud-operations)
  - [Fetching Records](#fetching-records)
  - [Creating and Updating](#creating-and-updating)
  - [Counting Records](#counting-records)
  - [Incrementing Values](#incrementing-values)
  - [Deleting and Restoring](#deleting-and-restoring)
- [Cloud Firestore](#cloud-firestore)
- [Base Entity](#base-entity)
- [ID Generation](#id-generation)
- [Caching with DataLoader](#caching-with-dataloader)
- [Testing](#testing)
- [Advanced Usage](#advanced-usage)

## Installation

```bash
npm install @hgraph/storage
```

```bash
yarn add @hgraph/storage
```

```bash
bun add @hgraph/storage
```

## Quick Start

Get up and running in three simple steps. This example shows the basic pattern you'll use throughout your application.

### 1. Define Your Entity

Entities are TypeScript classes that map to database tables. Use TypeORM decorators to define the schema:

```typescript
import { Entity, Column, PrimaryColumn } from 'typeorm'

@Entity()
class User {
  @PrimaryColumn()
  id!: string

  @Column()
  name!: string

  @Column()
  email!: string

  @Column({ nullable: true })
  bio?: string

  @Column({ default: false })
  verified?: boolean

  @Column({ default: 0 })
  followers?: number
}
```

### 2. Create a Repository

Repositories handle all database operations for an entity. Create one by extending the base `Repository` class:

```typescript
import { Repository } from '@hgraph/storage'

class UserRepository extends Repository<User> {
  constructor() {
    super(User)
  }
}
```

### 3. Query Your Data

Use the fluent query builder to fetch data. All field names are type-checked, so typos are caught at compile time:

```typescript
const userRepo = new UserRepository()

// Find users with elegant query syntax
const activeUsers = await userRepo.findAll(q =>
  q.whereEqualTo('verified', true)
   .whereMoreThan('followers', 100)
   .orderByDescending('followers')
)
```

## Usage with NestJS

The library integrates seamlessly with NestJS's module system, providing dependency injection for repositories and automatic connection management.

### Step 1: Configure Root Module

Import `StorageModule.forRoot()` in your app module to establish the database connection. This should only be done once in your application:

```typescript
import { Module } from '@nestjs/common'
import { StorageModule, RepositoryType } from '@hgraph/storage/nestjs'

@Module({
  imports: [
    StorageModule.forRoot({
      repositoryType: RepositoryType.TypeORM,
      type: 'postgres',
      url: process.env.DATABASE_URL,
      synchronize: process.env.NODE_ENV === 'development',
    }),
    UserModule,
  ],
})
export class AppModule {}
```

### Step 2: Register Entities in Feature Modules

Each feature module declares which entities it uses via `StorageModule.forFeature()`. This creates the necessary repository providers scoped to that module:

```typescript
import { Module } from '@nestjs/common'
import { StorageModule } from '@hgraph/storage/nestjs'
import { User } from './user.entity'
import { UserService } from './user.service'

@Module({
  imports: [StorageModule.forFeature([User])],
  providers: [UserService],
})
export class UserModule {}
```

### Step 3: Inject Repositories

Use the `@InjectRepo()` decorator to inject repositories into your services. The repository is fully typed based on your entity:

```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepo, Repository } from '@hgraph/storage/nestjs'
import { User } from './user.entity'

@Injectable()
export class UserService {
  constructor(
    @InjectRepo(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findVerifiedUsers(): Promise<User[]> {
    return this.userRepo.findAll(q => q.whereEqualTo('verified', true))
  }
}
```

## Usage without NestJS

You can use this library in any Node.js application. The library uses [tsyringe](https://github.com/microsoft/tsyringe) for dependency injection internally.

### Initialize the Data Source

Before using any repository, you must initialize the database connection. Do this once at application startup:

```typescript
import { initializeDataSource } from '@hgraph/storage'

await initializeDataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Post, Comment],
  synchronize: true,  // Auto-create tables (disable in production)
})
```

Alternatively, configure via environment variables for cleaner deployment:

```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
DATABASE_SYNCHRONIZE=true
```

### Use with Dependency Injection (tsyringe)

Repositories are registered with tsyringe automatically. Use `container.resolve()` to get instances with proper singleton management:

```typescript
import { container } from 'tsyringe'

const userRepo = container.resolve(UserRepository)
const users = await userRepo.findAll()
```

This approach ensures you get the same repository instance throughout your application, which is important for connection pooling and caching.

## Query Builder

The query builder provides a fluent, type-safe API for constructing database queries. Every method is fully typed based on your entity, so invalid field names or type mismatches are caught at compile time.

### Basic Queries

Repository methods accept a query builder callback. The callback receives a query object that you chain methods on:

```typescript
import { Query, PaginatedQuery } from '@hgraph/storage'

// Simple query with repository methods
const user = await userRepo.findOne(q =>
  q.whereEqualTo('email', 'john@example.com')
)

// Paginated query
const { items, next } = await userRepo.find(q =>
  q.whereEqualTo('verified', true)
   .limit(20)
   .next(previousToken)
)
```

### Where Conditions

Filter records using a variety of comparison operators. All conditions are combined with AND logic by default:

```typescript
// Equality
q.whereEqualTo('status', 'active')
q.whereNotEqualTo('status', 'deleted')

// Comparisons
q.whereMoreThan('age', 18)
q.whereMoreThanOrEqual('score', 100)
q.whereLessThan('price', 50)
q.whereLessThanOrEqual('quantity', 10)
q.whereBetween('rating', 3, 5)

// Negated comparisons
q.whereNotMoreThan('attempts', 3)
q.whereNotLessThan('balance', 0)

// Null checks
q.whereIsNull('deletedAt')
q.whereIsNotNull('verifiedAt')

// IN operator
q.whereIn('role', ['admin', 'moderator'])

// OR conditions
q.whereOr(
  q1 => q1.whereEqualTo('role', 'admin'),
  q2 => q2.whereEqualTo('role', 'superuser')
)
```

### Text Search

Search within text fields using SQL LIKE patterns. These are useful for implementing search functionality:

```typescript
// Partial matches
q.whereTextContains('bio', 'developer')      // LIKE '%developer%'
q.whereTextStartsWith('name', 'John')        // LIKE 'John%'
q.whereTextEndsWith('email', '@gmail.com')   // LIKE '%@gmail.com'

// Case-insensitive search
q.whereTextInAnyCaseContains('title', 'urgent')
q.whereTextInAnyCaseStartsWith('name', 'john')
q.whereTextInAnyCaseEndsWith('domain', '.COM')
```

### Array Operations

For columns that store arrays (like tags or categories), use these methods to query by array contents:

```typescript
// Check if array column contains a specific value
q.whereArrayContains('tags', 'featured')

// Check if array column contains any of the given values
q.whereArrayContainsAny('categories', ['tech', 'science'])
```

### Relations and Joins

Query across related entities using joins. This is powerful for filtering based on related data or eagerly loading associations:

```typescript
// Filter users who have at least one published post
q.whereJoin('posts', postQuery =>
  postQuery.whereEqualTo('published', true)
)

// Eagerly load related entities in the result
// Avoids N+1 queries when accessing relations
q.fetchRelation('posts', 'comments', 'author')

// Load only relation IDs instead of full objects (better performance when you just need IDs)
q.loadRelationIds()
```

### Sorting and Pagination

Control result ordering and implement efficient pagination using cursor-based tokens:

```typescript
// Sorting - chain multiple for secondary sort
q.orderByAscending('name')
q.orderByDescending('createdAt')

// Pagination using cursor tokens
// The 'next' token is returned from previous queries
q.limit(25)
q.next('cursor-token')

// Or combine pagination options
q.pagination({ limit: 25, next: 'cursor-token' })

// Select specific columns (improves performance for large tables)
q.select('id', 'name', 'email')

// Enable query result caching (milliseconds)
q.cache(5000) // Cache for 5 seconds
```

### Terminal Query Pattern

To prevent TypeORM runtime errors, certain methods (`whereIn` and `whereOr`) must be called last. The type system enforces this at compile time:

```typescript
// CORRECT: whereIn is last
q.whereEqualTo('status', 'active')
 .orderByDescending('createdAt')
 .whereIn('groupId', groupIds)

// COMPILE ERROR: can't chain after whereIn
q.whereIn('groupId', groupIds)
 .whereEqualTo('status', 'active')  // TypeScript error!
```

**Rules:**
1. `whereIn` must be the last where condition
2. `whereOr` must be the last where condition
3. Never use `whereIn` inside `whereJoin` or `whereOr`

After terminal operations, you can still chain: `orderBy*`, `select`, `fetchRelation`, `limit`, `next`, `cache`.

See [docs/query-builder.md](docs/query-builder.md) for complete documentation.

## CRUD Operations

The repository provides a complete set of methods for creating, reading, updating, and deleting records.

### Fetching Records

Multiple methods are available depending on whether you need one record, multiple records, or paginated results:

```typescript
// Find by ID
const user = await userRepo.findById('user-123')

// Find by multiple IDs
const users = await userRepo.findByIds(['user-1', 'user-2', 'user-3'])

// Find one with query
const admin = await userRepo.findOne(q =>
  q.whereEqualTo('role', 'admin')
)

// Find all (no pagination)
const allUsers = await userRepo.findAll()

// Find all with query and filter
const filteredUsers = await userRepo.findAll(
  q => q.whereEqualTo('verified', true),
  user => user.followers > 1000,  // In-memory filter
  (items, next) => console.log(`Fetched ${items.length} users`)  // Progress callback
)

// Find with pagination
const { items, next } = await userRepo.find(q =>
  q.whereEqualTo('active', true)
   .limit(50)
)
```

### Creating and Updating

The library distinguishes between `insert` (always creates new), `update` (always modifies existing), and `save` (upsert - creates or updates based on ID):

```typescript
// Insert (auto-generates ID if omitted)
const newUser = await userRepo.insert({
  name: 'Jane Doe',
  email: 'jane@example.com'
})

// Insert multiple
const users = await userRepo.insertMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' }
])

// Save (insert or update based on ID)
const user = await userRepo.save({
  id: 'user-123',
  name: 'Updated Name'
})

// Save multiple
await userRepo.saveMany([...users])

// Update (ID required)
const updated = await userRepo.update({
  id: 'user-123',
  verified: true
})

// Update multiple by query
await userRepo.updateMany(
  q => q.whereEqualTo('status', 'pending'),
  { status: 'active' }
)
```

### Counting Records

Get the number of matching records without fetching the data itself:

```typescript
// Count all records in the table
const total = await userRepo.count()

// Count records matching a condition
const verifiedCount = await userRepo.count(q =>
  q.whereEqualTo('verified', true)
)
```

### Incrementing Values

Atomically increment or decrement numeric fields. This is safer than read-modify-write patterns for counters:

```typescript
// Increment a counter by ID
await userRepo.increment('user-123', 'followers', 1)

// Decrement by using negative value
await userRepo.increment('user-123', 'followers', -1)

// Increment for all records matching a query
await userRepo.increment(
  q => q.whereEqualTo('featured', true),
  'views',
  1
)
```

### Deleting and Restoring

Choose between hard delete (permanent removal) or soft delete (sets `deletedAt` timestamp). Soft-deleted records are automatically excluded from queries but can be restored later:

```typescript
// Hard delete - permanently removes from database
await userRepo.delete('user-123')

// Delete multiple records matching a query
await userRepo.delete(q =>
  q.whereEqualTo('status', 'spam')
)

// Soft delete - keeps record but marks as deleted
// Requires using BaseEntity which includes deletedAt field
await userRepo.delete('user-123', { softDelete: true })

// Restore a soft-deleted record
await userRepo.restore('user-123')

// Restore multiple records by query
await userRepo.restore(q =>
  q.whereEqualTo('status', 'suspended')
)
```

## Cloud Firestore

This library supports Google Cloud Firestore as an alternative to SQL databases. The same repository patterns and most query methods work identically, making it easy to switch between backends or use both in the same application.

### Installation

```bash
npm install firebase-admin
```

### With NestJS

```typescript
import { Module } from '@nestjs/common'
import { StorageModule, RepositoryType } from '@hgraph/storage/nestjs'

@Module({
  imports: [
    StorageModule.forRoot({
      repositoryType: RepositoryType.Firestore,
      serviceAccountConfig: process.env.FIREBASE_SERVICE_ACCOUNT,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Optional
    }),
  ],
})
export class AppModule {}
```

### Without NestJS

```typescript
import { initializeFirestore, FirestoreRepository } from '@hgraph/storage'

await initializeFirestore({
  serviceAccountConfig: './service-account.json'
})

class UserRepository extends FirestoreRepository<User> {
  constructor() {
    super(User)
  }
}
```

### Firestore-Specific Operations

Firestore provides atomic array operations that safely handle concurrent modifications:

```typescript
// Add items to an array field atomically
// The entity must include id and the array field with items to add
await userRepo.addToArray('following', {
  id: 'user-123',                    // ID of the document to update
  following: [{ id: 'user-456' }]    // Items to add to the array
})

// Remove items from an array field atomically
await userRepo.removeFromArray('following', {
  id: 'user-123',                    // ID of the document to update
  following: [{ id: 'user-456' }]    // Items to remove from the array
})
```

### Firestore Query Limitations

Some TypeORM query methods are not supported in Firestore:

| Feature | Support |
|---------|---------|
| `whereTextContains` | Not supported |
| `whereTextEndsWith` | Not supported |
| Case-insensitive search | Not supported |
| `whereJoin` | Not supported |
| `fetchRelation` | Not supported |
| Soft delete | Not supported |
| `cache()` | No effect |

## Base Entity

Instead of manually defining common fields like `id`, `createdAt`, and `updatedAt` on every entity, extend `BaseEntity` to get them automatically. This ensures consistency across your data model and enables features like soft delete and optimistic locking out of the box.

```typescript
import { BaseEntity } from '@hgraph/storage'
import { Entity, Column } from 'typeorm'

@Entity()
class User extends BaseEntity {
  // Inherited fields:
  // - id: string (primary key)
  // - createdAt: Date (auto-set on insert)
  // - updatedAt: Date (auto-set on update)
  // - deletedAt: Date (for soft deletes)
  // - version: number (optimistic locking)

  @Column()
  name!: string

  @Column()
  email!: string
}
```

The `version` field enables optimistic locking - if two processes try to update the same record simultaneously, the second update will fail rather than silently overwriting changes.

## ID Generation

When you insert records without specifying an ID, the library automatically generates one using `generateId()`. You can also use these utilities directly for custom ID generation needs:

```typescript
import {
  generateId,
  generateNumericId,
  generateIdOf,
  createRandomIdGenerator
} from '@hgraph/storage'

// Generate 8-character alphanumeric ID (default for auto-generated IDs)
const id = generateId() // e.g., "Ax7kM2pQ"

// Generate numeric timestamp-based ID (useful for sortable IDs)
const numericId = generateNumericId() // e.g., "7234561234567890"

// Generate deterministic hash-based ID from input (same input = same output)
// Useful for creating stable IDs from external identifiers
const hashId = generateIdOf('user@example.com')

// Create custom ID generator with specific length and character set
const generate12CharId = createRandomIdGenerator(12, 'ABCDEF0123456789')
const hexId = generate12CharId() // e.g., "A1B2C3D4E5F6"
```

### Custom ID Generator Decorator

For entities that need specific ID formats (like order numbers or SKUs), use the `@IdGenerator` decorator. The function runs automatically when inserting new records:

```typescript
import { BaseEntity, IdGenerator } from '@hgraph/storage'
import { Entity, Column } from 'typeorm'

@Entity()
@IdGenerator<Order>(order => {
  order.id = `ORD-${Date.now()}`
})
class Order extends BaseEntity {
  @Column()
  total!: number
}
```

## Caching with DataLoader

When building GraphQL APIs, the N+1 query problem can severely impact performance. For example, fetching a list of posts and then the author of each post would result in 1 + N queries.

The library integrates with Facebook's [DataLoader](https://github.com/graphql/dataloader) to batch and cache requests within a single request cycle. This automatically combines multiple `findById` calls into a single batched query.

```typescript
import { RepositoryWithIdCache } from '@hgraph/storage'

// Simply extend RepositoryWithIdCache instead of Repository
class UserRepository extends RepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}

// For Firestore
import { FirestoreRepositoryWithIdCache } from '@hgraph/storage'

class UserRepository extends FirestoreRepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}
```

### Custom Cache Key

By default, caching uses the `id` field. For entities that are frequently looked up by a different field (like email), you can specify a custom cache key:

```typescript
import { Repository, WithCache } from '@hgraph/storage'

@WithCache('email')
class RepositoryWithEmailCache<Entity> extends Repository<Entity> {
  // findByEmail calls will now be batched and cached
}
```

## Testing

Writing tests that depend on a real database is slow and flaky. This library includes an in-memory PostgreSQL implementation using [pg-mem](https://github.com/oguimbal/pg-mem) that runs entirely in memory with no external dependencies.

### Testing with NestJS

Use `StorageModule.forTest()` to automatically swap in the mock database. Your tests run against the same repository code but with instant in-memory storage:

```typescript
import { Test } from '@nestjs/testing'
import { StorageModule, RepositoryType } from '@hgraph/storage/nestjs'

describe('UserService', () => {
  let userService: UserService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        StorageModule.forTest({
          repositoryType: RepositoryType.TypeORM,
          type: 'postgres',
          entities: [User],
        }),
        StorageModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile()

    userService = module.get(UserService)
  })

  it('should find users', async () => {
    // Test your service methods
  })
})
```

### Testing without NestJS

For non-NestJS applications, initialize the mock data source directly:

```typescript
import { initializeMockDataSource, MockTypeORMDataSource } from '@hgraph/storage/dist/typeorm-mock'

describe('UserRepository', () => {
  let dataSource: MockTypeORMDataSource

  beforeEach(async () => {
    dataSource = await initializeMockDataSource({
      type: 'postgres',
      database: 'test',
      entities: [User, Post],
      synchronize: false,
    })
  })

  afterEach(async () => {
    dataSource?.destroy()
  })

  it('should create and find users', async () => {
    const repo = container.resolve(UserRepository)

    await repo.save({ id: 'user-1', name: 'Test User' })

    const user = await repo.findById('user-1')
    expect(user?.name).toBe('Test User')
  })
})
```

### Testing with Firestore

For Firestore, you have two options: use the built-in mock or connect to the Firestore emulator for more realistic testing.

**Option 1: In-memory mock (fastest, no setup required)**

```typescript
import { initializeMockFirestore } from '@hgraph/storage/dist/firestore-repository/firestore-mock'

beforeAll(() => {
  initializeMockFirestore()
})
```

**Option 2: Firestore emulator (more realistic, requires emulator running)**

```typescript
import admin from 'firebase-admin'
import { container } from 'tsyringe'
import { FIRESTORE_INSTANCE } from '@hgraph/storage'

const firestore = admin.initializeApp({ projectId: 'test' }).firestore()
firestore.settings({ host: 'localhost:8080', ssl: false })
container.registerInstance(FIRESTORE_INSTANCE, firestore)
```

## Advanced Usage

### Access TypeORM DataSource

For features not exposed by the repository abstraction, you can access the underlying TypeORM DataSource directly. This gives you full access to TypeORM's API for advanced use cases like raw queries, transactions, or migrations:

```typescript
import { initializeDataSource } from '@hgraph/storage'
import { container } from 'tsyringe'
import { DataSource } from 'typeorm'

await initializeDataSource({ type: 'postgres', /* ... */ })

const dataSource = container.resolve(DataSource)

// Now use any TypeORM feature
await dataSource.query('SELECT * FROM users WHERE ...')
await dataSource.transaction(async manager => { /* ... */ })
```

### Repository Resolver

When building dynamic systems (like GraphQL servers that resolve repositories at runtime), use the repository resolver to look up repositories by name:

```typescript
import {
  createRepositoryResolver,
  registerRepository,
  resolveRepositories
} from '@hgraph/storage'

// Register repositories manually
registerRepository('UserRepository', UserRepository)
registerRepository('PostRepository', PostRepository)

// Or auto-discover from file patterns
await resolveRepositories([
  './src/repositories/*.repository.ts',
  UserRepository,  // Can also pass classes directly
])

// Create a resolver that looks up repositories by name
const repos = createRepositoryResolver({ container })

// Access repositories dynamically (useful in generic GraphQL resolvers)
const users = await repos.UserRepository.findAll()
const posts = await repos.PostRepository.findById('post-1')
```

### Entity Examples

See [docs/entities.md](docs/entities.md) for complete entity setup examples including:
- Basic entities with columns
- Enums and arrays
- One-to-many and many-to-one relations
- Self-referencing relations

## Database Support

Built on [TypeORM](https://typeorm.io/), @hgraph/storage supports:

- PostgreSQL
- MySQL / MariaDB
- SQLite
- Microsoft SQL Server
- Oracle
- CockroachDB
- SAP Hana
- Cloud Firestore (via dedicated adapter)

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## Links

- [GitHub Repository](https://github.com/rintoj/hypergraph-storage)
- [npm Package](https://www.npmjs.com/package/@hgraph/storage)
- [TypeORM Documentation](https://typeorm.io/)
