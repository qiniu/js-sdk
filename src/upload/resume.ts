import { uploadChunk, uploadComplete, initUploadParts, UploadChunkData } from '../api'
import { QiniuError, QiniuErrorType } from '../errors'
import * as utils from '../utils'

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
  const re = /^[1-9]\d*$/
  return re.test(String(n))
}

export default class Resume extends Base {
  private chunks: Blob[]
  /** 当前上传过程中已完成的上传信息 */
  private uploadedList: UploadedChunkStorage[]
  /** 当前上传片进度信息 */
  private loaded: ChunkLoaded
  private uploadId: string

  /**
   * @returns  {Promise<ResponseSuccess<any>>}
   * @description 实现了 Base 的 run 接口，处理具体的分片上传事务，并抛出过程中的异常。
   */
  protected async run() {
    this.logger.info('start run Resume.')
    if (!this.config.chunkSize || !isPositiveInteger(this.config.chunkSize)) {
      throw new QiniuError(
        QiniuErrorType.InvalidChunkSize,
        'chunkSize must be a positive integer.'
      )
    }

    if (this.config.chunkSize > 1024) {
      throw new QiniuError(
        QiniuErrorType.InvalidChunkSize,
        'chunkSize maximum value is 1024.'
      )
    }

    await this.initBeforeUploadChunks()

    const pool = new utils.Pool(
      (chunkInfo: ChunkInfo) => this.uploadChunk(chunkInfo),
      this.config.concurrentRequestLimit
    )

    let mkFileResponse = null
    const localKey = this.getLocalKey()
    const uploadChunks = this.chunks.map((chunk, index) => pool.enqueue({ chunk, index }))

    try {
      await Promise.all(uploadChunks)
      mkFileResponse = await this.mkFileReq()
    } catch (error) {
      this.logger.error('uploadChunks failed.', error)
      // uploadId 无效，上传参数有误（多由于本地存储信息的 uploadId 失效
      if (error.code === 612 || error.code === 400) {
        try {
          utils.removeLocalFileInfo(localKey)
        } catch (removeError) {
          this.logger.warn(removeError)
        }
      }

      throw error
    }

    // 上传成功，清理本地缓存数据
    try {
      utils.removeLocalFileInfo(localKey)
    } catch (error) {
      this.logger.warn(error)
    }
    return mkFileResponse
  }

  private async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const info = this.uploadedList[index]
    this.logger.info(`upload part ${index}.`, info)

    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.updateChunkProgress(chunk.size, index)
    }

    if (info && !shouldCheckMD5) {
      reuseSaved()
      return
    }

    const md5 = await utils.computeMd5(chunk)
    this.logger.info('computed part md5.', md5)

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

    this.logger.info(`part ${index} start uploading.`)
    await this.checkAndUpdateUploadHost()
    const response = await uploadChunk(
      this.token,
      this.key,
      chunkInfo.index + 1,
      this.getUploadInfo(),
      requestOptions
    )
    this.logger.info(`part ${index} upload completed.`)
    this.checkAndUnfreezeHost()

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

    try {
      utils.setLocalFileInfo(this.getLocalKey(), {
        id: this.uploadId,
        data: this.uploadedList
      })
    } catch (error) {
      this.logger.info(`set part ${index} cache failed.`, error)
    }
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

    this.logger.info('parts upload completed, make file.', data)
    await this.checkAndUpdateUploadHost()
    const result = await uploadComplete(
      this.token,
      this.key,
      this.getUploadInfo(),
      {
        onCreate: xhr => this.addXhr(xhr),
        body: JSON.stringify(data)
      }
    )

    this.logger.info('finish Resume Progress.')
    this.updateMkFileProgress(1)
    this.checkAndUnfreezeHost()
    return result
  }

  private async initBeforeUploadChunks() {
    let localInfo: LocalInfo | null = null
    try {
      localInfo = utils.getLocalFileInfo(this.getLocalKey())
    } catch (error) {
      this.logger.warn(error)
    }

    // 分片必须和当时使用的 uploadId 配套，所以断点续传需要把本地存储的 uploadId 拿出来
    // 假如没有 localInfo 本地信息并重新获取 uploadId
    if (!localInfo) {
      this.logger.info('resume upload parts from api.')
      await this.checkAndUpdateUploadHost()
      const res = await initUploadParts(
        this.token,
        this.putPolicy.bucketName,
        this.key,
        this.uploadHost.url()
      )
      this.checkAndUnfreezeHost()
      this.logger.info(`resume upload parts of id: ${res.data.uploadId}.`)
      this.uploadId = res.data.uploadId
      this.uploadedList = []
    } else {
      const infoMessage = [
        'resume upload parts from local cache',
        `total ${localInfo.data.length} part`,
        `id is ${localInfo.id}.`
      ]

      this.logger.info(infoMessage.join(', '))
      this.uploadedList = localInfo.data
      this.uploadId = localInfo.id
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
      url: this.uploadHost.url()
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
        url: this.uploadHost?.url()
      }
    }
    this.onData(this.progress)
  }
}
