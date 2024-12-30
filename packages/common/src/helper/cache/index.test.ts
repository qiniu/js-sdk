import { MemoryCacheManager, PersistentNever } from './index'

interface CacheData {
  result: string
}

describe('CacheManager', () => {
  test('test MemoryCacheManager', async () => {
    const memoryCacheManager = new MemoryCacheManager<CacheData>()

    await memoryCacheManager.set('key', {
      result: 'val'
    })
    let val = await memoryCacheManager.get('key')
    expect(val).toEqual({
      result: 'val'
    })

    await memoryCacheManager.delete('key')
    val = await memoryCacheManager.get('key')
    expect(val).toBe(null)
  })

  test('test PersistentNever', async () => {
    const cacheManager = new PersistentNever<CacheData>()

    await cacheManager.set('key', {
      result: 'val'
    })
    let val = await cacheManager.get('key')
    expect(val).toBe(null)

    await cacheManager.delete('key')
    val = await cacheManager.get('key')
    expect(val).toBe(null)
  })
})
