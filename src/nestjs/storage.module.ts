import { DynamicModule, Inject, Module, OnApplicationBootstrap, Provider } from '@nestjs/common'
import { initializeDataSource } from '../data-source'
import { initializeFirestore } from '../firestore-repository'
import {
  isTypeORMStorageModuleOptions,
  STORAGE_MODULE_OPTIONS,
  StorageModuleOptions,
} from './storage.types'

@Module({})
export class StorageModule implements OnApplicationBootstrap {
  static register(options: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [{ provide: STORAGE_MODULE_OPTIONS, useValue: options }]
    return {
      module: StorageModule,
      global: true,
      providers,
      exports: providers,
    }
  }

  constructor(@Inject(STORAGE_MODULE_OPTIONS) private options: StorageModuleOptions) {}

  async onApplicationBootstrap() {
    if (isTypeORMStorageModuleOptions(this.options)) {
      await initializeDataSource(this.options)
    } else {
      await initializeFirestore(this.options)
    }
  }
}
