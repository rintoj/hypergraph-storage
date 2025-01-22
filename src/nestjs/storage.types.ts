import { ObjectLiteral } from 'typeorm'
import { Repository as TypeORMRepository } from '../repository'

export const Repository = TypeORMRepository
export type Repository<T extends ObjectLiteral> = TypeORMRepository<T>

export enum RepositoryType {
  Firestore = 'Firestore',
  TypeORM = 'TypeORM',
}

export class StorageModuleOptions {
  public readonly repositoryType!: RepositoryType
}
