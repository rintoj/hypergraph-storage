import {
  ArrayPrimitive,
  InferredType,
  isDefined,
  KeysOf,
  KeysOfNonPrimitives,
  NonArrayPrimitive,
  Primitive,
  setProperty,
  TypeOf,
} from 'tsds-tools'
import { NestedKeysOf, NestedKeysOf2, TypeOfNested } from './nested-types'
import {
  buildNestedWhere,
  buildRelationsObject,
  deepMerge,
  getRelationPath,
  isNestedPath,
} from './parse-nested-path'
import {
  ArrayContains,
  ArrayOverlap,
  Between,
  FindManyOptions,
  FindOperator,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  ObjectLiteral,
} from 'typeorm'
import { decodeNextToken } from '../pagination'
import { Repository } from '../repository'

export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_CACHE_TIME = 5 * 1000 // 5 seconds

type QueryBuilder<Entity extends ObjectLiteral> = (
  q: QueryWithWhere<Entity>,
) => QueryWithWhere<Entity> | TerminalQuery<Entity>

/**
 * Context flags to track query building state for runtime validation
 */
interface QueryContext {
  insideWhereJoin: boolean
  insideWhereOr: boolean
}

export function isQuery<T extends ObjectLiteral>(query: any): query is Query<T> {
  return typeof query === 'object' && typeof query?.toQuery === 'function'
}

export function isTerminalQuery<T extends ObjectLiteral>(query: any): query is TerminalQuery<T> {
  return query instanceof TerminalQuery
}

/**
 * A terminal query that restricts further where clause chaining.
 *
 * This class is returned by `whereIn()` and `whereOr()` methods to enforce
 * query chain ordering at compile time. TypeORM's `In()` operator can cause
 * unexpected behavior when combined with subsequent where clauses, so this
 * pattern ensures such combinations are caught during development.
 *
 * ## Why Terminal Queries Exist
 *
 * When using TypeORM's `In()` operator (via `whereIn()`), adding more where
 * conditions after it can lead to incorrect SQL generation. The Terminal Query
 * Pattern enforces that these operators must be last in your query chain.
 *
 * ## Available Methods
 *
 * After calling `whereIn()` or `whereOr()`, you can still use:
 * - `orderByAscending()` / `orderByDescending()` - Sort results
 * - `select()` - Choose specific columns
 * - `fetchRelation()` - Eagerly load related entities
 * - `loadRelationIds()` - Load only relation IDs
 * - `cache()` - Enable query caching
 *
 * ## Restricted Methods
 *
 * The following methods are NOT available after terminal operations:
 * - All `where*()` methods (e.g., `whereEqualTo()`, `whereMoreThan()`)
 * - `whereJoin()`
 *
 * ## Migration Guide
 *
 * If you have existing code that chains where clauses after `whereIn()`,
 * reorder your query to place `whereIn()` last:
 *
 * ```typescript
 * // Before (will cause TypeScript error)
 * q.whereIn('status', statuses).whereEqualTo('active', true)
 *
 * // After (correct)
 * q.whereEqualTo('active', true).whereIn('status', statuses)
 * ```
 *
 * @see {@link TerminalPaginatedQuery} for the paginated variant
 * @see README.md#terminal-query-pattern for full documentation
 */
export class TerminalQuery<Entity extends ObjectLiteral> {
  protected query: FindManyOptions<Entity> = {
    cache: DEFAULT_CACHE_TIME,
    take: DEFAULT_PAGE_SIZE,
  }

  constructor(public readonly repository: Repository<Entity>) {}

  static from<Entity extends ObjectLiteral>(
    source: QueryWithWhere<Entity> | Query<Entity> | PaginatedQuery<Entity> | TerminalQuery<Entity>,
  ): TerminalQuery<Entity> {
    const newQuery = new TerminalQuery(source.repository)
    newQuery.query = source.toQuery()
    return newQuery
  }

  orderByAscending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query = setProperty(['order', key].join('.'), 'ASC', this.query)
    return this
  }

  orderByDescending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query = setProperty(['order', key].join('.'), 'DESC', this.query)
    return this
  }

  select<Key extends KeysOf<Entity, Primitive>>(key: Key) {
    this.query = setProperty(['select', key].filter(isDefined).join('.'), true, this.query)
    return this
  }

  fetchRelation<
    Key1 extends KeysOfNonPrimitives<Entity>,
    Key2 extends KeysOfNonPrimitives<InferredType<Entity, Key1>>,
    Key3 extends KeysOfNonPrimitives<InferredType<InferredType<Entity, Key1>, Key2>>,
    Key4 extends KeysOfNonPrimitives<
      InferredType<InferredType<InferredType<Entity, Key1>, Key2>, Key3>
    >,
  >(key1: Key1, key2?: Key2, key3?: Key3, key4?: Key4) {
    this.query = setProperty(
      ['relations', key1, key2, key3, key4].filter(isDefined).join('.'),
      true,
      this.query,
    )
    return this
  }

  loadRelationIds(loadRelationIds = true) {
    this.query.loadRelationIds = loadRelationIds
    return this
  }

  cache(cache: boolean | number = DEFAULT_CACHE_TIME) {
    this.query.cache = cache
    return this
  }

  toQuery() {
    return this.query
  }
}

/**
 * A terminal paginated query that restricts further where clause chaining.
 *
 * This class extends {@link TerminalQuery} with pagination capabilities. It is
 * returned by `whereIn()` and `whereOr()` methods when called on a
 * {@link PaginatedQuery}.
 *
 * ## Additional Methods (beyond TerminalQuery)
 *
 * - `pagination()` - Set both limit and cursor token
 * - `next()` - Set the cursor token for pagination
 * - `limit()` - Set the page size
 *
 * ## Example
 *
 * ```typescript
 * const { items, next } = await userRepo.find(q =>
 *   q.whereEqualTo('active', true)
 *    .whereIn('role', ['admin', 'moderator'])
 *    .orderByDescending('createdAt')
 *    .limit(25)
 * )
 * ```
 *
 * @see {@link TerminalQuery} for base terminal query documentation
 * @see README.md#terminal-query-pattern for full documentation
 */
export class TerminalPaginatedQuery<Entity extends ObjectLiteral> extends TerminalQuery<Entity> {
  static from<Entity extends ObjectLiteral>(
    source: QueryWithWhere<Entity> | Query<Entity> | PaginatedQuery<Entity> | TerminalQuery<Entity>,
  ): TerminalPaginatedQuery<Entity> {
    const newQuery = new TerminalPaginatedQuery(source.repository)
    newQuery.query = source.toQuery()
    return newQuery
  }

  pagination(pagination: { next?: string | null; limit?: number | null } | null | undefined) {
    if (!pagination) return this
    return this.next(pagination?.next).limit(pagination?.limit)
  }

  next(next: string | null | undefined) {
    const [skip, take] = decodeNextToken(next) ?? []
    this.query.skip = skip
    this.query.take = take ?? this.query.take ?? DEFAULT_PAGE_SIZE
    return this
  }

  limit(limit: number | null | undefined) {
    if (!limit) return this
    this.query.take = limit
    return this
  }
}

export class QueryWithWhere<Entity extends ObjectLiteral> {
  protected query: FindManyOptions<Entity> = {
    cache: DEFAULT_CACHE_TIME,
    take: DEFAULT_PAGE_SIZE,
  }

  protected context: QueryContext = {
    insideWhereJoin: false,
    insideWhereOr: false,
  }

  constructor(public readonly repository: Repository<Entity>) {}

  static from<
    Entity extends ObjectLiteral,
    QueryType extends QueryWithWhere<Entity> | Query<Entity> | PaginatedQuery<Entity>,
  >(query: QueryType): QueryWithWhere<Entity> {
    const newQuery = new QueryWithWhere(query.repository)
    newQuery.query = query.toQuery()
    return newQuery
  }

  /**
   * Filter by equal value - supports both direct and nested field paths
   *
   * @example Direct field
   * q.whereEqualTo('status', 'active')
   *
   * @example Nested relation field (1 level)
   * q.whereEqualTo('author.id', userId)
   *
   * @example Nested relation field (2 levels)
   * q.whereEqualTo('author.profile.age', 25)
   */
  whereEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereEqualTo<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereEqualTo<Path extends NestedKeysOf2<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereEqualTo(key: string, value: unknown) {
    if (value === undefined) return this.whereIsNull(key as any)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, value)
    }
    return this.setWhere(key as any, value as any)
  }

  /**
   * Filter by not equal value - supports both direct and nested field paths
   */
  whereNotEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereNotEqualTo<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotEqualTo<Path extends NestedKeysOf2<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotEqualTo(key: string, value: unknown) {
    if (value === undefined) return this.whereIsNotNull(key as any)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, Not(value))
    }
    return this.setWhere(key as any, Not(value))
  }

  /**
   * Filter by more than value - supports both direct and nested field paths
   */
  whereMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereMoreThan<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereMoreThan<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereMoreThan(key: string, value: unknown) {
    const operator = MoreThan(value ?? 0)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by not more than value - supports both direct and nested field paths
   */
  whereNotMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereNotMoreThan<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotMoreThan<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotMoreThan(key: string, value: unknown) {
    const operator = Not(MoreThan(value ?? 0))
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by more than or equal value - supports both direct and nested field paths
   */
  whereMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereMoreThanOrEqual<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereMoreThanOrEqual<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereMoreThanOrEqual(key: string, value: unknown) {
    const operator = MoreThanOrEqual(value ?? 0)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by not more than or equal value - supports both direct and nested field paths
   */
  whereNotMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereNotMoreThanOrEqual<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotMoreThanOrEqual<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotMoreThanOrEqual(key: string, value: unknown) {
    const operator = Not(MoreThanOrEqual(value ?? 0))
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by less than value - supports both direct and nested field paths
   */
  whereLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereLessThan<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereLessThan<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereLessThan(key: string, value: unknown) {
    const operator = LessThan(value ?? 0)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by not less than value - supports both direct and nested field paths
   */
  whereNotLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereNotLessThan<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotLessThan<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotLessThan(key: string, value: unknown) {
    const operator = Not(LessThan(value ?? 0))
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by less than or equal value - supports both direct and nested field paths
   */
  whereLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereLessThanOrEqual<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereLessThanOrEqual<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereLessThanOrEqual(key: string, value: unknown) {
    const operator = LessThanOrEqual(value ?? 0)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by not less than or equal value - supports both direct and nested field paths
   */
  whereNotLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereNotLessThanOrEqual<Path extends NestedKeysOf<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotLessThanOrEqual<Path extends NestedKeysOf2<Entity, number | Date>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereNotLessThanOrEqual(key: string, value: unknown) {
    const operator = Not(LessThanOrEqual(value ?? 0))
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by between values - supports both direct and nested field paths
   */
  whereBetween<Key extends KeysOf<Entity, number>>(
    key: Key,
    from: TypeOf<Entity, Key> | undefined,
    to: TypeOf<Entity, Key> | undefined,
  ): this
  whereBetween<Path extends NestedKeysOf<Entity, number>>(
    path: Path,
    from: TypeOfNested<Entity, Path> | undefined,
    to: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereBetween<Path extends NestedKeysOf2<Entity, number>>(
    path: Path,
    from: TypeOfNested<Entity, Path> | undefined,
    to: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereBetween(key: string, from: unknown, to: unknown) {
    const operator = Between((from as number) ?? 0, (to as number) ?? 0)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text containing value - supports both direct and nested field paths
   */
  whereTextContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextContains<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextContains<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextContains(key: string, value: unknown) {
    const operator = Like(`%${(value as string) ?? ''}%`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text starting with value - supports both direct and nested field paths
   */
  whereTextStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextStartsWith<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextStartsWith<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextStartsWith(key: string, value: unknown) {
    const operator = Like(`${(value as string) ?? ''}%`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text ending with value - supports both direct and nested field paths
   */
  whereTextEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextEndsWith<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextEndsWith<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextEndsWith(key: string, value: unknown) {
    const operator = Like(`%${(value as string) ?? ''}`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text containing value (case insensitive) - supports both direct and nested field paths
   */
  whereTextInAnyCaseContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextInAnyCaseContains<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseContains<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseContains(key: string, value: unknown) {
    const operator = ILike(`%${(value as string) ?? ''}%`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text starting with value (case insensitive) - supports both direct and nested field paths
   */
  whereTextInAnyCaseStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextInAnyCaseStartsWith<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseStartsWith<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseStartsWith(key: string, value: unknown) {
    const operator = ILike(`${(value as string) ?? ''}%`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by text ending with value (case insensitive) - supports both direct and nested field paths
   */
  whereTextInAnyCaseEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ): this
  whereTextInAnyCaseEndsWith<Path extends NestedKeysOf<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseEndsWith<Path extends NestedKeysOf2<Entity, string>>(
    path: Path,
    value: TypeOfNested<Entity, Path> | undefined,
  ): this
  whereTextInAnyCaseEndsWith(key: string, value: unknown) {
    const operator = ILike(`%${(value as string) ?? ''}`)
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by value in array - supports both direct and nested field paths
   * Note: This is a terminal operation and returns a TerminalQuery
   */
  whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key>[] | undefined,
  ): TerminalQuery<Entity>
  whereIn<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path>[] | undefined,
  ): TerminalQuery<Entity>
  whereIn<Path extends NestedKeysOf2<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path>[] | undefined,
  ): TerminalQuery<Entity>
  whereIn(key: string, value: unknown[] | undefined): TerminalQuery<Entity> {
    if (this.context.insideWhereJoin) {
      throw new Error(
        'whereIn() cannot be used inside whereJoin(). Use the explicit foreign key field instead. ' +
          'Example: Instead of q.whereJoin("group", gq => gq.whereIn("id", ids)), ' +
          'use q.whereIn("groupId", ids)',
      )
    }
    if (this.context.insideWhereOr) {
      throw new Error(
        'whereIn() cannot be used inside whereOr(). Restructure your query to use multiple ' +
          'whereEqualTo() conditions instead. Example: Instead of whereOr(q => q.whereIn("status", ["a", "b"])), ' +
          'use whereOr(q => q.whereEqualTo("status", "a"), q => q.whereEqualTo("status", "b"))',
      )
    }
    const operator = In(value ?? [])
    if (isNestedPath(key)) {
      this.setNestedWhere(key, operator)
    } else {
      this.setWhere(key as any, operator)
    }
    return TerminalQuery.from(this)
  }

  /**
   * Filter by null value - supports both direct and nested field paths
   */
  whereIsNull<Key extends KeysOf<Entity>>(key: Key): this
  whereIsNull<Path extends NestedKeysOf<Entity>>(path: Path): this
  whereIsNull<Path extends NestedKeysOf2<Entity>>(path: Path): this
  whereIsNull(key: string) {
    const operator = IsNull()
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  /**
   * Filter by not null value - supports both direct and nested field paths
   */
  whereIsNotNull<Key extends KeysOf<Entity>>(key: Key): this
  whereIsNotNull<Path extends NestedKeysOf<Entity>>(path: Path): this
  whereIsNotNull<Path extends NestedKeysOf2<Entity>>(path: Path): this
  whereIsNotNull(key: string) {
    const operator = Not(IsNull())
    if (isNestedPath(key)) {
      return this.setNestedWhere(key, operator)
    }
    return this.setWhere(key as any, operator)
  }

  whereArrayContains<Key extends KeysOf<Entity, ArrayPrimitive>>(
    key: Key,
    value: InferredType<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, ArrayContains(value ? [value] : []))
  }

  whereArrayContainsAny<Key extends KeysOf<Entity, ArrayPrimitive>>(
    key: Key,
    value: InferredType<Entity, Key>[] | undefined,
  ) {
    return this.setWhere(key, ArrayOverlap(value ?? []))
  }

  whereJoin<
    Key extends KeysOfNonPrimitives<Entity>,
    Type extends InferredType<Entity, Key> & ObjectLiteral,
  >(key: Key, queryBuilder: QueryBuilder<Type>) {
    const query = new Query<any>(this.repository)
    query.context.insideWhereJoin = true
    const result = (queryBuilder(query) as Query<Type>).toQuery() as FindManyOptions<Entity>
    this.query = setProperty(['relations', key].join('.'), result.relations ?? true, this.query)
    return this.setWhere(key, result.where)
  }

  protected setWhere<Key extends KeysOf<Entity>>(
    key: Key,
    where:
      | FindOperator<any>
      | FindOptionsWhere<Entity>
      | FindOptionsWhere<Entity>[]
      | TypeOf<Entity, Key>
      | undefined,
  ) {
    if (!where || !key) return this
    if (this.query.where instanceof Array) {
      this.query.where = this.query.where.map(query => setProperty(key, where, query))
      return this
    }

    this.query = setProperty(['where', key].join('.'), where, this.query)
    return this
  }

  /**
   * Helper method to handle nested path where conditions
   * Automatically adds the relation and builds the nested where structure
   */
  protected setNestedWhere(path: string, value: unknown) {
    // Build the nested where condition
    const nestedWhere = buildNestedWhere(path, value)

    // Add the relation automatically
    const relationPath = getRelationPath(path)
    if (relationPath) {
      const relationsObj = buildRelationsObject(relationPath)
      this.query.relations = deepMerge(
        (this.query.relations as Record<string, any>) ?? {},
        relationsObj,
      )
    }

    // Merge with existing where conditions
    if (this.query.where instanceof Array) {
      this.query.where = this.query.where.map(w =>
        deepMerge(w as Record<string, any>, nestedWhere),
      ) as FindOptionsWhere<Entity>[]
    } else {
      this.query.where = deepMerge(
        (this.query.where as Record<string, any>) ?? {},
        nestedWhere,
      ) as FindOptionsWhere<Entity>
    }

    return this
  }

  whereOr(
    queryBuilder1: QueryBuilder<Entity>,
    queryBuilder2: QueryBuilder<Entity>,
    ...otherQueryBuilder: QueryBuilder<Entity>[]
  ): TerminalQuery<Entity> {
    const queryBuilders = [queryBuilder1, queryBuilder2, ...otherQueryBuilder].filter(isDefined)
    const results = queryBuilders.map(queryBuilder => {
      const query = new Query<Entity>(this.repository)
      query.query.where = this.query.where
      query.context.insideWhereOr = true
      return queryBuilder(query).toQuery().where
    })
    this.query = setProperty('where', results.filter(isDefined), this.query)
    return TerminalQuery.from(this)
  }

  toQuery() {
    return this.query
  }
}

export class Query<Entity extends ObjectLiteral> extends QueryWithWhere<Entity> {
  static from<
    Entity extends ObjectLiteral,
    QueryType extends QueryWithWhere<Entity> | Query<Entity> | PaginatedQuery<Entity>,
  >(query: QueryType): Query<Entity> {
    const newQuery: any = new Query(query.repository)
    newQuery.query = query.toQuery()
    return newQuery as Query<Entity>
  }

  orderByAscending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query = setProperty(['order', key].join('.'), 'ASC', this.query)
    return this
  }

  orderByDescending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query = setProperty(['order', key].join('.'), 'DESC', this.query)
    return this
  }

  select<Key extends KeysOf<Entity, Primitive>>(key: Key) {
    this.query = setProperty(['select', key].filter(isDefined).join('.'), true, this.query)
    return this
  }

  fetchRelation<
    Key1 extends KeysOfNonPrimitives<Entity>,
    Key2 extends KeysOfNonPrimitives<InferredType<Entity, Key1>>,
    Key3 extends KeysOfNonPrimitives<InferredType<InferredType<Entity, Key1>, Key2>>,
    Key4 extends KeysOfNonPrimitives<
      InferredType<InferredType<InferredType<Entity, Key1>, Key2>, Key3>
    >,
  >(key1: Key1, key2?: Key2, key3?: Key3, key4?: Key4) {
    this.query = setProperty(
      ['relations', key1, key2, key3, key4].filter(isDefined).join('.'),
      true,
      this.query,
    )
    return this
  }

  loadRelationIds(loadRelationIds = true) {
    this.query.loadRelationIds = loadRelationIds
    return this
  }

  cache(cache: boolean | number = DEFAULT_CACHE_TIME) {
    this.query.cache = cache
    return this
  }
}

export class PaginatedQuery<Entity extends ObjectLiteral> extends Query<Entity> {
  static from<
    QueryType extends
      | QueryWithWhere<any>
      | Query<any>
      | PaginatedQuery<any>
      | TerminalQuery<any>
      | TerminalPaginatedQuery<any>,
  >(query: QueryType): PaginatedQuery<any> {
    const newQuery: any = new PaginatedQuery(query.repository)
    newQuery.query = query.toQuery()
    return newQuery as PaginatedQuery<any>
  }

  pagination(pagination: { next?: string | null; limit?: number | null } | null | undefined) {
    if (!pagination) return this
    return this.next(pagination?.next).limit(pagination?.limit)
  }

  next(next: string | null | undefined) {
    const [skip, take] = decodeNextToken(next) ?? []
    this.query.skip = skip
    this.query.take = take ?? this.query.take ?? DEFAULT_PAGE_SIZE
    return this
  }

  limit(limit: number | null | undefined) {
    if (!limit) return this
    this.query.take = limit
    return this
  }

  override whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key>[] | undefined,
  ): TerminalPaginatedQuery<Entity>
  override whereIn<Path extends NestedKeysOf<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path>[] | undefined,
  ): TerminalPaginatedQuery<Entity>
  override whereIn<Path extends NestedKeysOf2<Entity, NonArrayPrimitive>>(
    path: Path,
    value: TypeOfNested<Entity, Path>[] | undefined,
  ): TerminalPaginatedQuery<Entity>
  override whereIn(key: string, value: unknown[] | undefined): TerminalPaginatedQuery<Entity> {
    if (this.context.insideWhereJoin) {
      throw new Error(
        'whereIn() cannot be used inside whereJoin(). Use the explicit foreign key field instead. ' +
          'Example: Instead of q.whereJoin("group", gq => gq.whereIn("id", ids)), ' +
          'use q.whereIn("groupId", ids)',
      )
    }
    if (this.context.insideWhereOr) {
      throw new Error(
        'whereIn() cannot be used inside whereOr(). Restructure your query to use multiple ' +
          'whereEqualTo() conditions instead. Example: Instead of whereOr(q => q.whereIn("status", ["a", "b"])), ' +
          'use whereOr(q => q.whereEqualTo("status", "a"), q => q.whereEqualTo("status", "b"))',
      )
    }
    const operator = In(value ?? [])
    if (isNestedPath(key)) {
      this.setNestedWhere(key, operator)
    } else {
      this.setWhere(key as any, operator)
    }
    return TerminalPaginatedQuery.from(this)
  }

  override whereOr(
    queryBuilder1: QueryBuilder<Entity>,
    queryBuilder2: QueryBuilder<Entity>,
    ...otherQueryBuilder: QueryBuilder<Entity>[]
  ): TerminalPaginatedQuery<Entity> {
    const queryBuilders = [queryBuilder1, queryBuilder2, ...otherQueryBuilder].filter(isDefined)
    const results = queryBuilders.map(queryBuilder => {
      const subQuery = new PaginatedQuery<Entity>(this.repository)
      subQuery.query.where = this.query.where
      subQuery.context.insideWhereOr = true
      return queryBuilder(subQuery).toQuery().where
    })
    this.query = setProperty('where', results.filter(isDefined), this.query)
    return TerminalPaginatedQuery.from(this)
  }
}
