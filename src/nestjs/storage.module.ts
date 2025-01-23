import { DynamicModule, Inject, Module, OnApplicationBootstrap, Provider } from '@nestjs/common'
import { ClassType } from 'tsds-tools'
import { initializeDataSource } from '../data-source'
import { initializeFirestore } from '../firestore-repository'
import {
  isTypeORMStorageModuleOptions,
  STORAGE_MODULE_OPTIONS,
  StorageModuleForTestOptions,
  StorageModuleOptions,
  TEST_MODE,
} from './storage.types'
import { createRepository } from './storage.utils'

@Module({})
export class StorageFeatureModule {}

@Module({})
export class StorageModule implements OnApplicationBootstrap {
  static readonly entities = new Set<any>()

  static forRoot(options: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: STORAGE_MODULE_OPTIONS, useValue: options },
      { provide: TEST_MODE, useValue: false },
    ]
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

  static forTest(options: StorageModuleForTestOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: STORAGE_MODULE_OPTIONS, useValue: options },
      { provide: TEST_MODE, useValue: true },
    ]
    return {
      module: StorageModule,
      global: true,
      providers,
      exports: providers,
    }
  }

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private options: StorageModuleOptions,
    @Inject(TEST_MODE) private isTestMode: boolean,
  ) {}

  async onApplicationBootstrap() {
    if (isTypeORMStorageModuleOptions(this.options)) {
      const entities = [...(this.options.entities ?? []), ...StorageModule.entities]
      if (this.isTestMode) {
        const { initializeMockDataSource } = await import('../typeorm-mock')
        return await initializeMockDataSource({ ...this.options, entities })
      }
      await initializeDataSource({
        ...this.options,
        entities,
      })
    } else {
      if (this.isTestMode) {
        const { initializeMockFirestore } = await import('../firestore-repository/firestore-mock')
        return await initializeMockFirestore()
      }
      await initializeFirestore(this.options)
    }
  }
}
