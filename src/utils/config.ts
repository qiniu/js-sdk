import Logger from '../logger'
import { regionUphostMap } from '../config'
import { Config, DEFAULT_CHUNK_SIZE, InternalConfig } from '../upload'

export function normalizeUploadConfig(config?: Partial<Config>, logger?: Logger): InternalConfig {
  const { upprotocol, uphost, ...otherConfig } = { ...config }

  const normalizeConfig: InternalConfig = {
    uphost: [],
    retryCount: 3,

    checkByMD5: false,
    forceDirect: false,
    useCdnDomain: true,
    checkByServer: false,
    concurrentRequestLimit: 3,
    chunkSize: DEFAULT_CHUNK_SIZE,

    upprotocol: 'https',

    debugLogLevel: 'OFF',
    disableStatisticsReport: false,

    ...otherConfig
  }

  // 兼容原来的 http: https: 的写法
  if (upprotocol) {
    normalizeConfig.upprotocol = upprotocol
      .replace(/:$/, '') as InternalConfig['upprotocol']
  }

  const hostList: string[] = []

  if (logger && config?.uphost != null && config?.region != null) {
    logger.warn('do not use both the uphost and region config.')
  }

  // 如果同时指定了 uphost 参数，添加到可用 host 列表
  if (uphost) {
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
