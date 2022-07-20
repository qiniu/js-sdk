import Resume from './resume'
import Direct from './direct'
import Logger from '../logger'
import type { UploadCompleteData } from '../api'
import { Observable, IObserver, MB, normalizeUploadConfig } from '../utils'
import { QiniuError, QiniuNetworkError, QiniuRequestError } from '../errors'
import { Extra, UploadOptions, UploadHandlers, UploadProgress, Config } from './base'
import { HostPool } from './hosts'

export type {
  Config,
  UploadProgress
} from './base'

export type UploadExtra = Partial<Extra>
export type UploadKey = string | null | undefined
export type UploadError = QiniuError | QiniuRequestError | QiniuNetworkError
export type UploadObservable<T = any> = Observable<UploadProgress, UploadError, UploadCompleteData<T>>

export function createUploadManager<T = any>(
  options: UploadOptions,
  handlers: UploadHandlers,
  hostPool: HostPool,
  logger: Logger
) {
  if (options.config && options.config.forceDirect) {
    logger.info('ues forceDirect mode.')
    return new Direct<T>(options, handlers, hostPool, logger)
  }

  if (options.file.size > 4 * MB) {
    logger.info('file size over 4M, use Resume.')
    return new Resume<T>(options, handlers, hostPool, logger)
  }

  logger.info('file size less or equal than 4M, use Direct.')
  return new Direct<T>(options, handlers, hostPool, logger)
}

/**
 * @param file 上传文件
 * @param key 目标文件名
 * @param token 上传凭证
 * @param putExtra 上传文件的相关资源信息配置
 * @param config 上传任务的配置
 * @returns 返回用于上传任务的可观察对象
 */
export function upload<T = any>(
  file: File,
  key: UploadKey,
  token: string,
  putExtra?: UploadExtra,
  config?: Config
): UploadObservable<T> {
  // 为每个任务创建单独的 Logger
  const logger = new Logger(token, config?.disableStatisticsReport, config?.debugLogLevel, file.name)

  const options: UploadOptions = {
    file,
    key,
    token,
    putExtra,
    config: normalizeUploadConfig(config, logger)
  }

  // 创建 host 池
  const hostPool = new HostPool(options.config.uphost)

  return new Observable((observer: IObserver<UploadProgress, UploadError, UploadCompleteData>) => {
    const manager = createUploadManager<T>(options, {
      onData: (data: UploadProgress) => observer.next(data),
      onError: (err: QiniuError) => observer.error(err),
      onComplete: (res: any) => observer.complete(res)
    }, hostPool, logger)
    manager.putFile()
    return manager.stop.bind(manager)
  })
}
