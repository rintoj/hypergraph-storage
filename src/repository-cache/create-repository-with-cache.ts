import DataLoader from 'dataloader'
import { ClassType, KeysOf, toByProperty } from 'tsds-tools'
import { DeepPartial, ObjectLiteral } from 'typeorm'
import { OnPageLoad, PaginatedResult, PaginationFilter } from '../pagination'
import { PaginatedQuery, Query } from '../query'
import {
  DeleteOptions,
  EntityWithOptionalId,
  IdsOrQuery,
  PartialEntityWithId,
  Repository,
  RepositoryOptions,
} from '../repository/repository'

export function createRepositoryWithCache<
  Entity extends ObjectLiteral,
  R extends Repository<Entity>,
>(Repository: ClassType<Repository<Entity>>, property: KeysOf<Entity, string> = 'id' as any): R {
  return class RepositoryWithCache extends Repository implements Repository<Entity> {
    protected loader: DataLoader<string, Entity | null>

    constructor(
      public readonly entity: ClassType<Entity>,
      public readonly options?: RepositoryOptions,
    ) {
      super(entity, options)
      this.loader = new DataLoader(values => this.findByProperty(values as string[]), {
        cache: true,
      })
    }

    protected async findByProperty(values: string[]): Promise<Array<Entity | null>> {
      const items = await this.findAll(
        new PaginatedQuery<any>(this as Repository<Entity>).whereIn(property, values),
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

    async findOne(queryOrCallback?: Query<Entity> | ((query: Query<Entity>) => Query<Entity>)) {
      return this.withCache(super.findOne(queryOrCallback))
    }

    async findAll(
      queryOrCallback?:
        | PaginatedQuery<Entity>
        | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
      filter?: PaginationFilter<Entity>,
      onPage?: OnPageLoad<Entity>,
    ): Promise<Entity[]> {
      return this.withCacheMany(super.findAll(queryOrCallback, filter, onPage))
    }

    async find(
      queryOrCallback:
        | PaginatedQuery<Entity>
        | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
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
      const id = entity[property] as string | undefined
      if (id) this.loader.clear(id)
      return this.withCache(super.save(entity))
    }

    async saveMany(
      entities: Array<DeepPartial<Entity>>,
      options?: { chunk?: number },
    ): Promise<Entity[]> {
      for (const entity of entities) {
        const id = entity?.[property] as string | undefined
        if (id) this.loader.clear(id)
      }
      return this.withCacheMany(super.saveMany(entities, options))
    }

    async update(entity: PartialEntityWithId<Entity>): Promise<Entity> {
      const id = entity[property] as string | undefined
      if (id) this.loader.clear(id)
      return this.withCache(super.update(entity))
    }

    async updateMany(query: IdsOrQuery<Entity>, entity: DeepPartial<Entity>) {
      const where = await this.toFindOptionsWhere(query)
      if (!where) return []
      const records = await this.repository.find(where)
      for (const record of records) {
        const id = record?.[property] as string | undefined
        if (id) this.loader.clear(id)
      }
      return this.withCacheMany(super.updateMany(query, entity))
    }

    async delete(query: IdsOrQuery<Entity>, options?: DeleteOptions): Promise<Entity[]> {
      const records = await super.delete(query, options)
      records.map(record => {
        const id = record?.[property] as string | undefined
        if (id) this.loader.clear(id)
      })
      return records
    }

    async restore(query: IdsOrQuery<Entity>): Promise<Entity[]> {
      return this.withCacheMany(super.restore(query))
    }

    async increment<Key extends KeysOf<Entity, number>>(
      idOrQuery: IdsOrQuery<Entity>,
      key: Key,
      incrementBy = 1,
    ): Promise<Entity[]> {
      return this.withCacheMany(super.increment(idOrQuery, key, incrementBy))
    }
  } as any
}
