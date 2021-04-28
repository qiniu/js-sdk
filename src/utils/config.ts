import { Config, DEFAULT_CHUNK_SIZE } from 'upload'

export function normalizeUploadConfig(config: Config): Config {
  if (config == null) return config
  const { upprotocol } = config

  const normalizeData: Config = {
    uphost: '',
    retryCount: 3,

    checkByMD5: false,
    forceDirect: false,
    useCdnDomain: true,
    concurrentRequestLimit: 3,
    chunkSize: DEFAULT_CHUNK_SIZE,

    // 兼容原来的 https:、http: 的 写法
    upprotocol: upprotocol ? upprotocol.replace(/:$/, '') as Config['upprotocol'] : 'https',

    debugLogLevel: 'OFF',
    disableStatisticsReport: false
  }

  return { ...normalizeData, ...config }
}
