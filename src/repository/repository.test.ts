import 'reflect-metadata'

import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { container } from 'tsyringe'
import { Repository } from '.'
import { AlbumEntity, PhotoEntity, UserEntity, UserRole } from '../entity'
import { UserProfileEntity } from '../entity/user-profile-entity'
import { Query, TerminalPaginatedQuery } from '../query'
import { PaginatedQuery } from '../query/query'
import data from '../test/data.json'
import { MockTypeORMDataSource, initializeMockDataSource } from '../typeorm-mock'

function omit<T extends Record<any, any>>(
  target: T | null | undefined,
  ...properties: Array<keyof T>
) {
  if (!target) return target
  return Object.keys(target)
    .filter((key: any) => !properties.includes(key))
    .reduce((a, i) => ({ ...a, [i]: target[i] }), {} as T)
}

describe('Repository', () => {
  let dataSource: MockTypeORMDataSource

  class UserRepository extends Repository<UserEntity> {
    constructor() {
      super(UserEntity)
    }
  }

  class UserProfileRepository extends Repository<UserProfileEntity> {
    constructor() {
      super(UserProfileEntity)
    }
  }

  class AlbumRepository extends Repository<AlbumEntity> {
    constructor() {
      super(AlbumEntity)
    }
  }

  class PhotoRepository extends Repository<PhotoEntity> {
    constructor() {
      super(PhotoEntity)
    }
  }

  beforeEach(async () => {
    dataSource = await initializeMockDataSource({
      type: 'postgres',
      database: 'hypergraph-local',
      entities: [AlbumEntity, PhotoEntity, UserEntity, UserProfileEntity],
      synchronize: false,
      retry: 0,
    })
    await container.resolve(UserRepository).saveMany(data.users as any)
    await container.resolve(AlbumRepository).saveMany(data.albums)
    await container.resolve(PhotoRepository).saveMany(data.photos)
  })

  afterEach(async () => {
    dataSource?.destroy()
  })

  test('should count the number of entities', async () => {
    const repository = container.resolve(AlbumRepository)
    const result = await repository.count()
    expect(result).toEqual(data.albums.length)
  })

  test('should count the number of entities given a condition', async () => {
    const repository = container.resolve(AlbumRepository)
    const result = await repository.count(new Query(repository).whereTextStartsWith('name', 'a'))
    expect(result).toEqual(data.albums.filter(({ name }) => /^a/.test(name)).length)
  })

  test('should fetch a user by findById', async () => {
    const repository = container.resolve(UserRepository)
    const [user] = data.users
    const result = await repository.findById(user.id)
    expect(result).toEqual(expect.objectContaining(omit(user, 'profile')))
  })

  test('should fetch a user by findOne', async () => {
    const repository = container.resolve(UserRepository)
    const [user] = data.users
    const result = await repository.findOne(
      new Query(repository).fetchRelation('profile').whereEqualTo('id', user.id),
    )
    expect(result).toEqual(
      expect.objectContaining({
        ...user,
        profile: expect.objectContaining(user.profile),
      }),
    )
  })

  test('should fetch a user by findOne without a query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.findOne()
    expect(result).toBeDefined()
  })

  test('should fetch a user by findByIds', async () => {
    const repository = container.resolve(UserRepository)
    const userIds = data.users.map(user => user.id).slice(0, 2)
    const result = await repository.findByIds(userIds.concat(randomUUID()))
    expect(result[0]).not.toBeNull()
    expect(result[1]).not.toBeNull()
    expect(result[2]).toBeNull()
  })

  test('should fetch a users by whereNotEqualTo query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereNotEqualTo('role', UserRole.ADMIN),
    )
    expect(result.next).toBeNull()
    expect(Array.from(new Set(result.items.map(user => user.role)))).toEqual([UserRole.USER])
  })

  test('should fetch a users by whereMoreThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereMoreThan('age', 64))
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) > 64).length,
    )
  })

  test('should fetch a users by whereNotMoreThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereNotMoreThan('age', 64))
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) <= 64).length,
    )
  })

  test('should fetch a users by whereMoreThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereMoreThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 64).length,
    )
  })

  test('should fetch a users by whereNotMoreThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereNotMoreThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) < 64).length,
    )
  })

  test('should fetch a users by whereLessThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereLessThan('age', 64))
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) < 64).length,
    )
  })

  test('should fetch a users by whereNotLessThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereNotLessThan('age', 64))
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 64).length,
    )
  })

  test('should fetch a users by whereLessThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereLessThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) <= 64).length,
    )
  })

  test('should fetch a users by whereNotLessThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereNotLessThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) > 64).length,
    )
  })

  test('should fetch a users by whereBetween query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereBetween('age', 48, 64))
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 48 && (user.profile.age ?? 0) <= 64)
        .length,
    )
  })

  test('should fetch a users by whereTextContains query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereTextContains('name', 'Hilll'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => /Hilll/.test(user.name ?? '')).length,
    )
  })

  test('should fetch a users by whereTextStartsWith query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereTextStartsWith('name', 'Mrs'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => /^Mrs/.test(user.name ?? '')).length,
    )
  })

  test('should fetch a users by whereTextEndsWith query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereTextEndsWith('name', 'II'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => /II$/.test(user.name ?? '')).length,
    )
  })

  test('should fetch a users by whereIn query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const terminalQuery = new PaginatedQuery(repository).whereIn('age', [64, 73])
    const result = await repository.find(TerminalPaginatedQuery.from(terminalQuery))
    expect(result.items.length).toEqual(
      data.users.filter(user => [64, 73].includes(user.profile?.age ?? 0)).length,
    )
  })

  test('should fetch a users by whereIsNull query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereIsNull('deletedAt'))
    expect(result.items.length).toEqual(data.users.length)
  })

  test('should fetch a users by whereIsNotNull query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(new PaginatedQuery(repository).whereIsNotNull('name'))
    expect(result.items.length).toEqual(data.users.length)
  })

  // TODO: does not work with 'pg-mem' due a bug in the library
  // test('should fetch a users by whereArrayContains query', async () => {
  //   const repository = container.resolve(UserRepository)
  //   const result = await repository.find(
  //     new PaginatedQuery(repository).whereArrayContains('tags', 'music'),
  //   )
  //   expect(result.items.length).toEqual(
  //     data.users.filter(user => user.tags.includes('music')).length,
  //   )
  // })

  test('should fetch a users by whereArrayContainsAny query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereArrayContainsAny('tags', ['music', 'hiphop']),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => user.tags?.includes('music') || user.tags?.includes('hiphop'))
        .length,
    )
  })

  test('should fetch a users by whereJoin query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new PaginatedQuery(repository).whereJoin('profile', q => q.whereEqualTo('age', 48)),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile?.age ?? 0) === 48).length,
    )
  })

  test('should fetch a users by whereOr query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const terminalQuery = new Query(repository).whereOr(
      q => q.whereEqualTo('age', 48),
      q => q.whereEqualTo('age', 64),
    )
    const result = await repository.find(TerminalPaginatedQuery.from(terminalQuery))
    expect(result.items.length).toEqual(
      data.users.filter(user => [48, 64].includes(user.profile?.age ?? 0)).length,
    )
  })

  test('should fetch a users by whereOr with AND condition inside each branch', async () => {
    const repository = container.resolve(UserProfileRepository)
    // To combine OR with AND, include the AND condition inside each OR branch
    const terminalQuery = new Query(repository).whereOr(
      q => q.whereEqualTo('age', 48).whereTextContains('gender', 'Male'),
      q => q.whereEqualTo('age', 64).whereTextContains('gender', 'Male'),
    )
    const result = await repository.find(TerminalPaginatedQuery.from(terminalQuery))
    expect(result.items.length).toEqual(
      data.users.filter(
        user => [48, 64].includes(user.profile?.age ?? 0) && /Male/.test(user.profile.gender),
      ).length,
    )
  })

  test('should allow pagination with find', async () => {
    const repository = container.resolve(UserRepository)
    const page1 = await repository.find(new PaginatedQuery(repository).limit(2))
    expect(page1.next).not.toBeNull()
    expect(page1.items[0]).toBeDefined()
    expect(page1.items[1]).toBeDefined()
    expect(page1.items[2]).not.toBeDefined()
    const page2 = await repository.find(new PaginatedQuery(repository).next(page1.next))
    expect(page2.next).not.toBeNull()
    expect(page2.items[0]).toBeDefined()
    expect(page2.items[1]).toBeDefined()
    expect(page2.items[2]).not.toBeDefined()
    expect(page1.items[0]).not.toEqual(page2.items[0])
    expect(page1.items[1]).not.toEqual(page2.items[1])
  })

  test('should return a page with no next token when reaches the end of pagination', async () => {
    const repository = container.resolve(UserRepository)
    const pageWithDefaultSize = await repository.find(new PaginatedQuery(repository))
    expect(pageWithDefaultSize.next).toBeNull()
    expect(pageWithDefaultSize.items.length).toEqual(data.users.length)
  })

  test('should insert a single item to the database', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    try {
      const result = await repository.insert({
        id,
        url: faker.image.imageUrl(),
        imageDepth: 1,
      })
      const item = await repository.findById(id)
      expect(item).toEqual(result)
    } finally {
      await repository.delete(id)
    }
  })

  test('should insert many items to the database', async () => {
    const images = new Array(3).fill(0).map((_, index) => ({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: index,
    }))
    const repository = container.resolve(PhotoRepository)
    try {
      const result = await repository.insertMany(images)
      const terminalQuery = new PaginatedQuery(repository).whereIn(
        'id',
        images.map(i => i.id),
      )
      const queryResult = await repository.find(TerminalPaginatedQuery.from(terminalQuery))
      expect(queryResult.items).toEqual(result)
    } finally {
      await repository.delete(images.map(i => i.id))
    }
  })

  test('should throw an error if an item with existing id is attempted to be inserted', async () => {
    const id = data.photos[5].id
    const repository = container.resolve(PhotoRepository)
    await expect(() =>
      repository.insert({ id, url: faker.image.imageUrl(), imageDepth: 1 }),
    ).rejects.toThrowError('duplicate key value violates unique constraint')
  })

  test('should save a single item to the database', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    try {
      const result = await repository.save({
        id,
        url: faker.image.imageUrl(),
        imageDepth: 1,
      })
      const item = await repository.findById(id)
      expect(item).toEqual(result)
    } finally {
      await repository.delete(id)
    }
  })

  test('should not throw an error if an item with existing id is attempted to be saved', async () => {
    const photo = data.photos[5]
    const repository = container.resolve(PhotoRepository)
    const update = { id: photo.id, url: faker.image.imageUrl(), imageDepth: 1 }
    const result = await repository.save(update)
    expect(result).toEqual(
      expect.objectContaining(
        omit({ ...photo, ...update } as PhotoEntity, 'user', 'album', 'createdAt'),
      ),
    )
  })

  test('should save many items to the database', async () => {
    const images = new Array(3).fill(0).map((_, index) => ({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: index,
    }))
    const repository = container.resolve(PhotoRepository)
    try {
      const result = await repository.saveMany(images)
      const terminalQuery = new PaginatedQuery(repository).whereIn(
        'id',
        images.map(i => i.id),
      )
      const queryResult = await repository.find(TerminalPaginatedQuery.from(terminalQuery))
      expect(queryResult.items).toEqual(result)
    } finally {
      await repository.delete(images.map(i => i.id))
    }
  })

  test('should update an existing item', async () => {
    const repository = container.resolve(PhotoRepository)
    const item = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    const image = { id: item?.id, url: faker.image.imageUrl(), imageDepth: 1 }
    await repository.update(image)
    const result = await repository.findById(item.id)
    expect(result).toEqual(expect.objectContaining(image))
  })

  test('should update multiple items', async () => {
    const repository = container.resolve(PhotoRepository)
    const item1 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 10,
    })
    const item2 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 10,
    })
    await repository.updateMany(new Query(repository).whereEqualTo('imageDepth', 10), {
      imageDepth: 2,
    })
    const result = await repository.findByIds([item1.id, item2.id])
    expect(result[0]).toEqual(
      expect.objectContaining({ id: item1.id, url: item1.url, imageDepth: 2 }),
    )
    expect(result[1]).toEqual(
      expect.objectContaining({ id: item2.id, url: item2.url, imageDepth: 2 }),
    )
  })

  test('should reject update with an error if id is invalid', async () => {
    const repository = container.resolve(PhotoRepository)
    await expect(() =>
      repository.update({
        id: randomUUID(),
        url: faker.image.imageUrl(),
        imageDepth: 1,
      }),
    ).rejects.toThrow('No such PhotoEntity of id')
  })

  test('should delete an item by query', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    try {
      await repository.insert({
        id,
        url: faker.image.imageUrl(),
        imageDepth: 1,
      })
      await repository.delete(new Query(repository).whereEqualTo('imageDepth', 1))
      const item = await repository.findById(id)
      expect(item).toBeNull()
    } finally {
      await repository.delete(id)
    }
  })

  test('should do a soft delete and restore', async () => {
    const repository = container.resolve(PhotoRepository)
    const item = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    await repository.delete(item.id, { softDelete: true })
    expect(await repository.findById(item.id)).toBeNull()
    await repository.restore(item.id)
    expect(await repository.findById(item.id)).toEqual({
      ...item,
      updatedAt: expect.anything(),
      version: expect.any(Number),
    })
  })

  test('should do a soft delete and restore through query', async () => {
    const repository = container.resolve(PhotoRepository)
    const item = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    const query = new Query(repository).whereEqualTo('id', item.id)
    await repository.delete(query, { softDelete: true })
    expect(await repository.findById(item.id)).toBeNull()
    await repository.restore(query)
    expect(await repository.findById(item.id)).toEqual({
      ...item,
      updatedAt: expect.anything(),
      version: expect.any(Number),
    })
  })

  test('should not throw an error if query results in no items during delete', async () => {
    const repository = container.resolve(PhotoRepository)
    const records = await repository.delete(
      new Query(repository).whereOr(
        q => q.whereEqualTo('id', randomUUID()),
        q => q.whereEqualTo('id', randomUUID()),
      ),
    )
    expect(records.length).toEqual(0)
  })

  test('should throw an error if delete uses or operation', async () => {
    const repository = container.resolve(PhotoRepository)
    const {
      items: [item1, item2],
    } = await repository.find(new PaginatedQuery(repository).whereIsNotNull('id'))
    await repository.delete(
      new Query(repository).whereOr(
        q => q.whereEqualTo('id', item1?.id),
        q => q.whereEqualTo('id', item2?.id),
      ),
    )
    const [updatedItem1, updatedItem2] = await repository.findByIds([item1.id, item2?.id])
    expect(updatedItem1).toBeNull()
    expect(updatedItem2).toBeNull()
  })

  test('should allow to increment a numeric value', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    const item = await repository.insert({
      id,
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    await repository.increment(id, 'imageDepth')
    expect((await repository.findById(id))?.imageDepth).toEqual((item.imageDepth ?? 0) + 1)
    await repository.increment(id, 'imageDepth', 2)
    expect((await repository.findById(id))?.imageDepth).toEqual((item.imageDepth ?? 0) + 3)
    await repository.increment(id, 'imageDepth', -1)
    expect((await repository.findById(id))?.imageDepth).toEqual((item.imageDepth ?? 0) + 2)
  })

  test('should allow to increment by more than one id', async () => {
    const repository = container.resolve(PhotoRepository)
    const item1 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    const item2 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 4,
    })
    await repository.increment([item1.id, item2.id], 'imageDepth')
    expect((await repository.findById(item1.id))?.imageDepth).toEqual((item1.imageDepth ?? 0) + 1)
    expect((await repository.findById(item2.id))?.imageDepth).toEqual((item2.imageDepth ?? 0) + 1)
  })

  test('should allow to increment by query', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    const item = await repository.insert({
      id,
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    await repository.increment(new Query(repository).whereEqualTo('id', id), 'imageDepth')
    expect((await repository.findById(item.id))?.imageDepth).toEqual((item.imageDepth ?? 0) + 1)
  })

  test('should allow to increment with or condition', async () => {
    const repository = container.resolve(PhotoRepository)
    const item1 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    const item2 = await repository.insert({
      id: randomUUID(),
      url: faker.image.imageUrl(),
      imageDepth: 4,
    })
    await repository.increment(
      new Query(repository).whereOr(
        q => q.whereEqualTo('id', item1.id),
        q => q.whereEqualTo('id', item2.id),
      ),
      'imageDepth',
    )
    expect((await repository.findById(item1.id))?.imageDepth).toEqual((item1.imageDepth ?? 0) + 1)
    expect((await repository.findById(item2.id))?.imageDepth).toEqual((item2.imageDepth ?? 0) + 1)
  })

  test('should throw an error if an invalid query is passed on', async () => {
    const id = randomUUID()
    const repository = container.resolve(PhotoRepository)
    await repository.insert({
      id,
      url: faker.image.imageUrl(),
      imageDepth: 1,
    })
    await expect(() => repository.increment(new Query(repository), 'imageDepth')).rejects.toThrow(
      'Invalid query: no WHERE condition!',
    )
  })
})
