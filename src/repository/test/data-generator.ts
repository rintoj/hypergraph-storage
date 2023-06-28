import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { writeFile } from 'fs-extra'
import { BaseEntity } from '../../base-entity'
import { AlbumEntity, PhotoEntity, UserEntity, UserRole } from '../../entity'

function randomFromArray(array: any[], isNullable?: boolean) {
  return array[
    faker.datatype.number({
      min: 0,
      max: array.length + (isNullable ? array.length / 2 : -1),
    })
  ]
}

function generateBaseEntity(): BaseEntity {
  return {
    id: randomUUID(),
  }
}

const tags = ['hiphop', 'music', 'rap', 'producer', 'beatmaker', 'flstudio']

function generateUser(): UserEntity {
  return {
    ...generateBaseEntity(),
    name: faker.name.fullName(),
    email: faker.internet.email().toLowerCase(),
    role: UserRole.USER,
    tags: Array.from(
      new Set(
        new Array(faker.datatype.number({ min: 0, max: 4 }))
          .fill(0)
          .map(() => randomFromArray(tags)),
      ),
    ),
    profile: {
      ...generateBaseEntity(),
      gender: faker.name.gender(),
      age: faker.datatype.number({ min: 10, max: 80 }),
      photo: faker.internet.avatar(),
    },
  }
}

function generatePhoto(data: Data): PhotoEntity {
  return {
    ...generateBaseEntity(),
    url: faker.image.imageUrl(),
    user: randomFromArray(data.users.map(({ id }) => ({ id }))),
    album: randomFromArray(data.albums.map(({ id }) => ({ id }))),
  }
}

const albums = [
  'abstract',
  'animals',
  'avatar',
  'business',
  'cats',
  'city',
  'fashion',
  'food',
  'nature',
  'nightlife',
  'people',
  'sports',
  'technics',
  'transport',
]

function generateAlbum(data: Data, index: number): AlbumEntity {
  return {
    ...generateBaseEntity(),
    name: albums[index],
    owner: randomFromArray(data.users.map(({ id }) => ({ id }))),
  }
}

interface Data {
  users: UserEntity[]
  albums: AlbumEntity[]
  photos: PhotoEntity[]
}

export async function generateData() {
  const data: Data = { users: [], photos: [], albums: [] }
  data.users = new Array(10).fill(0).map(() => generateUser())
  data.albums = new Array(albums.length).fill(0).map((_, index) => generateAlbum(data, index))
  data.photos = new Array(10).fill(0).map(() => generatePhoto(data))
  await writeFile(`${__dirname}/data.json`, JSON.stringify(data, null, 2), 'utf-8')
  return data
}

void generateData()
