import { container } from 'tsyringe'
import { DataSource, DataSourceOptions } from 'typeorm'
import { RepositorySubscriber } from '../repository/repository-subscriber'
import { withRetry } from './with-retry'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

const DEFAULT_RETRY = 100
const DEFAULT_WAIT_IN_MS = 5 * 1000

const {
  DB_TYPE = 'postgres',
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'hypergraphlocal',
  DB_USER = 'postgres',
  DB_PASSWORD,
  DB_SYNCHRONIZE = 'true',
} = process.env

export type InitializeDataSourceOptions = Partial<PostgresConnectionOptions> & {
  retry?: number
  waitInMs?: number
}

export async function initializeDataSource(options: InitializeDataSourceOptions = {}) {
  const dataSourceOptions: DataSourceOptions = {
    type: (options.type ?? DB_TYPE) as 'postgres',
    host: options.host ?? DB_HOST,
    port: options.port ?? parseInt(DB_PORT),
    database: options.database ?? DB_NAME,
    username: options.username ?? DB_USER,
    password: options.password ?? DB_PASSWORD,
    synchronize: options.synchronize ?? DB_SYNCHRONIZE === 'true',
    subscribers: [RepositorySubscriber, ...(options.subscribers ?? ([] as any))],
    ...((options as any) ?? {}),
  }
  const dataSource = new DataSource(dataSourceOptions)
  await withRetry(() => dataSource.initialize(), {
    retry: options?.retry ?? DEFAULT_RETRY,
    waitInMs: options?.waitInMs ?? DEFAULT_WAIT_IN_MS,
    next: retry =>
      console.log(`(${retry} more attempts) trying to reconnect to database!`, dataSourceOptions),
  })
  container.registerInstance(DataSource, dataSource)
  if (typeof jest === 'undefined') console.log('Initialized database')
  return dataSource
}
