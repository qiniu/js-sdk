import { ChunkInfo } from '../upload'

import { Pool } from './pool'

const m = jest.fn()
const task = (): Promise<void> => new Promise((resolve, _) => {
  m()
  resolve()
})

describe('test Pool for control concurrency', () => {
  const pool = new Pool<ChunkInfo>(task, 2)
  test('pool.js', async () => {
    const chunk = new Blob()
    const data = [
      { chunk, index: 0 },
      { chunk, index: 1 },
      { chunk, index: 2 },
      { chunk, index: 3 },
      { chunk, index: 4 },
      { chunk, index: 5 }
    ]

    return Promise.all(data.map(async value => {
      await pool.enqueue(value)
      expect(pool.processing.length).toBeLessThanOrEqual(2)
    })).then(() => {
      expect(m.mock.calls.length).toBe(6)
    })
  })
})
