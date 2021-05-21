import Resume from './resume'
import Direct from './direct'
import Logger from '../logger'
import { UploadCompleteData } from '../api'
import { Observable, IObserver, MB, normalizeUploadConfig } from '../utils'
import { QiniuError, QiniuNetworkError, QiniuRequestError } from '../errors'
import { Extra, UploadOptions, UploadHandlers, UploadProgress, Config } from './base'
import { HostPool } from './hosts'

export * from './base'
export * from './resume'

export function createUploadManager(
  options: UploadOptions,
  handlers: UploadHandlers,
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
  config?: Config
): Observable<UploadProgress, QiniuError | QiniuRequestError | QiniuNetworkError, UploadCompleteData> {

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

  return new Observable((observer: IObserver<
    UploadProgress,
    QiniuError | QiniuRequestError | QiniuNetworkError,
    UploadCompleteData
  >) => {
    const manager = createUploadManager(options, {
      onData: (data: UploadProgress) => observer.next(data),
      onError: (err: QiniuError) => observer.error(err),
      onComplete: (res: any) => observer.complete(res)
    }, hostPool, logger)
    manager.putFile()
    return manager.stop.bind(manager)
  })
}
