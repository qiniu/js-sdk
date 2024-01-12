import ohCommon from '@ohos.app.ability.common'

import * as common from './@internal'

import { HttpClient } from './http'
import { FileData, UploadFile } from './file'

export { FileData } from './file'
export { UploadTask, UploadConfig, Progress } from './@internal'

function onCancel(task: common.UploadTask, listener: () => Promise<common.Result>) {
  const rawCancel = task.cancel
  task.cancel = async () => {
    const cancelResult = await rawCancel()
    if (!common.isSuccessResult(cancelResult)) {
      return cancelResult
    }
    return listener()
  }
}

/**
 * @deprecated 受限于当前版本的系统接口暂时无法获取上传之后的结果，优先考虑是用分片。
 */
export function createDirectUploadTask(context: ohCommon.Context, file: FileData, config: common.UploadConfig) {
  const innerFile = new UploadFile(context, file)
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = common.createDirectUploadTask(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}

export function createMultipartUploadTask(context: ohCommon.Context, file: FileData, config: common.UploadConfig) {
  const innerFile = new UploadFile(context, file)
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = common.createMultipartUploadTask(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}
