import * as utils from '../utils'
import { Pool } from '../pool'
import { uploadChunk, uploadComplete, initUploadParts, UploadChunkData } from '../api'
import Base, { Progress, UploadInfo, Extra } from './base'

export interface UploadedChunkStorage extends UploadChunkData {
  size: number
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
  data: UploadedChunkStorage[]
  id: string
}

export interface ChunkPart {
  etag: string
  partNumber: number
}

export interface UploadChunkBody extends Extra {
  parts: ChunkPart[]
}

/** 是否为正整数 */
function isPositiveInteger(n: number) {
  var re = /^[1-9]\d*$/
  return re.test(String(n))
}

export default class Resume extends Base {
  private chunks: Blob[]
  /** 当前上传过程中已完成的上传信息 */
  private uploadedList: UploadedChunkStorage[]
  /** 当前上传片进度信息 */
  private loaded: ChunkLoaded
  private uploadId: string

  protected async run() {
    if (!this.config.chunkSize || !isPositiveInteger(this.config.chunkSize)) {
      throw new Error('chunkSize must be a positive integer')
    }

    if (this.config.chunkSize > 1024) {
      throw new Error('chunkSize maximum value is 1024')
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
        utils.removeLocalFileInfo(this.getLocalKey())
      },
      err => {
        // uploadId 无效，上传参数有误（多由于本地存储信息的 uploadId 失效
        if (err.code === 612 || err.code === 400) {
          utils.removeLocalFileInfo(this.getLocalKey())
        }
      }
    )
    return result
  }

  private async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.uploadedList[index]

    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
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
      this.key,
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

    utils.setLocalFileInfo(this.getLocalKey(), {
      id: this.uploadId,
      data: this.uploadedList
    })

  }

  private async mkFileReq() {
    const data: UploadChunkBody = {
      parts: this.uploadedList.map((value, index) => ({
        etag: value.etag,
        partNumber: index + 1
      })),
      fname: this.putExtra.fname,
      ...this.putExtra.mimeType && { mimeType: this.putExtra.mimeType },
      ...this.putExtra.customVars && { customVars: this.putExtra.customVars },
      ...this.putExtra.metadata && { metadata: this.putExtra.metadata }
    }

    const result = await uploadComplete(
      this.token,
      this.key,
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
    const localInfo = utils.getLocalFileInfo(this.getLocalKey())
    // 分片必须和当时使用的 uploadId 配套，所以断点续传需要把本地存储的 uploadId 拿出来
    // 假如没有 localInfo 本地信息并重新获取 uploadId
    if (!localInfo) {
      // 防止本地信息已被破坏，初始化时 clear 一下
      utils.removeLocalFileInfo(this.getLocalKey())
      const res = await initUploadParts(this.token, this.bucket, this.key, this.uploadUrl)
      this.uploadId = res.data.uploadId
      this.uploadedList = []
    } else {
      this.uploadId = localInfo.id
      this.uploadedList = localInfo.data
    }

    this.chunks = utils.getChunks(this.file, this.config.chunkSize)
    this.loaded = {
      mkFileProgress: 0,
      chunks: this.chunks.map(_ => 0)
    }
    this.notifyResumeProgress()
  }

  private getUploadInfo(): UploadInfo {
    return {
      id: this.uploadId,
      url: this.uploadUrl
    }
  }

  private getLocalKey() {
    return utils.createLocalKey(this.file.name, this.key, this.file.size)
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
        this.file.size + 1 // 防止在 complete 未调用的时候进度显示 100%
      ),
      chunks: this.chunks.map((chunk, index) => (
        this.getProgressInfoItem(this.loaded.chunks[index], chunk.size)
      )),
      uploadInfo: {
        id: this.uploadId,
        url: this.uploadUrl
      }
    }
    this.onData(this.progress)
  }

}
