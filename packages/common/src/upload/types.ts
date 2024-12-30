import { Result } from '../types/types'
import { TokenProvider } from '../types/token'
import { HttpClient, HttpProtocol } from '../types/http'

import { LogLevel } from '../helper/logger'
import { MemoryCacheManager, PersistentCacheManager } from '../helper/cache'
import { Retrier } from '../helper/retry'

import { UploadContext, Progress as BaseProgress } from './common/context'
import { Region, RegionsProvider } from './common/region'

import { DirectUploadContext, DirectUploadProgressKey } from './direct'
import { MultipartUploadV1Context, MultipartUploadV1ProgressKey } from './multipartv1'
import { MultipartUploadV2Context, MultipartUploadV2ProgressKey } from './multipartv2'

type RegionsProviderGetter = (context: UploadContext) => RegionsProvider
type UploadRetrierGetter = (context: UploadContext) => Retrier

export interface UploadConfig {
  /** 自定义变量；本次上传任务的自定义变量，关于使用请参考：https://developer.qiniu.com/kodo/1235/vars#xvar */
  vars?: Record<string, string>
  /**
   * @deprecated 使用 bucketServerHosts 替代
   *
   * 服务的接口地址；默认为七牛公有云，示例：https://api.qiniu.com
   * 该配置仅当未设置 uploadHosts 时生效 SDK 将会通过指定的 api 服务提供的接口来动态获取上传地址
   * 私有云请联系集群运维人员，并确认集群是否支持 v4/query 接口
  */
  apiServerUrl?: string
  /**
   * 服务的接口地址；默认为七牛公有云，
   * 该配置仅当未设置 uploadHosts 时生效 SDK 将会通过指定的 bucket 服务提供的接口来动态获取上传地址
   * 私有云请联系集群运维人员，并确认集群是否支持 v4/query 接口
   */
  bucketServerHosts?: string[]
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
  /**
   * 是否开启空间级别上传加速；默认为 false
   * 当配置 uploadHosts 时，该配置无效
   * 开启后，将优先使用 regions 配置中获取到的加速上传域名进行上传
   * 若加速域名不可用或上传失败，默认重试器将使用其他域名进行重试
   */
  accelerateUploading?: boolean
  /**
   * 控制如何获取 bucket 所在区域提供器，该配置仅当未设置 uploadHosts 时生效
   * 默认通过 bucket 服务提供的接口来动态获取上传区域
   */
  regionsProviderGetter?: RegionsProviderGetter
  /**
   * 控制如何获取上传重试器
   * 默认将会开启域名重试、区域重试
   */
  uploadRetrierGetter?: UploadRetrierGetter
  /** 内存缓存管理器；默认值为 undefined，且为开启状态 */
  regionsMemoryCache?: MemoryCacheManager<Region[]> | undefined
  /**
   * 持久化缓存管理器；默认值为 undefined，且为关闭状态
   * 但在 browser 与 wechat-miniprogram 包中默认使用 LocalStorage
   * TODO: 在 harmony 包中默认使用 xxx
   */
  regionsPersistentCache?: PersistentCacheManager<Region[]> | undefined
}

export type Context = DirectUploadContext | MultipartUploadV1Context | MultipartUploadV2Context
// eslint-disable-next-line max-len
export type Progress = BaseProgress<DirectUploadProgressKey | MultipartUploadV1ProgressKey | MultipartUploadV2ProgressKey>

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
