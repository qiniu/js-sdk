import ohCommon from '@ohos.app.ability.common'

import { HttpClient } from './http'
import * as internal from './@internal'
import { UploadFile, InternalUploadFile } from './file'
import { Result, UploadConfig, UploadTask, isSuccessResult } from './@internal'

export { UploadFile } from './file'
export type { UploadTask, Progress, UploadConfig, DirectUploadContext, MultipartUploadV1Context, MultipartUploadV2Context } from './@internal'

function onCancel(task: UploadTask, listener: () => Promise<Result>) {
  const rawCancel = task.cancel
  task.cancel = async () => {
    const cancelResult = await rawCancel()
    if (!isSuccessResult(cancelResult)) {
      return cancelResult
    }
    return listener()
  }
}

/**
 * 直传，大文件请优先考虑使用分片。
 */
export function createDirectUploadTask(context: ohCommon.Context, file: UploadFile, config: UploadConfig) {
  const innerFile = new InternalUploadFile(context, file)
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = internal.createDirectUploadTask(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}

/**
 * v1 版本的分片上传，串行上传，不支持 file 的 metadata 属性
 */
export function createMultipartUploadV1Task(context: ohCommon.Context, file: UploadFile, config: UploadConfig) {
  const innerFile = new InternalUploadFile(context, file)
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = internal.createMultipartUploadV1Task(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}

/**
 * v2 版本的分片上传，特点是支持并发
 */
// eslint-disable-next-line max-len
export function createMultipartUploadV2Task(context: ohCommon.Context, file: UploadFile, config: UploadConfig) {
  const innerFile = new InternalUploadFile(context, file)
  config.httpClient = config.httpClient ?? new HttpClient(context)
  const task = internal.createMultipartUploadV2Task(innerFile, config)
  task.onComplete(() => innerFile.free())
  task.onError(() => innerFile.free())
  onCancel(task, () => innerFile.free())
  return task
}
