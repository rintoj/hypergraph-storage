import * as admin from 'firebase-admin'
import {
  ArrayPrimitive,
  InferredType,
  isDefined,
  KeysOf,
  KeysOfNonPrimitives,
  NonArrayPrimitive,
  Primitive,
  TypeOf,
} from 'tsds-tools'
import { FirestoreRepository } from '../firestore-repository'
import { ObjectLiteral } from 'typeorm'

export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_CACHE_TIME = 5 * 1000 // 5 seconds

export type FilterFunction<Entity extends ObjectLiteral> = (item: Entity | null) => boolean
export type OrderBy = Map<string, FirebaseFirestore.OrderByDirection>

type QueryBuilder<Entity extends ObjectLiteral> = (
  q: FirestoreQueryWithWhere<Entity>,
) => FirestoreQueryWithWhere<Entity>

export function isQuery<T extends ObjectLiteral>(query: any): query is FirestoreQuery<T> {
  return typeof query === 'object' && typeof query?.toQuery === 'function'
}

type FirebaseQuery<Entity extends ObjectLiteral> = {
  queryRef: FirebaseFirestore.Query<Entity> | FirebaseFirestore.CollectionReference<Entity>
  cache?: number | boolean
  next?: string | null
  limit?: number | null
  filterFunction?: FilterFunction<Entity>
  orderByMap?: OrderBy
  filteredProps: Set<string>
}

export class FirestoreQueryWithWhere<Entity extends ObjectLiteral> {
  protected query: FirebaseQuery<Entity>

  constructor(public readonly repository: FirestoreRepository<Entity>) {
    this.query = {
      queryRef: repository.collection,
      filteredProps: new Set(),
      cache: DEFAULT_CACHE_TIME,
    }
  }

  static from<
    Entity extends ObjectLiteral,
    QueryType extends
      | FirestoreQueryWithWhere<Entity>
      | FirestoreQuery<Entity>
      | FirestorePaginatedQuery<Entity>,
  >(query: QueryType): FirestoreQueryWithWhere<Entity> {
    const newQuery = new FirestoreQueryWithWhere(query.repository)
    newQuery.query = query.toQuery()
    return newQuery
  }

  whereEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '==', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereNotEqualTo<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '!=', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereMoreThan<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '>', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereNotMoreThan<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '<=', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereMoreThanOrEqual<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '>=', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereNotMoreThanOrEqual<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '<', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereLessThan<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '<', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereNotLessThan<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '>=', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereLessThanOrEqual<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '<=', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereNotLessThanOrEqual<Key extends KeysOf<Entity, number>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '>', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereBetween<Key extends KeysOf<Entity, number>>(
    key: Key,
    from: TypeOf<Entity, Key> | undefined,
    to: TypeOf<Entity, Key> | undefined,
  ) {
    if (from === undefined || to === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, '>=', from).where(key, '<=', to)
    this.query.filteredProps.add(key)
    return this
  }

  whereTextContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    throw new Error(
      `Unable to set "whereTextContains('${key}', ${value})" because text search is not supported by firestore.`,
    )
  }

  whereTextStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    if (value == undefined) return this
    this.query.queryRef = this.query.queryRef
      .where(key, '>=', value)
      .where(key, '<=', value + '\uf8ff')
    this.query.filteredProps.add(key)
    return this
  }

  whereTextEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    throw new Error(
      `Unable to set "whereTextEndsWith('${key}', ${value})" because text search is not supported by firestore.`,
    )
  }

  whereTextInAnyCaseContains<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    throw new Error(
      `Unable to set "whereTextInAnyCaseContains('${key}', ${value})" because text search is not supported by firestore.`,
    )
  }

  whereTextInAnyCaseStartsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    throw new Error(
      `Unable to set "whereTextInAnyCaseStartsWith('${key}', ${value})" because text search is not supported by firestore.`,
    )
  }

  whereTextInAnyCaseEndsWith<Key extends KeysOf<Entity, string>>(
    key: Key,
    value: TypeOf<Entity, Key> | undefined,
  ) {
    throw new Error(
      `Unable to set "whereTextInAnyCaseEndsWith('${key}', ${value})" because text search is not supported by firestore.`,
    )
  }

  whereIn<Key extends KeysOf<Entity, NonArrayPrimitive>>(
    key: Key,
    value: TypeOf<Entity, Key>[] | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, 'in', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereIsNull<Key extends KeysOf<Entity>>(key: Key) {
    this.query.queryRef = this.query.queryRef.where(key, '==', null)
    this.query.filteredProps.add(key)
    return this
  }

  whereIsNotNull<Key extends KeysOf<Entity>>(key: Key) {
    this.query.queryRef = this.query.queryRef.where(key, '!=', null)
    this.query.filteredProps.add(key)
    return this
  }

  whereArrayContains<Key extends KeysOf<Entity, ArrayPrimitive>>(
    key: Key,
    value: InferredType<Entity, Key> | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, 'array-contains', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereArrayContainsAny<Key extends KeysOf<Entity, ArrayPrimitive>>(
    key: Key,
    value: InferredType<Entity, Key>[] | undefined,
  ) {
    if (value === undefined) return this
    this.query.queryRef = this.query.queryRef.where(key, 'array-contains-any', value)
    this.query.filteredProps.add(key)
    return this
  }

  whereJoin<
    Key extends KeysOfNonPrimitives<Entity>,
    Type extends InferredType<Entity, Key> & ObjectLiteral,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  >(key: Key, queryBuilder: QueryBuilder<Type>) {
    throw new Error(`Unable to set "whereJoin('${key}')" because it is not implemented just yet!`)
  }

  whereOr(
    queryBuilder1: QueryBuilder<Entity>,
    queryBuilder2: QueryBuilder<Entity>,
    ...otherQueryBuilder: QueryBuilder<Entity>[]
  ) {
    const queryBuilders = [queryBuilder1, queryBuilder2, ...otherQueryBuilder].filter(isDefined)
    const filters = queryBuilders.map(queryBuilder => {
      const query = new FirestoreQueryWithWhere<Entity>({
        collection: admin.firestore.Filter,
      } as any)
      return queryBuilder(query).toQuery().queryRef
    })
    this.query.queryRef = this.query.queryRef.where(admin.firestore.Filter.or(...filters))
    return this as any
  }

  toQuery() {
    return this.query
  }
}

export class FirestoreQuery<Entity extends ObjectLiteral> extends FirestoreQueryWithWhere<Entity> {
  static from<
    Entity extends ObjectLiteral,
    QueryType extends
      | FirestoreQueryWithWhere<Entity>
      | FirestoreQuery<Entity>
      | FirestorePaginatedQuery<Entity>,
  >(query: QueryType): FirestoreQuery<Entity> {
    const newQuery: any = new FirestoreQuery(query.repository)
    newQuery.query = query.toQuery()
    return newQuery as FirestoreQuery<Entity>
  }

  orderByAscending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query.queryRef = this.query.queryRef.orderBy(key, 'asc')
    if (!this.query.orderByMap) {
      this.query.orderByMap = new Map()
    }
    this.query.orderByMap.set(key, 'asc')
    return this
  }

  orderByDescending<Key extends KeysOf<Entity, NonArrayPrimitive>>(key: Key) {
    this.query.queryRef = this.query.queryRef.orderBy(key, 'desc')
    if (!this.query.orderByMap) {
      this.query.orderByMap = new Map()
    }
    this.query.orderByMap.set(key, 'desc')
    return this
  }

  toOrderByMap() {
    return this.query.orderByMap as OrderBy
  }

  select<Key extends KeysOf<Entity, Primitive>>(key: Key) {
    this.query.queryRef = this.query.queryRef.select(key) as FirebaseFirestore.Query<Entity>
    return this
  }

  fetchRelation<
    Key1 extends KeysOfNonPrimitives<Entity>,
    Key2 extends KeysOfNonPrimitives<InferredType<Entity, Key1>>,
    Key3 extends KeysOfNonPrimitives<InferredType<InferredType<Entity, Key1>, Key2>>,
    Key4 extends KeysOfNonPrimitives<
      InferredType<InferredType<InferredType<Entity, Key1>, Key2>, Key3>
    >,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  >(key1: Key1, key2?: Key2, key3?: Key3, key4?: Key4) {
    // this.query = setProperty(
    //   ['relations', key1, key2, key3, key4].filter(isDefined).join('.'),
    //   true,
    //   this.query,
    // )
    throw new Error('fetchRelation: Not implemented yet!')
  }

  cache(cache: boolean | number = DEFAULT_CACHE_TIME) {
    this.query.cache = cache
    return this
  }
}

export class FirestorePaginatedQuery<Entity extends ObjectLiteral> extends FirestoreQuery<Entity> {
  static from<
    QueryType extends
      | FirestoreQueryWithWhere<any>
      | FirestoreQuery<any>
      | FirestorePaginatedQuery<any>,
  >(query: QueryType): FirestorePaginatedQuery<any> {
    const newQuery: any = new FirestorePaginatedQuery(query.repository)
    newQuery.query = query.toQuery()
    return newQuery as FirestorePaginatedQuery<any>
  }

  pagination(pagination: { next?: string | null; limit?: number | null } | null | undefined) {
    if (!pagination) return this
    return this.next(pagination?.next).limit(pagination?.limit)
  }

  next(next: string | null | undefined) {
    this.query.next = next
    return this
  }

  limit(limit: number | null | undefined) {
    this.query.limit = limit
    return this
  }

  filter(predicate: FilterFunction<Entity>) {
    if (this.query.filterFunction) {
      throw new Error('Query.filter() can only be called once!')
    }
    this.query.filterFunction = predicate
    return this
  }
}
