import { AllRequired, InferredType, KeysOf, NonArrayPrimitive, Primitive } from 'tsds-tools'

/**
 * Helper type to get the non-array version of a type
 * For Entity { photos: Photo[] }, this extracts Photo
 */
type UnwrapArray<T> = T extends (infer U)[] ? U : T

/**
 * Helper type to check if a type is a relation (non-primitive object)
 */
type IsRelation<T> = T extends Primitive ? false : T extends object ? true : false

/**
 * Extracts nested paths for relations (1 level deep)
 *
 * For Entity { author: User } and User { id: string, name: string }
 * Result: 'author.id' | 'author.name'
 *
 * @example
 * type Post = { id: string; author: User }
 * type User = { id: string; name: string }
 * type Result = NestedKeysOf<Post, NonArrayPrimitive>
 * // Result = 'author.id' | 'author.name'
 */
export type NestedKeysOf<Entity, Type = any> = {
  [Key in keyof AllRequired<Entity>]: IsRelation<
    UnwrapArray<AllRequired<Entity>[Key]>
  > extends true
    ? `${Key & string}.${KeysOf<UnwrapArray<AllRequired<Entity>[Key]>, Type> & string}`
    : never
}[keyof AllRequired<Entity>]

/**
 * Extracts nested paths for 2 levels deep
 *
 * For Entity { author: User } and User { profile: Profile } and Profile { bio: string }
 * Result: 'author.profile.bio'
 *
 * @example
 * type Post = { id: string; author: User }
 * type User = { id: string; profile: UserProfile }
 * type UserProfile = { bio: string; age: number }
 * type Result = NestedKeysOf2<Post, NonArrayPrimitive>
 * // Result = 'author.profile.bio' | 'author.profile.age'
 */
export type NestedKeysOf2<Entity, Type = any> = {
  [Key in keyof AllRequired<Entity>]: IsRelation<
    UnwrapArray<AllRequired<Entity>[Key]>
  > extends true
    ? {
        [Key2 in keyof AllRequired<
          UnwrapArray<AllRequired<Entity>[Key]>
        >]: IsRelation<
          UnwrapArray<AllRequired<UnwrapArray<AllRequired<Entity>[Key]>>[Key2]>
        > extends true
          ? `${Key & string}.${Key2 & string}.${KeysOf<
              UnwrapArray<AllRequired<UnwrapArray<AllRequired<Entity>[Key]>>[Key2]>,
              Type
            > &
              string}`
          : never
      }[keyof AllRequired<UnwrapArray<AllRequired<Entity>[Key]>>]
    : never
}[keyof AllRequired<Entity>]

/**
 * Combined type for 1-level nested keys
 */
export type AllNestedKeysOf<Entity, Type = any> = NestedKeysOf<Entity, Type>

/**
 * Combined type for 1-level and 2-level nested keys
 */
export type AllNestedKeysOf2<Entity, Type = any> =
  | NestedKeysOf<Entity, Type>
  | NestedKeysOf2<Entity, Type>

/**
 * Get the type at a nested path (1 level)
 *
 * @example
 * type Post = { id: string; author: User }
 * type User = { id: string; name: string }
 * type Result = TypeOfNested<Post, 'author.id'>
 * // Result = string
 */
export type TypeOfNested<Entity, Path extends string> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof AllRequired<Entity>
    ? Rest extends keyof AllRequired<UnwrapArray<AllRequired<Entity>[K]>>
      ? AllRequired<UnwrapArray<AllRequired<Entity>[K]>>[Rest]
      : TypeOfNested<UnwrapArray<AllRequired<Entity>[K]>, Rest>
    : never
  : Path extends keyof AllRequired<Entity>
    ? AllRequired<Entity>[Path]
    : never

/**
 * Combined type for direct keys and nested keys (1 level)
 */
export type DirectOrNestedKeysOf<Entity, Type = any> =
  | KeysOf<Entity, Type>
  | NestedKeysOf<Entity, Type>

/**
 * Combined type for direct keys and nested keys (up to 2 levels)
 */
export type DirectOrNestedKeysOf2<Entity, Type = any> =
  | KeysOf<Entity, Type>
  | NestedKeysOf<Entity, Type>
  | NestedKeysOf2<Entity, Type>

/**
 * Type guard to check if a value could be a nested path
 */
export type IsNestedPath<T extends string> = T extends `${string}.${string}` ? true : false

/**
 * Extract the relation part from a nested path
 *
 * @example
 * type Result = RelationOf<'author.profile.bio'>
 * // Result = 'author.profile'
 */
export type RelationOf<Path extends string> = Path extends `${infer Relation}.${infer _Field}`
  ? _Field extends `${string}.${string}`
    ? `${Relation}.${RelationOf<_Field>}`
    : Relation
  : never

/**
 * Extracts nested paths for non-primitive fields (relations)
 * Used for whereJoin-style operations on nested relations
 */
export type NestedRelationKeysOf<Entity> = {
  [Key in keyof AllRequired<Entity>]: IsRelation<
    UnwrapArray<AllRequired<Entity>[Key]>
  > extends true
    ? {
        [Key2 in keyof AllRequired<
          UnwrapArray<AllRequired<Entity>[Key]>
        >]: IsRelation<
          UnwrapArray<AllRequired<UnwrapArray<AllRequired<Entity>[Key]>>[Key2]>
        > extends true
          ? `${Key & string}.${Key2 & string}`
          : never
      }[keyof AllRequired<UnwrapArray<AllRequired<Entity>[Key]>>]
    : never
}[keyof AllRequired<Entity>]

/**
 * Get the inferred type at a nested relation path
 * Returns the entity type (unwrapped from array if needed)
 */
export type InferredNestedType<Entity, Path extends string> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof AllRequired<Entity>
    ? InferredNestedType<InferredType<Entity, K>, Rest>
    : never
  : Path extends keyof AllRequired<Entity>
    ? InferredType<Entity, Path>
    : never
