import * as utils from '../utils'
import { getUploadUrl } from '../api'

import StatisticsLogger from '../statisticsLog'
import { region } from '../config'

export const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024

export interface Extra {
  fname: string // 文件原文件名
  customVars?: { [key: string]: string } // 用来放置自定义变量
  metadata?: { [key: string]: string } // 自定义元信息
  excludeMimeType?: string[] // 用来限制上传文件类型，限制类型放到数组里： ['image/png', 'image/jpeg', 'image/gif']
  mimeType?: string // 文件类型设置
}

export interface Config {
  useCdnDomain: boolean
  checkByMD5: boolean
  forceDirect: boolean
  retryCount: number
  uphost: string
  concurrentRequestLimit: number
  disableStatisticsReport: boolean
  chunkSize: number
  region?: typeof region[keyof typeof region]
}

export interface UploadOptions {
  bucket: string
  file: File
  key: string
  token: string
  putExtra?: Partial<Extra>
  config?: Partial<Config>
}

export interface UploadProgress {
  total: ProgressCompose
  chunks?: ProgressCompose[]
  uploadId?: string
  uploadUrl?: string
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
const MB = 1024 ** 2

export default abstract class Base {
  protected config: Config
  protected putExtra: Extra
  protected xhrList: XMLHttpRequest[] = []
  protected xhrHandler: XHRHandler = xhr => this.xhrList.push(xhr)
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

  abstract run(): utils.Response<any>

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
    this.bucket = options.bucket
    Object.assign(this, handlers)
  }

  async putFile() {
    this.aborted = false
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name
    }

    if (this.putExtra.excludeMimeType && this.putExtra.excludeMimeType.length) {
      if (!utils.isFileTypeAvailable(this.file.type, this.putExtra.excludeMimeType)) {
        const err = new Error('file type is excluded because of the excludeMimeType you set')
        this.onError(err)
        return
      }
    }

    if (this.file.size > 10000 * GB) {
      const err = new Error('file size exceed maximum value 10000G')
      this.onError(err)
      return
    }

    if (this.config.chunkSize > this.file.size) {
      const err = new Error("chunkSize can't exceed the file size")
      this.onError(err)
      return
    }

    if (!this.config.chunkSize || this.config.chunkSize % MB !== 0) {
      const err = new Error('chunkSize must be a multiple of 1M')
      this.onError(err)
      return
    }

    if (this.putExtra.customVars) {
      if (!utils.isCustomVarsAvailble(this.putExtra.customVars)) {
        const err = new Error('customVars key should start width x:')
        this.onError(err)
        return
      }
    }

    if (this.putExtra.metadata) {
      if (!utils.isMetaDataAvailble(this.putExtra.metadata)) {
        const err = new Error('metadata key should start with x-qn-meta-')
        this.onError(err)
        return
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
      if (needRetry && notReachRetryCount) {
        this.putFile()
        return
      }

      this.onError(err)
    }
  }

  clear() {
    this.xhrList.forEach(xhr => xhr.abort())
    this.xhrList = []
  }

  stop() {
    this.clear()
    this.aborted = true
  }

  sendLog(reqId: string, code: number) {
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

  getProgressInfoItem(loaded: number, size: number) {
    return {
      loaded,
      size,
      percent: loaded / size * 100
    }
  }
}
