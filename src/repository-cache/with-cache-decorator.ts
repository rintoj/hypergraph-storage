import { ClassType, KeysOf } from 'tsds-tools'
import { ObjectLiteral } from 'typeorm'
import { Repository } from '../repository/repository'
import { createRepositoryWithCache } from './create-repository-with-cache'

export function WithCache<Entity extends ObjectLiteral>(property?: KeysOf<Entity, string>) {
  return <TClass extends ClassType<Repository<any>>>(repositoryClass: TClass) => {
    return createRepositoryWithCache(repositoryClass, property) as any
  }
}
