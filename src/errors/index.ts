export enum QiniuErrorType {
  // 输入错误
  InvalidFile = 'InvalidFile',
  InvalidToken = 'InvalidToken',
  InvalidMetadata = 'InvalidMetadata',
  InvalidChunkSize = 'InvalidChunkSize',
  InvalidCustomVars = 'InvalidCustomVars',
  NotAvailableUploadHost = 'NotAvailableUploadHost',

  // 缓存相关
  ReadCacheFailed = 'ReadCacheFailed',
  InvalidCacheData = 'InvalidCacheData',
  WriteCacheFailed = 'WriteCacheFailed',
  RemoveCacheFailed = 'RemoveCacheFailed',

  // 图片压缩模块相关
  InvalidTransformOrientation = 'InvalidTransformOrientation',
  GetCanvasContextFailed = 'GetCanvasContextFailed',
  UnsupportedFileType = 'UnsupportedFileType',

  // 运行环境相关
  FileReaderReadFailed = 'FileReaderReadFailed',
  NotAvailableXMLHttpRequest = 'NotAvailableXMLHttpRequest',
  InvalidProgressEventTarget = 'InvalidProgressEventTarget',

  // 请求错误
  RequestError = 'RequestError'
}

export class QiniuError extends Error {
  constructor(public type: QiniuErrorType, message?: string) {
    super(message)
  }
}

export function isQiniuError(error: any): error is QiniuRequestError {
  if (error != null && QiniuErrorType[error.type] != null) return true
  return false
}

export class QiniuRequestError extends QiniuError {
  constructor(public code: number, public reqId: string, message?: string) {
    super(QiniuErrorType.RequestError, message)
  }
}

export function isQiniuRequestError(error: any): error is QiniuRequestError {
  if (isQiniuError(error) && error.type === QiniuErrorType.RequestError) return true
  return false
}
