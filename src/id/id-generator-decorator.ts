import { BaseEntity } from '../base-entity'

const idGenerators: any = {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IdGenerator<T extends BaseEntity>(idGenerator: (item: T) => void): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  return <TFunction extends Function>(target: TFunction) => {
    idGenerators[target] = idGenerator
  }
}

export function getIdGenerator(target: any) {
  return idGenerators[target]
}
