import { Pool } from "../pool"

var m = jest.fn()
var t = jest.fn(() => {
  return new Promise((resolve, reject) => {
    m()
    resolve("123")
  })
})

describe("test Pool for control concurrency", () => {
  var pool = new Pool(t, 2)
  test("pool.js", () => {
    return Promise.all([1,2,3,4,5,6].map(value => {
      pool.enqueue(value)
      expect(pool.processing.length).toBeLessThanOrEqual(2)
    })).then(()=> {
      expect(m.mock.calls.length).toBe(6)
    })
  })
})