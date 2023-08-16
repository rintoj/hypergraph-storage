import { ClassType } from 'tsds-tools'
import { ObjectLiteral } from 'typeorm'
import { Repository, RepositoryOptions } from '../repository/repository'
import { WithCache } from './with-cache-decorator'

@WithCache('id')
export class RepositoryWithIdCache<Entity extends ObjectLiteral> extends Repository<Entity> {
  constructor(
    public readonly entity: ClassType<Entity>,
    public readonly options?: RepositoryOptions,
  ) {
    super(entity, options)
  }
}
