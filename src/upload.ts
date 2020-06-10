import * as utils from './utils'
import { Pool } from './pool'
import statisticsLogger from './statisticsLog'
import { RegionType } from './config'

const BLOCK_SIZE = 4 * 1024 * 1024

export interface Extra {
  fname: string // 文件原文件名
  params: { [key: string]: string } // 用来放置自定义变量
  mimeType: string[] | null // 用来限制上传文件类型，为 null 时表示不对文件类型限制；限制类型放到数组里： ['image/png', 'image/jpeg', 'image/gif']
}

export interface Config {
  useCdnDomain: boolean
  checkByMD5: boolean
  forceDirect: boolean
  retryCount: number
  uphost: string
  concurrentRequestLimit: number
  disableStatisticsReport: boolean
  region?: RegionType
}

export interface UploadOptions {
  file: File
  key: string
  token: string
  putExtra: Partial<Extra>
  config: Partial<Config>
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

export interface UploadProgress {
  total: ProgressCompose
  chunks?: ProgressCompose[]
}

export interface CtxInfo {
  time: number
  ctx: string
  size: number
  md5: string
}

export interface ChunkLoaded {
  mkFileProgress: 0 | 1
  chunks: number[]
}

export interface ChunkInfo {
  chunk: Blob
  index: number
}

export class UploadManager {
  private config: Config
  private putExtra: Extra
  private xhrList: XMLHttpRequest[] = []
  private xhrHandler: utils.XHRHandler = xhr => this.xhrList.push(xhr)
  private file: File
  private key: string
  private aborted = false
  private retryCount = 0
  private token: string
  private uploadUrl: string
  private uploadAt: number

  private onData: (data: UploadProgress) => void
  private onError: (err: utils.CustomError) => void
  private onComplete: (res: any) => void
  private progress: UploadProgress
  private ctxList: CtxInfo[]
  private loaded: ChunkLoaded
  private chunks: Blob[]
  private localInfo: CtxInfo[]

  constructor(options: UploadOptions, handlers: UploadHandler) {
    this.config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 3,
      checkByMD5: false,
      uphost: '',
      forceDirect: false,
      concurrentRequestLimit: 3,
      ...options.config
    }

    this.putExtra = {
      fname: '',
      params: {},
      mimeType: null,
      ...options.putExtra
    }

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
      if (!utils.isContainFileMimeType(this.file.type, this.putExtra.mimeType)) {
        const err = new Error("file type doesn't match with what you specify")
        this.onError(err)
        return
      }
    }

    const upload = utils.getUploadUrl(this.config, this.token).then(res => {
      this.uploadUrl = res
      this.uploadAt = new Date().getTime()

      if (this.config.forceDirect) {
        return this.directUpload()
      }

      return this.file.size > BLOCK_SIZE ? this.resumeUpload() : this.directUpload()
    })

    upload.then(res => {
      this.onComplete(res.data)
      if (!this.config.disableStatisticsReport) {
        this.sendLog(res.reqId, 200)
      }
    }, (err: utils.CustomError) => {

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

  sendLog(reqId: string, code: number) {
    statisticsLogger.log({
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

  // 直传
  async directUpload() {
    const formData = new FormData()
    formData.append('file', this.file)
    formData.append('token', this.token)
    if (this.key != null) {
      formData.append('key', this.key)
    }
    formData.append('fname', this.putExtra.fname)
    utils.filterParams(this.putExtra.params).forEach(item => formData.append(item[0], item[1]))

    const result = await utils.request(this.uploadUrl, {
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
    this.initBeforeUploadChunks()

    const pool = new Pool<ChunkInfo>(
      (chunkInfo: ChunkInfo) => this.uploadChunk(chunkInfo),
      this.config.concurrentRequestLimit
    )
    const uploadChunks = this.chunks.map((chunk, index) => pool.enqueue({ chunk, index }))

    const result = Promise.all(uploadChunks).then(() => this.mkFileReq())
    result.then(
      () => {
        utils.removeLocalFileInfo(this.file)
      },
      (err: utils.CustomError) => {
        // ctx错误或者过期情况下
        if (err.code === 701) {
          utils.removeLocalFileInfo(this.file)
        }
      }
    )
    return result
  }

  async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.localInfo[index]
    const requestUrl = this.uploadUrl + '/mkblk/' + chunk.size

    const savedReusable = info && !utils.isChunkExpired(info.time)
    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
      this.ctxList[index] = {
        ctx: info.ctx,
        size: info.size,
        time: info.time,
        md5: info.md5
      }
    }

    if (savedReusable && !shouldCheckMD5) {
      reuseSaved()
      return
    }

    const md5 = await utils.computeMd5(chunk)

    if (savedReusable && md5 === info.md5) {
      reuseSaved()
      return
    }

    const headers = utils.getHeadersForChunkUpload(this.token)
    const onProgress = (data: Progress) => {
      this.updateChunkProgress(data.loaded, index)
    }
    const onCreate = this.xhrHandler
    const method = 'POST'

    const response = await utils.request<{ ctx: string }>(requestUrl, {
      method,
      headers,
      body: chunk,
      onProgress,
      onCreate
    })
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
    onProgress({
      loaded: chunk.size,
      total: chunk.size
    })

    this.ctxList[index] = {
      time: new Date().getTime(),
      ctx: response.data.ctx,
      size: chunk.size,
      md5
    }

    utils.setLocalFileInfo(this.file, this.ctxList)
  }

  async mkFileReq() {
    const putExtra = {
      mimeType: 'application/octet-stream',
      ...this.putExtra
    }

    const requestUrL = utils.createMkFileUrl(
      this.uploadUrl,
      this.file,
      this.key,
      putExtra
    )

    const body = this.ctxList.map(value => value.ctx).join(',')
    const headers = utils.getHeadersForMkFile(this.token)
    const onCreate = this.xhrHandler
    const method = 'POST'
    const result = await utils.request(requestUrL, { method, body, headers, onCreate })
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

  initBeforeUploadChunks() {
    this.loaded = {
      mkFileProgress: 0,
      chunks: []
    }

    this.localInfo = utils.getLocalFileInfo(this.file)
    this.chunks = utils.getChunks(this.file, BLOCK_SIZE)

    this.ctxList = []
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
        utils.sum(this.loaded.chunks) + this.loaded.mkFileProgress,
        this.file.size + 1
      ),
      chunks: this.chunks.map((chunk, index) => (
        this.getProgressInfoItem(this.loaded.chunks[index], chunk.size)
      ))
    }
    this.onData(this.progress)
  }

  getProgressInfoItem(loaded: number, size: number) {
    return {
      loaded,
      size,
      percent: loaded / size * 100
    }
  }
}
