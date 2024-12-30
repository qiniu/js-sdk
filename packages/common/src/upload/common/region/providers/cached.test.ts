import { Result } from '../../../../types/types'
import { Region } from '../region'

import { RegionsProvider } from './types'
import { CachedRegionsProvider, getCacheKey } from './cached'
import { MockCacheManager } from '../../../../helper/cache/persistent.mock'

describe('getCacheKey', () => {
  test('assert value and ignore hosts order', () => {
    const key = getCacheKey({
      bucketServerHosts: [
        'bucket1.js-sdk.qiniu.com',
        'bucket2.js-sdk.qiniu.com',
        'bucket3.js-sdk.qiniu.com'
      ],
      accessKey: 'fakeAK',
      bucketName: 'fake-bucket'
    })

    expect(key).toBe(
      'regions:fakeAK:fake-bucket:bucket1.js-sdk.qiniu.com;bucket2.js-sdk.qiniu.com;bucket3.js-sdk.qiniu.com'
    )

    const key2 = getCacheKey({
      bucketServerHosts: [
        'bucket2.js-sdk.qiniu.com',
        'bucket3.js-sdk.qiniu.com',
        'bucket1.js-sdk.qiniu.com'
      ],
      accessKey: 'fakeAK',
      bucketName: 'fake-bucket'
    })

    expect(key2).toBe(key)
  })
})

describe('CachedRegionsProvider', () => {
  class MockRegionsProvider implements RegionsProvider {
    getRegions = jest.fn<Promise<Result<Region[]>>, []>()
  }

  const mockRegionsProvider = new MockRegionsProvider()
  mockRegionsProvider.getRegions.mockImplementation(
    () => Promise.resolve({
      result: [
        Region.fromRegionId('z0')
      ]
    })
  )
  const memoryCache = new MockCacheManager<Region[]>()
  const persistentCache = new MockCacheManager<Region[]>()

  let cachedRegionsProvider: CachedRegionsProvider

  beforeEach(() => {
    cachedRegionsProvider = new CachedRegionsProvider({
      baseRegionsProvider: mockRegionsProvider,
      cacheKey: 'someCacheKey',
      memoryCache,
      persistentCache
    })
    mockRegionsProvider.getRegions.mockClear()
    memoryCache.get.mockClear()
    persistentCache.get.mockClear()
  })

  test('test CachedRegionsProvider getRegions from memory', async () => {
    memoryCache.get.mockResolvedValueOnce([Region.fromRegionId('z0')])
    await cachedRegionsProvider.getRegions()

    expect(mockRegionsProvider.getRegions).toBeCalledTimes(0)
    expect(persistentCache.get).toBeCalledTimes(0)
    expect(memoryCache.get).toBeCalledTimes(1)
  })

  test('test CachedRegionsProvider getRegions from persistence', async () => {
    persistentCache.get.mockResolvedValueOnce([Region.fromRegionId('z0')])
    await cachedRegionsProvider.getRegions()

    expect(mockRegionsProvider.getRegions).toBeCalledTimes(0)
    expect(persistentCache.get).toBeCalledTimes(1)
    expect(memoryCache.get).toBeCalledTimes(1)
  })

  test('test CachedRegionsProvider wait fetching from baseProvider', async () => {
    const waitFn = jest.fn()
    mockRegionsProvider.getRegions.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        waitFn()
        resolve({ result: [Region.fromRegionId('z0')] })
      }, 1000)
    }))
    await cachedRegionsProvider.getRegions()
    expect(mockRegionsProvider.getRegions).toBeCalledTimes(1)
    expect(waitFn).toBeCalledTimes(1)
  })

  test('test CachedRegionsProvider async refresh', async () => {
    const waitFn = jest.fn()

    memoryCache.get.mockResolvedValueOnce([
      new Region({
        regionId: 'z0',
        services: {},
        createdAt: new Date(0),
        ttl: 1
      })
    ])
    mockRegionsProvider.getRegions.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        waitFn()
        resolve({ result: [Region.fromRegionId('z0')] })
      }, 1000)
    }))
    await cachedRegionsProvider.getRegions()
    expect(waitFn).toBeCalledTimes(0)
    await new Promise(resolve => setTimeout(resolve, 1000))
    expect(mockRegionsProvider.getRegions).toBeCalledTimes(1)
    expect(waitFn).toBeCalledTimes(1)
  })
})
