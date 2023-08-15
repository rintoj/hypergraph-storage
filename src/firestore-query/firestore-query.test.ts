import { FirestorePaginatedQuery, FirestoreQuery } from './firestore-query'

interface MockUser {
  id?: string
}

interface MockEntity {
  id: string
  email?: string
  age?: number
  userRoles?: string[]
  author: MockUser
}

class MockRepository {
  constructor(public readonly collection: any) {}
}

describe('FirestoreQuery', () => {
  test('should call "where" firebase api with ==', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereEqualTo('email', 'johndoe@company.com')
    expect(where).toBeCalledWith('email', '==', 'johndoe@company.com')
  })

  test('should not call "where" firebase api with == if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereEqualTo('email', undefined)
    expect(where).not.toBeCalledWith('email', '==', undefined)
  })

  test('should call "where" firebase api with !=', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotEqualTo('email', 'johndoe@company.com')
    expect(where).toBeCalledWith('email', '!=', 'johndoe@company.com')
  })

  test('should not call "where" firebase api with != if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotEqualTo('email', undefined)
    expect(where).not.toBeCalledWith('email', '!=', undefined)
  })

  test('should call "where" firebase api with == NULL', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereIsNull('email')
    expect(where).toBeCalledWith('email', '==', null)
  })

  test('should call "where" firebase api with != NULL', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereIsNotNull('email')
    expect(where).toBeCalledWith('email', '!=', null)
  })

  test('should call "where" firebase api with >=', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereMoreThanOrEqual('age', 10)
    expect(where).toBeCalledWith('age', '>=', 10)
  })

  test('should not call "where" firebase api with >= if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereMoreThanOrEqual('age', undefined)
    expect(where).not.toBeCalledWith('age', '>=', undefined)
  })

  test('should call "where" firebase api with NOT >=', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotMoreThanOrEqual('age', 10)
    expect(where).toBeCalledWith('age', '<', 10)
  })
  it('should not call "where" firebase api with NOT >= if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotMoreThanOrEqual('age', undefined)
    expect(where).not.toBeCalledWith('age', '<', undefined)
  })

  test('should call "where" firebase api with >', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereMoreThan('age', 18)
    expect(where).toBeCalledWith('age', '>', 18)
  })

  test('should not call "where" firebase api with > if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereMoreThan('age', undefined)
    expect(where).not.toBeCalledWith('age', '>', undefined)
  })

  test('should call "where" firebase api with NOT >', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotMoreThan('age', 18)
    expect(where).toBeCalledWith('age', '<=', 18)
  })

  test('should not call "where" firebase api with NOT > if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotMoreThan('age', undefined)
    expect(where).not.toBeCalledWith('age', '<=', undefined)
  })

  test('should call "where" firebase api with <', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereLessThan('age', 18)
    expect(where).toBeCalledWith('age', '<', 18)
  })

  test('should not call "where" firebase api with < if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereLessThan('age', undefined)
    expect(where).not.toBeCalledWith('age', '<', undefined)
  })

  test('should call "where" firebase api with NOT <', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotLessThan('age', 18)
    expect(where).toBeCalledWith('age', '>=', 18)
  })

  test('should not call "where" firebase api with NOT < if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotLessThan('age', undefined)
    expect(where).not.toBeCalledWith('age', '>=', undefined)
  })

  test('should call "where" firebase api with <=', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereLessThanOrEqual('age', 10)
    expect(where).toBeCalledWith('age', '<=', 10)
  })

  test('should not call "where" firebase api with <=, if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereLessThanOrEqual('age', undefined)
    expect(where).not.toBeCalledWith('age', '<=', undefined)
  })

  test('should call "where" firebase api with NOT <=', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotLessThanOrEqual('age', 10)
    expect(where).toBeCalledWith('age', '>', 10)
  })

  test('should not call "where" firebase api with NOT <=, if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereNotLessThanOrEqual('age', undefined)
    expect(where).not.toBeCalledWith('age', '>', undefined)
  })

  test('should call "where" firebase api with between', () => {
    const secondWhere = jest.fn()
    const where = jest.fn().mockImplementation(() => ({ where: secondWhere }))
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereBetween('age', 10, 20)
    expect(where).toBeCalledWith('age', '>=', 10)
    expect(secondWhere).toBeCalledWith('age', '<=', 20)
  })

  test('should not call "where" firebase api with between if either value is undefined', () => {
    const secondWhere = jest.fn()
    const where = jest.fn().mockImplementation(() => ({ where: secondWhere }))
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereBetween('age', undefined, 20)
    expect(where).not.toBeCalledWith('age', '>=', 10)
    expect(secondWhere).not.toBeCalledWith('age', '<=', 20)
    query.whereBetween('age', 10, undefined)
    expect(where).not.toBeCalledWith('age', '>=', 10)
    expect(secondWhere).not.toBeCalledWith('age', '<=', 20)
  })

  test('should call "where" firebase api with "array-contains"', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereArrayContains('userRoles', 'johndoe@company.com')
    expect(where).toBeCalledWith('userRoles', 'array-contains', 'johndoe@company.com')
  })

  test('should not call "where" firebase api with "array-contains", if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereArrayContains('userRoles', undefined)
    expect(where).not.toBeCalledWith('userRoles', 'array-contains', undefined)
  })

  test('should call "where" firebase api with "array-contains-any"', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereArrayContainsAny('userRoles', ['johndoe@company.com'])
    expect(where).toBeCalledWith('userRoles', 'array-contains-any', ['johndoe@company.com'])
  })

  test('should not call "where" firebase api with "array-contains-any" if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereArrayContainsAny('userRoles', undefined)
    expect(where).not.toBeCalledWith('userRoles', 'array-contains-any', undefined)
  })

  test('should call "where" firebase api with "in"', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereIn('email', ['johndoe@company.com'])
    expect(where).toBeCalledWith('email', 'in', ['johndoe@company.com'])
  })

  test('should not call "where" firebase api with "in", if value is undefined', () => {
    const where = jest.fn()
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereIn('email', undefined)
    expect(where).not.toBeCalledWith('email', 'in', undefined)
  })

  test('should call "where" firebase api with "or"', () => {
    const where = jest.fn().mockImplementation(() => ({ where: () => null }))
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereOr(
      q => q.whereEqualTo('age', 10),
      q => q.whereEqualTo('email', 'test@test.com'),
    )
    expect(where).toBeCalledWith('age', '==', 10)
    expect(where).toBeCalledWith('email', '==', 'test@test.com')
    expect(where).toBeCalledWith({
      filters: [{ where: expect.any(Function) }, { where: expect.any(Function) }],
      operator: 'OR',
    })
  })

  test('should call "orderBy" firebase api', () => {
    const orderBy = jest.fn()
    const repo: any = new MockRepository({ orderBy })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.orderByAscending('email')
    expect(orderBy).toBeCalledWith('email', 'asc')
  })

  test('should call "orderBy" firebase api with "desc"', () => {
    const orderBy = jest.fn()
    const repo: any = new MockRepository({ orderBy })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.orderByDescending('email')
    expect(orderBy).toBeCalledWith('email', 'desc')
  })

  test('should call "where" firebase api with textStartsWith', () => {
    const where = jest.fn().mockImplementation(() => ({ where }))
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereTextStartsWith('email', 'test')
    expect(where).toBeCalledWith('email', '>=', 'test')
    expect(where).toBeCalledWith('email', '<=', 'test' + '\uf8ff')
  })

  test('should not call "where" firebase api with textStartsWith, if value is undefined', () => {
    const where = jest.fn().mockImplementation(() => ({ where }))
    const repo: any = new MockRepository({ where })
    const query = new FirestoreQuery<MockEntity>(repo)
    query.whereTextStartsWith('email', undefined)
    expect(where).not.toBeCalledWith('email', '>=', 'test')
    expect(where).not.toBeCalledWith('email', '<=', 'test' + '\uf8ff')
  })

  test('should return internal query when toFirestoreQuery is called', () => {
    const internalQuery = { where: jest.fn() }
    const repo: any = new MockRepository(internalQuery)
    const query = new FirestoreQuery<MockEntity>(repo)
    expect(query.toQuery()).toEqual({ cache: 5000, queryRef: expect.any(Object) })
  })

  test('should call "limit" firebase api', () => {
    const limit = jest.fn()
    const repo: any = new MockRepository({ limit })
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    query.limit(100)
    expect(query.toQuery().limit).toEqual(100)
  })

  test('should call "next" firebase api', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    query.next('abc')
    expect(query.toQuery().next).toEqual('abc')
  })

  test('should call "pagination" api', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    query.pagination({ next: 'WyIxIl0=', limit: 20 })
    expect(query.toQuery().next).toEqual('WyIxIl0=')
    expect(query.toQuery().limit).toEqual(20)
  })

  test('should not call "pagination" api if value is undefined', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    query.pagination(undefined)
    expect(query.toQuery().next).toEqual(undefined)
    expect(query.toQuery().limit).toEqual(undefined)
  })

  test('should call "startAfter" firebase api when next token is undefined', () => {
    const startAfter = jest.fn()
    const repo: any = new MockRepository({ startAfter })
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    query.next(undefined)
    expect(startAfter).not.toBeCalledWith('1')
  })

  test('should throw an error if "whereTextContains" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereTextContains('email', 'test')).toThrow('is not supported')
  })

  test('should throw an error if "whereTextEndsWith" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereTextEndsWith('email', 'test')).toThrow('is not supported')
  })

  test('should throw an error if "whereTextInAnyCaseContains" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereTextInAnyCaseContains('email', 'test')).toThrow('is not supported')
  })

  test('should throw an error if "whereTextInAnyCaseStartsWith" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereTextInAnyCaseStartsWith('email', 'test')).toThrow('is not supported')
  })

  test('should throw an error if "whereTextInAnyCaseEndsWith" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereTextInAnyCaseEndsWith('email', 'test')).toThrow('is not supported')
  })

  test('should throw an error if "whereJoin" is called', () => {
    const repo: any = new MockRepository({})
    const query = new FirestorePaginatedQuery<MockEntity>(repo)
    expect(() => query.whereJoin('author', query => query)).toThrow('is not implemented')
  })
})
