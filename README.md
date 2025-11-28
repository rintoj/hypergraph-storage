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
- [Base Entity](#base-entity)
- [ID Generation](#id-generation)
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
- [Caching with DataLoader](#caching-with-dataloader)
- [Testing](#testing)
- [Advanced Usage](#advanced-usage)

## Installation

```bash
npm install @hgraph/storage
# or
yarn add @hgraph/storage
```

## Quick Start

### 1. Define Your Entity

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

```typescript
import { Repository } from '@hgraph/storage'

class UserRepository extends Repository<User> {
  constructor() {
    super(User)
  }
}
```

### 3. Query Your Data

```typescript
const userRepo = new UserRepository()

// Find users with elegant query syntax
const activeUsers = await userRepo.findAll(q =>
  q.whereEqualTo('verified', true)
   .whereMoreThan('followers', 100)
   .orderByDescending('followers')
)
```

## Base Entity

The library provides a `BaseEntity` class with common fields for your entities:

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

## ID Generation

The library provides utilities for generating unique IDs:

```typescript
import {
  generateId,
  generateNumericId,
  generateIdOf,
  createRandomIdGenerator
} from '@hgraph/storage'

// Generate 8-character alphanumeric ID
const id = generateId() // e.g., "Ax7kM2pQ"

// Generate numeric timestamp-based ID
const numericId = generateNumericId() // e.g., "7234561234567890"

// Generate deterministic hash-based ID from input
const hashId = generateIdOf('user@example.com') // Always same output for same input

// Create custom ID generator
const generate12CharId = createRandomIdGenerator(12, 'ABCDEF0123456789')
const hexId = generate12CharId() // e.g., "A1B2C3D4E5F6"
```

### Custom ID Generator Decorator

Use the `@IdGenerator` decorator to define custom ID generation logic per entity:

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

## Usage with NestJS

### Step 1: Configure Root Module

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

### Initialize the Data Source

```typescript
import { initializeDataSource } from '@hgraph/storage'

await initializeDataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Post, Comment],
  synchronize: true,
})
```

Or use environment variables:

```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
DATABASE_SYNCHRONIZE=true
```

### Use with Dependency Injection (tsyringe)

```typescript
import { container } from 'tsyringe'

const userRepo = container.resolve(UserRepository)
const users = await userRepo.findAll()
```

## Query Builder

The query builder provides a fluent, type-safe API for constructing database queries.

### Basic Queries

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

```typescript
// Check if array contains value
q.whereArrayContains('tags', 'featured')

// Check if array contains any of the values
q.whereArrayContainsAny('categories', ['tech', 'science'])
```

### Relations and Joins

```typescript
// Filter by related entity
q.whereJoin('posts', postQuery =>
  postQuery.whereEqualTo('published', true)
)

// Fetch related entities
q.fetchRelation('posts', 'comments', 'author')

// Load only relation IDs (performance optimization)
q.loadRelationIds()
```

### Sorting and Pagination

```typescript
// Sorting
q.orderByAscending('name')
q.orderByDescending('createdAt')

// Pagination
q.limit(25)
q.next('cursor-token')

// Combined
q.pagination({ limit: 25, next: 'cursor-token' })

// Select specific columns
q.select('id', 'name', 'email')

// Enable caching
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

### Fetching Records

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

```typescript
// Count all
const total = await userRepo.count()

// Count with query
const verifiedCount = await userRepo.count(q =>
  q.whereEqualTo('verified', true)
)
```

### Incrementing Values

```typescript
// Increment by ID
await userRepo.increment('user-123', 'followers', 1)

// Decrement by ID
await userRepo.increment('user-123', 'followers', -1)

// Increment by query
await userRepo.increment(
  q => q.whereEqualTo('featured', true),
  'views',
  1
)
```

### Deleting and Restoring

```typescript
// Hard delete
await userRepo.delete('user-123')

// Delete by query
await userRepo.delete(q =>
  q.whereEqualTo('status', 'spam')
)

// Soft delete (sets deletedAt timestamp)
await userRepo.delete('user-123', { softDelete: true })

// Restore soft-deleted record
await userRepo.restore('user-123')

// Restore by query
await userRepo.restore(q =>
  q.whereEqualTo('status', 'suspended')
)
```

## Cloud Firestore

@hgraph/storage provides robust support for Google Cloud Firestore as an alternative to SQL databases.

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

## Caching with DataLoader

For GraphQL applications, use the built-in DataLoader integration for batching and caching:

```typescript
import { RepositoryWithIdCache } from '@hgraph/storage'

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

```typescript
import { Repository, WithCache } from '@hgraph/storage'

@WithCache('email')
class RepositoryWithEmailCache<Entity> extends Repository<Entity> {
  // Cache by email instead of ID
}
```

## Testing

@hgraph/storage includes an in-memory database implementation using [pg-mem](https://github.com/oguimbal/pg-mem) for testing.

### Testing with NestJS

Use `StorageModule.forTest()` to automatically configure an in-memory database:

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

```typescript
import { initializeMockFirestore } from '@hgraph/storage/dist/firestore-repository/firestore-mock'

beforeAll(() => {
  initializeMockFirestore()
})
```

Or use the Firestore emulator:

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

```typescript
import { initializeDataSource } from '@hgraph/storage'
import { container } from 'tsyringe'
import { DataSource } from 'typeorm'

await initializeDataSource({ type: 'postgres', /* ... */ })

const dataSource = container.resolve(DataSource)
// Use any TypeORM feature directly
```

### Repository Resolver

Dynamically resolve repositories by name (useful for GraphQL resolvers):

```typescript
import {
  createRepositoryResolver,
  registerRepository,
  resolveRepositories
} from '@hgraph/storage'

// Register repositories manually
registerRepository('UserRepository', UserRepository)
registerRepository('PostRepository', PostRepository)

// Or auto-resolve from file paths
await resolveRepositories([
  './src/repositories/*.repository.ts',
  UserRepository,  // Can also pass classes directly
])

// Create a resolver proxy
const repos = createRepositoryResolver({ container })

// Access repositories dynamically by name
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
