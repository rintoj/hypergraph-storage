import {
  parseNestedPath,
  isNestedPath,
  buildNestedWhere,
  getRelationPath,
  buildRelationsObject,
  deepMerge,
  getFirstSegment,
  getRestOfPath,
} from './parse-nested-path'
import { In, Like, MoreThan } from 'typeorm'

describe('parseNestedPath', () => {
  it('should split a simple nested path', () => {
    expect(parseNestedPath('user.id')).toEqual(['user', 'id'])
  })

  it('should split a deeply nested path', () => {
    expect(parseNestedPath('album.owner.profile.bio')).toEqual(['album', 'owner', 'profile', 'bio'])
  })

  it('should handle a single segment path', () => {
    expect(parseNestedPath('name')).toEqual(['name'])
  })
})

describe('isNestedPath', () => {
  it('should return true for nested paths', () => {
    expect(isNestedPath('user.id')).toBe(true)
    expect(isNestedPath('album.owner.name')).toBe(true)
  })

  it('should return false for direct paths', () => {
    expect(isNestedPath('name')).toBe(false)
    expect(isNestedPath('id')).toBe(false)
  })
})

describe('buildNestedWhere', () => {
  it('should build a nested object for a simple path', () => {
    expect(buildNestedWhere('user.id', 'user-123')).toEqual({
      user: { id: 'user-123' },
    })
  })

  it('should build a nested object for a deep path', () => {
    expect(buildNestedWhere('album.owner.name', 'John')).toEqual({
      album: { owner: { name: 'John' } },
    })
  })

  it('should work with TypeORM operators', () => {
    const result = buildNestedWhere('user.version', MoreThan(5))
    expect(result).toEqual({
      user: { version: expect.objectContaining({ _type: 'moreThan' }) },
    })
  })

  it('should work with In operator', () => {
    const result = buildNestedWhere('user.id', In(['a', 'b', 'c']))
    expect(result).toEqual({
      user: { id: expect.objectContaining({ _type: 'in' }) },
    })
  })

  it('should work with Like operator', () => {
    const result = buildNestedWhere('user.name', Like('%John%'))
    expect(result).toEqual({
      user: { name: expect.objectContaining({ _type: 'like' }) },
    })
  })
})

describe('getRelationPath', () => {
  it('should return the relation path for a nested field', () => {
    expect(getRelationPath('user.id')).toBe('user')
    expect(getRelationPath('album.owner.name')).toBe('album.owner')
    expect(getRelationPath('a.b.c.d')).toBe('a.b.c')
  })

  it('should return null for a direct field', () => {
    expect(getRelationPath('name')).toBeNull()
    expect(getRelationPath('id')).toBeNull()
  })
})

describe('buildRelationsObject', () => {
  it('should build a relations object for a single level', () => {
    expect(buildRelationsObject('user')).toEqual({ user: true })
  })

  it('should build a relations object for multiple levels', () => {
    expect(buildRelationsObject('album.owner')).toEqual({
      album: { owner: true },
    })
  })

  it('should build a relations object for deep levels', () => {
    expect(buildRelationsObject('a.b.c.d')).toEqual({
      a: { b: { c: { d: true } } },
    })
  })
})

describe('deepMerge', () => {
  it('should merge flat objects', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('should merge nested objects', () => {
    expect(deepMerge({ user: { id: 1 } }, { user: { name: 'John' } })).toEqual({
      user: { id: 1, name: 'John' },
    })
  })

  it('should override scalar values', () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
  })

  it('should not merge arrays', () => {
    expect(deepMerge({ arr: [1, 2] }, { arr: [3, 4] })).toEqual({ arr: [3, 4] })
  })

  it('should preserve FindOperator objects', () => {
    const operator = MoreThan(5)
    const result = deepMerge({ user: { name: 'John' } }, { user: { version: operator } }) as {
      user: { name: string; version: typeof operator }
    }
    expect(result).toEqual({
      user: {
        name: 'John',
        version: operator,
      },
    })
    // Verify the operator is the same reference, not merged
    expect(result.user.version).toBe(operator)
  })

  it('should handle complex nested merges', () => {
    const target = {
      user: { id: 1, profile: { name: 'John' } },
      album: { name: 'Summer' },
    }
    const source = {
      user: { email: 'john@example.com', profile: { age: 30 } },
      photo: { url: 'https://example.com' },
    }
    expect(deepMerge(target, source)).toEqual({
      user: {
        id: 1,
        email: 'john@example.com',
        profile: { name: 'John', age: 30 },
      },
      album: { name: 'Summer' },
      photo: { url: 'https://example.com' },
    })
  })

  it('should handle empty objects', () => {
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 })
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 })
    expect(deepMerge({}, {})).toEqual({})
  })
})

describe('getFirstSegment', () => {
  it('should return the first segment of a path', () => {
    expect(getFirstSegment('user.id')).toBe('user')
    expect(getFirstSegment('album.owner.name')).toBe('album')
    expect(getFirstSegment('name')).toBe('name')
  })
})

describe('getRestOfPath', () => {
  it('should return the remaining path after the first segment', () => {
    expect(getRestOfPath('user.id')).toBe('id')
    expect(getRestOfPath('album.owner.name')).toBe('owner.name')
  })

  it('should return null for single segment paths', () => {
    expect(getRestOfPath('name')).toBeNull()
  })
})
