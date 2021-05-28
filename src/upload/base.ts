import { QiniuErrorName, QiniuError, QiniuRequestError } from '../errors'
import Logger, { LogLevel } from '../logger'
import { region } from '../config'
import * as utils from '../utils'

import { Host, HostPool } from './hosts'

export const DEFAULT_CHUNK_SIZE = 4 // 单位 MB

// code 信息地址 https://developer.qiniu.com/kodo/3928/error-responses
export const FREEZE_CODE_LIST = [0, 502, 503, 504, 599] // 将会冻结当前 host 的 code
export const RETRY_CODE_LIST = [...FREEZE_CODE_LIST, 612] // 会进行重试的 code

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

export interface InternalConfig {
  /** 是否开启 cdn 加速 */
  useCdnDomain: boolean
  /** 是否对分片进行 md5校验 */
  checkByMD5: boolean
  /** 强制直传 */
  forceDirect: boolean
  /** 上传失败后重试次数 */
  retryCount: number
  /** 自定义上传域名 */
  uphost: string[]
  /** 自定义分片上传并发请求量 */
  concurrentRequestLimit: number
  /** 分片大小，单位为 MB */
  chunkSize: number
  /** 上传域名协议 */
  upprotocol: 'https' | 'http'
  /** 上传区域 */
  region?: typeof region[keyof typeof region]
  /** 是否禁止统计日志上报 */
  disableStatisticsReport: boolean
  /** 设置调试日志输出模式，默认 `OFF`，不输出任何日志 */
  debugLogLevel?: LogLevel
}

/** 上传任务的配置信息 */
export interface Config extends Partial<Omit<InternalConfig, 'upprotocol' | 'uphost'>> {
  /** 上传域名协议 */
  upprotocol?: InternalConfig['upprotocol'] | 'https:' | 'http:'
  /** 自定义上传域名 */
  uphost?: InternalConfig['uphost'] | string
}

export interface UploadOptions {
  file: File
  key: string | null | undefined
  token: string
  config: InternalConfig
  putExtra?: Partial<Extra>
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

export interface UploadHandlers {
  onData: (data: UploadProgress) => void
  onError: (err: QiniuError) => void
  onComplete: (res: any) => void
}

export interface Progress {
  total: number
  loaded: number
}

export interface ProgressCompose {
  size: number
  loaded: number
  percent: number
  fromCache?: boolean
}

export type XHRHandler = (xhr: XMLHttpRequest) => void

const GB = 1024 ** 3

export default abstract class Base {
  protected config: InternalConfig
  protected putExtra: Extra

  protected aborted = false
  protected retryCount = 0

  protected uploadHost?: Host
  protected xhrList: XMLHttpRequest[] = []

  protected file: File
  protected key: string | null | undefined

  protected token: string
  protected assessKey: string
  protected bucketName: string

  protected uploadAt: number
  protected progress: UploadProgress

  protected onData: (data: UploadProgress) => void
  protected onError: (err: QiniuError) => void
  protected onComplete: (res: any) => void

  /**
   * @returns utils.Response<any>
   * @description 子类通过该方法实现具体的任务处理
   */
  protected abstract run(): utils.Response<any>

  constructor(
    options: UploadOptions,
    handlers: UploadHandlers,
    protected hostPool: HostPool,
    protected logger: Logger
  ) {

    this.config = options.config
    logger.info('config inited.', this.config)

    this.putExtra = {
      fname: '',
      ...options.putExtra
    }

    logger.info('putExtra inited.', this.putExtra)

    this.key = options.key
    this.file = options.file
    this.token = options.token

    this.onData = handlers.onData
    this.onError = handlers.onError
    this.onComplete = handlers.onComplete

    try {
      const putPolicy = utils.getPutPolicy(this.token)
      this.bucketName = putPolicy.bucketName
      this.assessKey = putPolicy.assessKey
    } catch (error) {
      logger.error('get putPolicy from token failed.', error)
      this.onError(error)
    }
  }

  // 检查并更新 upload host
  protected async checkAndUpdateUploadHost() {
    // 从 hostPool 中获取一个可用的 host 挂载在 this
    this.logger.info('get available upload host.')
    const newHost = await this.hostPool.getUp(
      this.assessKey,
      this.bucketName,
      this.config.upprotocol
    )

    if (newHost == null) {
      throw new QiniuError(
        QiniuErrorName.NotAvailableUploadHost,
        'no available upload host.'
      )
    }

    if (this.uploadHost != null && this.uploadHost.host !== newHost.host) {
      this.logger.warn(`host switches from ${this.uploadHost.host} to ${newHost.host}.`)
    } else {
      this.logger.info(`use host ${newHost.host}.`)
    }

    this.uploadHost = newHost
  }

  // 检查并解冻当前的 host
  protected checkAndUnfreezeHost() {
    this.logger.info('check unfreeze host.')
    if (this.uploadHost != null && this.uploadHost.isFrozen()) {
      this.logger.warn(`${this.uploadHost.host} will be unfrozen.`)
      this.uploadHost.unfreeze()
    }
  }

  // 检查并更新冻结当前的 host
  private checkAndFreezeHost(error: QiniuError) {
    this.logger.info('check freeze host.')
    if (error instanceof QiniuRequestError && this.uploadHost != null) {
      if (FREEZE_CODE_LIST.includes(error.code)) {
        this.logger.warn(`${this.uploadHost.host} will be temporarily frozen.`)
        this.uploadHost.freeze()
      }
    }
  }

  private handleError(error: QiniuError) {
    this.logger.error(error.message)
    this.onError(error)
  }

  /**
   * @returns Promise 返回结果与上传最终状态无关，状态信息请通过 [Subscriber] 获取。
   * @description 上传文件，状态信息请通过 [Subscriber] 获取。
   */
  public async putFile(): Promise<void> {
    this.aborted = false
    if (!this.putExtra.fname) {
      this.logger.info('use file.name as fname.')
      this.putExtra.fname = this.file.name
    }

    if (this.file.size > 10000 * GB) {
      this.handleError(new QiniuError(
        QiniuErrorName.InvalidFile,
        'file size exceed maximum value 10000G'
      ))
      return
    }

    if (this.putExtra.customVars) {
      if (!utils.isCustomVarsValid(this.putExtra.customVars)) {
        this.handleError(new QiniuError(
          QiniuErrorName.InvalidCustomVars,
          // FIXME: width => with
          'customVars key should start width x:'
        ))
        return
      }
    }

    if (this.putExtra.metadata) {
      if (!utils.isMetaDataValid(this.putExtra.metadata)) {
        this.handleError(new QiniuError(
          QiniuErrorName.InvalidMetadata,
          'metadata key should start with x-qn-meta-'
        ))
        return
      }
    }

    try {
      this.uploadAt = new Date().getTime()
      await this.checkAndUpdateUploadHost()
      const result = await this.run()
      this.onComplete(result.data)
      this.checkAndUnfreezeHost()
      this.sendLog(result.reqId, 200)
      return
    } catch (err) {
      this.logger.error(err)
      this.clear()

      if (err instanceof QiniuRequestError) {
        const reqId = this.aborted ? '' : err.reqId
        const code = this.aborted ? -2 : err.code
        this.sendLog(reqId, code)

        // 检查并冻结当前的 host
        this.checkAndFreezeHost(err)

        const notReachRetryCount = ++this.retryCount <= this.config.retryCount
        const needRetry = !this.aborted && RETRY_CODE_LIST.includes(err.code)

        // 以下条件满足其中之一则会进行重新上传：
        // 1. 满足 needRetry 的条件且 retryCount 不为 0
        // 2. uploadId 无效时在 resume 里会清除本地数据，并且这里触发重新上传
        if (needRetry && notReachRetryCount) {
          this.logger.warn(`error auto retry: ${this.retryCount}/${this.config.retryCount}.`)
          this.putFile()
          return
        }
      }

      this.onError(err)
    }
  }

  private clear() {
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
      remoteIp: '',
      upType: 'jssdk-h5',
      size: this.file.size,
      time: Math.floor(this.uploadAt / 1000),
      port: utils.getPortFromUrl(this.uploadHost?.getUrl()),
      host: utils.getDomainFromUrl(this.uploadHost?.getUrl()),
      bytesSent: this.progress ? this.progress.total.loaded : 0,
      duration: Math.floor((new Date().getTime() - this.uploadAt) / 1000)
    })
  }

  public getProgressInfoItem(loaded: number, size: number, fromCache?: boolean): ProgressCompose {
    return {
      size,
      loaded,
      percent: loaded / size * 100,
      ...(fromCache == null ? {} : { fromCache })
    }
  }
}
