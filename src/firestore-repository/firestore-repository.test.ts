import 'reflect-metadata'

import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import * as admin from 'firebase-admin'
import { container } from 'tsyringe'
import { PhotoEntity, UserEntity, UserProfileEntity, UserRole } from '../entity'
import { AlbumEntity } from '../entity/album-entity'
import { FirestorePaginatedQuery, FirestoreQuery } from '../firestore-query'
import data from '../test/data.json'
import { FIRESTORE_INSTANCE } from './firestore-initializer'
import { FirestoreRepository } from './firestore-repository'

function omit<T extends Record<any, any>>(
  target: T | null | undefined,
  ...properties: Array<keyof T>
) {
  if (!target) return target
  return Object.keys(target)
    .filter((key: any) => !properties.includes(key))
    .reduce((a, i) => ({ ...a, [i]: target[i] }), {} as T)
}

class UserRepository extends FirestoreRepository<UserEntity> {
  constructor() {
    super(UserEntity)
  }
}

class AlbumRepository extends FirestoreRepository<AlbumEntity> {
  constructor() {
    super(AlbumEntity)
  }
}

class PhotoRepository extends FirestoreRepository<PhotoEntity> {
  constructor() {
    super(PhotoEntity)
  }
}

class UserProfileRepository extends FirestoreRepository<UserProfileEntity> {
  constructor() {
    super(UserProfileEntity)
  }
}

async function saveAll() {
  await Promise.all([
    container.resolve(UserRepository).saveMany(data.users as any),
    container.resolve(AlbumRepository).saveMany(data.albums),
    container.resolve(PhotoRepository).saveMany(data.photos),
    container.resolve(UserProfileRepository).saveMany(data.users.map(user => user.profile as any)),
  ])
}

async function deleteAll() {
  await Promise.all([
    container.resolve(UserRepository).delete(query => query),
    container.resolve(AlbumRepository).delete(query => query),
    container.resolve(PhotoRepository).delete(query => query),
    container.resolve(UserProfileRepository).delete(query => query),
  ])
}

describe('FirestoreRepository', () => {
  beforeAll(async () => {
    const firestore = admin.initializeApp({ projectId: 'onprem-e9d5b' }).firestore()
    firestore.settings({ host: 'localhost:8080', ssl: false })
    container.registerInstance(FIRESTORE_INSTANCE, firestore)
  })

  beforeEach(async () => {
    await deleteAll()
    await saveAll()
  })

  test('should count the number of entities', async () => {
    const repository = container.resolve(AlbumRepository)
    const result = await repository.count()
    expect(result).toEqual(data.albums.length)
  })

  test('should count the number of entities given a condition', async () => {
    const repository = container.resolve(AlbumRepository)
    const result = await repository.count(
      new FirestoreQuery(repository).whereTextStartsWith('name', 'a'),
    )
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
      new FirestoreQuery(repository).whereEqualTo('id', user.id),
    )
    expect(result).toEqual(expect.objectContaining(omit(user, 'profile')))
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
      new FirestorePaginatedQuery(repository).whereNotEqualTo('role', UserRole.ADMIN),
    )
    expect(result.next).toBeNull()
    expect(Array.from(new Set(result.items.map(user => user.role)))).toEqual([UserRole.USER])
  })

  test('should fetch a users by whereMoreThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereMoreThan('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) > 64).length,
    )
  })

  test('should fetch a users by whereNotMoreThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereNotMoreThan('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) <= 64).length,
    )
  })

  test('should fetch a users by whereMoreThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereMoreThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 64).length,
    )
  })

  test('should fetch a users by whereNotMoreThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereNotMoreThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) < 64).length,
    )
  })

  test('should fetch a users by whereLessThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereLessThan('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) < 64).length,
    )
  })

  test('should fetch a users by whereNotLessThan query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereNotLessThan('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 64).length,
    )
  })

  test('should fetch a users by whereLessThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereLessThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) <= 64).length,
    )
  })

  test('should fetch a users by whereNotLessThanOrEqual query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereNotLessThanOrEqual('age', 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) > 64).length,
    )
  })

  test('should fetch a users by whereBetween query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereBetween('age', 48, 64),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => (user.profile.age ?? 0) >= 48 && (user.profile.age ?? 0) <= 64)
        .length,
    )
  })

  test('should fetch a users by whereTextStartsWith query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereTextStartsWith('name', 'Mrs'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => /^Mrs/.test(user.name ?? '')).length,
    )
  })

  // test('should fetch a users by whereTextContains query', async () => {
  //   const repository = container.resolve(UserRepository)
  //   const result = await repository.find(
  //     new FirestorePaginatedQuery(repository).whereTextContains('name', 'Hilll'),
  //   )
  //   expect(result.items.length).toEqual(
  //     data.users.filter(user => /Hilll/.test(user.name ?? '')).length,
  //   )
  // })

  // test('should fetch a users by whereTextEndsWith query', async () => {
  //   const repository = container.resolve(UserRepository)
  //   const result = await repository.find(
  //     new FirestorePaginatedQuery(repository).whereTextEndsWith('name', 'II'),
  //   )
  //   expect(result.items.length).toEqual(
  //     data.users.filter(user => /II$/.test(user.name ?? '')).length,
  //   )
  // })

  test('should fetch a users by whereIn query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereIn('age', [64, 73]),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => [64, 73].includes(user.profile?.age ?? 0)).length,
    )
  })

  test('should fetch a users by whereIsNull query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereIsNull('deletedAt'),
    )
    expect(result.items.length).toEqual(data.users.length)
  })

  test('should fetch a users by whereIsNotNull query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereIsNotNull('name'),
    )
    expect(result.items.length).toEqual(data.users.length)
  })

  test('should fetch a users by whereArrayContains query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereArrayContains('tags', 'music'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => user.tags.includes('music')).length,
    )
  })

  test('should fetch a users by whereArrayContainsAny query', async () => {
    const repository = container.resolve(UserRepository)
    const result = await repository.find(
      new FirestorePaginatedQuery(repository).whereArrayContainsAny('tags', ['music', 'hiphop']),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => user.tags?.includes('music') || user.tags?.includes('hiphop'))
        .length,
    )
  })

  // test('should fetch a users by whereJoin query', async () => {
  //   const repository = container.resolve(UserRepository)
  //   const result = await repository.find(
  //     new FirestorePaginatedQuery(repository).whereJoin('profile', q => q.whereEqualTo('age', 48)),
  //   )
  //   expect(result.items.length).toEqual(
  //     data.users.filter(user => (user.profile?.age ?? 0) === 48).length,
  //   )
  // })

  test('should fetch a users by whereOr query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestoreQuery(repository).whereOr(
        q => q.whereEqualTo('age', 48),
        q => q.whereEqualTo('age', 64),
      ),
    )
    expect(result.items.length).toEqual(
      data.users.filter(user => [48, 64].includes(user.profile?.age ?? 0)).length,
    )
  })

  test('should fetch a users by whereOr and AND query', async () => {
    const repository = container.resolve(UserProfileRepository)
    const result = await repository.find(
      new FirestoreQuery(repository)
        .whereOr(
          q => q.whereEqualTo('age', 48),
          q => q.whereEqualTo('age', 64),
        )
        .whereTextStartsWith('gender', 'Male'),
    )
    expect(result.items.length).toEqual(
      data.users.filter(
        user => [48, 64].includes(user.profile?.age ?? 0) && /Male/.test(user.profile.gender),
      ).length,
    )
  })

  test('should allow pagination with find', async () => {
    const repository = container.resolve(UserRepository)
    const page1 = await repository.find(new FirestorePaginatedQuery(repository).limit(2))
    expect(page1.next).not.toBeNull()
    expect(page1.items[0]).toBeDefined()
    expect(page1.items[1]).toBeDefined()
    expect(page1.items[2]).not.toBeDefined()
    const page2 = await repository.find(
      new FirestorePaginatedQuery(repository).next(page1.next).limit(2),
    )
    expect(page2.next).not.toBeNull()
    expect(page2.items[0]).toBeDefined()
    expect(page2.items[1]).toBeDefined()
    expect(page2.items[2]).not.toBeDefined()
    expect(page1.items[0]).not.toEqual(page2.items[0])
    expect(page1.items[1]).not.toEqual(page2.items[1])
    const page3 = await repository.find(new FirestorePaginatedQuery(repository).next(page2.next))
    expect(page3.next).toBeNull()
    expect(page3.items[0]).not.toEqual(page1.items[0])
    expect(page3.items[0]).not.toEqual(page2.items[0])
    expect(page3.items[1]).not.toEqual(page1.items[1])
    expect(page3.items[1]).not.toEqual(page2.items[1])
  })

  test('should return a page with no next token when reaches the end of pagination', async () => {
    const repository = container.resolve(UserRepository)
    const pageWithDefaultSize = await repository.find(new FirestorePaginatedQuery(repository))
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
    const sortBy = (a: any, b: any) => a.imageDepth - b.imageDepth
    try {
      const result = await repository.insertMany(images)
      const queryResult = await repository.find(
        new FirestorePaginatedQuery(repository).whereIn(
          'id',
          images.map(i => i.id),
        ),
      )
      expect(queryResult.items.sort(sortBy)).toEqual(result.sort(sortBy))
    } finally {
      await repository.delete(images.map(i => i.id))
    }
  })

  test('should throw an error if an item with existing id is attempted to be inserted', async () => {
    const id = data.photos[5].id
    const repository = container.resolve(PhotoRepository)
    await expect(() =>
      repository.insert({ id, url: faker.image.imageUrl(), imageDepth: 1 }),
    ).rejects.toThrowError('entity already exists')
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
      const queryResult = await repository.find(
        new FirestorePaginatedQuery(repository).whereIn(
          'id',
          images.map(i => i.id),
        ),
      )
      const sortBy = (a: any, b: any) => a.imageDepth - b.imageDepth
      expect(queryResult.items.sort(sortBy)).toEqual(result.sort(sortBy))
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
    await repository.updateMany(
      new FirestorePaginatedQuery(repository).whereEqualTo('imageDepth', 10),
      {
        imageDepth: 2,
      },
    )
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
    ).rejects.toThrow('No record with id')
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
      await repository.delete(new FirestorePaginatedQuery(repository).whereEqualTo('imageDepth', 1))
      const item = await repository.findById(id)
      expect(item).toBeNull()
    } finally {
      await repository.delete(id)
    }
  })

  // test('should do a soft delete and restore', async () => {
  //   const repository = container.resolve(PhotoRepository)
  //   const item = await repository.insert({
  //     id: randomUUID(),
  //     url: faker.image.imageUrl(),
  //     imageDepth: 1,
  //   })
  //   await repository.delete(item.id, { softDelete: true })
  //   expect(await repository.findById(item.id)).toBeNull()
  //   await repository.restore(item.id)
  //   expect(await repository.findById(item.id)).toEqual({
  //     ...item,
  //     updatedAt: expect.anything(),
  //     version: expect.any(Number),
  //   })
  // })

  // test('should do a soft delete and restore through query', async () => {
  //   const repository = container.resolve(PhotoRepository)
  //   const item = await repository.insert({
  //     id: randomUUID(),
  //     url: faker.image.imageUrl(),
  //     imageDepth: 1,
  //   })
  //   const query = new FirestorePaginatedQuery(repository).whereEqualTo('id', item.id)
  //   await repository.delete(query, { softDelete: true })
  //   expect(await repository.findById(item.id)).toBeNull()
  //   await repository.restore(query)
  //   expect(await repository.findById(item.id)).toEqual({
  //     ...item,
  //     updatedAt: expect.anything(),
  //     version: expect.any(Number),
  //   })
  // })

  test('should not throw an error if query results in no items during delete', async () => {
    const repository = container.resolve(PhotoRepository)
    const records = await repository.delete(
      new FirestorePaginatedQuery(repository).whereOr(
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
    } = await repository.find(new FirestorePaginatedQuery(repository).whereIsNotNull('id'))
    await repository.delete(
      new FirestorePaginatedQuery(repository).whereOr(
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
    await repository.increment(
      new FirestorePaginatedQuery(repository).whereEqualTo('id', id),
      'imageDepth',
    )
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
      new FirestorePaginatedQuery(repository).whereOr(
        q => q.whereEqualTo('id', item1.id),
        q => q.whereEqualTo('id', item2.id),
      ),
      'imageDepth',
    )
    expect((await repository.findById(item1.id))?.imageDepth).toEqual((item1.imageDepth ?? 0) + 1)
    expect((await repository.findById(item2.id))?.imageDepth).toEqual((item2.imageDepth ?? 0) + 1)
  })
})
