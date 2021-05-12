import { regionUphostMap } from '../config'
import { Config, DEFAULT_CHUNK_SIZE } from '../upload'

export function normalizeUploadConfig(config: Partial<Config> = {}): Config {
  const normalizeConfig: Config = {
    uphost: [],
    retryCount: 3,

    checkByMD5: false,
    forceDirect: false,
    useCdnDomain: true,
    concurrentRequestLimit: 3,
    chunkSize: DEFAULT_CHUNK_SIZE,

    upprotocol: 'https',

    debugLogLevel: 'OFF',
    disableStatisticsReport: false,

    ...config,
  }

  // 兼容原来的 http: https: 的写法
  normalizeConfig.upprotocol = normalizeConfig.upprotocol.replace(/:$/, '') as Config['upprotocol']

  const hostList: string[] = []

  // 如果用户传了 region，添加指定 region 的 host 到可用 host 列表
  if (normalizeConfig?.region) {
    const hostMap = regionUphostMap[normalizeConfig?.region]
    if (normalizeConfig.useCdnDomain) {
      hostList.push(...hostMap.cdnUphost)
    } else {
      hostList.push(...hostMap.srcUphost)
    }
  }

  // 如果同时指定了 uphost 参数，添加到可用 host 列表
  if (normalizeConfig?.uphost != null) {
    if (Array.isArray(normalizeConfig?.uphost)) {
      hostList.push(...normalizeConfig?.uphost)
    } else {
      hostList.push(normalizeConfig?.uphost)
    }
  }

  return {
    ...normalizeConfig,
    uphost: hostList.filter(Boolean)
  }
}
