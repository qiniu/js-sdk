import { IBlob, IFile } from '../../types/file'
import { HttpAbortController } from '../../types/http'
import { generateRandomString } from '../../helper/uuid'
import { Result, isErrorResult, isSuccessResult } from '../../types/types'
import { UploadApis, ConfigApis, PartMeta, InitPartsUploadData } from '../../api'
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
  uploadedParts?: PartMeta[]
  uploadPartId?: InitPartsUploadData
}

class InitPartUploadTask implements Task {
  private abort = new HttpAbortController()
  constructor(
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private file: IFile
  ) {}

  async cancel(): Promise<Result> {
    this.abort.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    this.context!.progress.details.initMultipartUpload = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    this.updateProgress(0, notify)
    const initResult = await this.uploadApis.initMultipartUpload({
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
      uploadHostUrl: this.context!.host!.getUrl(),
      onProgress: progress => { this.updateProgress(progress.percent, notify) }
    })

    if (isSuccessResult(initResult)) {
      if (isErrorResult(initResult)) this.context.error = initResult.error
      this.context!.uploadPartId = initResult.result
    }

    return initResult
  }
}

class UploadPartTask implements Task {
  private abort = new HttpAbortController()
  constructor(
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private index: number,
    private blob: IBlob
  ) {}

  setup(ctx: MultipartUploadQueueContext): void {
    this.context = ctx
  }

  async cancel(): Promise<Result> {
    this.abort.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    const key = `multipartUpload(${this.index})` as const
    this.context!.progress.details[key] = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    this.updateProgress(0, notify)
    const uploadPartResult = await this.uploadApis.uploadPart({
      part: this.blob,
      abort: this.abort,
      partIndex: this.index,
      token: this.context!.token!,
      bucket: this.context!.token!.bucket,
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
  private abort = new HttpAbortController()
  constructor(
    private context: MultipartUploadQueueContext,
    private uploadApis: UploadApis,
    private file: IFile
  ) {}

  setup(ctx: MultipartUploadQueueContext): void {
    this.context = ctx
  }

  async cancel(): Promise<Result> {
    this.abort.abort()
    return { result: true }
  }

  private updateProgress(number: number, notify: () => void) {
    this.context!.progress.details.completeMultipartUpload = number
    notify()
  }

  async process(notify: () => void): Promise<Result> {
    this.updateProgress(0, notify)
    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) return filenameResult

    const sortedParts = this.context!.uploadedParts!
      .sort((a, b) => a.partNumber - b.partNumber)

    const completeResult = await this.uploadApis.completeMultipartUpload({
      abort: this.abort,
      parts: sortedParts,
      token: this.context!.token!,
      uploadHostUrl: this.context!.host!.getUrl(),
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
  const initPartUploadTask = new InitPartUploadTask(context, uploadApis, file)
  const completePartUploadTask = new CompletePartUploadTask(context, uploadApis, file)
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)
  const hostProvideTask = new HostProvideTask(context, configApis, normalizedConfig.protocol)

  const mainQueue = new TaskQueue({
    concurrentLimit: 1
  })

  // 分片任务单独使用一个子队列动态创建&执行
  const partQueue = new TaskQueue({
    concurrentLimit: 3,
    tasksCreator: async () => {
      const sliceResult = await file.slice(4 * 1024 * 1024)
      if (!isSuccessResult(sliceResult)) return sliceResult
      const tasks = sliceResult.result.map((blob, index) => (
        new UploadPartTask(context, uploadApis, index + 1, blob)
      ))
      return { result: tasks }
    }
  })

  mainQueue.enqueue([
    tokenProvideTask,
    hostProvideTask,
    initPartUploadTask,
    partQueue,
    completePartUploadTask
  ])

  return {
    start: () => mainQueue.start(),
    cancel: () => mainQueue.cancel(),
    onError: fn => mainQueue.onError(() => fn(context)),
    onProgress: fn => mainQueue.onProgress(() => fn(context)),
    onComplete: fn => mainQueue.onComplete(() => fn(context))
  }
}
