import { Token } from '../../../types/token'
import { UploadError } from '../../../types/error'

import { Host } from '../host'

/** 进度信息；包含整体的进度以及具体每个部分的详细进度 */
export type Progress<Key extends string = string> = {
  /** 上传的文件总大小；单位 byte */
  size: number
  /** 目前处理的百分比进度；范围 0-1 */
  percent: number
  /** 具体每个部分的进度信息； */
  details: Record<Key, {
    /** 子任务的处理数据大小；单位 byte */
    size: number
    /** 目前处理的百分比进度；范围 0-1 */
    percent: number
    /** 该处理是否复用了缓存； */
    fromCache: boolean
  }>
}

/** 根据 details 上的信息更新总的信息 */
export function updateTotalIntoProgress(progress: Progress): Progress {
  const detailValues = Object.values(progress.details)

  let totalSize = 0
  let totalPercent = 0
  for (let index = 0; index < detailValues.length; index++) {
    const value = detailValues[index]
    totalSize += value.size
    totalPercent += value.percent
  }

  const newPercent = totalPercent / detailValues.length

  // 在失败重试等场景中，进度回退是正常业务导致的，但是客户要求进度不能回退
  if (newPercent > progress.percent) progress.percent = newPercent // 防止进度倒流

  progress.size = totalSize
  return progress
}

/** 队列的上下文；用于在所有任务间共享状态 */
export interface QueueContext<ProgressKey extends string = string> {
  /** 上传使用的 host; 由公共的 HostProvideTask 维护和更新 */
  host?: Host
  /** 上传使用的 token; 由公共的 TokenProvideTask 维护和更新 */
  token?: Token
  /** 上传成功的信息  */
  result?: string
  /** 队列的错误 */
  error?: UploadError
  /** 整体的任务进度信息 */
  progress: Progress<ProgressKey>

  /** 初始化函数；队列开始时执行 */
  setup(): void
}

/** 上传任务的队列上下文 */
export class UploadContext<ProgressKey extends string = string> implements QueueContext {
  host?: Host
  token?: Token
  result?: string
  error?: UploadError
  progress: Progress<ProgressKey>
  constructor() {
    this.progress = {
      size: 0,
      percent: 0,
      details: {} as any
    }
  }

  setup(): void {
    this.error = undefined
    if (this.progress) {
      // 重置所有的进度为 0
      this.progress.size = 0
      this.progress.percent = 0
      for (const key in this.progress.details) {
        if (Object.prototype.hasOwnProperty.call(this.progress.details, key)) {
          this.progress.details[key] = {
            size: 0,
            percent: 0,
            fromCache: false
          }
        }
      }
    }
  }
}
