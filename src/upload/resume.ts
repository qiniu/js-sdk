import { uploadChunk, uploadComplete, initUploadParts, UploadChunkData } from '../api'
import { QiniuError, QiniuErrorName, QiniuRequestError } from '../errors'
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
  /**
   * @description 文件的分片 chunks
   */
  private chunks: Blob[]

  /**
   * @description 使用缓存的 chunks
   */
  private usedCacheList: boolean[]

  /**
   * @description 来自缓存的上传信息
   */
  private cachedUploadedList: UploadedChunkStorage[]

  /**
   * @description 当前上传过程中已完成的上传信息
   */
  private uploadedList: UploadedChunkStorage[]

  /**
   * @description 当前上传片进度信息
   */
  private loaded: ChunkLoaded

  /**
   * @description 当前上传任务的 id
   */
  private uploadId: string

  /**
   * @returns  {Promise<ResponseSuccess<any>>}
   * @description 实现了 Base 的 run 接口，处理具体的分片上传事务，并抛出过程中的异常。
   */
  protected async run() {
    this.logger.info('start run Resume.')
    if (!this.config.chunkSize || !isPositiveInteger(this.config.chunkSize)) {
      throw new QiniuError(
        QiniuErrorName.InvalidChunkSize,
        'chunkSize must be a positive integer'
      )
    }

    if (this.config.chunkSize > 1024) {
      throw new QiniuError(
        QiniuErrorName.InvalidChunkSize,
        'chunkSize maximum value is 1024'
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
      // uploadId 无效，上传参数有误（多由于本地存储信息的 uploadId 失效）
      if (error instanceof QiniuRequestError && (error.code === 612 || error.code === 400)) {
        utils.removeLocalFileInfo(localKey, this.logger)
      }

      throw error
    }

    // 上传成功，清理本地缓存数据
    utils.removeLocalFileInfo(localKey, this.logger)
    return mkFileResponse
  }

  private async uploadChunk(chunkInfo: ChunkInfo) {
    const { index, chunk } = chunkInfo
    const cachedInfo = this.cachedUploadedList[index]
    this.logger.info(`upload part ${index}, cache:`, cachedInfo)

    const shouldCheckMD5 = this.config.checkByMD5
    const reuseSaved = () => {
      this.uploadedList[index] = cachedInfo
      this.usedCacheList[index] = true
      this.updateChunkProgress(chunk.size, index)
      this.updateLocalCache()
    }

    // FIXME: 至少判断一下 size
    if (cachedInfo && !shouldCheckMD5) {
      reuseSaved()
      return
    }

    const md5 = await utils.computeMd5(chunk)
    this.logger.info('computed part md5.', md5)

    if (cachedInfo && md5 === cachedInfo.md5) {
      reuseSaved()
      return
    }

    // 没有使用缓存设置标记为 false
    this.usedCacheList[index] = false

    const onProgress = (data: Progress) => {
      this.updateChunkProgress(data.loaded, index)
    }

    const requestOptions = {
      body: chunk,
      onProgress,
      onCreate: (xhr: XMLHttpRequest) => this.addXhr(xhr)
    }

    this.logger.info(`part ${index} start uploading.`)
    const response = await uploadChunk(
      this.token,
      this.key,
      chunkInfo.index + 1,
      this.getUploadInfo(),
      requestOptions
    )
    this.logger.info(`part ${index} upload completed.`)

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

    this.updateLocalCache()
  }

  private async mkFileReq() {
    const data: UploadChunkBody = {
      parts: this.uploadedList.map((value, index) => ({
        etag: value.etag,
        // 接口要求 index 需要从 1 开始，所以需要整体 + 1
        partNumber: index + 1
      })),
      fname: this.putExtra.fname,
      ...this.putExtra.mimeType && { mimeType: this.putExtra.mimeType },
      ...this.putExtra.customVars && { customVars: this.putExtra.customVars },
      ...this.putExtra.metadata && { metadata: this.putExtra.metadata }
    }

    this.logger.info('parts upload completed, make file.', data)
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
    return result
  }

  private async initBeforeUploadChunks() {
    this.uploadedList = []
    this.usedCacheList = []
    const cachedInfo = utils.getLocalFileInfo(this.getLocalKey(), this.logger)

    // 分片必须和当时使用的 uploadId 配套，所以断点续传需要把本地存储的 uploadId 拿出来
    // 假如没有 cachedInfo 本地信息并重新获取 uploadId
    if (!cachedInfo) {
      this.logger.info('init upload parts from api.')
      const res = await initUploadParts(
        this.token,
        this.bucketName,
        this.key,
        this.uploadHost!.getUrl()
      )
      this.logger.info(`initd upload parts of id: ${res.data.uploadId}.`)
      this.uploadId = res.data.uploadId
      this.cachedUploadedList = []
    } else {
      const infoMessage = [
        'resume upload parts from local cache,',
        `total ${cachedInfo.data.length} part,`,
        `id is ${cachedInfo.id}.`
      ]

      this.logger.info(infoMessage.join(' '))
      this.cachedUploadedList = cachedInfo.data
      this.uploadId = cachedInfo.id
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
      url: this.uploadHost!.getUrl()
    }
  }

  private getLocalKey() {
    return utils.createLocalKey(this.file.name, this.key, this.file.size)
  }

  private updateLocalCache() {
    utils.setLocalFileInfo(this.getLocalKey(), {
      id: this.uploadId,
      data: this.uploadedList
    }, this.logger)
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
        // FIXME: 不准确的 fileSize
        this.file.size + 1 // 防止在 complete 未调用的时候进度显示 100%
      ),
      chunks: this.chunks.map((chunk, index) => {
        const fromCache = this.usedCacheList[index]
        return this.getProgressInfoItem(this.loaded.chunks[index], chunk.size, fromCache)
      }),
      uploadInfo: {
        id: this.uploadId,
        url: this.uploadHost!.getUrl()
      }
    }
    this.onData(this.progress)
  }
}
