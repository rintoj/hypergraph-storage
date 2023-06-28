import { PaginatedResult } from './pagination'

type FetchNext<T> = (next: string | null | undefined) => Promise<PaginatedResult<T>>
export type PaginationFilter<T> = (item: T) => boolean
export type OnPageLoad<T> = (items: T[], next: string | null | undefined) => Promise<any> | void

const MAX_REPEAT_COUNT = 5

export async function paginate<T>(
  fetchNext: FetchNext<T>,
  filter?: PaginationFilter<T>,
  onPage?: OnPageLoad<T>,
) {
  const result: T[] = []
  let repeatCounter = MAX_REPEAT_COUNT
  let nextToken: string | null | undefined
  do {
    const { items, next } = await fetchNext(nextToken)
    for (const item of items) {
      if (!filter || filter(item)) {
        result.push(item)
      }
    }
    await onPage?.(items, next)
    // safe guard from infinite loop, break if the same token is seen MAX_REPEAT_COUNT times
    repeatCounter = nextToken === next ? repeatCounter - 1 : MAX_REPEAT_COUNT
    nextToken = next
  } while (nextToken && repeatCounter > 0)
  return result
}
