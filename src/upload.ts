import {
  getChunks,
  isChunkExpired,
  createMkFileUrl,
  setLocalFileInfo,
  removeLocalFileInfo,
  getLocalFileInfo,
  isContainFileMimeType,
  sum,
  getDomainFromUrl,
  getPortFromUrl,
  getHeadersForChunkUpload,
  getHeadersForMkFile,
  request,
  computeMd5,
  getUploadUrl,
  filterParams
} from './utils'

import { Pool } from './pool'
import { OnNext, OnError, OnCompleted } from './observable'
import StatisticsLogger from './statisticsLog'
import { ZoneType } from './config'

const BLOCK_SIZE = 4 * 1024 * 1024

export interface IExtra {
  fname: string	// 文件原文件名
  params: { [key: string]: string }	// 用来放置自定义变量
  mimeType: string[] | null	// 用来限制上传文件类型，为 null 时表示不对文件类型限制；限制类型放到数组里： ['image/png', 'image/jpeg', 'image/gif']
}

export interface IConfig {
  region: ZoneType
  useCdnDomain: boolean
  checkByMD5: boolean
  forceDirect: boolean
  retryCount: number
  uphost: string
  concurrentRequestLimit: number
  disableStatisticsReport: boolean
}

export interface IUploadOptions {
  file: File
  key: string
  token: string
  putExtra: Partial<IExtra>
  config: Partial<IConfig>
}

export interface IUploadHandler {
  onData: OnNext
  onError: OnError
  onComplete: OnCompleted
}

export interface IProgress {
  loaded: number
  total: number
}

export interface IProgressCompose {
  loaded: number
  size: number
  percent: number
}

export interface IUploadProgress {
  total: IProgressCompose
  chunks?: IProgressCompose[]
}

export interface ICtxInfo {
  time: number
  ctx: string
  size: number
  md5: string
}

export interface IChunkLoaded {
  mkFileProgress: 0 | 1
  chunks: number[]
}

export interface IChunkInfo {
  chunk: Blob
  index: number
}

export type XHRHandler = (xhr: XMLHttpRequest) => void

const statisticsLogger = new StatisticsLogger()

export class UploadManager {
  private config: IConfig
  private putExtra: IExtra
  private xhrList: XMLHttpRequest[] = []
  private xhrHandler: XHRHandler = xhr => this.xhrList.push(xhr)
  private file: File
  private key: string
  private aborted = false
  private retryCount = 0
  private token: string
  private uploadUrl: string
  private uploadAt: number

  private onData: OnNext
  private onError: OnError
  private onComplete: OnCompleted
  private progress: IUploadProgress
  private ctxList: ICtxInfo[]
  private loaded: IChunkLoaded
  private chunks: Blob[]
  private localInfo: ICtxInfo[]

  constructor(options: IUploadOptions, handlers: IUploadHandler) {
    this.config = Object.assign(
      {
        useCdnDomain: true,
        disableStatisticsReport: false,
        retryCount: 3,
        checkByMD5: false,
        uphost: null,
        forceDirect: false,
        concurrentRequestLimit: 3,
        region: null
      },
      options.config
    )

    this.putExtra = Object.assign(
      {
        fname: '',
        params: {},
        mimeType: null
      },
      options.putExtra
    )

    this.file = options.file
    this.key = options.key
    this.token = options.token
    Object.assign(this, handlers)
  }

  putFile() {
    this.aborted = false
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name
    }

    if (this.putExtra.mimeType && this.putExtra.mimeType.length) {
      if (!isContainFileMimeType(this.file.type, this.putExtra.mimeType)){
        const err = new Error("file type doesn't match with what you specify")
        this.onError(err)
        return
      }
    }

    const upload = getUploadUrl(this.config, this.token).then(res => {
      this.uploadUrl = res
      this.uploadAt = new Date().getTime()

      if (this.config.forceDirect) {
        return this.directUpload()
      }

      return this.file.size > BLOCK_SIZE ? this.resumeUpload() : this.directUpload()
    })

    upload.then(res => {
      this.onComplete()
      if (!this.config.disableStatisticsReport) {
        this.sendLog(res.reqId, 200)
      }
    }, err => {

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
    })
    return upload
  }

  clear() {
    this.xhrList.forEach(xhr => xhr.abort())
    this.xhrList = []
  }

  stop() {
    this.clear()
    this.aborted = true
  }

  sendLog(reqId: string, code: number){
    statisticsLogger.log({
      code: code,
      reqId: reqId,
      host: getDomainFromUrl(this.uploadUrl),
      remoteIp: '',
      port: getPortFromUrl(this.uploadUrl),
      duration: (new Date().getTime() - this.uploadAt) / 1000,
      time: Math.floor(this.uploadAt / 1000),
      bytesSent: this.progress ? this.progress.total.loaded : 0,
      upType: 'jssdk-h5',
      size: this.file.size
    }, this.token)
  }

  // 直传
  async directUpload() {
    const formData = new FormData()
    formData.append('file', this.file)
    formData.append('token', this.token)
    if (this.key != null) {
      formData.append('key', this.key)
    }
    formData.append('fname', this.putExtra.fname)
    filterParams(this.putExtra.params).forEach(item =>
      formData.append(item[0], item[1])
    )

    const result = await request(this.uploadUrl, {
      method: 'POST',
      body: formData,
      onProgress: data => {
        this.updateDirectProgress(data.loaded, data.total)
      },
      onCreate: this.xhrHandler
    })

    this.finishDirectProgress()
    return result
  }

  // 分片上传
  resumeUpload() {

    this.loaded = {
      mkFileProgress: 0,
      chunks: []
    }

    this.ctxList = []
    this.localInfo = getLocalFileInfo(this.file)
    this.chunks = getChunks(this.file, BLOCK_SIZE)
    this.initChunksProgress()

    const pool = new Pool((chunkInfo: IChunkInfo) => this.uploadChunk(chunkInfo), this.config.concurrentRequestLimit)
    const uploadChunks = this.chunks.map((chunk, index) => pool.enqueue({chunk, index}))

    const result = Promise.all(uploadChunks).then(this.mkFileReq)
    result.then(
      () => {
        removeLocalFileInfo(this.file)
      },
      err => {
        // ctx错误或者过期情况下
        if (err.code === 701) {
          removeLocalFileInfo(this.file)
          return
        }
      }
    )
    return result
  }

  async uploadChunk(chunkInfo: IChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.localInfo[index]
    const requestUrl = this.uploadUrl + '/mkblk/' + chunk.size

    const savedReusable = info && !isChunkExpired(info.time)
    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
      this.ctxList[index] = { ctx: info.ctx, size: info.size, time: info.time, md5: info.md5 }
      return Promise.resolve(null)
    }

    if (savedReusable && !shouldCheckMD5) {
      return reuseSaved()
    }

    const md5 = await computeMd5(chunk)

    if (savedReusable && md5 === info.md5) {
      return reuseSaved()
    }

    const headers = getHeadersForChunkUpload(this.token)
    const onProgress = (data: IProgress) => {
      this.updateChunkProgress(data.loaded, index)
    }
    const onCreate = this.xhrHandler
    const method = 'POST'

    const response = await request(requestUrl, {
      method,
      headers,
      body: chunk,
      onProgress,
      onCreate
    })
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
    onProgress({ loaded: chunk.size, total: chunk.size })

    this.ctxList[index] = {
      time: new Date().getTime(),
      ctx: response.data.ctx,
      size: chunk.size,
      md5: md5
    }

    setLocalFileInfo(this.file, this.ctxList)
  }

  async mkFileReq() {
    const putExtra = Object.assign(
      { mimeType: 'application/octet-stream' },
      this.putExtra
    )

    const requestUrL = createMkFileUrl(
      this.uploadUrl,
      this.file.size,
      this.key,
      putExtra
    )

    const body = this.ctxList.map(value => value.ctx).join(',')
    const headers = getHeadersForMkFile(this.token)
    const onCreate = this.xhrHandler
    const method = 'POST'
    const result = await request(requestUrL, { method, body, headers, onCreate})
    this.updateMkFileProgress()
    return result
  }

  updateDirectProgress(loaded: number, total: number) {
    // 当请求未完成时可能进度会达到100，所以total + 1来防止这种情况出现
    this.progress = { total: this.getProgressInfoItem(loaded, total + 1) }
    this.onData(this.progress)
  }

  finishDirectProgress() {
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null， 这里 fake 下
    if (!this.progress) {
      this.progress = { total: this.getProgressInfoItem(this.file.size, this.file.size) }
      this.onData(this.progress)
      return
    }

    const { total } = this.progress
    this.progress = { total: this.getProgressInfoItem(total.loaded + 1, total.size) }
    this.onData(this.progress)
  }

  initChunksProgress() {
    this.loaded.chunks = this.chunks.map(_ => 0)
    this.notifyResumeProgress()
  }

  updateChunkProgress(loaded: number, index: number) {
    this.loaded.chunks[index] = loaded
    this.notifyResumeProgress()
  }

  updateMkFileProgress() {
    this.loaded.mkFileProgress = 1
    this.notifyResumeProgress()
  }

  notifyResumeProgress() {
    this.progress = {
      total: this.getProgressInfoItem(
        sum(this.loaded.chunks) + this.loaded.mkFileProgress,
        this.file.size + 1
      ),
      chunks: this.chunks.map((chunk, index) => this.getProgressInfoItem(this.loaded.chunks[index], chunk.size))
    }
    this.onData(this.progress)
  }

  getProgressInfoItem(loaded: number, size: number) {
    return {
      loaded: loaded,
      size: size,
      percent: loaded / size * 100
    }
  }
}
