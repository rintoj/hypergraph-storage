import { ClassType } from 'tsds-tools'
import { EntityOptions, Entity as TypeORMEntity } from 'typeorm'

const ENTITY_METADATA: { [id: symbol]: { name: string; options?: EntityOptions } } = {}

export function Entity(name: string, options?: EntityOptions): ClassDecorator
export function Entity(options?: EntityOptions): ClassDecorator
export function Entity(
  nameOrOptions?: string | EntityOptions,
  maybeOptions?: EntityOptions,
): ClassDecorator {
  return ((target: ClassType<any>) => {
    const name = typeof nameOrOptions === 'string' ? nameOrOptions : target.name
    const options = typeof nameOrOptions !== 'string' ? nameOrOptions : maybeOptions
    ENTITY_METADATA[target as any] = { name, options }
    return TypeORMEntity(name, options)(target)
  }) as ClassDecorator
}

export function getEntityMeta(target: ClassType<any>) {
  return ENTITY_METADATA[target as any]
}
