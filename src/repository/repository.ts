import { ClassType, KeysOf, toByProperty } from 'tsds-tools'
import { container } from 'tsyringe'
import { DataSource, DeepPartial, FindOptionsWhere, ObjectLiteral } from 'typeorm'
import {
  OnPageLoad,
  paginate,
  PaginatedResult,
  PaginationFilter,
  toPaginationToken,
} from '../pagination'
import { DEFAULT_PAGE_SIZE, isQuery, Query, QueryWithWhere } from '../query'
import { PaginatedQuery } from '../query/query'

export type EntityWithOptionalId<Entity> = Omit<Entity, 'id'> & { id?: string }
export type PartialEntityWithId<Entity> = DeepPartial<Entity> & { id: string }
export type IdsOrQuery<Entity extends ObjectLiteral> =
  | string
  | string[]
  | QueryWithWhere<Entity>
  | ((query: Query<Entity>) => Query<Entity>)

export interface DeleteOptions {
  softDelete?: boolean
}

export interface RepositoryOptions extends DeleteOptions {
  softDelete?: boolean
}

export class Repository<Entity extends ObjectLiteral> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: RepositoryOptions,
  ) {}

  protected get repository() {
    const dataSource = container.resolve(DataSource)
    return dataSource.getRepository(this.entity)
  }

  count(query?: QueryWithWhere<Entity>): Promise<number> {
    return this.repository.count(query?.toQuery())
  }

  async findById(id: string | null | undefined): Promise<Entity | null> {
    if (!id) return null
    return this.repository.findOne(new Query<any>(this).whereEqualTo('id', id).toQuery() as any)
  }

  async findByIds(ids: string[]): Promise<Array<Entity | null>> {
    const items = await paginate(next =>
      this.find(new PaginatedQuery<any>(this).whereIn('id', ids).next(next)),
    )
    const itemsById = toByProperty(items, 'id')
    return ids.map(id => itemsById[id] ?? null)
  }

  findOne(
    queryOrCallback?: Query<Entity> | ((query: Query<Entity>) => Query<Entity>),
  ): Promise<Entity | null> {
    const query =
      typeof queryOrCallback === 'function' ? queryOrCallback(new Query(this)) : queryOrCallback
    return this.repository.findOne(
      query?.toQuery() ?? new Query(this).whereIsNotNull('id' as any).toQuery(),
    )
  }

  async findAll(
    queryOrCallback?:
      | PaginatedQuery<Entity>
      | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
    filter?: PaginationFilter<Entity>,
    onPage?: OnPageLoad<Entity>,
  ): Promise<Entity[]> {
    const query =
      (typeof queryOrCallback === 'function'
        ? queryOrCallback(new PaginatedQuery(this))
        : queryOrCallback) ?? new PaginatedQuery(this)
    return paginate(next => this.find(query.next(next)), filter, onPage)
  }

  async find(
    queryOrCallback:
      | PaginatedQuery<Entity>
      | ((query: PaginatedQuery<Entity>) => PaginatedQuery<Entity>),
  ): Promise<PaginatedResult<Entity>> {
    let query =
      typeof queryOrCallback === 'function'
        ? queryOrCallback(new PaginatedQuery(this))
        : queryOrCallback
    if (Object.keys(query.toQuery().order ?? {}).length) {
      query = query.orderByAscending('id' as any)
    }
    const options = query.toQuery()
    const items = await this.repository.find(options)
    if (!items.length || (options.take && items.length < options.take)) {
      return { next: null, items }
    }
    return {
      next: toPaginationToken({
        take: options.take ?? DEFAULT_PAGE_SIZE,
        skip: (options.skip ?? 0) + (options.take ?? 0),
      }),
      items,
    }
  }

  async insert(entity: EntityWithOptionalId<Entity>): Promise<Entity> {
    const result = await this.repository.insert(entity)
    return { ...(result.identifiers[0] ?? {}), ...entity } as Entity
  }

  async insertMany(entities: Array<EntityWithOptionalId<Entity>>): Promise<Entity[]> {
    const result = await this.repository.insert(entities)
    return entities.map(
      (entity, index) => ({ ...(result.identifiers[index] ?? {}), ...entity } as Entity),
    )
  }

  async save(entity: DeepPartial<Entity>): Promise<Entity> {
    const record = await this.repository.save(entity)
    return this.findById(record.id) as any
  }

  async saveMany(
    entity: Array<DeepPartial<Entity>>,
    options?: { chunk?: number },
  ): Promise<Entity[]> {
    return this.repository.save(entity, { reload: true, ...options })
  }

  async update(entity: PartialEntityWithId<Entity>): Promise<Entity> {
    const record = await this.findById(entity.id)
    if (!record) throw new Error(`No such ${this.entity.name} of id '${entity.id}'`)
    await this.repository.update(entity.id, entity)
    return { ...record, ...entity }
  }

  async updateMany(query: IdsOrQuery<Entity>, entity: DeepPartial<Entity>): Promise<Entity[]> {
    const where = await this.toFindOptionsWhere(query)
    if (!where) return []
    await this.repository.update(where, entity)
    return this.repository.find({ where })
  }

  async delete(query: IdsOrQuery<Entity>, options?: DeleteOptions): Promise<Entity[]> {
    const where = await this.toFindOptionsWhere(query)
    if (!where) return []
    const records = await this.repository.find({ where })
    if (options?.softDelete ?? this.options?.softDelete) {
      await this.repository.softDelete(where)
    } else {
      await this.repository.delete(where)
    }
    return records
  }

  async restore(query: IdsOrQuery<Entity>): Promise<Entity[]> {
    const where = await this.toFindOptionsWhere(query)
    if (!where) return []
    await this.repository.restore(where)
    return this.repository.find({ where })
  }

  async increment<Key extends KeysOf<Entity, number>>(
    query: IdsOrQuery<Entity>,
    key: Key,
    incrementBy = 1,
  ): Promise<Entity[]> {
    const where = await this.toFindOptionsWhere(query)
    if (!where) return []
    await this.repository.increment(where, key, incrementBy)
    return this.repository.find({ where })
  }

  protected async toFindOptionsWhere(
    queryOrCallback: IdsOrQuery<Entity>,
  ): Promise<FindOptionsWhere<any> | undefined> {
    const queryOrId =
      typeof queryOrCallback === 'function' ? queryOrCallback(new Query(this)) : queryOrCallback
    const where = isQuery(queryOrId)
      ? queryOrId.toQuery().where
      : queryOrId instanceof Array
      ? new QueryWithWhere(this).whereIn('id' as any, queryOrId as any[]).toQuery().where
      : new QueryWithWhere(this).whereEqualTo('id' as any, queryOrId as any).toQuery().where
    if (!where) throw new Error('Invalid query: no WHERE condition!')
    if (isQuery(queryOrId) && where instanceof Array) {
      const items = await paginate(next => this.find(PaginatedQuery.from(queryOrId).next(next)))
      if (!items.length) return undefined
      return this.toFindOptionsWhere(items.map(i => i.id))
    }
    return where
  }
}
