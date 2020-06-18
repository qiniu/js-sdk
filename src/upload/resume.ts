import * as utils from '../utils'
import { Pool } from '../pool'
import { uploadChunk, uploadComplete, initUploadParts } from '../api'
import Base, { Progress } from './base'

export interface UploadedChunkResult {
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

export interface LocalInfo {
  data: UploadedChunkResult[]
  id: string
}

const MB = 1024 ** 2

export default class Resume extends Base {
  private chunks: Blob[]
  /** 本地已存储的文件上传信息 */
  private localInfo: LocalInfo
  /** 当前上传过程中已完成的上传信息 */
  private uploadedList: UploadedChunkResult[]
  /** 当前上传片进度信息 */
  private loaded: ChunkLoaded
  private uploadId: string

  protected async run() {
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
        this.removeLoalFileInfo()
      },
      err => {
        /** 上传凭证无效，上传参数有误（多由于本地存储信息的 uploadId 失效） */
        if (err.code === 401 || err.code === 400) {
          this.removeLoalFileInfo()
        }
      }
    )
    return result
  }

  private async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.localInfo.data[index]

    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
      this.uploadedList[index] = {
        etag: info.etag,
        size: info.size,
        md5: info.md5
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

    const onProgress = (data: Progress) => {
      this.updateChunkProgress(data.loaded, index)
    }

    const requestOptions = {
      body: chunk,
      onProgress,
      onCreate: (xhr: XMLHttpRequest) => this.addXhr(xhr)
    }

    const response = await uploadChunk(
      this.token,
      chunkInfo.index + 1,
      this.getUploadInfo(),
      requestOptions
    )
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
    onProgress({
      loaded: chunk.size,
      total: chunk.size
    })

    this.uploadedList[index] = {
      etag: response.data.etag,
      md5: response.data.md5,
      size: chunk.size
    }

    this.setLocalFileInfo()
  }

  private async mkFileReq() {
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

    const result = await uploadComplete(
      this.token,
      this.getUploadInfo(),
      {
        onCreate: xhr => this.addXhr(xhr),
        body: JSON.stringify(data)
      }
    )
    this.updateMkFileProgress(1)
    return result
  }

  private async initBeforeUploadChunks() {
    this.localInfo = this.getLocalFileInfo()
    /**
     * 分片必须和当时使用的 uploadId 配套，所以断点续传需要把本地存储的 uploadId 拿出来
     * 假如没有 result 或者存储信息已过期，clear 本地信息并重新获取 uploadId
     */
    if (!this.localInfo || !this.localInfo.id) {
      this.removeLoalFileInfo()
      const parts = await initUploadParts(this.token, this.bucket, this.key, this.uploadUrl)
      this.uploadId = parts.data.uploadId
      this.localInfo.id = this.uploadId
    } else {
      this.uploadId = this.localInfo.id
    }

    this.chunks = utils.getChunks(this.file, this.config.chunkSize)
    this.uploadedList = []
    this.loaded = {
      mkFileProgress: 0,
      chunks: this.chunks.map(_ => 0)
    }
    this.notifyResumeProgress()
  }

  private getUploadInfo() {
    return {
      uploadUrl: this.uploadUrl,
      uploadId: this.uploadId,
      bucket: this.bucket,
      key: this.key
    }
  }

  private getLocalFileInfo() {
    return utils.getLocalFileInfo(this.file.name, this.key, this.file.size)
  }

  private setLocalFileInfo() {
    this.localInfo.data = this.uploadedList
    utils.setLocalFileInfo(this.file.name, this.key, this.file.size, this.localInfo)
  }

  private removeLoalFileInfo() {
    utils.removeLocalFileInfo(this.file.name, this.key, this.file.size)
  }

  private updateChunkProgress(loaded: number, index: number) {
    this.loaded.chunks[index] = loaded
    this.notifyResumeProgress()
  }

  private updateMkFileProgress(progress: 0 | 1) {
    this.loaded.mkFileProgress = progress
    this.notifyResumeProgress()
  }

  private notifyResumeProgress() {
    this.progress = {
      total: this.getProgressInfoItem(
        utils.sum(this.loaded.chunks) + this.loaded.mkFileProgress,
        this.file.size + 1
      ),
      chunks: this.chunks.map((chunk, index) => (
        this.getProgressInfoItem(this.loaded.chunks[index], chunk.size)
      )),
      uploadInfo: {
        key: this.key,
        bucket: this.bucket,
        uploadId: this.uploadId,
        uploadUrl: this.uploadUrl,
        size: this.file.size,
        fname: this.file.name
      }
    }
    this.onData(this.progress)
  }

}
