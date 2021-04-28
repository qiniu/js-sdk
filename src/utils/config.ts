import { regionUphostMap } from '../config'
import { Config, DEFAULT_CHUNK_SIZE } from '../upload'

export function normalizeUploadConfig(config?: Partial<Config>): Config {
  const { upprotocol } = { ...config }

  const normalizeConfig: Config = {
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

  const hostList: string[] = []

  // 如果用户传了 region，添加指定 region 的 host 到可用 host 列表
  if (config?.region) {
    const hostMap = regionUphostMap[config?.region]
    if (config.useCdnDomain) {
      hostList.push(hostMap.cdnUphost)
    } else {
      hostList.push(hostMap.srcUphost)
    }
  }

  // 如果同时指定了 uphost 参数，添加到可用 host 列表
  if (config?.uphost != null) {
    if (Array.isArray(config?.uphost)) {
      hostList.push(...config?.uphost)
    } else {
      hostList.push(config?.uphost)
    }
  }

  return { ...config, ...normalizeConfig, uphost: hostList }
}
