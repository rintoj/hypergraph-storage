export type Nullable<T> = T | undefined | null
export type PaginationInput = { next?: string | null; limit?: number }
export type PaginatedResult<T> = { next?: string | null; items: T[] }

export function toBase64(object: any) {
  const str = JSON.stringify(object)
  return Buffer.from(str).toString('base64')
}

export function fromBase64<T>(base64String: string | undefined): T | undefined {
  if (base64String == null) {
    return undefined
  }
  try {
    const json = Buffer.from(base64String, 'base64').toString()
    return JSON.parse(json)
  } catch (e) {
    throw new Error('Invalid base64 string')
  }
}

export function toPaginationToken({ skip = 0, take = 20 }: { skip?: number; take?: number }) {
  return toBase64([skip, take])
}

export function decodeNextToken(next: string | null | undefined): [number, number] | null {
  if (next) {
    try {
      return fromBase64(next) as [number, number]
    } catch (e) {
      throw new Error('Invalid next token')
    }
  }
  return null
}
