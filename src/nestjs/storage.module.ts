import { DynamicModule, Inject, Module, OnApplicationBootstrap, Provider } from '@nestjs/common'
import { ClassType } from 'tsds-tools'
import { initializeDataSource } from '../data-source'
import { initializeFirestore } from '../firestore-repository'
import {
  isTypeORMStorageModuleOptions,
  STORAGE_MODULE_OPTIONS,
  StorageModuleOptions,
} from './storage.types'
import { createRepository } from './storage.utils'

@Module({})
export class StorageFeatureModule {}

@Module({})
export class StorageModule implements OnApplicationBootstrap {
  static readonly entities = new Set<any>()

  static forRoot(options: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [{ provide: STORAGE_MODULE_OPTIONS, useValue: options }]
    return {
      module: StorageModule,
      global: true,
      providers,
      exports: providers,
    }
  }

  static forFeature(entities: ClassType<any>[]) {
    const repositoryProviders = entities.map(entity => {
      StorageModule.entities.add(entity)
      return createRepository(entity)
    })
    return {
      module: StorageFeatureModule,
      providers: repositoryProviders,
      exports: repositoryProviders,
    }
  }

  constructor(@Inject(STORAGE_MODULE_OPTIONS) private options: StorageModuleOptions) {}

  async onApplicationBootstrap() {
    if (isTypeORMStorageModuleOptions(this.options)) {
      const entities = [...(this.options.entities ?? []), ...StorageModule.entities]
      await initializeDataSource({
        ...this.options,
        entities,
      })
    } else {
      await initializeFirestore(this.options)
    }
  }
}
