import * as React from 'react'

import * as qiniu from 'qiniu-js'

import { generateUploadToken, loadSetting } from './utils'

export enum Status {
  Ready, // 准备好了
  Processing, // 上传中
  Finished // 任务已结束（完成、失败、中断）
}

// 上传逻辑封装
export function useUpload(file: File) {
  const [state, setState] = React.useState<Status>(Status.Ready)
  const [uploadTaskWorker, setUploadWorker] = React.useState<Worker | null>(null)
  const [uploadTask, setUploadTask] = React.useState<qiniu.UploadTask | null>(null)

  const [error, setError] = React.useState<Error | null>(null)
  const [completeInfo, setCompleteInfo] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<Partial<qiniu.Progress> | null>(null)

  // 开始上传文件
  const start = () => {
    const uploadSetting = loadSetting()
    if (uploadSetting.useWebWorker) {
      startWithWorker()
      return
    }

    setCompleteInfo(null)
    setProgress(null)
    setError(null)

    if (uploadTask) {
      return uploadTask.start()
    }

    const uploadConfig: qiniu.UploadConfig = {
      serverUrl: uploadSetting.server,
      tokenProvider: async () => {
        const { assessKey, secretKey, bucketName } = loadSetting()
        if (!assessKey || !secretKey || !bucketName) {
          throw new Error('请点开设置并输入必要的配置信息')
        }

        const deadline = Math.floor(Date.now() / 1e3) + 360

        // 线上应该使用服务端生成 token
        return generateUploadToken({ assessKey, secretKey, bucketName, deadline })
      },
    }

    const fileData: qiniu.FileData = {
      type: 'file',
      data: file
    }

    const newUploadTask = uploadSetting.forceDirect
      ? qiniu.createDirectUploadTask(fileData, uploadConfig)
      : qiniu.createMultipartUploadTask(fileData, uploadConfig)

    newUploadTask.onProgress(progress => {
      setState(Status.Processing)
      setProgress({ ...progress } as any)
    })

    newUploadTask.onError(error => {
      setState(Status.Finished)
      setError(error || null)
    })

    newUploadTask.onComplete(result => {
      setState(Status.Finished)
      setCompleteInfo(result || null)
    })

    setUploadTask(newUploadTask)
    newUploadTask.start()
  }

  const startWithWorker = () => {
    setCompleteInfo(null)
    setProgress(null)
    setError(null)

    if (uploadTaskWorker) {
      return uploadTaskWorker.postMessage({ method: 'start' })
    }

    const fileData: qiniu.FileData = {
      type: 'file',
      data: file
    }

    const method = 'initTask'
    const uploadSetting = loadSetting()
    const worker = new Worker('/worker.bundle.js')
    // worker.bundle.js 通过 webpack 构建，请参阅 webpack 的配置文件
    worker.postMessage({ method, params: [fileData, uploadSetting] })

    worker.addEventListener('message', message => {
      const { method, params } = message.data

      if (method === 'complete') {
        setState(Status.Finished)
        setCompleteInfo(params[0] as any)
      }

      if (method === 'progress') {
        setState(Status.Processing)
        setProgress(params[0] as any)
      }

      if (method === 'error') {
        setState(Status.Finished)
        setError(params[0] || null)
      }
    })

    setUploadWorker(worker)
    worker.postMessage({ method: 'start' })
  }

  // 停止上传文件
  const stop = () => {
    if (uploadTaskWorker) {
      uploadTaskWorker.postMessage({ method: 'cancel' })
    } else {
      uploadTask?.cancel()
    }

    setState(Status.Finished)
  }

  return { start, stop, state, progress, error, completeInfo }
}
