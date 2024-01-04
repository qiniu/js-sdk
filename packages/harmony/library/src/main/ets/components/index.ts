import ohCommon from '@ohos.app.ability.common'

import * as common from './@internal'

import { HttpClient } from './http'

export { UploadFile } from './file'
export { UploadTask, UploadConfig, Progress } from './@internal'

/**
 * @deprecated 系统原因一直无法调通，请使用分片上传
 */
export function createDirectUploadTask(context: ohCommon.BaseContext, file: common.IFile, config: common.UploadConfig) {
  config.httpClient = config.httpClient ?? new HttpClient(context)
  return common.createDirectUploadTask(file, config)
}

export function createMultipartUploadTask(context: ohCommon.BaseContext, file: common.IFile, config: common.UploadConfig) {
  config.httpClient = config.httpClient ?? new HttpClient(context)
  return common.createMultipartUploadTask(file, config)
}
