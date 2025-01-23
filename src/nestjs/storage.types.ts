import { ObjectLiteral } from 'typeorm'
import { InitializeDataSourceOptions } from '../data-source'
import { InitializeFirestoreOptions } from '../firestore-repository'
import { Repository as TypeORMRepository } from '../repository'

export const Repository = TypeORMRepository
export type Repository<T extends ObjectLiteral> = TypeORMRepository<T>

export enum RepositoryType {
  Firestore = 'Firestore',
  TypeORM = 'TypeORM',
}

interface FirestoreStorageModuleOptions extends InitializeFirestoreOptions {
  repositoryType: RepositoryType.Firestore
}

interface FirestoreStorageModuleForTestOptions {
  repositoryType: RepositoryType.Firestore
}

interface TypeORMStorageModuleOptions extends InitializeDataSourceOptions {
  repositoryType: RepositoryType.TypeORM
}

export function isFirestoreStorageModuleOptions(
  options: StorageModuleOptions,
): options is FirestoreStorageModuleOptions {
  return options.repositoryType === RepositoryType.Firestore
}

export function isTypeORMStorageModuleOptions(
  options: StorageModuleOptions,
): options is TypeORMStorageModuleOptions {
  return options.repositoryType === RepositoryType.TypeORM
}

export const STORAGE_MODULE_OPTIONS = 'STORAGE_MODULE_OPTIONS'
export const TEST_MODE = 'TEST_MODE'
export type StorageModuleOptions = FirestoreStorageModuleOptions | TypeORMStorageModuleOptions
export type StorageModuleForTestOptions =
  | FirestoreStorageModuleForTestOptions
  | TypeORMStorageModuleOptions
