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

    for (const item of data) {
      // eslint-disable-next-line no-await-in-loop
      await pool.enqueue(item)
      expect(pool.processing.length).toBeLessThanOrEqual(2)
    }
  })
})
