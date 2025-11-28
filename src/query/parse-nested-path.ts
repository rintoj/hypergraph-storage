import { FindOperator, FindOptionsWhere } from 'typeorm'

/**
 * Parses a dot-notation path and returns the path segments
 *
 * @example
 * parseNestedPath('author.profile.bio') // ['author', 'profile', 'bio']
 * parseNestedPath('name') // ['name']
 */
export function parseNestedPath(path: string): string[] {
  return path.split('.')
}

/**
 * Checks if a path is nested (contains a dot)
 *
 * @example
 * isNestedPath('author.id') // true
 * isNestedPath('name') // false
 */
export function isNestedPath(path: string): boolean {
  return path.includes('.')
}

/**
 * Converts a dot-notation path and value to a nested object structure
 *
 * @example
 * buildNestedWhere('author.id', 'user-123')
 * // { author: { id: 'user-123' } }
 *
 * buildNestedWhere('author.profile.bio', 'Hello')
 * // { author: { profile: { bio: 'Hello' } } }
 */
export function buildNestedWhere<T>(
  path: string,
  value: T | FindOperator<T>,
): FindOptionsWhere<any> {
  const segments = parseNestedPath(path)
  let result: any = value

  // Build from the innermost property outward
  for (let i = segments.length - 1; i >= 0; i--) {
    result = { [segments[i]]: result }
  }

  return result
}

/**
 * Extracts the relation path from a nested field path (excludes the final field)
 *
 * @example
 * getRelationPath('author.profile.bio') // 'author.profile'
 * getRelationPath('author.id') // 'author'
 * getRelationPath('name') // null
 */
export function getRelationPath(path: string): string | null {
  const segments = parseNestedPath(path)
  if (segments.length <= 1) return null
  return segments.slice(0, -1).join('.')
}

/**
 * Converts a relation path to TypeORM relations object
 *
 * @example
 * buildRelationsObject('author') // { author: true }
 * buildRelationsObject('author.profile') // { author: { profile: true } }
 */
export function buildRelationsObject(relationPath: string): Record<string, any> {
  const segments = parseNestedPath(relationPath)
  let result: any = true

  for (let i = segments.length - 1; i >= 0; i--) {
    result = { [segments[i]]: result }
  }

  return result
}

/**
 * Deep merges two objects, combining nested properties
 * Used to merge relation objects and where conditions
 *
 * @example
 * deepMerge({ a: { b: 1 } }, { a: { c: 2 } })
 * // { a: { b: 1, c: 2 } }
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target } as any

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key]
      const targetValue = result[key]

      // If both values are plain objects (not arrays, dates, FindOperators, etc.), merge recursively
      if (
        isPlainObject(targetValue) &&
        isPlainObject(sourceValue) &&
        !isSpecialObject(sourceValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue)
      } else {
        result[key] = sourceValue
      }
    }
  }

  return result
}

/**
 * Checks if a value is a plain object (not array, null, date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks if an object is a special TypeORM object that shouldn't be merged
 */
function isSpecialObject(value: unknown): boolean {
  if (!isPlainObject(value)) return false

  // Check for FindOperator instances
  if (value instanceof FindOperator) return true

  // Check for _type property which indicates TypeORM operators
  if ('_type' in value) return true

  // Check for Date objects
  if (value instanceof Date) return true

  return false
}

/**
 * Gets the first segment (relation name) from a nested path
 *
 * @example
 * getFirstSegment('author.profile.bio') // 'author'
 * getFirstSegment('name') // 'name'
 */
export function getFirstSegment(path: string): string {
  return parseNestedPath(path)[0]
}

/**
 * Gets the remaining path after the first segment
 *
 * @example
 * getRestOfPath('author.profile.bio') // 'profile.bio'
 * getRestOfPath('author.id') // 'id'
 * getRestOfPath('name') // null
 */
export function getRestOfPath(path: string): string | null {
  const segments = parseNestedPath(path)
  if (segments.length <= 1) return null
  return segments.slice(1).join('.')
}
