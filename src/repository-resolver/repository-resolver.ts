import { sync } from 'fast-glob'
import { toClassName } from 'name-util'
import { ClassType } from 'tsds-tools'
import { DependencyContainer, container } from 'tsyringe'
import { Repository } from '../repository/repository'

const repositoryClasses: { [id: string]: ClassType<Repository<any>> } = {}

type Context = { container?: DependencyContainer }

export function createRepositoryResolver(context: Context) {
  return new Proxy(
    {},
    {
      get(target, repositoryName) {
        if (typeof repositoryName !== 'string') return
        const repositoryClassName = toClassName(repositoryName)
        const repositoryClass = repositoryClasses[repositoryClassName]
        if (!repositoryClass) {
          throw new Error(
            `Unable to resolve repository '${repositoryClassName}'. Make sure to define "repositories" while initializing the server`,
          )
        }
        return (context.container ?? container).resolve(repositoryClass)
      },
    },
  )
}

export function registerRepository<R extends Repository<any>>(
  name: string,
  repository: ClassType<R>,
) {
  repositoryClasses[name] = repository
}

export async function resolveRepositories(
  paths: Array<string | ClassType<Repository<any>>> | undefined,
) {
  for (const path of paths ?? []) {
    if (typeof path !== 'string') {
      registerRepository(path.name, path)
      continue
    }
    const filePaths = path.replace('/*-schema.{ts,js}', '/*-repository.{ts,js}')
    const files = sync(filePaths)
    const repositories = await Promise.all(files?.map(path => import(path)) ?? [])
    repositories.map(repoFile =>
      Object.keys(repoFile).forEach(repositoryName =>
        registerRepository(repositoryName, repoFile[repositoryName]),
      ),
    )
  }
}
