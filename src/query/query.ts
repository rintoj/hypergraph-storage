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
) => QueryWithWhere<Entity>

export function isQuery<T extends ObjectLiteral>(query: any): query is Query<T> {
  return typeof query === 'object' && typeof query?.toQuery === 'function'
}

export class QueryWithWhere<Entity extends ObjectLiteral> {
  protected query: FindManyOptions<Entity> = {
    cache: DEFAULT_CACHE_TIME,
    take: DEFAULT_PAGE_SIZE,
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
    if (value === undefined) return this
    return this.setWhere(key, value)
  }

  whereNotEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Not(value))
  }

  whereMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, MoreThan(value))
  }

  whereNotMoreThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Not(MoreThan(value)))
  }

  whereMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, MoreThanOrEqual(value))
  }

  whereNotMoreThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Not(MoreThanOrEqual(value)))
  }

  whereLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, LessThan(value))
  }

  whereNotLessThan<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Not(LessThan(value)))
  }

  whereLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, LessThanOrEqual(value))
  }

  whereNotLessThanOrEqual<Key extends KeysOf<Entity, number | Date>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Not(LessThanOrEqual(value)))
  }

  whereBetween<Key extends KeysOf<Entity, number>>(
    key: Key,
    from: TypeOf<Entity, Key> | undefined,
    to: TypeOf<Entity, Key> | undefined,
  ) {
    if (from === undefined || to === undefined) return this
    return this.setWhere(key, Between(from, to))
  }

  whereTextContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Like(`%${value}%`))
  }

  whereTextStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Like(`${value}%`))
  }

  whereTextEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, Like(`%${value}`))
  }

  whereTextInAnyCaseContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, ILike(`%${value}%`))
  }

  whereTextInAnyCaseStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, ILike(`${value}%`))
  }

  whereTextInAnyCaseEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, ILike(`%${value}`))
  }

  whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key>[] | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, In(value))
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
    if (value === undefined) return this
    return this.setWhere(key, ArrayContains([value]))
  }

  whereArrayContainsAny<Key extends KeysOf<Entity, ArrayPrimitive>>(
    key: Key,
    value: InferredType<Entity, Key>[] | undefined,
  ) {
    if (value === undefined) return this
    return this.setWhere(key, ArrayOverlap(value as any))
  }

  whereJoin<
    Key extends KeysOfNonPrimitives<Entity>,
    Type extends InferredType<Entity, Key> & ObjectLiteral,
  >(key: Key, queryBuilder: QueryBuilder<Type>) {
    const query = new Query<any>(this.repository)
    const result = (queryBuilder(query) as Query<Type>).toQuery() as FindManyOptions<Entity>
    this.query = setProperty(['relations', key].join('.'), result.relations ?? true, this.query)
    return this.setWhere(key, result.where)
  }

  private setWhere<Key extends KeysOf<Entity>>(
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
  ) {
    const queryBuilders = [queryBuilder1, queryBuilder2, ...otherQueryBuilder].filter(isDefined)
    const results = queryBuilders.map(queryBuilder => {
      const query = new Query<Entity>(this.repository)
      query.query.where = this.query.where
      return queryBuilder(query).toQuery().where
    })
    this.query = setProperty('where', results.filter(isDefined), this.query)
    return this as any
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
  static from<QueryType extends QueryWithWhere<any> | Query<any> | PaginatedQuery<any>>(
    query: QueryType,
  ): PaginatedQuery<any> {
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
}
