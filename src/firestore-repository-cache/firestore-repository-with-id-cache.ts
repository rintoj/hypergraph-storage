import { ClassType } from 'tsds-tools'
import { ObjectLiteral } from 'typeorm'
import { FirestoreRepository, FirestoreRepositoryOptions } from '../firestore-repository'
import { WithFirestoreCache } from './with-cache-decorator'

@WithFirestoreCache('id')
export class FirestoreRepositoryWithIdCache<
  Entity extends ObjectLiteral,
> extends FirestoreRepository<Entity> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: FirestoreRepositoryOptions,
  ) {
    super(entity, options)
  }
}
