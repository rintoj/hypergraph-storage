export type RetryCallback = () => Promise<any>
export type RetryOptions = { retry?: number; waitInMs?: number; next?: (retry?: number) => void }

const DEFAULT_RETRY = 5
const DEFAULT_WAIT_IN_MS = 5 * 1000

export async function withRetry(callback: RetryCallback, options?: RetryOptions) {
  let retry = (options?.retry ?? DEFAULT_RETRY) + 1
  while (retry-- > 0) {
    try {
      await callback()
      break
    } catch (e) {
      console.log(e)
    }
    await new Promise(resolve => setTimeout(resolve, options?.waitInMs ?? DEFAULT_WAIT_IN_MS))
    options?.next?.(retry)
  }
}
