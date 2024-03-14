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
 * @deprecated 受限于当前版本的系统接口暂时无法获取上传之后的结果，优先考虑使用分片。
 */
export function createDirectUploadTask(context: ohCommon.Context, file: FileData, config: common.UploadConfig) {
  const innerFile = new UploadFile(context, file, 'direct')
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = common.createDirectUploadTask(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}

/**
 * v1 版本的分片上传，串行上传，不支持 file 的 metadata 属性
 */
export function createMultipartUploadV1Task(context: ohCommon.Context, file: FileData, config: common.UploadConfig) {
  const innerFile = new UploadFile(context, file, 'multipart')
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = common.createMultipartUploadV1Task(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}

/**
 * v2 版本的分片上传，特点是支持并发
 */
export function createMultipartUploadV2Task(context: ohCommon.Context, file: FileData, config: common.UploadConfig) {
  const innerFile = new UploadFile(context, file, 'multipart')
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = common.createMultipartUploadV2Task(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}
