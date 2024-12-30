export type ErrorName =
  | 'InvalidToken'
  | 'InvalidParams'
  | 'InvalidUploadHost'
  | 'HttpRequestError'
  | 'FileSystemError'
  | 'NetworkError'
  | 'InternalError'
  | 'HijackedError'

export const NEVER_RETRY_ERROR_NAMES: ErrorName[] = [
  'InvalidToken',
  'InvalidParams',
  'FileSystemError'
]

export class UploadError implements Error {
  public stack: string | undefined
  constructor(public name: ErrorName, public message: string, public reqId?: string) {
    this.stack = new Error().stack
  }
}

export class HttpRequestError extends UploadError {
  constructor(public httpCode: number, message: string, public reqId?: string) {
    super('HttpRequestError', message)
  }

  needRetry(): boolean {
    if (this.httpCode >= 100 && this.httpCode < 500) {
      return false
    }
    // https://developer.qiniu.com/kodo/3928/error-responses
    if (
      [
        501, 509, 573, 579, 608, 612, 614, 618, 630, 631, 632, 640, 701
      ].includes(this.httpCode)
    ) {
      return false
    }
    return true
  }
}
