import * as React from 'react'
import { upload } from 'qiniu-js'
import { UploadProgress } from 'qiniu-js/esm/upload'

import { loadSetting } from './utils'

export enum Status {
  Readied, // 准备好了
  Processing, // 上传中
  Finished // 任务已结束（完成、失败、中断）
}

// 上传逻辑封装
export function useUpload(file: File) {
  const startTimeRef = React.useRef<number | null>(null)
  const [state, setState] = React.useState<Status | null>(null)
  const [error, setError] = React.useState<Error | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [speedPeak, setSpeedPeak] = React.useState<number | null>(null)
  const [completeInfo, setCompleteInfo] = React.useState<any | null>(null)
  const [progress, setProgress] = React.useState<UploadProgress | null>(null)
  const [observable, setObservable] = React.useState<ReturnType<typeof upload> | null>(null)
  const subscribeRef = React.useRef<ReturnType<ReturnType<typeof upload>['subscribe']> | null>(null)

  // 开始上传文件
  const start = () => {
    startTimeRef.current = Date.now()
    setCompleteInfo(null)
    setProgress(null)
    setError(null)

    subscribeRef.current = observable?.subscribe({
      error: newError => { setState(Status.Finished); setError(newError) },
      next: newProgress => { setState(Status.Processing); setProgress(newProgress) },
      complete: newInfo => { setState(Status.Finished); setError(null); setCompleteInfo(newInfo) }
    }) || null
  }

  // 停止上传文件
  const stop = () => {
    const subscribe = subscribeRef.current
    if (state === Status.Processing && subscribe && !subscribe.closed) {
      setState(Status.Finished)
      subscribe.unsubscribe()
    }
  }

  // 获取上传速度
  const speed = React.useMemo(() => {
    if (progress == null || progress.total == null || progress.total.loaded == null) return 0
    const duration = (Date.now() - (startTimeRef.current || 0)) / 1000

    if (Array.isArray(progress.chunks)) {
      const size = progress.chunks.reduce(((acc, cur) => (
        !cur.fromCache ? cur.loaded + acc : acc
      )), 0)

      return size > 0 ? Math.floor(size / duration) : 0
    }

    return progress.total.loaded > 0
      ? Math.floor(progress.total.loaded / duration)
      : 0
  }, [progress, startTimeRef])

  // 获取 token
  React.useEffect(() => {
    const setting = loadSetting()
    if (setting == null || !setting.assessKey || !setting.secretKey || !setting.bucketName) {
      setError(new Error('请点开设置并输入必要的配置信息'))
      return
    }

    fetch(`/api/token?setting=${encodeURIComponent(JSON.stringify(setting))}`)
      .then(newResponse => newResponse.text())
      .then(newToken => setToken(newToken))
      .catch(newError => setError(new Error(`获取 Token 失败: ${newError.message || newError.name}`)))
  }, [file])

  // 创建上传任务
  React.useEffect(() => {
    const { uphost } = loadSetting()

    if (token != null) {
      setState(Status.Readied)
      setObservable(upload(
        file,
        file.name,
        token,
        undefined,
        {
          checkByMD5: true,
          debugLogLevel: 'INFO',
          uphost: uphost && uphost.split(',')
        }
      ))
    }
  }, [file, token])

  // 计算峰值上传速度
  React.useEffect(() => {
    if (speed == null) {
      setSpeedPeak(0)
      return
    }

    if (speed > (speedPeak || 0)) {
      setSpeedPeak(speed)
    }
  }, [speed, speedPeak])

  return { start, stop, state, progress, error, completeInfo, speed, speedPeak }
}
