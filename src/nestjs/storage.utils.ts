import { Inject } from '@nestjs/common'
import { ClassType } from 'tsds-tools'
import { ObjectLiteral } from 'typeorm'
import { FirestoreRepository } from '../firestore-repository'
import { Repository as TypeORMRepository } from '../repository'
import { RepositoryType, StorageModuleOptions } from './storage.types'

function toRepositoryToken<T extends ObjectLiteral>(model: T) {
  return `${model.name}Repository`
}

export function InjectRepo<T extends ObjectLiteral>(model: T) {
  return Inject(toRepositoryToken(model))
}

export function createRepository<T extends ObjectLiteral>(model: ClassType<T>) {
  return {
    provide: toRepositoryToken(model),
    useFactory: (options: StorageModuleOptions) => {
      return options?.repositoryType === RepositoryType.Firestore
        ? new FirestoreRepository(model)
        : new TypeORMRepository(model)
    },
    inject: [StorageModuleOptions],
  }
}

export function createInjectableRepo<T extends TypeORMRepository<any> | FirestoreRepository<any>>(
  repository: ClassType<T>,
) {
  return {
    provide: repository.name,
    useClass: repository,
  }
}
