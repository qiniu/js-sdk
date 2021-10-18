import { DEFAULT_CHUNK_SIZE } from '../upload'
import { normalizeUploadConfig } from './config'
import { region, regionUphostMap } from '../config/region'

describe('test config ', () => {
  test('normalizeUploadConfig', () => {
    const config1 = normalizeUploadConfig()
    expect(config1).toStrictEqual({
      uphost: [],
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: true,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })

    const config2 = normalizeUploadConfig({ upprotocol: 'https:' })
    expect(config2).toStrictEqual({
      uphost: [],
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: true,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })

    const config3 = normalizeUploadConfig({ region: region.z0 })
    expect(config3).toStrictEqual({
      region: region.z0,
      uphost: regionUphostMap[region.z0].cdnUphost,
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: true,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })

    const config4 = normalizeUploadConfig({ uphost: ['test'] })
    expect(config4).toStrictEqual({
      uphost: ['test'],
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: true,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })

    const config5 = normalizeUploadConfig({ uphost: ['test'], region: region.z0 })
    expect(config5).toStrictEqual({
      region: region.z0,
      uphost: ['test'],
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: true,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })

    const config6 = normalizeUploadConfig({ useCdnDomain: false, region: region.z0 })
    expect(config6).toStrictEqual({
      region: region.z0,
      uphost: regionUphostMap[region.z0].srcUphost,
      retryCount: 3,
      checkByMD5: false,
      checkByServer: false,
      forceDirect: false,
      useCdnDomain: false,
      concurrentRequestLimit: 3,
      chunkSize: DEFAULT_CHUNK_SIZE,
      upprotocol: 'https',
      debugLogLevel: 'OFF',
      disableStatisticsReport: false
    })
  })
})
