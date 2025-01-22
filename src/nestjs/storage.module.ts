import { DynamicModule, Module, Provider } from '@nestjs/common'
import { StorageModuleOptions } from './storage.types'

@Module({})
export class StorageModule {
  static register(options: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [{ provide: StorageModuleOptions, useValue: options }]
    return {
      module: StorageModule,
      providers,
      exports: providers,
    }
  }
}
