import DataLoader from 'dataloader'
import { ClassType, KeysOf, toByProperty } from 'tsds-tools'
import { DeepPartial, ObjectLiteral } from 'typeorm'
import {
  FirestoreRepository,
  FirestoreRepositoryOptions,
  IdsOrFirestoreQuery,
} from '../firestore-repository/firestore-repository'
import { OnPageLoad, PaginatedResult, PaginationFilter } from '../pagination'
import { FirestorePaginatedQuery, FirestoreQuery } from '../firestore-query'
import { DeleteOptions, EntityWithOptionalId, PartialEntityWithId } from '../repository'

export function createFirestoreRepositoryWithCache<
  Entity extends ObjectLiteral,
  R extends FirestoreRepository<Entity>,
>(
  Repository: ClassType<FirestoreRepository<Entity>>,
  property: KeysOf<Entity, string> = 'id' as any,
): R {
  return class RepositoryWithCache
    extends FirestoreRepository<Entity>
    implements FirestoreRepository<Entity>
  {
    protected loader: DataLoader<string, Entity | null>

    constructor(
      public readonly entity: ClassType<Entity>,
      public readonly options?: FirestoreRepositoryOptions,
    ) {
      super(entity, options)
      this.loader = new DataLoader(values => this.findByProperty(values as string[]), {
        cache: true,
      })
    }

    protected async findByProperty(values: string[]): Promise<Array<Entity | null>> {
      const items = await this.findAll(
        new FirestorePaginatedQuery<any>(this as FirestoreRepository<Entity>).whereIn(
          property,
          values,
        ),
      )
      const itemsByProperty = toByProperty(items, property)
      return values.map(value => itemsByProperty[value] ?? null)
    }

    protected cacheRecord<T extends Entity | null>(record: T): T {
      if (record?.[property]) this.loader.clear(record[property]).prime(record[property], record)
      return record
    }

    protected async withCache<T extends Entity | null>(result: Promise<T> | T): Promise<T> {
      const record = await Promise.resolve(result)
      return this.cacheRecord(record)
    }

    protected async withCacheMany<T extends Entity | null>(result: Promise<Array<T>> | Array<T>) {
      const records = await Promise.resolve(result)
      return records.map(record => this.cacheRecord(record))
    }

    async findById(id: string) {
      const record = id ? await this.loader.load(id) : null
      if (!record) id && this.loader.clear(id)
      return record
    }

    async findByIds(ids: string[]): Promise<Array<Entity | null>> {
      return this.loader.loadMany(ids) as Promise<Array<Entity | null>>
    }

    async findOne(
      queryOrCallback?:
        | FirestoreQuery<Entity>
        | ((query: FirestoreQuery<Entity>) => FirestoreQuery<Entity>),
    ) {
      return this.withCache(super.findOne(queryOrCallback))
    }

    async findAll(
      queryOrCallback?:
        | FirestorePaginatedQuery<Entity>
        | ((query: FirestorePaginatedQuery<Entity>) => FirestorePaginatedQuery<Entity>),
      filter?: PaginationFilter<Entity>,
      onPage?: OnPageLoad<Entity>,
    ): Promise<Entity[]> {
      return this.withCacheMany(super.findAll(queryOrCallback, filter, onPage))
    }

    async find(
      queryOrCallback:
        | FirestorePaginatedQuery<Entity>
        | ((query: FirestorePaginatedQuery<Entity>) => FirestorePaginatedQuery<Entity>),
    ): Promise<PaginatedResult<Entity>> {
      const result = await super.find(queryOrCallback)
      await this.withCacheMany(result.items)
      return result
    }

    async insert(entity: EntityWithOptionalId<Entity>): Promise<Entity> {
      return this.withCache(super.insert(entity))
    }

    async insertMany(entities: Array<EntityWithOptionalId<Entity>>): Promise<Entity[]> {
      return this.withCacheMany(super.insertMany(entities))
    }

    async save(entity: DeepPartial<Entity>): Promise<Entity> {
      if (entity[property]) this.loader.clear(entity[property])
      return this.withCache(super.save(entity))
    }

    async saveMany(
      entities: Array<DeepPartial<Entity>>,
      options?: { chunk?: number },
    ): Promise<Entity[]> {
      for (const entity of entities) {
        if (entity?.[property]) this.loader.clear(entity[property])
      }
      return this.withCacheMany(super.saveMany(entities, options))
    }

    async update(entity: PartialEntityWithId<Entity>): Promise<Entity> {
      if (entity[property]) this.loader.clear(entity[property])
      return this.withCache(super.update(entity))
    }

    async updateMany(query: IdsOrFirestoreQuery<Entity>, entity: DeepPartial<Entity>) {
      const records = await this.idOrQueryToEntities(query)
      for (const record of records) {
        if (record?.[property]) this.loader.clear(record[property])
      }
      return this.withCacheMany(super.updateMany(query, entity))
    }

    async delete(query: IdsOrFirestoreQuery<Entity>, options?: DeleteOptions): Promise<Entity[]> {
      const records = await super.delete(query, options)
      records.map(record => record?.[property] && this.loader.clear(record[property]))
      return records
    }

    async increment<Key extends KeysOf<Entity, number>>(
      idOrQuery: IdsOrFirestoreQuery<Entity>,
      key: Key,
      incrementBy = 1,
    ): Promise<Entity[]> {
      return this.withCacheMany(super.increment(idOrQuery, key, incrementBy))
    }
  } as any
}
