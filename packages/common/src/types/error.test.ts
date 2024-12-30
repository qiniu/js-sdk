import { HttpRequestError } from './error'

describe('HttpRequestError', () => {
  test('needRetry', () => {
    const cases = Array.from(
      {
        length: 800
      },
      (_, i) => {
        if (i > 0 && i < 500) {
          return {
            code: i,
            expectValue: false
          }
        }
        if (
          [
            501, 509, 573, 579, 608, 612, 614, 618, 630, 631, 632, 640, 701
          ].includes(i)
        ) {
          return {
            code: i,
            expectValue: false
          }
        }
        return {
          code: i,
          expectValue: true
        }
      }
    )
    cases.unshift({
      code: -1,
      expectValue: true
    })

    const error = new HttpRequestError(400, 'test')
    expect(error.needRetry()).toBe(false)
  })
})
