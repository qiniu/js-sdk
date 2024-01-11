import * as common from '@internal/common'

import { WxHttpClient } from './http'
import { FileData, UploadFile } from './file'

export { FileData } from './file'
export { UploadTask, UploadConfig } from '@internal/common'

function beforeCancel(task: common.UploadTask, hook: () => Promise<common.Result>) {
  const rawCancel = task.cancel
  task.cancel = async () => {
    const cancelResult = await rawCancel()
    if (!common.isSuccessResult(cancelResult)) {
      return cancelResult
    }
    return hook()
  }
}

export const createDirectUploadTask = (file: FileData, config: common.UploadConfig) => {
  const innerFile = new UploadFile(file)
  config.httpClient = config.httpClient ?? new WxHttpClient()
  const task = common.createDirectUploadTask(innerFile, config)
  task.onError(() => innerFile.free())
  task.onComplete(() => innerFile.free())
  beforeCancel(task, () => innerFile.free())
  return task
}

export const createMultipartUploadTask = (file: FileData, config: common.UploadConfig) => {
  const innerFile = new UploadFile(file)
  config.httpClient = config.httpClient ?? new WxHttpClient()
  const task = common.createMultipartUploadTask(innerFile, config)
  task.onError(() => innerFile.free())
  task.onComplete(() => innerFile.free())
  beforeCancel(task, () => innerFile.free())
  return task
}
