# Nested Relation Field Filtering

## Overview

This document describes the nested relation field filtering feature in `@hgraph/storage` that allows filtering by related entity fields using dot-notation syntax.

### Goal

Enable queries like:

```typescript
// Current approach - using whereJoin callback
postRepo.find(q =>
  q.whereJoin('author', aq =>
    aq.whereEqualTo('id', userId)
  )
)

// Desired approach - direct dot-notation
postRepo.find(q => q.whereEqualTo('author.id', userId))
```

---

## How TypeORM Supports Nested Field Filtering

### 1. FindOptionsWhere - Nested Object Syntax

TypeORM's `FindOptionsWhere<Entity>` supports filtering by nested relation fields through **object nesting**, not dot notation:

```typescript
// TypeORM expects nested objects, NOT dot notation
repository.find({
  where: {
    author: {
      id: userId,
      role: 'admin'
    }
  },
  relations: { author: true }
})

// Dot notation does NOT work in FindOptionsWhere
// This is incorrect:
// where: { 'author.id': userId }
```

### 2. TypeORM QueryBuilder - Dot Notation

QueryBuilder uses explicit joins with dot notation:

```typescript
repository.createQueryBuilder('post')
  .leftJoinAndSelect('post.author', 'author')
  .where('author.id = :userId', { userId })
  .getMany()
```

### 3. Key Insight

Since `@hgraph/storage` uses TypeORM's `FindManyOptions` (not QueryBuilder), we need to:

1. Accept dot-notation syntax in our API: `whereEqualTo('author.id', userId)`
2. Transform it to TypeORM's nested object format: `{ where: { author: { id: userId } }, relations: { author: true } }`

---

## Current Implementation Analysis

### File Structure

| File | Purpose |
|------|---------|
| `src/query/query.ts` | Main query builder with where methods |
| `src/query/to-sql-query.ts` | SQL query generation utility |
| `tsds-tools` | Type utilities (KeysOf, TypeOf, etc.) |

### Current Type Constraints

From `tsds-tools`:

```typescript
// KeysOf - extracts keys matching a type constraint
type KeysOf<Entity, Type = any> = {
  [Key in keyof Entity]-?: AllRequired<Entity>[Key] extends Type
    ? Key extends string ? Key : never
    : never;
}[keyof Entity];

// TypeOf - gets the type of a property
type TypeOf<Entity, Key extends KeysOf<Entity>> = {
  [InnerKey in KeysOf<Entity>]-?: AllRequired<Entity>[InnerKey];
}[Key];

// KeysOfNonPrimitives - keys that are relation fields
type KeysOfNonPrimitives<Entity> = {
  [Key in keyof Entity]-?: InferredType<Entity, Key> extends Primitive
    ? never
    : Key extends string ? Key : never;
}[keyof Entity];
```

### Current whereEqualTo Signature

```typescript
whereEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
  key: Key,
  value: TypeOf<Entity, Key> | undefined,
)
```

This only accepts direct property keys, not nested paths.

---

## Implementation Plan

### Approach: Overloaded Methods with Dot-Notation Path Parsing

The cleanest approach is to:

1. Add new type utilities for nested paths
2. Add method overloads that accept dot-notation paths
3. Parse dot-notation at runtime and convert to nested object structure
4. Automatically add relations when filtering by nested fields

### Step 1: Add New Type Utilities

Create new types in `src/query/nested-types.ts`:

```typescript
import { AllRequired, InferredType, KeysOf, Primitive } from 'tsds-tools'

/**
 * Extracts nested paths for relations (1 level deep)
 * For Entity { author: User } and User { id: string, name: string }
 * Result: 'author.id' | 'author.name'
 */
export type NestedKeysOf<Entity, Type = any> = {
  [Key in keyof AllRequired<Entity>]: AllRequired<Entity>[Key] extends Primitive
    ? never
    : AllRequired<Entity>[Key] extends object
      ? `${Key & string}.${KeysOf<AllRequired<Entity>[Key], Type> & string}`
      : never
}[keyof AllRequired<Entity>]

/**
 * Extracts nested paths for 2 levels deep
 * For Entity { author: User } and User { profile: Profile } and Profile { bio: string }
 * Result: 'author.profile.bio'
 */
export type NestedKeysOf2<Entity, Type = any> = {
  [Key in keyof AllRequired<Entity>]: AllRequired<Entity>[Key] extends Primitive
    ? never
    : AllRequired<Entity>[Key] extends object
      ? {
          [Key2 in keyof AllRequired<AllRequired<Entity>[Key]>]: AllRequired<
            AllRequired<Entity>[Key]
          >[Key2] extends Primitive
            ? never
            : AllRequired<AllRequired<Entity>[Key]>[Key2] extends object
              ? `${Key & string}.${Key2 & string}.${KeysOf<
                  AllRequired<AllRequired<Entity>[Key]>[Key2],
                  Type
                > &
                  string}`
              : never
        }[keyof AllRequired<AllRequired<Entity>[Key]>]
      : never
}[keyof AllRequired<Entity>]

/**
 * Combined type for direct and nested keys
 */
export type DirectOrNestedKeysOf<Entity, Type = any> =
  | KeysOf<Entity, Type>
  | NestedKeysOf<Entity, Type>

/**
 * Get the type at a nested path
 * TypeOfNested<Post, 'author.id'> = string
 */
export type TypeOfNested<Entity, Path extends string> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof AllRequired<Entity>
    ? TypeOfNested<AllRequired<Entity>[K], Rest>
    : never
  : Path extends keyof AllRequired<Entity>
    ? AllRequired<Entity>[Path]
    : never
```

### Step 2: Add Runtime Path Parsing Utility

Add to `src/query/parse-nested-path.ts`:

```typescript
/**
 * Parses a dot-notation path and returns the path segments
 * @example parseNestedPath('author.profile.bio') // ['author', 'profile', 'bio']
 */
export function parseNestedPath(path: string): string[] {
  return path.split('.')
}

/**
 * Checks if a path is nested (contains a dot)
 */
export function isNestedPath(path: string): boolean {
  return path.includes('.')
}

/**
 * Converts a dot-notation path and value to a nested object structure
 * @example
 * buildNestedWhere('author.id', 'user-123')
 * // { author: { id: 'user-123' } }
 */
export function buildNestedWhere(path: string, value: any): object {
  const segments = parseNestedPath(path)
  let result: any = value

  // Build from the innermost property outward
  for (let i = segments.length - 1; i >= 0; i--) {
    result = { [segments[i]]: result }
  }

  return result
}

/**
 * Extracts the relation path from a nested field path
 * @example
 * getRelationPath('author.profile.bio') // 'author.profile'
 * getRelationPath('author.id') // 'author'
 */
export function getRelationPath(path: string): string | null {
  const segments = parseNestedPath(path)
  if (segments.length <= 1) return null
  return segments.slice(0, -1).join('.')
}

/**
 * Converts a relation path to TypeORM relations object
 * @example
 * buildRelationsObject('author.profile') // { author: { profile: true } }
 */
export function buildRelationsObject(relationPath: string): object {
  const segments = parseNestedPath(relationPath)
  let result: any = true

  for (let i = segments.length - 1; i >= 0; i--) {
    result = { [segments[i]]: result }
  }

  return result
}
```

### Step 3: Modify QueryWithWhere Class

Update `src/query/query.ts` to support nested paths:

```typescript
import {
  DirectOrNestedKeysOf,
  TypeOfNested,
  NestedKeysOf
} from './nested-types'
import {
  isNestedPath,
  buildNestedWhere,
  getRelationPath,
  buildRelationsObject
} from './parse-nested-path'
import { merge } from 'tsds-tools' // or lodash merge

export class QueryWithWhere<Entity extends ObjectLiteral> {
  // ... existing code ...

  /**
   * Filter by equal value - supports both direct and nested field paths
   *
   * @example Direct field
   * q.whereEqualTo('status', 'active')
   *
   * @example Nested relation field
   * q.whereEqualTo('author.id', userId)
   * q.whereEqualTo('author.profile.role', 'admin')
   */
  whereEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereEqualTo<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereEqualTo(
    keyOrPath: string,
    value: any,
  ) {
    if (value === undefined) {
      return this.whereIsNull(keyOrPath as any)
    }

    if (isNestedPath(keyOrPath)) {
      return this.setNestedWhere(keyOrPath, value)
    }

    return this.setWhere(keyOrPath as any, value)
  }

  /**
   * Helper method to handle nested path where conditions
   */
  protected setNestedWhere(path: string, value: any) {
    // Build the nested where condition
    const nestedWhere = buildNestedWhere(path, value)

    // Add the relation automatically
    const relationPath = getRelationPath(path)
    if (relationPath) {
      const relationsObj = buildRelationsObject(relationPath)
      this.query.relations = merge({}, this.query.relations, relationsObj)
    }

    // Merge with existing where conditions
    if (this.query.where instanceof Array) {
      this.query.where = this.query.where.map(w => merge({}, w, nestedWhere))
    } else {
      this.query.where = merge({}, this.query.where, nestedWhere) as any
    }

    return this
  }
}
```

### Step 4: Add Overloads to All Where Methods

Apply the same pattern to other where methods:

```typescript
// whereNotEqualTo
whereNotEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
  key: Key,
  value: TypeOf<Entity, Key> | undefined,
): this
whereNotEqualTo<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
  path: Path,
  value: TypeOfNested<Entity, Path> | undefined,
): this

// whereMoreThan
whereMoreThan<Key extends KeysOf<Entity, number | Date>>(
  key: Key,
  value: TypeOf<Entity, Key> | undefined,
): this
whereMoreThan<Path extends NestedKeysOf<Entity, number | Date>>(
  path: Path,
  value: TypeOfNested<Entity, Path> | undefined,
): this

// whereIn
whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
  key: Key,
  value: TypeOf<Entity, Key>[] | undefined,
): TerminalQuery<Entity>
whereIn<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
  path: Path,
  value: TypeOfNested<Entity, Path>[] | undefined,
): TerminalQuery<Entity>

// ... etc for all where methods
```

### Step 5: Add Tests

Add to `src/query/query.test.ts`:

```typescript
describe('Nested Field Filtering', () => {
  it('should filter by nested relation field', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereEqualTo('photos.id', 'photo-1')
      .toQuery()

    expect(query.relations).toEqual({ photos: true })
    expect(query.where).toEqual({ photos: { id: 'photo-1' } })
  })

  it('should filter by deeply nested relation field', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereEqualTo('photos.album.name', 'Summer')
      .toQuery()

    expect(query.relations).toEqual({ photos: { album: true } })
    expect(query.where).toEqual({
      photos: {
        album: { name: 'Summer' }
      }
    })
  })

  it('should combine direct and nested filters', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereEqualTo('name', 'John')
      .whereEqualTo('photos.url', 'https://example.com')
      .toQuery()

    expect(query.relations).toEqual({ photos: true })
    expect(query.where).toEqual({
      name: 'John',
      photos: { url: 'https://example.com' }
    })
  })

  it('should work with whereIn for nested fields', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereIn('photos.id', ['p1', 'p2'])
      .toQuery()

    expect(query.relations).toEqual({ photos: true })
    expect(query.where).toEqual({
      photos: { id: expect.any(Object) } // In() operator
    })
  })

  it('should work with comparison operators on nested fields', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereMoreThan('photos.imageDepth', 10)
      .toQuery()

    expect(query.relations).toEqual({ photos: true })
    expect(query.where).toEqual({
      photos: { imageDepth: expect.any(Object) } // MoreThan() operator
    })
  })
})
```

---

## Implementation Summary

### Files Created

| File | Description |
|------|-------------|
| `src/query/nested-types.ts` | Type utilities for nested paths (`NestedKeysOf`, `TypeOfNested`, etc.) |
| `src/query/parse-nested-path.ts` | Runtime utilities for path parsing and nested object building |
| `src/query/nested-types.test.ts` | Type validation tests (compile-time and runtime) |
| `src/query/parse-nested-path.test.ts` | Unit tests for path parsing utilities |

### Files Modified

| File | Changes |
|------|---------|
| `src/query/query.ts` | Added overloads for all where methods and `setNestedWhere` helper |
| `src/query/query.test.ts` | Added tests for nested filtering |
| `src/query/index.ts` | Export new types and utilities |

### Type Safety Guarantees

1. **Compile-time validation**: TypeScript will only allow valid nested paths
2. **Value type inference**: The value type is correctly inferred from the nested path
3. **Relation field restriction**: Only relation fields accept dot notation (primitives don't)

### Backward Compatibility

- All existing code continues to work unchanged
- The overload pattern means existing calls match the first signature
- New nested path calls match the second signature

---

## Alternative Approaches Considered

### 1. Template Literal Types Only (Rejected)

Using only template literal types without runtime parsing would require complex recursive type definitions and wouldn't work at runtime.

### 2. QueryBuilder Approach (Rejected)

Switching to TypeORM QueryBuilder would break the existing FindManyOptions-based architecture and require significant refactoring.

### 3. Extending whereJoin Only (Partial)

Keeping only `whereJoin` for nested filtering works but is more verbose:

```typescript
// More verbose
q.whereJoin('author', aq => aq.whereEqualTo('id', userId))

// Preferred
q.whereEqualTo('author.id', userId)
```

---

## Limitations

1. **Depth limit**: The type system practically supports 2-3 levels of nesting. Deeper nesting requires `whereJoin` chains.

2. **Array relations**: Filtering on array relations (OneToMany) works but queries may return unexpected results depending on how TypeORM generates the SQL.

3. **OR conditions**: Using `whereOr` with nested paths follows the same Terminal Query Pattern restrictions.

---

## Example Usage After Implementation

```typescript
// Post entity with ManyToOne author relation
class Post {
  id: string
  title: string
  author: User
}

class User {
  id: string
  name: string
  profile: UserProfile
}

// Simple nested filtering
const posts = await postRepo.findAll(q =>
  q.whereEqualTo('author.id', userId)
)

// Multiple nested conditions
const posts = await postRepo.findAll(q =>
  q.whereEqualTo('author.id', userId)
   .whereTextContains('author.name', 'John')
)

// Deep nesting (2 levels)
const posts = await postRepo.findAll(q =>
  q.whereEqualTo('author.profile.role', 'admin')
)

// Combined with direct fields
const posts = await postRepo.findAll(q =>
  q.whereEqualTo('title', 'Hello')
   .whereEqualTo('author.id', userId)
   .orderByDescending('createdAt')
)

// Using whereIn with nested fields
const posts = await postRepo.findAll(q =>
  q.whereIn('author.id', userIds)
)
```
