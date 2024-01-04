export type ErrorName =
  | 'InvalidToken'
  | 'InvalidParams'
  | 'InvalidUploadHost'
  | 'HttpRequestError'
  | 'FileSystemError'
  | 'NetworkError'
  | 'InternalError'

export class UploadError {
  public stack: string | undefined
  constructor(public name: ErrorName, public message: string) {
    this.stack = new Error().stack
  }
}

export class HttpRequestError extends UploadError {
  constructor(public httpCode: number, message: string, public reqId?: string) {
    super('HttpRequestError', message)
  }
}
