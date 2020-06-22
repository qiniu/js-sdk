import * as utils from '../utils'
import { getUploadUrl, UploadCompleteData } from '../api'

import StatisticsLogger from '../statisticsLog'
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
  /** 是否禁止静态日志上报 */
  disableStatisticsReport: boolean
  /** 分片大小，单位为 MB */
  chunkSize: number
  /** 上传区域 */
  region?: typeof region[keyof typeof region]
}

export interface UploadOptions {
  file: File
  key: string
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
  protected key: string
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

  constructor(options: UploadOptions, handlers: UploadHandler, private statisticsLogger: StatisticsLogger) {
    this.config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 3,
      checkByMD5: false,
      uphost: '',
      forceDirect: false,
      chunkSize: DEFAULT_CHUNK_SIZE,
      concurrentRequestLimit: 3,
      ...options.config
    }

    this.putExtra = {
      fname: '',
      ...options.putExtra
    }

    this.file = options.file
    this.key = options.key
    this.token = options.token

    this.onData = handlers.onData
    this.onError = handlers.onError
    this.onComplete = handlers.onComplete

    this.bucket = utils.getPutPolicy(this.token).bucket
  }

  public async putFile(): Promise<utils.ResponseSuccess<UploadCompleteData>> {
    this.aborted = false
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name
    }

    if (this.file.size > 10000 * GB) {
      const err = new Error('file size exceed maximum value 10000G')
      this.onError(err)
      throw err
    }

    if (this.putExtra.customVars) {
      if (!utils.isCustomVarsValid(this.putExtra.customVars)) {
        const err = new Error('customVars key should start width x:')
        this.onError(err)
        throw err
      }
    }

    if (this.putExtra.metadata) {
      if (!utils.isMetaDataValid(this.putExtra.metadata)) {
        const err = new Error('metadata key should start with x-qn-meta-')
        this.onError(err)
        throw err
      }
    }

    try {
      this.uploadUrl = await getUploadUrl(this.config, this.token)
      this.uploadAt = new Date().getTime()

      const result = await this.run()
      this.onComplete(result.data)

      if (!this.config.disableStatisticsReport) {
        this.sendLog(result.reqId, 200)
      }

      return result

    } catch (err) {
      this.clear()
      if (err.isRequestError && !this.config.disableStatisticsReport) {
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
        return this.putFile()
      }

      this.onError(err)
      throw err
    }
  }

  private clear() {
    this.xhrList.forEach(xhr => xhr.abort())
    this.xhrList = []
  }

  public stop() {
    this.clear()
    this.aborted = true
  }

  public addXhr(xhr: XMLHttpRequest) {
    this.xhrList.push(xhr)
  }

  private sendLog(reqId: string, code: number) {
    this.statisticsLogger.log({
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
    }, this.token)
  }

  public getProgressInfoItem(loaded: number, size: number) {
    return {
      loaded,
      size,
      percent: loaded / size * 100
    }
  }
}
