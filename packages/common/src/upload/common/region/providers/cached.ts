import { Result, isSuccessResult } from '../../../../types/types'
import { MemoryCacheManager, PersistentCacheManager } from '../../../../helper/cache'

import { Region } from '../region'
import { RegionsProvider } from './types'

const memoryCacheManager = new MemoryCacheManager<Region[]>()

export function getCacheKey({
  bucketServerHosts,
  accessKey,
  bucketName
}: {
  bucketServerHosts: string[]
  accessKey: string
  bucketName: string
}) {
  bucketServerHosts = bucketServerHosts.sort()
  return [
    'regions',
    accessKey,
    bucketName,
    bucketServerHosts.join(';')
  ].join(':')
}

export interface CachedRegionsProviderOptions {
  baseRegionsProvider: RegionsProvider
  cacheKey: string
  memoryCache?: MemoryCacheManager<Region[]>
  persistentCache?: PersistentCacheManager<Region[]>
}

const singleFlights = new Map<string, Promise<Result<Region[]>>>()

export class CachedRegionsProvider implements RegionsProvider {
  private readonly options: CachedRegionsProviderOptions

  constructor(options: CachedRegionsProviderOptions) {
    this.options = options
  }

  async getRegions(): Promise<Result<Region[]>> {
    const {
      cacheKey
    } = this.options

    let cachedRegions = await this.memoryCache.get(cacheKey)
    if (cachedRegions?.length && cachedRegions.every(r => r.isLive)) {
      return {
        result: cachedRegions
      }
    }

    let persistCachedRegions: Region[] | null = null
    if (this.persistentCache) {
      persistCachedRegions = await this.persistentCache.get(cacheKey)
    }
    if (persistCachedRegions?.length && persistCachedRegions.every(r => r.isLive)) {
      cachedRegions = persistCachedRegions
      this.memoryCache.set(cacheKey, persistCachedRegions)
      return {
        result: persistCachedRegions
      }
    }

    if (cachedRegions?.length) {
      // async refresh
      this.refresh()
      return {
        result: cachedRegions
      }
    }

    return this.refresh()
  }

  private get memoryCache() {
    if (this.options.memoryCache) {
      return this.options.memoryCache
    }
    return memoryCacheManager
  }

  private get persistentCache() {
    return this.options.persistentCache
  }

  private async refresh(): Promise<Result<Region[]>> {
    const {
      cacheKey
    } = this.options
    const fetchedRegionsResult = await this.fetchFromBase()
    if (isSuccessResult(fetchedRegionsResult)) {
      Promise.all([
        this.memoryCache.set(cacheKey, fetchedRegionsResult.result),
        this.persistentCache?.set(cacheKey, fetchedRegionsResult.result)
      ])
        .catch(err => {
          // TODO: logger.warning(set cache error)
        })
    }
    return fetchedRegionsResult
  }

  private async fetchFromBase(): Promise<Result<Region[]>> {
    const {
      baseRegionsProvider,
      cacheKey
    } = this.options

    // single flight
    let flight = singleFlights.get(cacheKey)
    if (flight) {
      return flight
    }

    flight = baseRegionsProvider.getRegions()
    singleFlights.set(cacheKey, flight)
    try {
      return await flight
    } finally {
      singleFlights.delete(cacheKey)
    }
  }
}
