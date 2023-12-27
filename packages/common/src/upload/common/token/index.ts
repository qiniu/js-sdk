import { UploadError } from '../../../types/error'
import { HttpAbortController } from '../../../types/http'
import { Token, TokenProvider } from '../../../types/token'
import { ErrorResult, Result, SuccessResult, isErrorResult, isSuccessResult } from '../../../types/types'
import { QueueContext, Task } from '../queue'
import { parsePutPolicy } from './parse'

export class TokenProvideTask implements Task {
  private cachedToken?: Token
  private abort = new HttpAbortController()
  constructor(private context: QueueContext, private userTokenProvider: TokenProvider) {}

  private isExpired(): boolean {
    if (this.cachedToken == null) return true
    // 如果剩余可用时间不足 1 分钟，则视为过期
    return this.cachedToken.expiredAt <= (Date.now() - (60 * 1000))
  }

  /** 获取上传 token；自动根据 token 的过期时间更新 token */
  private async getUploadToken(): Promise<Result<Token>> {
    if (this.cachedToken != null && !this.isExpired()) {
      return { result: this.cachedToken }
    }

    const tokenResult = await this.userTokenProvider.getUploadToken()
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
    this.context.progress.details.prepareUploadToken = 0; notice()
    const uploadToken = await this.getUploadToken()
    this.context.progress.details.prepareUploadToken = 0.7; notice()
    if (!isSuccessResult(uploadToken)) {
      if (isErrorResult(uploadToken)) {
        this.context.error = uploadToken.error; notice()
      }
      this.context.progress.details.prepareUploadToken = 1; notice()
      return uploadToken
    }

    this.context!.token = uploadToken.result
    this.context.progress.details.prepareUploadToken = 1; notice()
    return { result: true }
  }
}
