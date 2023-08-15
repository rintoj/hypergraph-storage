import { chunk } from 'lodash'
import { ClassType } from 'tsds-tools'
import { DeepPartial, ObjectLiteral } from 'typeorm'
import { getEntityMeta } from '../decorators/entity-decorator'
import { generateId } from '../id'
import { PaginatedQuery, Query, QueryWithWhere } from '../query'
import { RepositoryOptions } from '../repository'
import { resolveFirestore } from './firestore-initializer'
import { paginate } from '../pagination'

export interface FirestoreRepositoryOptions extends RepositoryOptions {
  softDelete?: boolean
}

function toEntity<Entity extends ObjectLiteral>(
  doc?: FirebaseFirestore.DocumentSnapshot<any> | null,
): Entity | null
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

export class FirestoreRepository<Entity extends ObjectLiteral> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: FirestoreRepositoryOptions,
  ) {}

  protected get repository(): any {
    throw new Error('"this.repository" has no implementation FirestoreRepository')
  }

  public get collection() {
    const firestore = resolveFirestore()
    const collectionName = getEntityMeta(this.entity)?.name ?? this.entity.name
    return firestore.collection(collectionName) as FirebaseFirestore.CollectionReference<Entity>
  }

  async count(query?: QueryWithWhere<Entity>): Promise<number> {
    // TODO: fix this logic
    const response = await this.collection.select().get()
    return response.size
  }

  async findById(id: string | null | undefined): Promise<Entity | null> {
    if (!id) return null
    return toEntity<Entity>(await this.collection.doc(id).get())
  }

  // async findByIds(ids: string[]): Promise<Array<Entity | null>> {
  //   const items = await paginate(next =>
  //     this.find(new PaginatedQuery<any>(this as Repository<Entity>).whereIn('id', ids).next(next)),
  //   )
  //   const itemsById = toByProperty(items, 'id')
  //   return ids.map(id => itemsById[id] ?? null)
  // }

  findOne(
    queryOrCallback?: Query<Entity> | ((query: Query<Entity>) => Query<Entity>),
  ): Promise<Entity | null> {
    const query =
      typeof queryOrCallback === 'function' ? queryOrCallback(new Query(this)) : queryOrCallback
    console.log({ query })
    return this.collection.get(
      query?.toQuery() ?? new Query(this).whereIsNotNull('id' as any).toQuery(),
    )
  }

  // async findAll(
  //   queryOrCallback?:
  //     | PaginatedQuery<Entity>
  //     | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
  //   filter?: PaginationFilter<Entity>,
  //   onPage?: OnPageLoad<Entity>,
  // ): Promise<Entity[]> {
  //   const query =
  //     (typeof queryOrCallback === 'function'
  //       ? queryOrCallback(new PaginatedQuery(this))
  //       : queryOrCallback) ?? new PaginatedQuery(this)
  //   return paginate(next => this.find(query.next(next)), filter, onPage)
  // }

  // async find(
  //   queryOrCallback:
  //     | PaginatedQuery<Entity>
  //     | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
  // ): Promise<PaginatedResult<Entity>> {
  //   const query =
  //     typeof queryOrCallback === 'function'
  //       ? queryOrCallback(new PaginatedQuery(this))
  //       : queryOrCallback
  //   const options = query.toQuery()
  //   const items = await this.collection.find(options)
  //   if (!items.length || (options.take && items.length < options.take)) {
  //     return { next: null, items }
  //   }
  //   return {
  //     next: toPaginationToken({
  //       take: options.take ?? DEFAULT_PAGE_SIZE,
  //       skip: (options.skip ?? 0) + (options.take ?? 0),
  //     }),
  //     items,
  //   }
  // }

  // async insert(entity: EntityWithOptionalId<Entity>): Promise<Entity> {
  //   const result = await this.collection.insert(entity)
  //   return { ...(result.identifiers[0] ?? {}), ...entity } as Entity
  // }

  // async insertMany(entities: Array<EntityWithOptionalId<Entity>>): Promise<Entity[]> {
  //   const result = await this.collection.insert(entities)
  //   return entities.map(
  //     (entity, index) => ({ ...(result.identifiers[index] ?? {}), ...entity } as Entity),
  //   )
  // }

  async save(entity: DeepPartial<Entity>): Promise<Entity> {
    const id = (entity as Entity).id || generateId()
    const timestamp = Date.now()
    const record = replaceUndefinedWithNull({ ...entity, id, updatedAt: timestamp }) as Entity
    await this.collection.doc(id).set(record, { merge: true })
    return this.findById(id) as Promise<Entity>
  }

  async saveMany(
    entities: Array<DeepPartial<Entity>>,
    options?: { chunk?: number },
  ): Promise<Entity[]> {
    let records: Entity[] = []
    for (const part of chunk(entities, options?.chunk ?? 10)) {
      console.log('SAving ', part)
      records = records.concat(await Promise.all(part.map(entity => this.save(entity))))
    }
    return records
  }

  // async update(entity: PartialEntityWithId<Entity>): Promise<Entity> {
  //   const record = await this.findById(entity.id)
  //   if (!record) throw new Error(`No such ${this.entity.name} of id '${entity.id}'`)
  //   await this.collection.update(entity.id, entity)
  //   return { ...record, ...entity }
  // }

  // async updateMany(query: IdsOrQuery<Entity>, entity: DeepPartial<Entity>): Promise<Entity[]> {
  //   const where = await this.toFindOptionsWhere(query)
  //   if (!where) return []
  //   await this.collection.update(where, entity)
  //   return this.collection.find(where)
  // }

  // async delete(query: IdsOrQuery<Entity>, options?: DeleteOptions): Promise<Entity[]> {
  //   const where = await this.toFindOptionsWhere(query)
  //   if (!where) return []
  //   const records = await this.collection.find(where)
  //   if (options?.softDelete ?? this.options?.softDelete) {
  //     await this.collection.softDelete(where)
  //   } else {
  //     await this.collection.delete(where)
  //   }
  //   return records
  // }

  // async restore(query: IdsOrQuery<Entity>): Promise<Entity[]> {
  //   const where = await this.toFindOptionsWhere(query)
  //   if (!where) return []
  //   await this.collection.restore(where)
  //   return this.collection.find(where)
  // }

  // async increment<Key extends KeysOf<Entity, number>>(
  //   query: IdsOrQuery<Entity>,
  //   key: Key,
  //   incrementBy = 1,
  // ): Promise<Entity[]> {
  //   const where = await this.toFindOptionsWhere(query)
  //   if (!where) return []
  //   await this.collection.increment(where, key, incrementBy)
  //   return this.collection.find(where)
  // }

  // protected async toFindOptionsWhere(
  //   queryOrCallback: IdsOrQuery<Entity>,
  // ): Promise<FindOptionsWhere<any> | undefined> {
  //   const queryOrId =
  //     typeof queryOrCallback === 'function' ? queryOrCallback(new Query(this)) : queryOrCallback
  //   const where = isQuery(queryOrId)
  //     ? queryOrId.toQuery().where
  //     : queryOrId instanceof Array
  //     ? new QueryWithWhere(this).whereIn('id' as any, queryOrId as any[]).toQuery().where
  //     : new QueryWithWhere(this).whereEqualTo('id' as any, queryOrId as any).toQuery().where
  //   if (!where) throw new Error('Invalid query: no WHERE condition!')
  //   if (isQuery(queryOrId) && where instanceof Array) {
  //     const items = await paginate(next => this.find(PaginatedQuery.from(queryOrId).next(next)))
  //     if (!items.length) return undefined
  //     return this.toFindOptionsWhere(items.map(i => i.id))
  //   }
  //   return where
  // }
}
