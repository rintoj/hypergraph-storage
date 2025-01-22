import { DynamicModule, Inject, Module, OnApplicationBootstrap, Provider } from '@nestjs/common'
import { ClassType } from 'tsds-tools'
import { initializeDataSource } from '../data-source'
import { initializeFirestore } from '../firestore-repository'
import {
  isTypeORMStorageModuleOptions,
  STORAGE_MODULE_OPTIONS,
  StorageModuleOptions,
} from './storage.types'

@Module({})
export class FeatureModule {}

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
    entities.map(entity => StorageModule.entities.add(entity))
    return {
      module: FeatureModule,
      providers: [],
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
