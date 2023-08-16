import { ClassType, KeysOf } from 'tsds-tools'
import { ObjectLiteral } from 'typeorm'
import { FirestoreRepository } from '../firestore-repository'
import { createFirestoreRepositoryWithCache } from './create-firestore-repository-with-cache'

export function WithFirestoreCache<Entity extends ObjectLiteral>(
  property?: KeysOf<Entity, string>,
) {
  return <TClass extends ClassType<FirestoreRepository<any>>>(repositoryClass: TClass) => {
    return createFirestoreRepositoryWithCache(repositoryClass, property) as any
  }
}
