/**
 * Web Worker
 */

import { generateUploadToken } from './utils'
import { UploadConfig, UploadTask, createDirectUploadTask, createMultipartUploadTask } from 'qiniu-js'

const ctx: Worker = self as any
let task: UploadTask | null = null

ctx.addEventListener('message', event => {
  const { method, params } = event.data

  if (method === 'initTask') {
    const [fileData, uploadSetting] = params

    console.log(fileData, uploadSetting)

    const uploadConfig: UploadConfig = {
      serverUrl: uploadSetting.server,
      tokenProvider: async () => {
        const { assessKey, secretKey, bucketName } = uploadSetting
        if (!assessKey || !secretKey || !bucketName) {
          throw new Error('请点开设置并输入必要的配置信息')
        }

        const deadline = Math.floor(Date.now() / 1e3) + 360

        // 线上应该使用服务端生成 token
        return generateUploadToken({ assessKey, secretKey, bucketName, deadline })
      },
    }

    task = uploadSetting.forceDirect
      ? createDirectUploadTask(fileData, uploadConfig)
      : createMultipartUploadTask(fileData, uploadConfig)

    task.onComplete((...data) => ctx.postMessage({ method: 'complete', params: data }))
    task.onProgress((...data) => ctx.postMessage({ method: 'progress', params: data }))
    task.onError((...data) => ctx.postMessage({ method: 'error', params: data }))
  }

  if (method === 'start') {
    task?.start()
  }

  if (method === 'cancel') {
    task?.cancel()
  }
})
