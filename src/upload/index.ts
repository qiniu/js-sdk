import Resume from './resume'
import Direct from './direct'
import Logger from '../logger'
import { regionUphostMap } from '../config'
import { UploadCompleteData } from '../api'
import { QiniuError, Observable, IObserver, MB } from '../utils'

import { Config, Extra, UploadHandler, UploadOptions, UploadProgress } from './base'
import { HostPool } from './hosts'

export * from './base'
export * from './resume'

export function createUploadManager(
  options: UploadOptions,
  handlers: UploadHandler,
  hostPool: HostPool,
  logger: Logger
) {
  if (options.config && options.config.forceDirect) {
    logger.info('ues forceDirect mode.')
    return new Direct(options, handlers, hostPool, logger)
  }

  if (options.file.size > 4 * MB) {
    logger.info('file size over 4M, use Resume.')
    return new Resume(options, handlers, hostPool, logger)
  }

  logger.info('file size less or equal than 4M, use Direct.')
  return new Direct(options, handlers, hostPool, logger)
}

/**
 * @param file 上传文件
 * @param key 目标文件名
 * @param token 上传凭证
 * @param putExtra 上传文件的相关资源信息配置
 * @param config 上传任务的配置
 * @returns 返回用于上传任务的可观察对象
 */
export default function upload(
  file: File,
  key: string | null | undefined,
  token: string,
  putExtra?: Partial<Extra>,
  config?: Partial<Config>
): Observable<UploadProgress, QiniuError, UploadCompleteData> {

  const options: UploadOptions = {
    file,
    key,
    token,
    putExtra,
    config
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

  // 创建 host 池
  const hostPool = new HostPool(hostList)

  // 为每个任务创建单独的 Logger
  const logger = new Logger(options.token, config?.disableStatisticsReport, config?.debugLogLevel)

  return new Observable((observer: IObserver<UploadProgress, QiniuError, UploadCompleteData>) => {
    const manager = createUploadManager(options, {
      onData: (data: UploadProgress) => observer.next(data),
      onError: (err: QiniuError) => observer.error(err),
      onComplete: (res: any) => observer.complete(res)
    }, hostPool, logger)
    manager.putFile()
    return manager.stop.bind(manager)
  })
}
