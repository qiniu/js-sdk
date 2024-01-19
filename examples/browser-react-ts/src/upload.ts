import * as React from 'react'

import * as qiniu from 'qiniu-js'

import { generateUploadToken, loadSetting } from './utils'

// const worker = new Worker(new URL('./upload.worker.ts', import.meta.url))

export enum Status {
  Ready, // 准备好了
  Processing, // 上传中
  Finished // 任务已结束（完成、失败、中断）
}

// 上传逻辑封装
export function useUpload(file: File) {
  const startTimeRef = React.useRef<number | null>(null)

  const [state, setState] = React.useState<Status>(Status.Ready)
  const [uploadTask, setUploadTask] = React.useState<qiniu.UploadTask | null>(null)

  const [error, setError] = React.useState<Error | null>(null)
  const [completeInfo, setCompleteInfo] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<Partial<qiniu.Progress> | null>(null)

  // 开始上传文件
  const start = () => {
    const uploadSetting = loadSetting()
    if (uploadSetting.useWebWorker) {
      startWithWorker
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
    startTimeRef.current = Date.now()
    newUploadTask.start()
  }

  const startWithWorker = () => {
    const worker = new Worker(new URL('./upload.worker.ts', import.meta.url))
    worker.postMessage("test222222222")
  }

  // 停止上传文件
  const stop = () => {
    uploadTask?.cancel()
    setState(Status.Finished)
  }

  return { start, stop, state, progress, error, completeInfo }
}
