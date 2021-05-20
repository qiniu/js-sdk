import * as React from 'react'
import { upload } from 'qiniu-js'
import { UploadProgress } from 'qiniu-js/esm/upload'
import { loadSetting } from './components/Settings'

export enum Status {
  Readied, // 准备好了
  Processing, // 上传中
  Finished // 已完成
}

// 面向 hooks 的上传逻辑封装
export function useUpload(file: File) {
  const [state, setState] = React.useState<Status>()
  const [error, setError] = React.useState<Error>()
  const [token, setToken] = React.useState<string>()
  const [startTime, setStartTime] = React.useState<number>()
  const [speedPeak, setSpeedPeak] = React.useState<number>()
  const [completeInfo, setCompleteInfo] = React.useState<any>()
  const [progress, setProgress] = React.useState<UploadProgress>()
  const [observable, setObservable] = React.useState<ReturnType<typeof upload>>()
  const [subscribe, setSubscribe] = React.useState<ReturnType<ReturnType<typeof upload>['subscribe']>>()

  // 开始上传文件
  const startUpload = React.useCallback(() => {
    setStartTime(Date.now())
    setCompleteInfo(null)
    setError(null)

    setSubscribe(observable.subscribe({
      error: _error => { setState(Status.Finished); setError(_error) },
      next: _progress => { setState(Status.Processing); setProgress(_progress) },
      complete: _info => { setState(Status.Finished); setError(null); setCompleteInfo(_info) }
    }))
  }, [observable])

  // 停止上传文件
  const stopUpload = React.useCallback(() => {
    if (state === Status.Processing && subscribe && !subscribe.closed) {
      setState(Status.Finished)
      subscribe.unsubscribe()
    }
  }, [subscribe, state])

  // 获取上传速度
  const speed = React.useMemo(() => {
    if (progress == null || progress.total == null || progress.total.loaded == null) return 0
    const duration = Date.now() - startTime
    return Math.floor(progress.total.loaded / duration)
  }, [progress, startTime])

  // 获取 token
  React.useEffect(() => {
    const setting = loadSetting()
    fetch(`/api/token?setting=${decodeURIComponent(JSON.stringify(setting))}`)
      .then(_response => _response.text())
      .then(_token => setToken(_token))
      .catch(_error => setError(new Error(`get token failed: ${_error.message || _error.name}`)))
  }, [file])

  // 创建上传任务
  React.useEffect(() => {
    const { uphost } = loadSetting()

    if (token != null) {
      setState(Status.Readied)
      setObservable(upload(
        file,
        file.name,
        token, null, {
        debugLogLevel: 'INFO',
        uphost: uphost && uphost.split(','),
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

  return { startUpload, stopUpload, state, progress, error, completeInfo, speed, speedPeak }
}
