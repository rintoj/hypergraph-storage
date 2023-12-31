import { createHash } from 'crypto'
import { customAlphabet } from 'nanoid'

export const ALPHABETS = {
  ALPHANUMERIC: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  NUMERIC: '0123456789',
}

/**
 * Generate a secure random ID of the given length with a given alphabet
 * For probability of collision with given params, see https://zelark.github.io/nano-id-cc/
 */
export function createRandomIdGenerator(
  length: number,
  alphabets: string = ALPHABETS.ALPHANUMERIC,
) {
  return customAlphabet(alphabets, length)
}

export const generateId = createRandomIdGenerator(8, ALPHABETS.ALPHANUMERIC)
export const generateNumericId = () =>
  `${Date.now().toString().substring(6)}${createRandomIdGenerator(10, ALPHABETS.NUMERIC)()}`
export const generateIdOf = (input: string) =>
  createHash('shake256', { outputLength: 8 }).update(input).digest('hex')
