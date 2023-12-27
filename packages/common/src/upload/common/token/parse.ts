import { Token } from '../../../types/token'
import { Result } from '../../../types/types'
import { UploadError } from '../../../types/error'
import { urlSafeBase64Decode } from '../../../helper/base64'

interface PutPolicy {
  assessKey: string
  bucketName: string
  deadline: number
  scope: string
}

export function parsePutPolicy(token: string): Result<Token> {
  if (!token) return { error: new UploadError('InvalidToken', 'invalid token.') }

  const segments = token.split(':')
  if (segments.length === 1) return { error: new UploadError('InvalidToken', 'invalid token segments.') }

  // token 构造的差异参考：https://github.com/qbox/product/blob/master/kodo/auths/UpToken.md#admin-uptoken-authorization
  const assessKey = segments.length > 3 ? segments[1] : segments[0]
  if (!assessKey) return { error: new UploadError('InvalidToken', 'missing assess key field.') }

  let putPolicy: PutPolicy | null = null

  try {
    putPolicy = JSON.parse(urlSafeBase64Decode(segments[segments.length - 1]))
  } catch (error) {
    return { error: new UploadError('InvalidToken', 'token parse failed.') }
  }

  if (putPolicy == null) {
    return { error: new UploadError('InvalidToken', 'putPolicy is null.') }
  }

  if (putPolicy.scope == null) {
    return { error: new UploadError('InvalidToken', 'scope field is null.') }
  }

  if (putPolicy.deadline == null) {
    return { error: new UploadError('InvalidToken', 'deadline field is null.') }
  }

  const bucket = putPolicy.scope.split(':')[0]
  if (!bucket) {
    return { error: new UploadError('InvalidToken', 'resolve bucketName failed.') }
  }

  return {
    result: {
      bucket,
      assessKey,
      signature: token,
      expiredAt: Date.now() + (putPolicy.deadline * 1000)
    }
  }
}
