import { UploadError } from '../../../types/error'
import { Result, isErrorResult, isSuccessResult, isCanceledResult } from '../../../types/types'
import { Task } from './index'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface RetryOptions {
  /** 最大重试次数（不含首次执行），默认 1 */
  maxRetries?: number
  /** 重试间隔（毫秒），默认 2000 */
  retryDelay?: number
  /** 判断是否应该重试，默认只对 NetworkError 重试 */
  shouldRetry?: (error: UploadError) => boolean
}

/**
 * 重试任务装饰器
 * 包装一个 Task，在执行失败时按配置进行重试
 */
export class RetryTask implements Task {
  private readonly maxRetries: number
  private readonly retryDelay: number
  private readonly shouldRetry: (error: UploadError) => boolean

  constructor(
    private readonly task: Task,
    options?: RetryOptions
  ) {
    this.maxRetries = options?.maxRetries ?? 1
    this.retryDelay = options?.retryDelay ?? 500
    this.shouldRetry = options?.shouldRetry ?? (error => error.name === 'NetworkError')
  }

  async cancel(): Promise<Result> {
    return this.task.cancel()
  }

  async process(notice: () => void): Promise<Result> {
    let lastError: UploadError | undefined

    /* eslint-disable no-await-in-loop */
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await delay(this.retryDelay)
      }

      const result = await this.task.process(notice)

      if (isSuccessResult(result) || isCanceledResult(result)) {
        return result
      }

      if (isErrorResult(result)) {
        lastError = result.error

        if (!this.shouldRetry(result.error)) {
          return result
        }
      }
    }
    /* eslint-enable no-await-in-loop */

    return { error: lastError! }
  }
}
