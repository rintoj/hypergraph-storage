import { validate } from 'class-validator'
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm'
import { generateId, getIdGenerator } from '../id'

async function validateEntity(event: InsertEvent<any> | UpdateEvent<any>) {
  if (event.entity) {
    const target = new (event.metadata.target as any)()
    const entity = Object.keys(event.entity).reduce((a, key) => {
      a[key] = (event.entity as any)[key]
      return a
    }, target)
    const result = await validate(entity)
    if (result && result.length > 0) {
      throw new Error(result.map(i => Object.values(i.constraints ?? {})).join(','))
    }
  }
}

@EventSubscriber()
export class RepositorySubscriber implements EntitySubscriberInterface {
  async beforeInsert(event: InsertEvent<any>) {
    const idGenerator = getIdGenerator(event.metadata.target)
    event.entity.id = event.entity.id ?? idGenerator?.(event.entity) ?? generateId()
    await validateEntity(event)
  }
}
