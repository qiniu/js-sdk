import { UploadError } from '../../../types/error'
import { HttpAbortController } from '../../../types/http'
import { Token, TokenProvider } from '../../../types/token'
import { ErrorResult, Result, SuccessResult, isErrorResult, isSuccessResult } from '../../../types/types'
import { MockProgress } from '../../../helper/progress'

import { Task } from '../queue'
import { QueueContext } from '../context'
import { parsePutPolicy } from './parse'

export type TokenProgressKey = 'prepareUploadToken'

export class TokenProvideTask implements Task {
  private cachedToken?: Token
  private abort = new HttpAbortController()
  constructor(private context: QueueContext<TokenProgressKey>, private userTokenProvider: TokenProvider) {
    this.context.progress.details.prepareUploadToken = {
      fromCache: false,
      percent: 0,
      size: 0
    }
  }

  private isExpired(): boolean {
    if (this.cachedToken == null) return true
    // 如果剩余可用时间不足 2 分钟，则视为过期
    return this.cachedToken.deadline <= (Date.now() / 1e3) - 120
  }

  /** 获取上传 token；自动根据 token 的过期时间更新 token */
  private async getUploadToken(): Promise<Result<Token>> {
    if (this.cachedToken != null && !this.isExpired()) {
      this.context.progress.details.prepareUploadToken.fromCache = true
      return { result: this.cachedToken }
    }

    const tokenResult = await this.userTokenProvider()
      .then<SuccessResult<string>>(token => ({ result: token }))
      .catch<ErrorResult>(() => ({ error: new UploadError('InvalidToken', 'Failed to get token') }))

    // 解析 token 并保存
    if (isSuccessResult(tokenResult)) {
      const parseToken = parsePutPolicy(tokenResult.result)
      if (!isSuccessResult(parseToken)) return parseToken
      this.cachedToken = parseToken.result
    }

    return { result: this.cachedToken! }
  }

  async cancel(): Promise<Result> {
    this.abort.abort()
    return { result: true }
  }

  async process(notice: () => void): Promise<Result> {
    const progress = new MockProgress(1)
    progress.onProgress(value => {
      this.context.progress.details.prepareUploadToken.percent = value
      notice()
    })

    progress.start()

    const uploadToken = await this.getUploadToken()
    if (!isSuccessResult(uploadToken)) {
      if (isErrorResult(uploadToken)) {
        this.context.error = uploadToken.error
      }
      progress.stop()
      return uploadToken
    }

    this.context!.token = uploadToken.result
    progress.end()
    return { result: true }
  }
}
