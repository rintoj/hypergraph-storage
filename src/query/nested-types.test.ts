/**
 * TypeScript Compile-Time Validation Tests for Nested Field Filtering
 *
 * This file tests that the type system correctly validates nested field paths
 * at compile time. Tests are structured to verify:
 *
 * 1. Valid nested paths compile without errors
 * 2. Invalid nested paths produce TypeScript errors (commented out to show what should fail)
 * 3. Value types are correctly inferred from nested paths
 *
 * To verify negative tests, uncomment the marked lines and confirm they produce TypeScript errors.
 */

import { PhotoEntity, UserEntity } from '../entity'
import { Repository } from '../repository'
import { Query, PaginatedQuery } from './query'
import {
  NestedKeysOf,
  NestedKeysOf2,
  TypeOfNested,
  DirectOrNestedKeysOf,
} from './nested-types'

// ============================================================================
// Test Repositories
// ============================================================================

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

// ============================================================================
// Type-Level Tests (Compile-Time Validation)
// ============================================================================

describe('Nested Types - Compile Time Validation', () => {
  describe('NestedKeysOf type utility', () => {
    it('should extract valid nested paths for 1-level relations', () => {
      // These type assertions verify the type system works correctly
      // If TypeScript compiles, the test passes

      // PhotoEntity has: user (UserEntity), album (AlbumEntity)
      // UserEntity has: id, name, email, role, version, createdAt, etc.
      type PhotoNestedKeys = NestedKeysOf<PhotoEntity, string>

      // Valid: user.name, user.email, user.id, album.name
      const validPath1: PhotoNestedKeys = 'user.name'
      const validPath2: PhotoNestedKeys = 'user.email'
      const validPath3: PhotoNestedKeys = 'user.id'
      const validPath4: PhotoNestedKeys = 'album.name'

      expect(validPath1).toBe('user.name')
      expect(validPath2).toBe('user.email')
      expect(validPath3).toBe('user.id')
      expect(validPath4).toBe('album.name')
    })

    it('should extract nested paths with number type constraint', () => {
      type PhotoNestedNumberKeys = NestedKeysOf<PhotoEntity, number>

      // Valid: user.version, album.version (both are number)
      const validPath1: PhotoNestedNumberKeys = 'user.version'

      expect(validPath1).toBe('user.version')
    })
  })

  describe('NestedKeysOf2 type utility', () => {
    it('should extract valid nested paths for 2-level relations', () => {
      // PhotoEntity -> album -> owner (UserEntity)
      type PhotoNested2Keys = NestedKeysOf2<PhotoEntity, string>

      // Valid: album.owner.name, album.owner.email, album.owner.id
      const validPath1: PhotoNested2Keys = 'album.owner.name'
      const validPath2: PhotoNested2Keys = 'album.owner.email'
      const validPath3: PhotoNested2Keys = 'album.owner.id'

      expect(validPath1).toBe('album.owner.name')
      expect(validPath2).toBe('album.owner.email')
      expect(validPath3).toBe('album.owner.id')
    })
  })

  describe('TypeOfNested type utility', () => {
    it('should infer correct value type from nested path', () => {
      // user.name should be string
      type UserNameType = TypeOfNested<PhotoEntity, 'user.name'>
      const userName: UserNameType = 'John Doe'
      expect(userName).toBe('John Doe')

      // user.version should be number
      type UserVersionType = TypeOfNested<PhotoEntity, 'user.version'>
      const userVersion: UserVersionType = 5
      expect(userVersion).toBe(5)
    })

    it('should infer correct value type from 2-level nested path', () => {
      // album.owner.name should be string
      type AlbumOwnerNameType = TypeOfNested<PhotoEntity, 'album.owner.name'>
      const ownerName: AlbumOwnerNameType = 'Album Owner'
      expect(ownerName).toBe('Album Owner')

      // album.owner.version should be number
      type AlbumOwnerVersionType = TypeOfNested<PhotoEntity, 'album.owner.version'>
      const ownerVersion: AlbumOwnerVersionType = 10
      expect(ownerVersion).toBe(10)
    })
  })

  describe('DirectOrNestedKeysOf type utility', () => {
    it('should accept both direct and nested keys', () => {
      type PhotoKeys = DirectOrNestedKeysOf<PhotoEntity, string>

      // Direct key
      const directKey: PhotoKeys = 'url'

      // Nested keys
      const nestedKey1: PhotoKeys = 'user.name'
      const nestedKey2: PhotoKeys = 'album.name'

      expect(directKey).toBe('url')
      expect(nestedKey1).toBe('user.name')
      expect(nestedKey2).toBe('album.name')
    })
  })
})

// ============================================================================
// Runtime Tests (Query Builder Integration)
// ============================================================================

describe('Nested Field Filtering - Type Safety', () => {
  describe('Valid Usage (should compile)', () => {
    it('should accept valid 1-level nested string paths', () => {
      const repo = new PhotoRepository()

      // All of these should compile without errors
      new Query(repo).whereEqualTo('user.id', 'user-123')
      new Query(repo).whereEqualTo('user.name', 'John')
      new Query(repo).whereEqualTo('user.email', 'john@example.com')
      new Query(repo).whereEqualTo('album.name', 'Summer Photos')

      expect(true).toBe(true) // If we get here, types are valid
    })

    it('should accept valid 1-level nested number paths', () => {
      const repo = new PhotoRepository()

      // Numeric fields
      new Query(repo).whereMoreThan('user.version', 5)
      new Query(repo).whereLessThan('user.version', 10)
      new Query(repo).whereBetween('user.version', 1, 10)
      new Query(repo).whereMoreThan('imageDepth', 100)

      expect(true).toBe(true)
    })

    it('should accept valid 2-level nested paths', () => {
      const repo = new PhotoRepository()

      // 2-level nesting: photo -> album -> owner
      new Query(repo).whereEqualTo('album.owner.id', 'owner-123')
      new Query(repo).whereEqualTo('album.owner.name', 'Owner Name')
      new Query(repo).whereMoreThan('album.owner.version', 1)

      expect(true).toBe(true)
    })

    it('should accept valid nested paths with text operators', () => {
      const repo = new PhotoRepository()

      new Query(repo).whereTextContains('user.name', 'John')
      new Query(repo).whereTextStartsWith('user.name', 'J')
      new Query(repo).whereTextEndsWith('user.email', '@example.com')
      new Query(repo).whereTextInAnyCaseContains('album.name', 'summer')

      expect(true).toBe(true)
    })

    it('should accept valid nested paths with null operators', () => {
      const repo = new PhotoRepository()

      new Query(repo).whereIsNull('user.email')
      new Query(repo).whereIsNotNull('user.name')
      new Query(repo).whereIsNull('album.owner.email')

      expect(true).toBe(true)
    })

    it('should accept valid nested paths with whereIn', () => {
      const repo = new PhotoRepository()

      new Query(repo).whereIn('user.id', ['user-1', 'user-2', 'user-3'])
      new Query(repo).whereIn('album.owner.id', ['owner-1', 'owner-2'])

      expect(true).toBe(true)
    })

    it('should work with PaginatedQuery', () => {
      const repo = new PhotoRepository()

      new PaginatedQuery(repo)
        .whereEqualTo('user.id', 'user-123')
        .whereMoreThan('user.version', 1)
        .limit(20)

      expect(true).toBe(true)
    })

    it('should allow chaining nested and direct filters', () => {
      const repo = new PhotoRepository()

      new Query(repo)
        .whereEqualTo('url', 'https://example.com')
        .whereEqualTo('user.id', 'user-123')
        .whereMoreThan('user.version', 1)
        .whereTextContains('album.name', 'Summer')

      expect(true).toBe(true)
    })
  })

  /**
   * NEGATIVE TESTS
   *
   * The tests below verify that INVALID nested paths produce TypeScript errors.
   * They are commented out because they SHOULD NOT compile.
   *
   * To verify these negative tests:
   * 1. Uncomment a test
   * 2. Run `npx tsc --noEmit`
   * 3. Verify you get a TypeScript error
   * 4. Re-comment the test
   */
  describe('Invalid Usage (should NOT compile - verify by uncommenting)', () => {
    it('documents invalid paths that should produce TypeScript errors', () => {
      const repo = new PhotoRepository()

      // ========== INVALID: Non-existent nested field ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereEqualTo('user.nonExistentField', 'value')
      // Error: 'user.nonExistentField' is not assignable to parameter

      // ========== INVALID: Nested path on primitive field ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereEqualTo('url.something', 'value')
      // Error: 'url.something' is not assignable (url is string, not relation)

      // ========== INVALID: Wrong value type for nested field ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereEqualTo('user.version', 'string-instead-of-number')
      // Error: Argument of type 'string' is not assignable to parameter of type 'number'

      // ========== INVALID: Using string operator on number field ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereTextContains('user.version', '5')
      // Error: 'user.version' is not assignable (version is number, not string)

      // ========== INVALID: Using number operator on string field ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereMoreThan('user.name', 5)
      // Error: 'user.name' is not assignable (name is string, not number)

      // ========== INVALID: 3-level nesting (not supported) ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereEqualTo('album.owner.profile.gender', 'male')
      // Error: Path too deep, not a valid NestedKeysOf2

      // ========== INVALID: Array type in whereIn with wrong element type ==========
      // Uncomment to verify TypeScript error:
      // new Query(repo).whereIn('user.version', ['string', 'values'])
      // Error: Type 'string' is not assignable to type 'number'

      expect(true).toBe(true) // Placeholder - test passes if we get here
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined values in nested filters', () => {
      const repo = new PhotoRepository()
      const userId: string | undefined = undefined

      // This should still work and use whereIsNull internally
      const query = new Query(repo).whereEqualTo('user.id', userId).toQuery()

      // When value is undefined, whereIsNull is called
      expect(query.where).toEqual({
        user: { id: expect.objectContaining({ _type: 'isNull' }) },
      })
    })

    it('should handle empty arrays in whereIn with nested fields', () => {
      const repo = new PhotoRepository()

      const query = new Query(repo).whereIn('user.id', []).toQuery()

      expect(query.where).toEqual({
        user: {
          id: expect.objectContaining({ _type: 'in', _value: [] }),
        },
      })
    })
  })
})

// ============================================================================
// Type Inference Verification Tests
// ============================================================================

describe('Type Inference Verification', () => {
  it('should correctly infer return types from nested queries', () => {
    const repo = new PhotoRepository()

    // Query should return QueryWithWhere (or subclass) after non-terminal operations
    const query1 = new Query(repo).whereEqualTo('user.id', 'user-1')
    expect(typeof query1.whereEqualTo).toBe('function') // Can chain more where clauses

    // Query should return TerminalQuery after whereIn
    const query2 = new Query(repo).whereIn('user.id', ['user-1', 'user-2'])
    expect(typeof query2.orderByAscending).toBe('function') // Can still order
    expect(typeof (query2 as any).whereEqualTo).toBe('undefined') // Cannot chain where clauses
  })

  it('should correctly infer PaginatedQuery return types', () => {
    const repo = new PhotoRepository()

    // PaginatedQuery should return TerminalPaginatedQuery after whereIn
    const query = new PaginatedQuery(repo).whereIn('user.id', ['user-1', 'user-2'])
    expect(typeof query.limit).toBe('function') // Can still set limit
    expect(typeof query.orderByAscending).toBe('function') // Can still order
  })
})
