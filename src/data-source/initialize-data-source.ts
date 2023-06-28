import { container } from 'tsyringe'
import { DataSource, DataSourceOptions } from 'typeorm'
import { RepositorySubscriber } from '../repository/repository-subscriber'
import { withRetry } from './with-retry'

const DEFAULT_RETRY = 100
const DEFAULT_WAIT_IN_MS = 5 * 1000

const {
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = '5432',
  POSTGRES_DB = 'hypergraphlocal',
  POSTGRES_USER = 'postgres',
  POSTGRES_PASSWORD,
} = process.env

export type InitializeDataSourceOptions = Partial<DataSourceOptions> & {
  retry?: number
  waitInMs?: number
}

export async function initializeDataSource(options: InitializeDataSourceOptions) {
  const dataSourceOptions: DataSourceOptions = {
    type: 'postgres' as const,
    ...(POSTGRES_HOST ? { host: POSTGRES_HOST } : {}),
    ...(POSTGRES_PORT ? { port: parseInt(POSTGRES_PORT) } : {}),
    ...(POSTGRES_DB ? { database: POSTGRES_DB } : {}),
    ...(POSTGRES_USER ? { username: POSTGRES_USER } : {}),
    ...(POSTGRES_PASSWORD ? { password: POSTGRES_PASSWORD } : {}),
    synchronize: true,
    subscribers: [RepositorySubscriber],
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
