import { Result } from './types'

export type TokenProvider = () => Promise<string>

export interface Token {
  bucket: string
  assessKey: string
  signature: string
  /** 过期时间 */
  deadline: number
}

// 和上面的区别在于内部会将 string 转换成 token 对象便于内部消费
export interface InnerTokenProvider {
  getUploadToken(): Promise<Result<Token>>
}
