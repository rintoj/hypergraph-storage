import { DataSource, FindManyOptions } from 'typeorm'
import { UserEntity } from '../entity'
import { toPaginationToken } from '../pagination'
import { Repository } from '../repository'
import { DEFAULT_CACHE_TIME, DEFAULT_PAGE_SIZE, PaginatedQuery, Query } from './query'
import { toSQLQuery } from './to-sql-query'

class UserRepository extends Repository<UserEntity> {
  constructor() {
    super(UserEntity)
  }
}

// const repo = new UserRepository()
// const query = new Query(repo)
//   .select('bio')
//   .select('id')
//   .select('email')
//   .fetchRelation('photos', 'album')
//   .whereEqualTo('id', 'id1')
//   .whereIn('role', [UserRole.ADMIN, UserRole.USER])
//   .whereArrayContains('tags', 'new')
//   .whereArrayContainsAny('tags', ['new', 'trending'])
//   .whereBetween('version', 1, 2)
//   .whereLessThan('version', 1)
//   .whereNotLessThan('version', 0)
//   .whereJoin('photos', q => q.whereIsNotNull('url'))
//   .whereTextContains('bio', 'true')
//   .whereTextStartsWith('bio', 'any')
//   .whereOr(
//     q => q.whereEqualTo('id', '10'),
//     q => q.whereEqualTo('id', '10'),
//   )
//   .whereTextEndsWith('bio', 'any')
//   .orderByAscending('version')
//   .orderByDescending('createdAt')
//   .take(20)
//   .skip(10)

let dataSource: MockDataSource

function toWhereCondition(options: FindManyOptions<any>) {
  return toSQLQuery(dataSource, UserEntity, options)
    .split('WHERE ')[1]
    .replace(` AND ( user.deletedAt IS NULL ) LIMIT ${DEFAULT_PAGE_SIZE}`, '')
    .replace(/^\( \(|\) \)$/g, '')
}

class MockDataSource extends DataSource {
  constructor() {
    super({ type: 'postgres', entities: [`${__dirname}/../entity/*`] })
  }
  async load() {
    return this.buildMetadatas()
  }
}

describe('Query', () => {
  beforeAll(async () => {
    dataSource = new MockDataSource()
    await dataSource.load()
  })

  it('should generate a query with EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereEqualTo('id', 'id1').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.id = 'id1'`)
  })

  it('should generate a query with NOT EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereNotEqualTo('id', 'id1').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.id != 'id1'`)
  })

  it('should generate a query with MORE THAN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereMoreThan('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.version > 1`)
  })

  it('should generate a query with NOT MORE THAN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereNotMoreThan('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`NOT(user.version > 1)`)
  })

  it('should generate a query with MORE THAN OR EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereMoreThanOrEqual('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.version >= 1`)
  })

  it('should generate a query with NOT MORE THAN OR EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereNotMoreThanOrEqual('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`NOT(user.version >= 1)`)
  })

  it('should generate a query with LESS THAN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereLessThan('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.version < 1`)
  })

  it('should generate a query with NOT LESS THAN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereNotLessThan('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`NOT(user.version < 1)`)
  })

  it('should generate a query with LESS THAN OR EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereLessThanOrEqual('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.version <= 1`)
  })

  it('should generate a query with NOT LESS THAN OR EQUAL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereNotLessThanOrEqual('version', 1).toQuery()
    expect(toWhereCondition(query)).toEqual(`NOT(user.version <= 1)`)
  })

  it('should generate a query with BETWEEN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereBetween('version', 1, 2).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.version BETWEEN 1 AND 2`)
  })

  it('should generate a query with TEXT CONTAINS', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereTextContains('name', 'test').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.name LIKE '%test%'`)
  })

  it('should generate a query with TEXT STARTS WITH', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereTextStartsWith('name', 'test').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.name LIKE 'test%'`)
  })

  it('should generate a query with TEXT ENDS WITH', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereTextEndsWith('name', 'test').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.name LIKE '%test'`)
  })

  it('should generate a query with IN', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereIn('name', ['John', 'Doe']).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.name IN ('John', 'Doe')`)
  })

  it('should generate a query with ARRAY CONTAINS', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereArrayContains('tags', 'a').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.tags @> ['a']`)
  })

  it('should generate a query with ARRAY CONTAINS ANY', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereArrayContainsAny('tags', ['a', 'b']).toQuery()
    expect(toWhereCondition(query)).toEqual(`user.tags && ['a', 'b']`)
  })

  it('should generate a query with IS NULL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereIsNull('name').toQuery()
    expect(toWhereCondition(query)).toEqual(`user.name IS NULL`)
  })

  it('should generate a query with IS NOT NULL', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereIsNotNull('name').toQuery()
    expect(toWhereCondition(query)).toEqual(`NOT(user.name IS NULL)`)
  })

  it('should generate a query with OR condition', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereOr(
        q => q.whereEqualTo('id', 'id1'),
        q => q.whereEqualTo('id', 'id2'),
        q => q.whereEqualTo('name', 'John Doe'),
      )
      .toQuery()
    expect(toWhereCondition(query)).toEqual(
      `(user.id = 'id1') OR (user.id = 'id2') OR (user.name = 'John Doe')`,
    )
  })

  it('should generate a query with OR and AND condition', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereEqualTo('version', 1)
      .whereOr(
        q => q.whereEqualTo('id', 'id1'),
        q => q.whereEqualTo('id', 'id2'),
      )
      .toQuery()
    expect(toWhereCondition(query)).toEqual(
      `(user.version = 1 AND user.id = 'id1') OR (user.version = 1 AND user.id = 'id2')`,
    )
  })

  it('should generate a query with inner OR', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereOr(
        q =>
          q.whereEqualTo('id', 'id1').whereOr(
            q => q.whereEqualTo('version', 1),
            q => q.whereEqualTo('version', 2),
          ),
        q => q.whereEqualTo('id', 'id2'),
      )
      .toQuery()
    expect(toWhereCondition(query)).toEqual(
      `(((user.id = 'id1' AND user.version = 1) OR (user.id = 'id1' AND user.version = 2))) OR (user.id = 'id2')`,
    )
  })

  it('should generate a query with join', () => {
    const repo = new UserRepository()
    const query = new Query(repo).whereJoin('photos', q => q.whereEqualTo('id', 'id1')).toQuery()
    expect(query.relations).toEqual({ photos: true })
    expect(query.where).toEqual({
      photos: { id: 'id1' },
    })
  })

  it('should generate a query with deeper join', () => {
    const repo = new UserRepository()
    const query = new Query(repo)
      .whereJoin('photos', q =>
        q.whereIsNotNull('url').whereJoin('album', q => q.whereEqualTo('name', 'Test')),
      )
      .toQuery()
    expect(query.relations).toEqual({ photos: { album: true } })
    expect(query.where).toEqual({
      photos: {
        url: expect.objectContaining({
          _value: expect.objectContaining({ _type: 'isNull' }),
          _type: 'not',
        }),
        album: { name: 'Test' },
      },
    })
  })

  it('should generate a query with order by ASC', () => {
    const repo = new UserRepository()
    expect(
      new Query(repo).orderByAscending('name').orderByAscending('version').toQuery().order,
    ).toEqual({
      name: 'ASC',
      version: 'ASC',
    })
  })

  it('should generate a query with order by DESC', () => {
    const repo = new UserRepository()
    expect(new Query(repo).orderByDescending('version').toQuery().order).toEqual({
      version: 'DESC',
    })
  })

  it('should generate a query with selection', () => {
    const repo = new UserRepository()
    expect(new Query(repo).select('id').select('createdAt').toQuery().select).toEqual({
      id: true,
      createdAt: true,
    })
  })

  it('should generate a query with relations', () => {
    const repo = new UserRepository()
    expect(
      new Query(repo)
        .fetchRelation('photos', 'album', 'photos', 'user')
        .fetchRelation('followers')
        .fetchRelation('profile')
        .toQuery().relations,
    ).toEqual({
      photos: { album: { photos: { user: true } } },
      followers: true,
      profile: true,
    })
  })

  it('should generate a query with next', () => {
    const repo = new UserRepository()
    expect(new PaginatedQuery(repo).next(toPaginationToken({ skip: 10 })).toQuery()).toEqual(
      expect.objectContaining({
        skip: 10,
        cache: DEFAULT_CACHE_TIME,
        take: DEFAULT_PAGE_SIZE,
      }),
    )
  })

  it('should generate a query with take and skip', () => {
    const repo = new UserRepository()
    expect(
      new PaginatedQuery(repo)
        .next(toPaginationToken({ skip: 10 }))
        .limit(50)
        .toQuery(),
    ).toEqual(
      expect.objectContaining({
        skip: 10,
        take: 50,
        cache: DEFAULT_CACHE_TIME,
      }),
    )
  })

  it('should generate a query with no cache', () => {
    const repo = new UserRepository()
    expect(new Query(repo).toQuery().cache).toEqual(DEFAULT_CACHE_TIME)
    expect(new Query(repo).cache(false).toQuery().cache).toEqual(false)
  })

  it('should generate a query with relation ids', () => {
    const repo = new UserRepository()
    expect(new Query(repo).loadRelationIds().toQuery().loadRelationIds).toEqual(true)
  })

  describe('Terminal Query Enforcement', () => {
    it('should throw error when whereIn is used inside whereJoin', () => {
      const repo = new UserRepository()
      expect(() => new Query(repo).whereJoin('photos', q => q.whereIn('id', ['1', '2']))).toThrow(
        'whereIn() cannot be used inside whereJoin()',
      )
    })

    it('should throw error when whereIn is used inside whereOr', () => {
      const repo = new UserRepository()
      expect(() =>
        new Query(repo).whereOr(
          q => q.whereIn('name', ['John', 'Doe']),
          q => q.whereEqualTo('id', '1'),
        ),
      ).toThrow('whereIn() cannot be used inside whereOr()')
    })

    it('should return TerminalQuery from whereIn', () => {
      const repo = new UserRepository()
      const result = new Query(repo).whereIn('name', ['John', 'Doe'])
      expect(result.constructor.name).toEqual('TerminalQuery')
      expect(result.toQuery()).toBeDefined()
    })

    it('should return TerminalQuery from whereOr', () => {
      const repo = new UserRepository()
      const result = new Query(repo).whereOr(
        q => q.whereEqualTo('id', '1'),
        q => q.whereEqualTo('id', '2'),
      )
      expect(result.constructor.name).toEqual('TerminalQuery')
      expect(result.toQuery()).toBeDefined()
    })

    it('should allow chaining safe methods after whereIn', () => {
      const repo = new UserRepository()
      const result = new Query(repo)
        .whereIn('name', ['John', 'Doe'])
        .orderByAscending('name')
        .fetchRelation('photos')
        .cache(false)
        .toQuery()
      expect(result.order).toEqual({ name: 'ASC' })
      expect(result.relations).toEqual({ photos: true })
      expect(result.cache).toEqual(false)
    })

    it('should allow chaining safe methods after whereOr', () => {
      const repo = new UserRepository()
      const result = new Query(repo)
        .whereOr(
          q => q.whereEqualTo('id', '1'),
          q => q.whereEqualTo('id', '2'),
        )
        .orderByDescending('createdAt')
        .select('id')
        .toQuery()
      expect(result.order).toEqual({ createdAt: 'DESC' })
      expect(result.select).toEqual({ id: true })
    })
  })
})
