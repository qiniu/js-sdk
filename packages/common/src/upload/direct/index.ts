import { IFile } from '../../types/file'
import { UploadTaskCreator } from '../types'
import { ConfigApis, UploadApis } from '../../api'
import { HttpAbortController } from '../../types/http'
import { generateRandomString } from '../../helper/string'
import { Result, isErrorResult, isSuccessResult } from '../../types/types'

import { HostProvideTask } from '../common/host'
import { TokenProvideTask } from '../common/token'
import { initUploadConfig } from '../common/config'
import { Task, TaskQueue, UploadQueueContext } from '../common/queue'

type DirectUploadProgressKey = 'directUpload'

export class DirectUploadQueueContext extends UploadQueueContext<DirectUploadProgressKey> {}

class DirectUploadTask implements Task {
  private abort: HttpAbortController | null = null
  constructor(private context: DirectUploadQueueContext, private file: IFile, private uploadApis: UploadApis) {}

  async cancel(): Promise<Result> {
    await this.abort?.abort()
    return { result: true }
  }

  async process(notify: () => void): Promise<Result> {
    const fileNameResult = await this.file.name()
    if (!isSuccessResult(fileNameResult)) return fileNameResult

    this.abort = new HttpAbortController()
    const result = await this.uploadApis.directUpload({
      file: this.file,
      abort: this.abort,
      token: this.context!.token!,
      uploadHostUrl: this.context!.host!.getUrl(),
      fileName: fileNameResult.result || generateRandomString(), // 接口要求必传且建议没有有效文件名时传随机字符串
      onProgress: progress => { this.context!.progress.directUpload = progress.percent; notify() }
    })

    if (isErrorResult(result)) this.context.error = result.error
    if (isSuccessResult(result)) this.context!.result = result.result

    return result
  }
}

export const createDirectUploadTask: UploadTaskCreator = (file, config) => {
  const normalizedConfig = initUploadConfig(config)
  const uploadApis = new UploadApis(normalizedConfig.httpClient)
  const configApis = new ConfigApis(normalizedConfig.serverUrl, normalizedConfig.httpClient)

  const context = new DirectUploadQueueContext()
  const directUploadTask = new DirectUploadTask(context, file, uploadApis)
  const tokenProvideTask = new TokenProvideTask(context, normalizedConfig.tokenProvider)
  const hostProvideTask = new HostProvideTask(context, configApis, normalizedConfig.protocol)

  const taskQueue = new TaskQueue({
    logger: { level: normalizedConfig.logLevel, prefix: 'directUploadQueue' },
    concurrentLimit: 1
  })

  taskQueue.enqueue([
    tokenProvideTask,
    hostProvideTask,
    directUploadTask
  ])

  return {
    cancel: () => taskQueue.cancel(),
    onError: fn => taskQueue.onError(() => fn(context)),
    onProgress: fn => taskQueue.onProgress(() => fn(context)),
    onComplete: fn => taskQueue.onComplete(() => fn(context)),
    start: () => {
      context.setup()
      return taskQueue.start()
        .then(() => ({ result: context.result }))
    }
  }
}
