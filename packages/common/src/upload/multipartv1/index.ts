import { HttpAbortController } from '../../types/http'
import { UploadBlob, UploadFile } from '../../types/file'
import { generateRandomString } from '../../helper/string'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../types/types'

import { UploadApis, ConfigApis, MkblkData } from '../../api'

import { UploadConfig, UploadTask } from '../types'

import { Task, TaskQueue } from '../common/queue'
import { initUploadConfig } from '../common/config'
import { HostProgressKey, HostProvideTask } from '../common/host'
import { TokenProgressKey, TokenProvideTask } from '../common/token'
import { UploadContext, updateTotalIntoProgress } from '../common/context'

export type MultipartUploadV1ProgressKey =
  | HostProgressKey
  | TokenProgressKey
  | 'completeMultipartUpload'
  | `multipartUpload:${number}`

export class MultipartUploadV1Context extends UploadContext<MultipartUploadV1ProgressKey> {
  uploadBlocks: MkblkData[] = []

  setup(): void {
    super.setup()
  }
}

function isExpiredData(data: MkblkData): boolean {
  if (!data || !data.expired_at) return true
  // 如果剩余可用时间不足 2 分钟，则视为过期
  return data.expired_at <= ((Date.now() / 1e3) - 120)
}

class MkblkTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadV1Context,
    private uploadApis: UploadApis,
    private blob: UploadBlob,
    private index: number
  ) { this.updateProgress(false, 0) }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  private updateProgress(fromCache: boolean, percent: number, notify?: () => void) {
    const key = `multipartUpload:${this.index}` as const
    if (this.context.progress.details[key] == null) {
      this.context.progress.details[key] = {
        percent: 0,
        fromCache: false,
        size: this.blob.size()
      }
    }

    this.context.progress.details[key].fromCache = fromCache
    this.context.progress.details[key].percent = percent
    notify?.()
  }

  async process(notify: () => void): Promise<Result> {
    // 检查是否可以复用
    if (this.context.uploadBlocks.length > 0) {
      const uploadedInfo = this.context.uploadBlocks[this.index]
      if (uploadedInfo && !isExpiredData(uploadedInfo)) {
        this.updateProgress(true, 1, notify)
        return { result: true }
      }
    }

    this.abort = new HttpAbortController()

    this.updateProgress(false, 0, notify)
    const uploadedPartResult = await this.uploadApis.mkblk({
      abort: this.abort,
      token: this.context!.token!,
      firstChunkBinary: this.blob,
      uploadHostUrl: this.context!.host!.getUrl(),
      onProgress: progress => { this.updateProgress(false, progress.percent, notify) }
    })

    if (isCanceledResult(uploadedPartResult)) {
      return uploadedPartResult
    }

    if (isErrorResult(uploadedPartResult)) {
      // 发生错误仅仅更新到 context
      this.context.error = uploadedPartResult.error
      return uploadedPartResult
    }

    // 更新已上传分片信息到 context
    this.context.uploadBlocks[this.index] = uploadedPartResult.result
    return uploadedPartResult
  }
}

class MkfileTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: MultipartUploadV1Context,
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

    const fileSizeResult = await this.file.size()
    if (!isSuccessResult(fileSizeResult)) return fileSizeResult

    const mimeTypeResult = await this.file.mimeType()
    if (!isSuccessResult(mimeTypeResult)) return mimeTypeResult

    const metadataResult = await this.file.metadata()
    if (!isSuccessResult(metadataResult)) return metadataResult

    this.abort = new HttpAbortController()
    const completeResult = await this.uploadApis.mkfile({
      abort: this.abort,
      userVars: this.vars,
      token: this.context.token!,
      fileSize: fileSizeResult.result,
      uploadHostUrl: this.context!.host!.getUrl(),
      fname: filenameResult.result || generateRandomString(),
      lastCtxOfBlock: this.context.uploadBlocks.map(i => i.ctx),
      key: fileKeyResult.result || filenameResult.result || undefined,
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
export const createMultipartUploadV1Task = (file: UploadFile, config: UploadConfig): UploadTask<MultipartUploadV1Context> => {
  const normalizedConfig = initUploadConfig(config)

  const uploadApis = new UploadApis(normalizedConfig.httpClient)
  const configApis = new ConfigApis(normalizedConfig.apiServerUrl, normalizedConfig.httpClient)

  const context = new MultipartUploadV1Context()
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)
  const hostProvideTask = new HostProvideTask(
    context,
    configApis,
    normalizedConfig.protocol,
    normalizedConfig.uploadHosts
  )

  const mainQueue = new TaskQueue({
    logger: {
      level: normalizedConfig.logLevel,
      prefix: 'MultipartUploadQueue'
    },
    concurrentLimit: 1
  })

  // 分片任务单独使用一个子队列动态创建&执行
  const putQueue = new TaskQueue({
    logger: {
      level: normalizedConfig.logLevel,
      prefix: 'MultipartUploadChildQueue'
    },
    concurrentLimit: 1, // 此接口只能串行
    // FIXME 动态创建任务会导致任务进度倒退
    tasksCreator: async () => {
      const sliceResult = await file.slice(4 * 1024 * 1024)
      if (isErrorResult(sliceResult)) {
        context.error = sliceResult.error
      }

      if (!isSuccessResult(sliceResult)) {
        return sliceResult
      }

      const tasks = sliceResult.result.map((blob, index) => (
        new MkblkTask(context, uploadApis, blob, index)
      ))
      return { result: tasks }
    }
  })

  const mkfileTask = new MkfileTask(context, uploadApis, normalizedConfig.vars, file)

  mainQueue.enqueue(
    tokenProvideTask,
    hostProvideTask,
    putQueue,
    mkfileTask
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
