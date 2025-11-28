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
 * Terminal query class - returned by whereIn() and whereOr().
 * Only exposes safe methods that can be chained after terminal operators.
 * This prevents unsafe patterns like chaining whereEqualTo() after whereIn().
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
 * Terminal paginated query - returned by whereIn() and whereOr() on PaginatedQuery.
 * Extends TerminalQuery with pagination methods.
 */
export class TerminalPaginatedQuery<Entity extends ObjectLiteral> extends TerminalQuery<Entity> {
  static from<Entity extends ObjectLiteral>(
    source:
      | QueryWithWhere<Entity>
      | Query<Entity>
      | PaginatedQuery<Entity>
      | TerminalQuery<Entity>,
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

  whereEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this.whereIsNull(key)
    return this.setWhere(key, value)
  }

  whereNotEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this.whereIsNotNull(key)
    return this.setWhere(key, Not(value))
  }

  whereMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, MoreThan(value ?? 0))
  }

  whereNotMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Not(MoreThan(value ?? 0)))
  }

  whereMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, MoreThanOrEqual(value ?? 0))
  }

  whereNotMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Not(MoreThanOrEqual(value ?? 0)))
  }

  whereLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, LessThan(value ?? 0))
  }

  whereNotLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Not(LessThan(value ?? 0)))
  }

  whereLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, LessThanOrEqual(value ?? 0))
  }

  whereNotLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Not(LessThanOrEqual(value ?? 0)))
  }

  whereBetween<Key extends KeysOf<Entity, number>>(
    key: Key,
    from: TypeOf<Entity, Key> | undefined,
    to: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Between(from ?? 0, to ?? 0))
  }

  whereTextContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Like(`%${value ?? ''}%`))
  }

  whereTextStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Like(`${value ?? ''}%`))
  }

  whereTextEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, Like(`%${value ?? ''}`))
  }

  whereTextInAnyCaseContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, ILike(`%${value ?? ''}%`))
  }

  whereTextInAnyCaseStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, ILike(`${value ?? ''}%`))
  }

  whereTextInAnyCaseEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    return this.setWhere(key, ILike(`%${value ?? ''}`))
  }

  whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key>[] | undefined,
  ): TerminalQuery<Entity> {
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
    this.setWhere(key, In(value ?? []))
    return TerminalQuery.from(this)
  }

  whereIsNull<Key extends KeysOf<Entity>>(key: Key) {
    return this.setWhere(key, IsNull())
  }

  whereIsNotNull<Key extends KeysOf<Entity>>(key: Key) {
    return this.setWhere(key, Not(IsNull()))
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
  ): TerminalPaginatedQuery<Entity> {
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
    this.setWhere(key, In(value ?? []))
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
