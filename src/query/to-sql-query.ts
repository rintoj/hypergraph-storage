import { toCamelCase } from 'name-util'
import { ClassType } from 'tsds-tools'
import { DataSource, FindManyOptions, ObjectLiteral } from 'typeorm'

export function toSQLQuery<T extends ObjectLiteral>(
  dataSource: DataSource,
  entityClass: ClassType<T>,
  findOptions: FindManyOptions<T>,
) {
  const queryBuilder = dataSource
    .createQueryBuilder(entityClass, toCamelCase(entityClass.name.replace(/Entity$/, '')))
    .setFindOptions(findOptions)
  const query = queryBuilder.getQuery()
  const parameters = queryBuilder.getParameters()
  return Object.keys(parameters).reduce((q, k) => {
    const value = parameters[k]
    if (value instanceof Array) {
      return q.replace(
        `:${k}`,
        `[${value.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(', ')}]`,
      )
    }
    return q.replace(`:${k}`, typeof value === 'string' ? `'${value}'` : value)
  }, query.replace(/"/g, ''))
}
