import { ClassType } from 'tsds-tools'
import { container } from 'tsyringe'
import { DataSource, DataSourceOptions } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { resolveRepositories } from '../repository-resolver'
import { withRetry } from './with-retry'

const DEFAULT_RETRY = 100
const DEFAULT_WAIT_IN_MS = 5 * 1000

const {
  DATABASE_TYPE = 'postgres',
  DATABASE_HOST = 'localhost',
  DATABASE_PORT = '5432',
  DATABASE_NAME = 'hypergraphlocal',
  DATABASE_USER = 'postgres',
  DATABASE_PASSWORD,
  DATABASE_SYNCHRONIZE = 'true',
  DATABASE_URL,
} = process.env

export type InitializeDataSourceOptions = Partial<Omit<PostgresConnectionOptions, 'entities'>> & {
  retry?: number
  waitInMs?: number
  entities?: ClassType<any>[]
  repositories?: Array<string | ClassType<any>>
}

export async function initializeDataSource(options: InitializeDataSourceOptions = {}) {
  const dataSourceOptions: DataSourceOptions = {
    type: (options.type ?? DATABASE_TYPE) as 'postgres',
    host: options.host ?? DATABASE_HOST,
    port: options.port ?? parseInt(DATABASE_PORT),
    url: options.url ?? DATABASE_URL,
    database: options.database ?? DATABASE_NAME,
    username: options.username ?? DATABASE_USER,
    password: options.password ?? DATABASE_PASSWORD,
    synchronize: options.synchronize ?? DATABASE_SYNCHRONIZE === 'true',
    subscribers: options.subscribers ?? ([] as any),
    ...((options as any) ?? {}),
  }
  const repos =
    options.repositories ?? options.entities instanceof Array
      ? (options.entities as any)
          ?.map((i: string) =>
            typeof i === 'string'
              ? i.replace('/*-schema.{ts,js}', '/*-repository.{ts,js}')
              : undefined,
          )
          .filter((i: string) => !!i)
      : undefined
  await resolveRepositories(repos)
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
