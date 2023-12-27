import { IFile } from '../types/file'
import { Result } from '../types/types'
import { TokenProvider } from '../types/token'
import { HttpClient, HttpProtocol } from '../types/http'
import { QueueContext } from './common/queue'

export interface UploadConfig {
  serverUrl?: string
  protocol?: HttpProtocol
  httpClient?: HttpClient
  tokenProvider?: TokenProvider
}

export type Context = QueueContext
export type OnError = (context: Context) => void
export type OnProgress = (context: Context) => void
export type OnComplete = (context: Context) => void

export interface UploadTask {
  onProgress(fn: OnProgress): void
  onComplete(fn: OnComplete): void
  onError(fn: OnError): void
  cancel(): Promise<void>
  start(): Promise<Result>
}

export type UploadTaskCreator = (file: IFile, config: UploadConfig) => UploadTask
