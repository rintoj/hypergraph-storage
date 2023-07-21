import { container } from 'tsyringe'
import { DataSource, DataSourceOptions } from 'typeorm'
import { RepositorySubscriber } from '../repository/repository-subscriber'
import { withRetry } from './with-retry'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

const DEFAULT_RETRY = 100
const DEFAULT_WAIT_IN_MS = 5 * 1000

const {
  dbType = 'postgres',
  dbHost = 'localhost',
  dbPort = '5432',
  dbName = 'hypergraphlocal',
  dbUser = 'postgres',
  dbPassword,
  dbSynchronize = 'true',
} = process.env

export type InitializeDataSourceOptions = Partial<PostgresConnectionOptions> & {
  retry?: number
  waitInMs?: number
}

export async function initializeDataSource(options: InitializeDataSourceOptions = {}) {
  const dataSourceOptions: DataSourceOptions = {
    type: (options.type ?? dbType) as 'postgres',
    host: options.host ?? dbHost,
    port: options.port ?? parseInt(dbPort),
    database: options.database ?? dbName,
    username: options.username ?? dbUser,
    password: options.password ?? dbPassword,
    synchronize: options.synchronize ?? dbSynchronize === 'true',
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
