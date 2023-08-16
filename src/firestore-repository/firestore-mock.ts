import { cloneDeep, pick } from 'lodash'
import { ById, toByProperty } from 'tsds-tools'
import { container } from 'tsyringe'
import { FIRESTORE_INSTANCE } from './firestore-initializer'

class MockArrayUnion<T> {
  public readonly values: T[] = []
  constructor(...values: T[]) {
    this.values = values
  }
}

class MockArrayRemove<T> {
  public readonly values: T[] = []
  constructor(...values: T[]) {
    this.values = values
  }
}

class MockIncrement {
  constructor(public readonly incrementBy: number = 1) {}
}

jest.mock('./firestore-initializer', () => {
  return {
    FieldValue: {
      arrayUnion: (...values: any) => new MockArrayUnion(...values),
      arrayRemove: (...values: any) => new MockArrayRemove(...values),
      increment: (...values: any) => new MockIncrement(...values),
      serverTimestamp: () => new Date().toISOString(),
    },
    resolveFirestore: () => container.resolve(FIRESTORE_INSTANCE),
  }
})

type RecordWithId = { id: string }
type FirestoreMockData<T extends RecordWithId = any> = ById<ById<T>>

class MockFirestoreDoc<T extends { id: string }> {
  constructor(public item?: T) {}
  get id() {
    return this.item?.id
  }
  get exists() {
    return !!this.item
  }
  data() {
    return this.item
  }
}

function mergeValues<T extends RecordWithId>(currentItem: T | undefined = {} as any, update: T): T {
  type KeyType = keyof T
  return Object.keys(update).reduce((object: T, id: string) => {
    const key = id as KeyType
    const value: any = update[key]
    const currentValue: any = currentItem?.[key]
    if (value instanceof MockArrayUnion) {
      return {
        ...object,
        [key]:
          currentValue instanceof Array
            ? Array.from(new Set([...(currentValue ?? []), ...value.values]))
            : value.values,
      }
    } else if (value instanceof MockArrayRemove) {
      return {
        ...object,
        [key]:
          currentValue instanceof Array
            ? currentValue.filter((item: string) => !value.values.includes(item))
            : value.values,
      } as T
    } else if (value instanceof MockIncrement) {
      return {
        ...object,
        [key]:
          typeof currentValue === 'number' ? currentValue + value.incrementBy : value.incrementBy,
      } as T
    }
    return { ...object, [key]: value }
  }, currentItem)
}

function createWhereFilter(property: string, operator: string, value: any) {
  return (item: any) => {
    switch (operator) {
      case '==':
        return item?.[property] === value
      case '!=':
        return item?.[property] !== value
      case '>=':
        return item?.[property] >= value
      case '>':
        return item?.[property] > value
      case '<':
        return item?.[property] < value
      case '<=':
        return item?.[property] <= value
      case 'array-contains':
        return item?.[property]?.includes?.(value)
      case 'array-contains-any':
        return value?.some?.((value: any) => item?.[property]?.includes?.(value))
      case 'in':
        return value?.includes?.(item?.[property])
      case 'not-in':
        return value ? !value?.includes(item?.[property]) : undefined
    }
  }
}

class MockFirestoreExistingDocQuery<T extends RecordWithId> {
  constructor(protected readonly collectionData: ById<T | null>, private readonly item?: T) {}

  get() {
    return new MockFirestoreDoc(this.item)
  }
  set(item: T, options?: { merge?: boolean }) {
    this.collectionData[item.id] = options?.merge
      ? mergeValues(this.collectionData[item.id] as T, item)
      : mergeValues(pick(this.collectionData[item.id], Object.keys(item)) as T, item)
    return this.collectionData[item.id]
  }
  update(item: T) {
    const newItem = mergeValues(this.item, item)
    this.collectionData[item.id] = newItem
    return newItem
  }
  delete() {
    const record = this.collectionData[this.item?.id as string]
    this.collectionData[this.item?.id as string] = null
    return record
  }
  create(item: T) {
    throw new Error(`id: "${item.id}" - entity already exists`)
  }
}

class MockFirestoreNewDocQuery<T extends RecordWithId> extends MockFirestoreExistingDocQuery<T> {
  constructor(protected readonly collectionData: ById<T>, private readonly id: string) {
    super(collectionData)
  }
  create(item: T) {
    this.collectionData[this.id] = mergeValues({} as T, item)
    return item
  }
}

class MockFirestoreQueryResult<T extends RecordWithId> {
  constructor(private readonly docs: MockFirestoreDoc<T>[]) {}

  get size() {
    return this.docs?.length ?? 0
  }

  get empty() {
    return !this.docs?.length
  }
}

class MockFirestoreCollection<T extends RecordWithId> {
  constructor(
    private readonly collectionData: () => ById<T>,
    private readonly recordLimit: number | undefined,
    private readonly orderByMap: string[] | undefined,
  ) {}
  get records() {
    return Object.values(this.collectionData()).filter(i => i != null)
  }
  doc(id: string) {
    const item = this.collectionData()?.[id]
    return item
      ? new MockFirestoreExistingDocQuery(this.collectionData(), item)
      : new MockFirestoreNewDocQuery(this.collectionData(), id)
  }
  where(property: string, operator: string, value: any) {
    if ((property as any)?.operator === 'OR') {
      const docs = (property as any).filters?.reduce((a: any, filter: any) => {
        return {
          ...a,
          ...toByProperty(
            this.records?.filter(createWhereFilter(filter.field, filter.operator, filter.value)),
          ),
        }
      }, {})
      return new MockFirestoreCollection(() => docs, this.recordLimit, this.orderByMap)
    }
    const docs = toByProperty(this.records?.filter(createWhereFilter(property, operator, value)))
    return new MockFirestoreCollection(() => docs, this.recordLimit, this.orderByMap)
  }
  startAfter(...values: string[]) {
    const items = (this.orderByMap ?? ['id']).reduce((a: T[], key: string, index: number): T[] => {
      return a.filter((item: any) => item[key] === values[index])
    }, this.records)
    const lastItem = items[items.length - 1]
    const startIndex = this.records.indexOf(lastItem)
    if (startIndex >= 0) {
      const nextData = toByProperty(this.records.slice(startIndex + 1))
      return new MockFirestoreCollection(() => nextData, this.recordLimit, this.orderByMap)
    }
    return this
  }
  orderBy(field: string, order = 'asc') {
    const highValue = order === 'asc' ? 1 : -1
    const lowValue = order === 'asc' ? -1 : 1
    const sortedRecords = this.records.sort((a: any, b: any) =>
      a[field] > b[field] ? highValue : lowValue,
    )
    return new MockFirestoreCollection(
      () => toByProperty(sortedRecords),
      this.recordLimit,
      (this.orderByMap ?? []).concat(field),
    )
  }
  limit(limit: number) {
    return new MockFirestoreCollection(this.collectionData, limit, this.orderByMap)
  }
  select() {
    // TODO: Ignore for now. Ideally, it should pick fields specified in method args only.
    return this
  }
  get() {
    return new MockFirestoreQueryResult(
      this.records.slice(0, this.recordLimit).map(item => new MockFirestoreDoc(item)),
    )
  }
}

class MockFirestore<T extends RecordWithId> {
  private originalData!: FirestoreMockData<T>

  constructor(private data: FirestoreMockData<T>) {
    this.originalData = cloneDeep(data)
  }
  collection(collection: string) {
    return new MockFirestoreCollection(
      () => this.data?.[collection] || (this.data[collection] = {}),
      undefined,
      undefined,
    )
  }
  reset() {
    this.data = cloneDeep(this.originalData)
  }
}

export function initializeMockFirestore<T extends RecordWithId>(data: FirestoreMockData<T> = {}) {
  const firestore = new MockFirestore(cloneDeep(data)) as any
  container.registerInstance(FIRESTORE_INSTANCE, firestore)
  return firestore
}
