import { generateId, generateIdOf, generateNumericId } from './generate-id'

describe('generate-id', () => {
  test('should generate a random id', () => {
    expect(generateId()).toEqual(expect.any(String))
  })

  test('should generate id from a string', () => {
    const test = 'sample-string'
    expect(generateIdOf(test)).toEqual(generateIdOf(test))
  })

  test('should generate numeric id', () => {
    expect(/[0-9]{12}/.test(generateNumericId())).toBeTruthy()
  })
})
