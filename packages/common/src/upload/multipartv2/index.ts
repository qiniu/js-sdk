import { UploadBlob, UploadFile } from '../../types/file'
import { HttpAbortController } from '../../types/http'
import { generateRandomString } from '../../helper/string'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../types/types'
import { UploadApis, ConfigApis, PartMeta, InitPartsUploadData, UploadedPart } from '../../api'

import { UploadTask, UploadConfig } from '../types'

import { UploadContext, updateTotalIntoProgress } from '../common/context'
import { Task, TaskQueue } from '../common/queue'
import { initUploadConfig } from '../common/config'
import { HostProgressKey, HostProvideTask } from '../common/host'
import { TokenProgressKey, TokenProvideTask } from '../common/token'

export type MultipartUploadV2ProgressKey =
  | HostProgressKey
  | TokenProgressKey
  | 'initMultipartUpload'
  | 'completeMultipartUpload'
  | `multipartUpload:${number}`

export class MultipartUploadV2Context extends UploadContext<MultipartUploadV2ProgressKey> {
  uploadPartId?: InitPartsUploadData
  uploadedParts: Array<PartMeta | UploadedPart> = []

  setup(): void {
    super.setup()
  }
}

class InitPartUploadTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadV2Context,
    private uploadApis: UploadApis,
    private file: UploadFile
  ) { this.updateProgress(0) }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(percent: number, notify?: () => void) {
    if (this.context.progress.details.initMultipartUpload == null) {
      this.context.progress.details.initMultipartUpload = {
        size: 0,
        percent: 0,
        fromCache: false
      }
    }

    this.context.progress.details.initMultipartUpload.size = 0
    this.context.progress.details.initMultipartUpload.percent = percent
    this.context.progress.details.initMultipartUpload.fromCache = false
    notify?.()
  }

  async process(notify: () => void): Promise<Result> {
    this.abort = new HttpAbortController()

    this.updateProgress(0, notify)

    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    const fileKeyResult = await this.file.key()
    if (!isSuccessResult(fileKeyResult)) return fileKeyResult

    // 首先检查 context 上的 upload id 有没有过期
    if (this.context.uploadPartId) {
      const nowTime = Date.now() / 1e3
      // 上次的 uploadPartId 还没过期 (至少剩余 60s)，继续使用
      if ((this.context.uploadPartId.expireAt - 60) > nowTime) {

        // 从服务端获取已上传的分片信息
        const uploadedPartResult = await this.uploadApis.listParts({
          abort: this.abort,
          token: this.context!.token!,
          bucket: this.context.token!.bucket,
          uploadHostUrl: this.context!.host!.getUrl(),
          uploadId: this.context.uploadPartId.uploadId,
          key: fileKeyResult.result || filenameResult.result || undefined,
          onProgress: progress => { this.updateProgress(progress.percent, notify) }
        })

        if (isCanceledResult(uploadedPartResult)) {
          return uploadedPartResult
        }

        if (isErrorResult(uploadedPartResult)) {
          // 发生错误仅仅更新到 context，不 return
          this.context.error = uploadedPartResult.error
        }

        // 更新已上传分片信息到 context
        if (isSuccessResult(uploadedPartResult) && uploadedPartResult.result.parts) {
          this.context.uploadedParts.splice(0, Infinity)
          this.context.uploadedParts.push(...uploadedPartResult.result.parts)
          this.context.progress.details.initMultipartUpload.fromCache = true
          return uploadedPartResult
        }
        // 错误情况直接走下面的 initMultipartUpload 流程重新初始化
      }
    }

    const initResult = await this.uploadApis.initMultipartUpload({
      abort: this.abort,
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
      uploadHostUrl: this.context!.host!.getUrl(),
      key: fileKeyResult.result || filenameResult.result || undefined,
      onProgress: progress => { this.updateProgress(progress.percent, notify) }
    })

    if (isSuccessResult(initResult)) {
      this.context!.uploadPartId = initResult.result
      this.context.uploadedParts.splice(0, Infinity)
    }

    if (isErrorResult(initResult)) {
      this.context.error = initResult.error
    }

    return initResult
  }
}

class UploadPartTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadV2Context,
    private uploadApis: UploadApis,
    private index: number,
    private file: UploadFile,
    private blob: UploadBlob
  ) { this.updateProgress(false, blob.size(), 0) }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(fromCache: boolean, size: number, percent: number, notify?: () => void) {
    const key = `multipartUpload:${this.index}` as const
    if (this.context.progress.details[key] == null) {
      this.context.progress.details[key] = {
        size: 0,
        percent: 0,
        fromCache: false
      }
    }

    this.context.progress.details[key].fromCache = fromCache
    this.context.progress.details[key].percent = percent
    this.context.progress.details[key].size = size
    notify?.()
  }

  async process(notify: () => void): Promise<Result> {
    if (this.context.uploadedParts.length > 0) {
      const uploadedParts = this.context.uploadedParts
      const uploadedPart = uploadedParts.find(i => i.partNumber === this.index)
      // 如果 number 和 size 匹配则直接跳过上传，复用分片
      if (uploadedPart && 'size' in uploadedPart && uploadedPart.size === this.blob.size()) {
        this.updateProgress(true, uploadedPart.size, 1, notify)
        return { result: true }
      }
    }

    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    const fileKeyResult = await this.file.key()
    if (!isSuccessResult(fileKeyResult)) return fileKeyResult

    const fileSizeResult = await this.file.size()
    if (!isSuccessResult(fileSizeResult)) return fileSizeResult

    this.abort = new HttpAbortController()
    const uploadPartResult = await this.uploadApis.uploadPart({
      part: this.blob,
      abort: this.abort,
      partIndex: this.index,
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
      uploadHostUrl: this.context!.host!.getUrl(),
      uploadId: this.context!.uploadPartId!.uploadId!,
      key: fileKeyResult.result || filenameResult.result || undefined,
      onProgress: progress => { this.updateProgress(false, fileSizeResult.result, progress.percent, notify) }
    })

    if (isSuccessResult(uploadPartResult)) {
      if (this.context!.uploadedParts == null) {
        this.context!.uploadedParts = []
      }
      this.context!.uploadedParts.push({
        partNumber: this.index,
        etag: uploadPartResult.result.etag
      })
    }

    if (isErrorResult(uploadPartResult)) {
      this.context.error = uploadPartResult.error
    }

    return uploadPartResult
  }
}

class CompletePartUploadTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadV2Context,
    private uploadApis: UploadApis,
    private vars: Record<string, string> | undefined,
    private file: UploadFile
  ) { this.updateProgress(0) }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(percent: number, notify?: () => void) {
    if (this.context.progress.details.completeMultipartUpload == null) {
      this.context.progress.details.completeMultipartUpload = {
        size: 0,
        percent: 0,
        fromCache: false
      }
    }

    this.context!.progress.details.completeMultipartUpload.size = 0
    this.context!.progress.details.completeMultipartUpload.percent = percent
    this.context!.progress.details.completeMultipartUpload.fromCache = false
    notify?.()
  }

  async process(notify: () => void): Promise<Result> {
    this.updateProgress(0, notify)

    const fileKeyResult = await this.file.key()
    if (!isSuccessResult(fileKeyResult)) return fileKeyResult

    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    const mimeTypeResult = await this.file.mimeType()
    if (!isSuccessResult(mimeTypeResult)) return mimeTypeResult

    const metadataResult = await this.file.metadata()
    if (!isSuccessResult(metadataResult)) return metadataResult

    const sortedParts = this.context!.uploadedParts!
      .map(item => ({ partNumber: item.partNumber, etag: item.etag }))
      .sort((a, b) => a.partNumber - b.partNumber)

    this.abort = new HttpAbortController()
    const completeResult = await this.uploadApis.completeMultipartUpload({
      abort: this.abort,
      parts: sortedParts,
      customVars: this.vars,
      token: this.context!.token!,
      metadata: metadataResult.result,
      uploadHostUrl: this.context!.host!.getUrl(),
      mimeType: mimeTypeResult.result || undefined,
      uploadId: this.context!.uploadPartId!.uploadId!,
      key: fileKeyResult.result || filenameResult.result || undefined,
      fileName: filenameResult.result || generateRandomString(), // 和直传行为保持一致
      onProgress: progress => { this.updateProgress(progress.percent, notify) }
    })

    if (isSuccessResult(completeResult)) {
      this.context!.result = completeResult.result
    }

    if (isErrorResult(completeResult)) {
      this.context.error = completeResult.error
    }

    return completeResult
  }
}

// eslint-disable-next-line max-len
export const createMultipartUploadV2Task = (file: UploadFile, config: UploadConfig): UploadTask<MultipartUploadV2Context> => {
  const normalizedConfig = initUploadConfig(config)

  const uploadApis = new UploadApis(normalizedConfig.httpClient)
  const configApis = new ConfigApis(normalizedConfig.apiServerUrl, normalizedConfig.httpClient)

  const context = new MultipartUploadV2Context()
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)
  const hostProvideTask = new HostProvideTask(
    context,
    configApis,
    normalizedConfig.protocol,
    normalizedConfig.uploadHosts
  )

  const initPartUploadTask = new InitPartUploadTask(context, uploadApis, file)
  const completePartUploadTask = new CompletePartUploadTask(context, uploadApis, config.vars, file)

  const mainQueue = new TaskQueue({
    logger: {
      level: normalizedConfig.logLevel,
      prefix: 'MultipartUploadQueue'
    },
    concurrentLimit: 1
  })

  // 分片任务单独使用一个子队列动态创建&执行
  const partQueue = new TaskQueue({
    logger: {
      level: normalizedConfig.logLevel,
      prefix: 'MultipartUploadChildQueue'
    },
    concurrentLimit: 3,

    // TODO 动态创建任务会导致任务进度倒退
    tasksCreator: async () => {
      const sliceResult = await file.slice(4 * 1024 * 1024)
      if (isErrorResult(sliceResult)) {
        context.error = sliceResult.error
      }

      if (!isSuccessResult(sliceResult)) {
        return sliceResult
      }

      const tasks = sliceResult.result.map((blob, index) => (
        new UploadPartTask(context, uploadApis, index + 1, file, blob)
      ))
      return { result: tasks }
    }
  })

  mainQueue.enqueue(
    tokenProvideTask,
    hostProvideTask,
    initPartUploadTask,
    partQueue,
    completePartUploadTask
  )

  return {
    onError: fn => mainQueue.onError(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.error!, context)
    }),
    onComplete: fn => mainQueue.onComplete(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.result!, context)
    }),
    onProgress: fn => mainQueue.onProgress(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.progress, context)
    }),
    start: () => {
      context.setup()
      updateTotalIntoProgress(context.progress)
      return mainQueue.start().then(() => ({ result: context.result }))
    },
    cancel: () => mainQueue.cancel()
  }
}
