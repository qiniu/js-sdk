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
  serverUrl?: string
  logLevel?: LogLevel
  protocol?: HttpProtocol
  httpClient?: HttpClient
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

export type UploadTaskCreator = (file: IFile, config: UploadConfig) => UploadTask
