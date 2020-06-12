import { Pool } from "../pool"
import { ChunkInfo } from '../upload'

const m = jest.fn()
const task = (): Promise<void> => {
  return new Promise((resolve, _) => {
    m()
    resolve()
  })
}

describe("test Pool for control concurrency", () => {
  var pool = new Pool<ChunkInfo>(task, 2)
  test("pool.js", () => {
    const chunk = new Blob()
    const data = [
      { chunk, index: 0 },
      { chunk, index: 1 },
      { chunk, index: 2 },
      { chunk, index: 3 },
      { chunk, index: 4 },
      { chunk, index: 5 }
    ]
    return Promise.all(data.map(value => {
      pool.enqueue(value)
      expect(pool.processing.length).toBeLessThanOrEqual(2)
    })).then(()=> {
      expect(m.mock.calls.length).toBe(6)
    })
  })
})
