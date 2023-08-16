import { chunk, omit } from 'lodash'
import { ClassType, KeysOf, toNonNullArray } from 'tsds-tools'
import { DeepPartial, ObjectLiteral, getMetadataArgsStorage } from 'typeorm'
import { RelationMetadataArgs } from 'typeorm/metadata-args/RelationMetadataArgs'
import { BaseEntity } from '../base-entity'
import {
  FilterFunction,
  FirestorePaginatedQuery,
  FirestoreQuery,
  FirestoreQueryWithWhere,
  OrderBy,
} from '../firestore-query'
import { generateId } from '../id'
import {
  OnPageLoad,
  PaginatedResult,
  PaginationFilter,
  fromBase64,
  paginate,
  toBase64,
} from '../pagination'
import {
  DeleteOptions,
  EntityWithOptionalId,
  PartialEntityWithId,
  RepositoryOptions,
} from '../repository'
import { FieldValue, resolveFirestore } from './firestore-initializer'

const MAX_PER_QUERY = 10

export interface FirestoreRepositoryOptions extends RepositoryOptions {
  softDelete?: never
}
export type UpdatableEntity<T> = Partial<T> & { id: string }
export type IdsOrQuery<Entity extends ObjectLiteral> =
  | string
  | string[]
  | FirestorePaginatedQuery<Entity>
  | ((query: FirestorePaginatedQuery<Entity>) => FirestorePaginatedQuery<Entity>)

function toEntity<Entity extends ObjectLiteral>(
  doc?: FirebaseFirestore.DocumentSnapshot | null,
): Entity | null {
  if (!doc || doc.exists === false) {
    return null
  }
  return { ...(doc.data() as Entity), id: doc.id }
}

function replaceUndefinedWithNull<T>(doc: T) {
  return Object.keys(doc as Record<keyof T, any>).reduce((a, key) => {
    const value = doc[key as keyof T]
    return {
      ...a,
      [key]:
        typeof value === 'boolean'
          ? value === true
          : typeof value === 'number'
          ? value
          : value || null,
    }
  }, {} as T)
}

function encodeNextToken<Entity extends ObjectLiteral>(
  orderBy: OrderBy,
  lastDocument: Entity | null | undefined,
) {
  if (!lastDocument || !orderBy) {
    return null
  }
  const lastDocValues: any[] = []
  orderBy.forEach((_, field) => {
    lastDocValues.push(lastDocument[field as any])
  }, [])
  return toBase64(lastDocValues)
}

function decodeNextToken(next: string | null | undefined): string[] | null {
  if (next) {
    try {
      return fromBase64<string[]>(next) as string[]
    } catch (e) {
      throw new Error('Invalid next token')
    }
  }
  return null
}

function createFilterFunction<Entity extends ObjectLiteral>(
  filterFunction: FilterFunction<Entity> | undefined,
) {
  if (filterFunction) {
    return (items: (Entity | null)[]): Entity[] => toNonNullArray(items.filter(filterFunction))
  }
  return (items: (Entity | null)[]): Entity[] => toNonNullArray(items)
}

export class FirestoreRepository<Entity extends ObjectLiteral> {
  protected readonly collectionName!: string
  protected readonly defaultProps!: Entity
  protected readonly relations!: RelationMetadataArgs[]
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: FirestoreRepositoryOptions,
  ) {
    const meta = getMetadataArgsStorage()
    const table = meta.tables.find(table => table.target === entity)
    this.collectionName = table?.name ?? entity.name
    const columns = meta.columns.filter(
      column => column.target === entity || column.target === BaseEntity,
    )
    this.defaultProps = columns.reduce((properties, column) => {
      return {
        ...properties,
        [column.propertyName]: column.options.array ? [] : null,
      }
    }, {} as Entity)
    this.relations = meta.relations.filter(
      relation =>
        relation.target === entity &&
        (relation.relationType === 'many-to-one' || relation.relationType === 'one-to-one'),
    )
  }

  protected get repository(): any {
    throw new Error('"this.repository" has no implementation FirestoreRepository')
  }

  protected toDBRecord(entity: DeepPartial<Entity>) {
    const propertiesToOmit: string[] = []
    const relationIds = this.relations.reduce((relationIds, relation) => {
      const key = relation.propertyName + 'Id'
      propertiesToOmit.push(relation.propertyName)
      return { ...relationIds, [key]: entity[relation.propertyName]?.id ?? entity[key] }
    }, {})
    return replaceUndefinedWithNull({
      ...this.defaultProps,
      ...omit(entity, propertiesToOmit),
      ...relationIds,
      version: (entity.version ?? 0) + 1,
      createdAt: entity.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }

  protected async idOrQueryToEntities(query: IdsOrQuery<Entity>) {
    return toNonNullArray(
      typeof query === 'string'
        ? [await this.findById(query)]
        : query instanceof Array
        ? await this.findByIds(query)
        : await this.findAll(query),
    )
  }

  public get collection() {
    const firestore = resolveFirestore()
    return firestore.collection(
      this.collectionName,
    ) as FirebaseFirestore.CollectionReference<Entity>
  }

  async count(query?: FirestoreQueryWithWhere<Entity>): Promise<number> {
    const response = query
      ? await query.toQuery().queryRef.select().get()
      : await this.collection.select().get()
    return response.size
  }

  async findById(id: string | null | undefined): Promise<Entity | null> {
    if (!id) return null
    return toEntity<Entity>(await this.collection.doc(id).get())
  }

  async findByIds(ids: string[]): Promise<Array<Entity | null>> {
    let itemsById = {}
    for (const idChunk of chunk(ids, MAX_PER_QUERY)) {
      const records = await this.collection.where('id', 'in', idChunk).get()
      const items = toNonNullArray(records.docs.map(doc => toEntity(doc)))
      itemsById = items.reduce((a, i) => ({ ...a, [i.id]: i }), itemsById)
    }
    return ids.map(id => itemsById[id as keyof typeof itemsById] || null)
  }

  async findOne(
    queryOrCallback?:
      | FirestoreQuery<Entity>
      | ((query: FirestoreQuery<Entity>) => FirestoreQuery<Entity>),
  ): Promise<Entity | null> {
    const query =
      typeof queryOrCallback === 'function'
        ? queryOrCallback(new FirestoreQuery(this))
        : queryOrCallback
    const record = await query?.toQuery().queryRef.get()
    if (!record) return null
    return toEntity(record.docs[0])
  }

  async findAll(
    queryOrCallback?:
      | FirestorePaginatedQuery<Entity>
      | ((query: FirestorePaginatedQuery<Entity>) => FirestorePaginatedQuery<Entity>),
    filter?: PaginationFilter<Entity>,
    onPage?: OnPageLoad<Entity>,
  ): Promise<Entity[]> {
    const query =
      (typeof queryOrCallback === 'function'
        ? queryOrCallback(new FirestorePaginatedQuery(this))
        : queryOrCallback) ?? new FirestorePaginatedQuery(this)
    return paginate(next => this.find(query.next(next)), filter, onPage)
  }

  async find(
    queryOrCallback:
      | FirestorePaginatedQuery<Entity>
      | ((query: FirestorePaginatedQuery<Entity>) => FirestorePaginatedQuery<Entity>),
  ): Promise<PaginatedResult<Entity>> {
    const query =
      typeof queryOrCallback === 'function'
        ? queryOrCallback(new FirestorePaginatedQuery(this))
        : queryOrCallback
    let response
    let items: Entity[] = []
    let { next } = query.toQuery()
    if (!query.toQuery().orderByMap) {
      const key = Array.from(query.toQuery().filteredProps)[0] ?? 'id'
      query.orderByAscending(key as any)
    }
    const { queryRef, limit, orderByMap, filterFunction } = query.toQuery()
    const filter = createFilterFunction(filterFunction)
    const nextTokens: Array<string | undefined | null> = []
    do {
      nextTokens.push(next)
      const token = decodeNextToken(next)
      const nextQuery = token ? queryRef.startAfter(...token) : queryRef
      response = await nextQuery.get()
      const docs = response.docs.map(doc => toEntity<Entity>(doc))
      const remainingItems = (limit ?? 20) - items.length
      items = items.concat(filter(docs).slice(0, remainingItems))
      const lastItem =
        response?.size === limit
          ? docs.slice(-1)[0]
          : items.length === limit && response.size > remainingItems
          ? items.slice(-1)[0]
          : undefined
      next = encodeNextToken<Entity>(orderByMap as Map<string, any>, lastItem)
    } while (
      items.length < (limit ?? 20) &&
      response?.size > 0 &&
      next &&
      !nextTokens.includes(next)
    )
    return { items, next }
  }

  async insert(entity: EntityWithOptionalId<Entity>): Promise<Entity> {
    const id = (entity as Entity).id || generateId()
    const record = this.toDBRecord({ id, ...entity } as any as Entity)
    await this.collection.doc(id).create(record)
    return record
  }

  async insertMany(entities: Array<EntityWithOptionalId<Entity>>): Promise<Entity[]> {
    let records: Entity[] = []
    for (const part of chunk(entities, 10)) {
      records = records.concat(await Promise.all(part.map(entity => this.insert(entity))))
    }
    return records
  }

  async save(entity: DeepPartial<Entity>): Promise<Entity> {
    const id = (entity as Entity).id || generateId()
    const record = this.toDBRecord({ ...entity, id }) as Entity
    await this.collection.doc(id).set(record, { merge: true })
    return this.findById(id) as Promise<Entity>
  }

  async saveMany(
    entities: Array<DeepPartial<Entity>>,
    options?: { chunk?: number },
  ): Promise<Entity[]> {
    let records: Entity[] = []
    for (const part of chunk(entities, options?.chunk ?? 10)) {
      records = records.concat(await Promise.all(part.map(entity => this.save(entity))))
    }
    return records
  }

  async update(entity: PartialEntityWithId<Entity>): Promise<Entity> {
    const existingRecord = await this.findById(entity.id)
    if (!existingRecord) {
      throw new Error(`No record with id "${entity.id}" available for update!`)
    }
    const record = this.toDBRecord({ ...existingRecord, ...entity }) as Entity
    await this.collection.doc(entity.id).update(record as any)
    return { ...existingRecord, ...record }
  }

  async updateMany(query: IdsOrQuery<Entity>, entity: DeepPartial<Entity>): Promise<Entity[]> {
    let records: Entity[] = []
    const entities = await this.idOrQueryToEntities(query)
    for (const part of chunk(entities, 10)) {
      records = records.concat(
        await Promise.all(part.map(item => this.update({ ...item, ...entity } as any))),
      )
    }
    return records
  }

  async delete(query: IdsOrQuery<Entity>, options?: DeleteOptions): Promise<Entity[]> {
    const entities = await this.idOrQueryToEntities(query)
    if (options?.softDelete ?? this.options?.softDelete) {
      throw new Error('Soft delete is not implemented yet!')
    }
    for (const part of chunk(entities, 10)) {
      await Promise.all(part.map(item => this.collection.doc(item.id).delete()))
    }
    return entities
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async restore(query: IdsOrQuery<Entity>): Promise<Entity[]> {
    throw new Error('Soft delete and restore options are not implemented yet!')
  }

  async addToArray<K extends KeysOf<Entity, Array<any>>>(key: K, entity: UpdatableEntity<Entity>) {
    const value = entity[key] as any
    const data = {
      ...this.toDBRecord(entity as any as Entity),
      ...(value ? { [key]: FieldValue.arrayUnion(...value) } : {}),
    } as any
    return this.save(data)
  }

  async removeFromArray<K extends KeysOf<Entity, Array<any>>>(
    key: K,
    entity: UpdatableEntity<Entity>,
  ) {
    const value = entity[key] as any
    const data = {
      ...this.toDBRecord(entity as any as Entity),
      ...(value ? { [key]: FieldValue.arrayRemove(...value) } : {}),
    } as any
    return this.save(data)
  }

  async increment<Key extends KeysOf<Entity, number>>(
    query: IdsOrQuery<Entity>,
    key: Key,
    incrementBy = 1,
  ): Promise<Entity[]> {
    const entities = await this.idOrQueryToEntities(query)
    for (const part of chunk(entities, 10)) {
      await Promise.all(
        part.map(item =>
          this.save({ id: item.id, [key]: FieldValue.increment(incrementBy) } as any),
        ),
      )
    }
    return this.idOrQueryToEntities(query)
  }
}
