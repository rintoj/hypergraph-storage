# Query Builder

The `@hgraph/storage` query builder provides a type-safe, fluent API for building database queries with TypeORM.

## Basic Usage

```typescript
import { Query, PaginatedQuery } from '@hgraph/storage'

// Simple query
const users = await repository.findOne(
  q => q.whereEqualTo('status', 'active')
       .orderByDescending('createdAt')
)

// Paginated query
const result = await repository.find(
  q => q.whereEqualTo('status', 'active')
       .limit(20)
)
```

## Terminal Query Pattern

To prevent "Unsupported FindOperator" errors from TypeORM, the query builder enforces safe ordering of query methods using a **Terminal Query Pattern**.

### What is a Terminal Query?

Certain query methods (`whereIn` and `whereOr`) return a `TerminalQuery` instead of the regular query builder. The `TerminalQuery` only exposes safe methods that can be chained after these operators.

### Why This Matters

TypeORM has limitations with how FindOperators can be combined. Incorrect ordering causes runtime errors like:

```
TypeError: Unsupported FindOperator Function
```

The Terminal Query Pattern prevents these errors at **compile time**.

## Rules

### Rule 1: `whereIn` Must Be Last

`whereIn()` returns a `TerminalQuery`, so no other where methods can be chained after it.

```typescript
// CORRECT - whereIn is last
q.whereEqualTo('status', 'active')
 .fetchRelation('user')
 .orderByDescending('createdAt')
 .whereIn('groupId', groupIds)

// COMPILE ERROR - can't chain whereEqualTo after whereIn
q.whereIn('groupId', groupIds)
 .whereEqualTo('status', 'active')  // TypeScript error!
```

### Rule 2: `whereOr` Must Be Last

`whereOr()` also returns a `TerminalQuery`.

```typescript
// CORRECT - whereOr is last
q.whereEqualTo('status', 'active')
 .whereOr(
   q1 => q1.whereEqualTo('role', 'admin'),
   q2 => q2.whereEqualTo('role', 'moderator')
 )

// COMPILE ERROR - can't chain after whereOr
q.whereOr(
   q1 => q1.whereEqualTo('role', 'admin'),
   q2 => q2.whereEqualTo('role', 'moderator')
 )
 .whereEqualTo('status', 'active')  // TypeScript error!
```

### Rule 3: Never Use `whereIn` Inside `whereJoin`

This throws a runtime error with a helpful message.

```typescript
// RUNTIME ERROR
q.whereJoin('group', gq => gq.whereIn('id', groupIds))

// CORRECT - use explicit foreign key
q.whereIn('groupId', groupIds)
```

### Rule 4: Never Use `whereIn` Inside `whereOr`

This throws a runtime error with a helpful message.

```typescript
// RUNTIME ERROR
q.whereOr(
  q1 => q1.whereIn('status', ['active', 'pending']),
  q2 => q2.whereEqualTo('role', 'admin')
)

// CORRECT - restructure with multiple whereEqualTo
q.whereOr(
  q1 => q1.whereEqualTo('status', 'active'),
  q2 => q2.whereEqualTo('status', 'pending'),
  q3 => q3.whereEqualTo('role', 'admin')
)
```

### Rule 5: Combining AND with OR

To combine AND conditions with OR, include the AND condition inside each OR branch:

```typescript
// CORRECT - AND condition inside each branch
q.whereOr(
  q1 => q1.whereEqualTo('age', 48).whereTextContains('gender', 'Male'),
  q2 => q2.whereEqualTo('age', 64).whereTextContains('gender', 'Male')
)
```

## Safe Query Pattern

Follow this recommended order for building queries:

```typescript
q.whereJoin('relation', rq => rq.whereEqualTo('field', value))  // 1. Joins first
 .whereEqualTo('field1', value1)                                 // 2. Simple equality
 .whereNotEqualTo('field2', value2)                              // 3. Simple inequality
 .whereMoreThan('field3', value3)                                // 4. Comparisons
 .whereTextInAnyCaseContains('field4', value4)                   // 5. Text search
 .whereIsNotNull('field5')                                       // 6. Null checks
 .fetchRelation('otherRelation')                                 // 7. Fetch relations
 .orderByDescending('createdAt')                                 // 8. Sorting
 .limit(50)                                                      // 9. Pagination
 .whereIn('field6', values)                                      // 10. LAST: whereIn
```

## Methods Available After Terminal Operations

After calling `whereIn()` or `whereOr()`, you can still chain these safe methods:

- `orderByAscending(key)` / `orderByDescending(key)`
- `select(key)`
- `fetchRelation(key1, key2?, key3?, key4?)`
- `loadRelationIds()`
- `cache(boolean | number)`
- `toQuery()`

For paginated queries (`TerminalPaginatedQuery`):
- `limit(count)`
- `next(token)`
- `pagination({ next?, limit? })`

## Available Where Methods

### Comparison Operators
- `whereEqualTo(key, value)` - Equality check
- `whereNotEqualTo(key, value)` - Not equal
- `whereMoreThan(key, value)` - Greater than
- `whereMoreThanOrEqual(key, value)` - Greater than or equal
- `whereLessThan(key, value)` - Less than
- `whereLessThanOrEqual(key, value)` - Less than or equal
- `whereBetween(key, from, to)` - Range check

### Text Search
- `whereTextContains(key, value)` - LIKE '%value%'
- `whereTextStartsWith(key, value)` - LIKE 'value%'
- `whereTextEndsWith(key, value)` - LIKE '%value'
- `whereTextInAnyCaseContains(key, value)` - Case-insensitive contains
- `whereTextInAnyCaseStartsWith(key, value)` - Case-insensitive starts with
- `whereTextInAnyCaseEndsWith(key, value)` - Case-insensitive ends with

### Array and Null
- `whereIn(key, values)` - IN operator (**Terminal**)
- `whereArrayContains(key, value)` - Array contains value
- `whereArrayContainsAny(key, values)` - Array contains any
- `whereIsNull(key)` - IS NULL
- `whereIsNotNull(key)` - IS NOT NULL

### Complex Conditions
- `whereJoin(key, queryBuilder)` - Join conditions
- `whereOr(q1, q2, ...others)` - OR logic (**Terminal**)

## Type Exports

```typescript
import {
  Query,
  PaginatedQuery,
  QueryWithWhere,
  TerminalQuery,
  TerminalPaginatedQuery,
  isQuery,
  isTerminalQuery,
} from '@hgraph/storage'
```
