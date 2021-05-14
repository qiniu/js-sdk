import { regionUphostMap } from '../config'
import { Config, DEFAULT_CHUNK_SIZE, InternalConfig } from '../upload'

export function normalizeUploadConfig(config?: Partial<Config>): InternalConfig {
  const { upprotocol, uphost, ...otherConfig } = { ...config }

  const normalizeConfig: InternalConfig = {
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

    ...otherConfig
  }

  // 兼容原来的 http: https: 的写法
  normalizeConfig.upprotocol = upprotocol
    ? upprotocol.replace(/:$/, '') as InternalConfig['upprotocol']
    : normalizeConfig.upprotocol

  const hostList: string[] = []

  // 如果同时指定了 uphost 参数，添加到可用 host 列表
  if (uphost != null) {
    if (Array.isArray(uphost)) {
      hostList.push(...uphost)
    } else {
      hostList.push(uphost)
    }

    // 否则如果用户传了 region，添加指定 region 的 host 到可用 host 列表
  } else if (normalizeConfig?.region) {
    const hostMap = regionUphostMap[normalizeConfig?.region]
    if (normalizeConfig.useCdnDomain) {
      hostList.push(...hostMap.cdnUphost)
    } else {
      hostList.push(...hostMap.srcUphost)
    }
  }

  return {
    ...normalizeConfig,
    uphost: hostList.filter(Boolean)
  }
}
