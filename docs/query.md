# Query Builder

Query class provides an easy to use implementation for constructing complex SQL query. It allows you
to build SQL queries using elegant and convenient syntax with typing support. Here is the
[entity setup](./entities.md) for this example.

## Query

```ts
import { Query } from 'hypergraph-storage'

const repo = new UserRepository()
const query = new Query(repo)

  // select columns
  .select('bio')
  .select('id')
  .select('email')

  // where conditions
  .whereEqualTo('id', 'id1')
  .whereNotEqualTo('id', 'id1')

  // numeric checks
  .whereMoreThan('version', 1)
  .whereMoreThanOrEqual('version', 1)
  .whereLessThan('version', 1)
  .whereLessThanOrEqual('version', 1)
  .whereBetween('version', 1, 2)

  // numeric "NOT" operators
  .whereNotMoreThan('version', 1)
  .whereNotMoreThanOrEqual('version', 1)
  .whereNotLessThan('version', 0)
  .whereNotLessThanOrEqual('version', 1)

  // search
  .whereTextContains('bio', 'true')
  .whereTextStartsWith('bio', 'any')
  .whereTextEndsWith('bio', 'any')

  // case insensitive search
  .whereTextInAnyCaseContains('bio', 'any')
  .whereTextInAnyCaseStartsWith('bio', 'any')
  .whereTextInAnyCaseEndsWith('bio', 'any')

  // "IN" operator
  .whereIn('role', [UserRole.ADMIN, UserRole.USER])

  // null checks
  .whereIsNull('name')
  .whereIsNotNull('name')

  // array operations
  .whereArrayContains('tags', 'new')
  .whereArrayContainsAny('tags', ['new', 'trending'])

  // search on related tables
  .whereJoin('photos', q => q.whereIsNotNull('url'))

  // build "OR" condition
  .whereOr(
    query => query.whereEqualTo('id', '10'),
    query => query.whereEqualTo('id', '10'),
  )

  // sort
  .orderByAscending('version')
  .orderByDescending('createdAt')

  // fetch related entities
  .fetchRelation('photos', 'album')
  .loadRelationIds() // load only 'id', not required with `fetchRelation`

  // enable or set timeout for `cache`
  .cache(5000 ?? true)
```

## PaginatedQuery

`PaginatedQuery`, in addition to the following, supports all the methods in `Query`.

```ts
import { PaginatedQuery } from 'hypergraph-storage'

const repo = new UserRepository()
const query = new PaginatedQuery(repo)

  // use individual methods
  .next('token')
  .limit(10)

  // or use this method
  .pagination({ next: 'token', limit: 10 })
```
