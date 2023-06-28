import { ClassType } from 'tsds-tools'
import { container } from 'tsyringe'
import { DataSource } from 'typeorm'
import { InitializeDataSourceOptions } from '../data-source'
import { generateId } from '../id'

export class MockTypeORMDataSource {
  private dataSource: any
  private initialized = false

  constructor(private readonly options: InitializeDataSourceOptions) {}

  async initialize() {
    if (this.initialized) return
    const { DataType, newDb } = await import('pg-mem')
    const db = newDb({ autoCreateForeignKeyIndices: true })
    db.public.registerFunction({
      name: 'current_database',
      args: [],
      returns: DataType.text,
      implementation: () => this.options.database,
    })

    db.public.registerFunction({
      name: 'version',
      args: [],
      returns: DataType.text,
      implementation: () => '1.0',
    })

    this.dataSource = await db.adapters.createTypeormDataSource({
      ...this.options,
      type: 'postgres',
    })

    await this.dataSource.initialize()
    await this.dataSource.synchronize()
    this.initialized = true
  }

  getRepository(entity: ClassType<any>) {
    const repo = this.dataSource?.getRepository(entity)
    if (!repo._modified) {
      repo._modified = true
      const currentSave = repo.save.bind(repo)
      repo.save = (entity: any, ...args: any) => {
        if (entity instanceof Array) {
          entity.map(e => {
            if (e && !e?.id) {
              e.id = generateId()
            }
          })
        } else if (entity && !entity?.id) {
          entity.id = generateId()
        }
        return currentSave(entity, ...args)
      }

      const currentInsert = repo.insert.bind(repo)
      repo.insert = (entity: any, ...args: any) => {
        if (entity instanceof Array) {
          entity.map(e => {
            if (e && !e?.id) {
              e.id = generateId()
            }
          })
        } else if (entity && !entity?.id) {
          entity.id = generateId()
        }
        return currentInsert(entity, ...args)
      }
    }
    return repo
  }

  destroy() {
    this.dataSource?.close()
  }
}

export async function initializeMockDataSource(options: InitializeDataSourceOptions) {
  const dataSource = new MockTypeORMDataSource(options)
  await dataSource.initialize()
  container.registerInstance(DataSource, dataSource as any)
  return dataSource
}
