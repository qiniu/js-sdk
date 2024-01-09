import { IBlob, IFile } from '../../types/file'
import { HttpAbortController } from '../../types/http'
import { generateRandomString } from '../../helper/string'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../types/types'
import { UploadApis, ConfigApis, PartMeta, InitPartsUploadData, UploadedPart } from '../../api'
import { HostProvideTask } from '../common/host'
import { TokenProvideTask } from '../common/token'
import { initUploadConfig } from '../common/config'
import { Task, UploadQueueContext, TaskQueue } from '../common/queue'
import { UploadTaskCreator } from '../types'

type MultipartUploadProgressKey =
  | 'initMultipartUpload'
  | 'completeMultipartUpload'
  | `multipartUpload(${number})`

export class MultipartUploadQueueContext extends UploadQueueContext<MultipartUploadProgressKey> {
  uploadPartId?: InitPartsUploadData
  uploadedParts: Array<PartMeta | UploadedPart> = []

  setup(): void {
    super.setup()
  }
}

class InitPartUploadTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private file: IFile
  ) {}

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    this.context!.progress.initMultipartUpload = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    this.abort = new HttpAbortController()

    this.updateProgress(0, notify)

    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    // 首先检查 context 上的 upload id 有没有过期
    if (this.context.uploadPartId) {
      const nowTime = Date.now() / 1e3
      // 上次的 uploadPartId 还没过期 (至少剩余 60s)，继续使用
      if ((this.context.uploadPartId.expireAt - 60) > nowTime) {

        // 从服务端获取已上传的分片信息
        const uploadedPartResult = await this.uploadApis.listUploadParts({
          abort: this.abort,
          token: this.context!.token!,
          bucket: this.context.token!.bucket,
          key: filenameResult.result || undefined,
          uploadHostUrl: this.context!.host!.getUrl(),
          uploadId: this.context.uploadPartId.uploadId,
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
          return uploadedPartResult
        }
        // 错误情况直接走下面的 initMultipartUpload 流程重新初始化
      }
    }

    const initResult = await this.uploadApis.initMultipartUpload({
      abort: this.abort,
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
      key: filenameResult.result || undefined,
      uploadHostUrl: this.context!.host!.getUrl(),
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
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private index: number,
    private file: IFile,
    private blob: IBlob
  ) {}

  setup(ctx: MultipartUploadQueueContext): void {
    this.context = ctx
  }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    const key = `multipartUpload(${this.index})` as const
    this.context!.progress[key] = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    if (this.context.uploadedParts.length > 0) {
      const uploadedParts = this.context.uploadedParts
      const uploadedPart = uploadedParts.find(i => i.partNumber === this.index)
      // 如果 number 和 size 匹配则直接跳过上传，复用分片
      if (uploadedPart && 'size' in uploadedPart && uploadedPart.size === this.blob.size()) {
        this.updateProgress(1, notify)
        return { result: true }
      }
    }

    this.updateProgress(0, notify)

    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    this.abort = new HttpAbortController()
    const uploadPartResult = await this.uploadApis.uploadPart({
      part: this.blob,
      abort: this.abort,
      partIndex: this.index,
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
      key: filenameResult.result || undefined,
      uploadHostUrl: this.context!.host!.getUrl(),
      uploadId: this.context!.uploadPartId!.uploadId!,
      onProgress: progress => { this.updateProgress(progress.percent, notify) }
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
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private vars: Record<string, string> | undefined,
    private file: IFile
  ) {}

  setup(ctx: MultipartUploadQueueContext): void {
    this.context = ctx
  }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    this.context!.progress.completeMultipartUpload = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    this.updateProgress(0, notify)
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
      key: filenameResult.result || undefined,
      uploadHostUrl: this.context!.host!.getUrl(),
      mimeType: mimeTypeResult.result || undefined,
      uploadId: this.context!.uploadPartId!.uploadId!,
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

export const createMultipartUploadTask: UploadTaskCreator = (file, config) => {
  const normalizedConfig = initUploadConfig(config)

  const uploadApis = new UploadApis(normalizedConfig.httpClient)
  const configApis = new ConfigApis(normalizedConfig.serverUrl, normalizedConfig.httpClient)

  const context = new MultipartUploadQueueContext()
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)
  const hostProvideTask = new HostProvideTask(context, configApis, normalizedConfig.protocol)

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
    tasksCreator: async () => {
      const sliceResult = await file.slice(4 * 1024 * 1024)
      if (!isSuccessResult(sliceResult)) return sliceResult
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
    cancel: () => mainQueue.cancel(),
    onError: fn => mainQueue.onError(() => fn(context)),
    onProgress: fn => mainQueue.onProgress(() => fn(context)),
    onComplete: fn => mainQueue.onComplete(() => fn(context)),
    start: () => {
      context.setup()
      return mainQueue.start()
        .then(() => ({ result: context.result }))
    }
  }
}
