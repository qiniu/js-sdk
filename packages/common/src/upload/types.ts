import { UploadFile } from '../types/file'
import { Result } from '../types/types'
import { TokenProvider } from '../types/token'
import { HttpClient, HttpProtocol } from '../types/http'

import { LogLevel } from '../helper/logger'

import { UploadContext, Progress as BaseProgress } from './common/context'

import { DirectUploadContext, DirectUploadProgressKey } from './direct'
import { MultipartUploadContext, MultipartUploadProgressKey } from './multipart'

export interface UploadConfig {
  /** 自定义变量；本次上传任务的自定义变量，关于使用请参考：https://developer.qiniu.com/kodo/1235/vars#xvar */
  vars?: Record<string, string>
  /**
   * 服务的接口地址；默认为七牛公有云，示例：https://api.qiniu.com
   * 该配置仅当未设置 uploadHosts 时生效 SDK 将会通过指定的 api 服务提供的接口来动态获取上传地址
   * 私有云请联系集群运维人员，并确认集群是否支持 v4/query 接口
  */
  apiServerUrl?: string
  /** 上传服务地址，手动指定上传服务地址，示例：up.qiniu.com */
  uploadHosts?: string[]
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
export type Progress = BaseProgress<DirectUploadProgressKey | MultipartUploadProgressKey>

export type OnError<C extends UploadContext> = (error: C['error'], context: C) => void
export type OnComplete<C extends UploadContext> = (result: C['result'], context: C) => void
export type OnProgress<C extends UploadContext> = (progress: C['progress'], context: C) => void

export interface UploadTask<C extends UploadContext = Context> {
  onProgress(fn: OnProgress<C>): void
  onComplete(fn: OnComplete<C>): void
  onError(fn: OnError<C>): void
  cancel(): Promise<Result>
  start(): Promise<Result>
}

export type UploadTaskCreator = (file: UploadFile, config: UploadConfig) => UploadTask
