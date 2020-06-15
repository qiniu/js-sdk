import * as utils from '../utils'
import { Pool } from '../pool'
import { uploadChunk, uploadComplete, initUploadParts } from '../api'
import Base, { Progress } from './base'

export interface UploadedChunkResult {
  time: number
  etag: string
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

export default class Resume extends Base {
  private chunks: Blob[]
  // 本地已存储的文件上传信息
  private localInfo: UploadedChunkResult[]
  // 当前上传过程中已完成的上传信息
  private uploadedList: UploadedChunkResult[]
  private loaded: ChunkLoaded
  private uploadId: string
  private expireAt: number

  async run() {
    // 初始化上传，获取上传标志 id
    const parts = await initUploadParts(this.token, this.bucket, this.key, this.uploadUrl)
    this.uploadId = parts.data.uploadId
    this.expireAt = parts.data.expireAt

    this.initBeforeUploadChunks()

    const pool = new Pool(
      (chunkInfo: ChunkInfo) => this.uploadChunk(chunkInfo),
      this.config.concurrentRequestLimit
    )
    const uploadChunks = this.chunks.map((chunk, index) => pool.enqueue({ chunk, index }))

    const result = Promise.all(uploadChunks).then(() => this.mkFileReq())
    result.then(
      () => {
        utils.removeLocalFileInfo(this.file)
      },
      err => {
        // 上传凭证无效
        if (err.code === 401) {
          utils.removeLocalFileInfo(this.file)
        }
      }
    )
    return result
  }

  async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.localInfo[index]

    const savedReusable = info && !utils.isChunkExpired(this.expireAt)
    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
      this.uploadedList[index] = {
        etag: info.etag,
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
    const method = 'PUT'
    const requestOptions = {
      method,
      headers,
      body: chunk,
      onProgress,
      onCreate
    }

    const response = await uploadChunk(
      this.bucket,
      this.key,
      chunkInfo.index + 1,
      this.uploadUrl,
      this.uploadId,
      requestOptions
    )
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
    onProgress({ loaded: chunk.size, total: chunk.size })

    this.uploadedList[index] = {
      time: this.expireAt,
      etag: response.data.etag,
      size: chunk.size,
      md5: response.data.md5
    }

    utils.setLocalFileInfo(this.file, this.uploadedList)
  }

  async mkFileReq() {
    const data = {
      parts: this.uploadedList.map((value, index) => ({
        etag: value.etag,
        partNumber: index + 1
      })),
      ...this.putExtra.fname && { fname: this.putExtra.fname },
      ...this.putExtra.mimeType && { mimeType: this.putExtra.mimeType },
      ...this.putExtra.customVars && { customVars: this.putExtra.customVars },
      ...this.putExtra.metadata && { metadata: this.putExtra.metadata }
    }
    const headers = utils.getHeadersForMkFile(this.token)
    const onCreate = this.xhrHandler
    const method = 'POST'

    const result = await uploadComplete(
      this.bucket,
      this.key,
      this.uploadUrl,
      this.uploadId,
      {
        method,
        headers,
        onCreate,
        body: JSON.stringify(data)
      }
    )
    this.updateMkFileProgress(1)
    return result
  }

  initBeforeUploadChunks() {

    this.localInfo = utils.getLocalFileInfo(this.file)
    this.chunks = utils.getChunks(this.file, this.config.chunkSize)

    this.uploadedList = []
    this.loaded = {
      mkFileProgress: 0,
      chunks: this.chunks.map(_ => 0)
    }
    this.notifyResumeProgress()
  }

  updateChunkProgress(loaded: number, index: number) {
    this.loaded.chunks[index] = loaded
    this.notifyResumeProgress()
  }

  updateMkFileProgress(progress: 0 | 1) {
    this.loaded.mkFileProgress = progress
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
      )),
      uploadId: this.uploadId,
      uploadUrl: this.uploadUrl
    }
    this.onData(this.progress)
  }

}
