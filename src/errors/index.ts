export enum ErrorType {
  // 输入错误
  InvalidFile,
  InvalidToken,
  InvalidMetadata,
  InvalidChunkSize,
  InvalidCustomVars,
  NotAvailableUploadHost,

  // 缓存相关
  ReadCacheFailed,
  InvalidCacheData,
  WriteCacheFailed,
  RemoveCacheFailed,

  // 图片压缩模块相关
  InvalidTransformOrientation,
  GetCanvasContextFailed,
  UnsupportedFileType,

  // 运行环境相关
  FileReaderReadFailed,
  NotAvailableXMLHttpRequest,
  InvalidProgressEventTarget,

  // 请求错误
  RequestError
}

export class QiniuError extends Error {
  constructor(public type: ErrorType, message?: string) {
    super(message)
  }
}

export class QiniuRequestError extends QiniuError {
  constructor(public code: number, public reqId: string, message?: string) {
    super(ErrorType.RequestError, message)
  }
}

export function isQiniuRequestError(error: any): error is QiniuRequestError {
  return error instanceof QiniuRequestError
}
