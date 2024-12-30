import { UploadFile } from '../../types/file'
import { UploadTask, UploadConfig } from '../types'
import { UploadApis } from '../../api'
import { HttpAbortController } from '../../types/http'
import { generateRandomString } from '../../helper/string'
import { Result, isErrorResult, isSuccessResult } from '../../types/types'

import { Task, TaskQueue } from '../common/queue'
import { UploadContext, updateTotalIntoProgress } from '../common/context'
import { initUploadConfig } from '../common/config'
import { PrepareRegionsHostsTask, RegionsHostsProgressKey } from '../common/region'
import { TokenProgressKey, TokenProvideTask } from '../common/token'

export type DirectUploadProgressKey =
  | RegionsHostsProgressKey
  | TokenProgressKey
  | 'directUpload'

export class DirectUploadContext extends UploadContext<DirectUploadProgressKey> {}

class DirectUploadTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(
    private context: DirectUploadContext,
    private uploadApis: UploadApis,
    private vars: Record<string, string> | undefined,
    private file: UploadFile
  ) {
    this.context!.progress.details.directUpload = {
      fromCache: false,
      percent: 0,
      size: 0
    }
  }

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  async process(notify: () => void): Promise<Result> {
    const filenameResult = await this.file.name()
    if (!isSuccessResult(filenameResult)) {
      if (isErrorResult(filenameResult)) {
        this.context.error = filenameResult.error
      }

      return filenameResult
    }

    const fileKeyResult = await this.file.key()
    if (!isSuccessResult(fileKeyResult)) {
      if (isErrorResult(fileKeyResult)) {
        this.context.error = fileKeyResult.error
      }

      return fileKeyResult
    }

    const fileMetaResult = await this.file.metadata()
    if (!isSuccessResult(fileMetaResult)) {
      if (isErrorResult(fileMetaResult)) {
        this.context.error = fileMetaResult.error
      }
      return fileMetaResult
    }

    const fileSizeResult = await this.file.size()
    if (!isSuccessResult(fileSizeResult)) {
      if (isErrorResult(fileSizeResult)) {
        this.context.error = fileSizeResult.error
      }
      return fileSizeResult
    }

    const abort = new HttpAbortController()
    this.abort = abort
    const result = await this.context.operationApiRetrier.tryDo(() => this.uploadApis.directUpload({
      file: this.file,
      abort,
      customVars: this.vars,
      token: this.context!.token!,
      metadata: fileMetaResult.result,
      uploadHostUrl: this.context.operationApiContext.host!.getUrl(),
      fileName: filenameResult.result || generateRandomString(), // 接口要求必传且建议没有有效文件名时传随机字符串
      key: fileKeyResult.result || filenameResult.result || undefined,
      onProgress: progress => {
        this.context!.progress.details.directUpload.percent = progress.percent
        this.context!.progress.details.directUpload.size = fileSizeResult.result
        notify()
      }
    }), this.context.operationApiContext)

    if (isErrorResult(result)) {
      this.context.error = result.error
    }

    if (isSuccessResult(result)) {
      this.context!.result = result.result
    }

    return result
  }
}

export const createDirectUploadTask = (file: UploadFile, config: UploadConfig): UploadTask<DirectUploadContext> => {
  const normalizedConfig = initUploadConfig(config)

  const context = new DirectUploadContext()
  const prepareRegionsHostsTask = new PrepareRegionsHostsTask({
    config: normalizedConfig,
    context
  })
  const uploadApis = new UploadApis(normalizedConfig.httpClient)
  const directUploadTask = new DirectUploadTask(context, uploadApis, config.vars, file)
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)

  const taskQueue = new TaskQueue({
    logger: { level: normalizedConfig.logLevel, prefix: 'directUploadQueue' },
    concurrentLimit: 1
  })

  taskQueue.enqueue(
    tokenProvideTask,
    prepareRegionsHostsTask,
    directUploadTask
  )

  return {
    onError: fn => taskQueue.onError(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.error!, context)
    }),
    onComplete: fn => taskQueue.onComplete(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.result!, context)
    }),
    onProgress: fn => taskQueue.onProgress(() => {
      updateTotalIntoProgress(context.progress)
      fn(context.progress, context)
    }),
    start: () => {
      context.setup()
      updateTotalIntoProgress(context.progress)
      return taskQueue.start().then(() => ({ result: context.result }))
    },
    cancel: () => taskQueue.cancel()
  }
}
