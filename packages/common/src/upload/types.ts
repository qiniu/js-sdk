import { IFile } from '../types/file'
import { Result } from '../types/types'
import { TokenProvider } from '../types/token'
import { HttpClient, HttpProtocol } from '../types/http'
import { QueueContext } from './common/queue'
import { LogLevel } from '../helper/logger'

export { Progress } from './common/queue'

export { Result } from '../types/types'
export { IFile, IBlob } from '../types/file'
export { TokenProvider } from '../types/token'
export { HttpClient, HttpProtocol } from '../types/http'

export interface UploadConfig {
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

export type Context = QueueContext
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

export type UploadTaskCreator<F = IFile> = (file: F, config: UploadConfig) => UploadTask
