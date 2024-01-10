import { IFile } from '../types/file'
import { Result } from '../types/types'
import { TokenProvider } from '../types/token'
import { HttpClient, HttpProtocol } from '../types/http'

import { LogLevel } from '../helper/logger'

import { DirectUploadContext } from './direct'
import { MultipartUploadContext } from './multipart'

export { Progress } from './common/queue'

export interface UploadConfig {
  /** 自定义变量；本次上传任务的自定义变量，关于使用请参考：https://developer.qiniu.com/kodo/1235/vars#xvar */
  vars?: Record<string, string>
  /** 服务的接口地址；默认为七牛公有云，内部通过该地址提供的接口获取每个区域的上传地址 */
  serverUrl?: string
  /** 日志级别；默认为 NONE，即不输出任何日志 */
  logLevel?: LogLevel
  /** 接口调用使用的协议；默认为 HTTPS */
  protocol?: HttpProtocol
  /** 发送请求的 client；所有的请求将会通过指定的 client 发出 */
  httpClient?: HttpClient
  /** 上传 token 提供器；SDK 通过该接口获取上传 Token */
  tokenProvider: TokenProvider
}

export type Context = DirectUploadContext | MultipartUploadContext
export type OnError = (context: Context) => void
export type OnProgress = (context: Context) => void
export type OnComplete = (context: Context) => void

export interface UploadTask {
  onProgress(fn: OnProgress): void
  onComplete(fn: OnComplete): void
  onError(fn: OnError): void
  cancel(): Promise<Result>
  start(): Promise<Result>
}

export type UploadTaskCreator = (file: IFile, config: UploadConfig) => UploadTask
