import * as common from '@internal/common'

import { WxHttpClient } from './http'

export { UploadTask, UploadConfig } from '@internal/common'
export { UploadFile } from './file'

export const createDirectUploadTask: common.UploadTaskCreator = (file, config) => {
  config.httpClient = config.httpClient ?? new WxHttpClient()
  return common.createDirectUploadTask(file, config)
}

export const createMultipartUploadTask: common.UploadTaskCreator = (file, config) => {
  config.httpClient = config.httpClient ?? new WxHttpClient()
  return common.createMultipartUploadTask(file, config)
}
