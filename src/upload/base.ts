import * as utils from '../utils'
import { getUploadUrl, UploadCompleteData } from '../api'

import { Logger, LogLevel } from '../logger'
import { region } from '../config'

export const DEFAULT_CHUNK_SIZE = 4 // 单位 MB

/** 上传文件的资源信息配置 */
export interface Extra {
  /** 文件原文件名 */
  fname: string
  /** 用来放置自定义变量 */
  customVars?: { [key: string]: string }
  /** 自定义元信息 */
  metadata?: { [key: string]: string }
  /** 文件类型设置 */
  mimeType?: string //
}

/** 上传任务的配置信息 */
export interface Config {
  /** 是否开启 cdn 加速 */
  useCdnDomain: boolean
  /** 是否对分片进行 md5校验 */
  checkByMD5: boolean
  /** 强制直传 */
  forceDirect: boolean
  /** 上传失败后重试次数 */
  retryCount: number
  /** 自定义上传域名 */
  uphost: string
  /** 自定义分片上传并发请求量 */
  concurrentRequestLimit: number
  /** 分片大小，单位为 MB */
  chunkSize: number
  /** 上传域名协议 */
  upprotocol: 'http:' | 'https:'
  /** 上传区域 */
  region?: typeof region[keyof typeof region]
  /** 是否禁止静态日志上报 */
  disableStatisticsReport: boolean
  /** 设置调试日志输出模式，默认 false，不输出任何日志 */
  debugLogLevel?: LogLevel
}

export interface UploadOptions {
  file: File
  key: string | null | undefined
  token: string
  putExtra?: Partial<Extra>
  config?: Partial<Config>
}

export interface UploadInfo {
  id: string
  url: string
}

/** 传递给外部的上传进度信息 */
export interface UploadProgress {
  total: ProgressCompose
  uploadInfo?: UploadInfo
  chunks?: ProgressCompose[]
}

export interface UploadHandler {
  onData: (data: UploadProgress) => void
  onError: (err: utils.CustomError) => void
  onComplete: (res: any) => void
}

export interface Progress {
  loaded: number
  total: number
}

export interface ProgressCompose {
  loaded: number
  size: number
  percent: number
}

export type XHRHandler = (xhr: XMLHttpRequest) => void

const GB = 1024 ** 3

export default abstract class Base {
  protected config: Config
  protected putExtra: Extra
  protected xhrList: XMLHttpRequest[] = []
  protected file: File
  protected key: string | null | undefined
  protected aborted = false
  protected retryCount = 0
  protected token: string
  protected uploadUrl: string
  protected bucket: string
  protected uploadAt: number
  protected progress: UploadProgress

  protected onData: (data: UploadProgress) => void
  protected onError: (err: utils.CustomError) => void
  protected onComplete: (res: any) => void

  protected abstract run(): utils.Response<any>

  constructor(options: UploadOptions, handlers: UploadHandler, protected logger: Logger) {
    this.config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 3,
      checkByMD5: false,
      uphost: '',
      upprotocol: 'https:',
      forceDirect: false,
      chunkSize: DEFAULT_CHUNK_SIZE,
      concurrentRequestLimit: 3,
      ...options.config
    }

    logger.info('config inited.', this.config)

    this.putExtra = {
      fname: '',
      ...options.putExtra
    }

    logger.info('putExtra inited.', this.putExtra)

    this.file = options.file
    this.key = options.key
    this.token = options.token

    this.onData = handlers.onData
    this.onError = handlers.onError
    this.onComplete = handlers.onComplete

    try {
      this.bucket = utils.getPutPolicy(this.token).bucket
    } catch (e) {
      logger.error('get bucket from token failed.', e)
      this.onError(e)
    }
  }

  private handleError(message: string) {
    const err = new Error(message)
    this.logger.error(message)
    this.onError(err)
  }


  /**
   * @description 上传文件，状态信息请通过 [Subscriber] 获取。
   */
  public async putFile(): Promise<void> {
    this.aborted = false
    if (!this.putExtra.fname) {
      this.logger.info('use file.name as fname.')
      this.putExtra.fname = this.file.name
    }

    if (this.file.size > 10000 * GB) {
      this.handleError('file size exceed maximum value 10000G.')
      return
    }

    if (this.putExtra.customVars) {
      if (!utils.isCustomVarsValid(this.putExtra.customVars)) {
        this.handleError('customVars key should start width x:.')
        return
      }
    }

    if (this.putExtra.metadata) {
      if (!utils.isMetaDataValid(this.putExtra.metadata)) {
        this.handleError('metadata key should start with x-qn-meta-.')
        return
      }
    }

    try {
      this.uploadUrl = await getUploadUrl(this.config, this.token)
      this.logger.info('get uploadUrl from api.', this.uploadUrl)
      this.uploadAt = new Date().getTime()

      const result = await this.run()
      this.onComplete(result.data)
      this.sendLog(result.reqId, 200)
      return
    } catch (err) {
      this.logger.error(err)

      this.clear()
      if (err.isRequestError) {
        const reqId = this.aborted ? '' : err.reqId
        const code = this.aborted ? -2 : err.code
        this.sendLog(reqId, code)
      }

      const needRetry = err.isRequestError && err.code === 0 && !this.aborted
      const notReachRetryCount = ++this.retryCount <= this.config.retryCount
      // 以下条件满足其中之一则会进行重新上传：
      // 1. 满足 needRetry 的条件且 retryCount 不为 0
      // 2. uploadId 无效时在 resume 里会清除本地数据，并且这里触发重新上传
      if (needRetry && notReachRetryCount || err.code === 612) {
        this.logger.warn(`error auto retry: ${this.retryCount}/${this.config.retryCount}.`)
        this.putFile()
        return
      }

      this.onError(err)
    }
  }

  private clear() {
    // abort 会触发 onreadystatechange
    // MDN 文档表示：readyState 为 0 并且 status 为 0
    this.logger.info('start cleaning all xhr.')
    this.xhrList.forEach(xhr => {
      xhr.onreadystatechange = null
      xhr.abort()
    })
    this.logger.info('cleanup completed.')
    this.xhrList = []
  }

  public stop() {
    this.logger.info('stop.')
    this.clear()
    this.aborted = true
  }

  public addXhr(xhr: XMLHttpRequest) {
    this.xhrList.push(xhr)
  }

  private sendLog(reqId: string, code: number) {
    this.logger.report({
      code,
      reqId,
      host: utils.getDomainFromUrl(this.uploadUrl),
      remoteIp: '',
      port: utils.getPortFromUrl(this.uploadUrl),
      duration: (new Date().getTime() - this.uploadAt) / 1000,
      time: Math.floor(this.uploadAt / 1000),
      bytesSent: this.progress ? this.progress.total.loaded : 0,
      upType: 'jssdk-h5',
      size: this.file.size
    })
  }

  public getProgressInfoItem(loaded: number, size: number) {
    return {
      loaded,
      size,
      percent: loaded / size * 100
    }
  }
}
