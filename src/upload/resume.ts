import * as utils from '../utils'
import { Pool } from '../pool'
import { uploadChunk, uploadComplete, initUploadParts } from '../api'
import Base, { Progress } from './base'

export interface UploadedChunkResult {
  time: number
  etag: string
  size: number
  md5: string
  uploadId: string
}

export interface ChunkLoaded {
  mkFileProgress: 0 | 1
  chunks: number[]
}

export interface ChunkInfo {
  chunk: Blob
  index: number
}

const MB = 1024 ** 2

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
    if (this.config.chunkSize > this.file.size) {
      throw new Error("chunkSize can't exceed the file size")
    }

    if (!this.config.chunkSize || this.config.chunkSize % MB !== 0) {
      throw new Error('chunkSize must be a multiple of 1M')
    }

    await this.initBeforeUploadChunks()

    const pool = new Pool(
      (chunkInfo: ChunkInfo) => this.uploadChunk(chunkInfo),
      this.config.concurrentRequestLimit
    )
    const uploadChunks = this.chunks.map((chunk, index) => pool.enqueue({ chunk, index }))

    const result = Promise.all(uploadChunks).then(() => this.mkFileReq())
    result.then(
      () => {
        utils.removeLocalFileInfo(this.key, this.file.size)
      },
      err => {
        // 上传凭证无效，上传参数有误（多由于本地存储信息的 uploadId 失效）
        if (err.code === 401 || err.code === 400) {
          utils.removeLocalFileInfo(this.key, this.file.size)
        }
      }
    )
    return result
  }

  async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.localInfo[index]
    if (utils.isExpired(this.expireAt)) {
      throw new Error('uploadId is expired, please upload again')
    }

    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
      this.uploadedList[index] = {
        etag: info.etag,
        size: info.size,
        time: info.time,
        md5: info.md5,
        uploadId: this.uploadId
      }
    }

    if (info && !shouldCheckMD5) {
      reuseSaved()
      return
    }

    const md5 = await utils.computeMd5(chunk)

    if (info && md5 === info.md5) {
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
    onProgress({
      loaded: chunk.size,
      total: chunk.size
    })

    this.uploadedList[index] = {
      time: this.expireAt,
      uploadId: this.uploadId,
      etag: response.data.etag,
      md5: response.data.md5,
      size: chunk.size
    }

    utils.setLocalFileInfo(this.key, this.file.size, this.uploadedList)
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

  async initBeforeUploadChunks() {
    this.localInfo = utils.getLocalFileInfo(this.key, this.file.size)
    // 分片必须和当时使用的 uploadId 配套，所以断点续传需要把本地存储的 uploadId 拿出来
    const result = this.localInfo.find(item => item.uploadId)
    // 假如没有 result 或者存储信息已过期，clear 本地信息并重新获取 uploadId
    if (!result || utils.isExpired(result.time)) {
      utils.removeLocalFileInfo(this.key, this.file.size)
      const parts = await initUploadParts(this.token, this.bucket, this.key, this.uploadUrl)
      this.uploadId = parts.data.uploadId
      this.expireAt = parts.data.expireAt
    } else {
      this.uploadId = result.uploadId
      this.expireAt = result.time
    }
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
