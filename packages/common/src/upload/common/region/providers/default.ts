import { ConfigApis, HostConfig } from '../../../../api'
import { MemoryCacheManager, PersistentCacheManager } from '../../../../helper/cache'
import { HttpClient, HttpProtocol } from '../../../../types/http'
import { Host, getDefaultHostsRetrier } from '../../host'

import { Region } from '../region'
import { CachedRegionsProvider, getCacheKey } from './cached'
import { QueryRegionsProvider } from './query'

interface GetDefaultRegionsProviderOptions {
  /** Default is global */
  memoryCache?: MemoryCacheManager<Region[]>
  /**
   * Default is disabled
   * But it uses local storage by default in browser and wechat-miniprogram package
   * TODO: And it uses xxx by default in harmony package
   */
  persistentCache?: PersistentCacheManager<Region[]>

  httpClient: HttpClient
  bucketServerHosts: string[]
  serverProtocol: HttpProtocol
  accessKey: string
  bucketName: string
}

export function getDefaultRegionsProvider({
  memoryCache,
  persistentCache,

  httpClient,
  bucketServerHosts,
  serverProtocol,
  accessKey,
  bucketName
}: GetDefaultRegionsProviderOptions) {
  const retrier = getDefaultHostsRetrier<HostConfig>({
    hosts: bucketServerHosts.map(h => new Host(h, serverProtocol))
  })
  const configApis = new ConfigApis('', httpClient)
  return new CachedRegionsProvider({
    cacheKey: getCacheKey({
      bucketServerHosts,
      accessKey,
      bucketName
    }),
    memoryCache,
    persistentCache,
    baseRegionsProvider: new QueryRegionsProvider({
      configApis,
      retrier,
      serverProtocol,
      accessKey,
      bucketName
    })
  })
}
