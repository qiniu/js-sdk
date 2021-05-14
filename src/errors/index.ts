export enum QiniuErrorName {
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
  RequestError = 'RequestError',

  // 网络错误
  NetworkError = 'NetworkError'
}

export class QiniuError implements Error {
  public stack: string | undefined
  constructor(public name: QiniuErrorName, public message: string) {
    this.stack = new Error().stack
  }
}

export class QiniuRequestError extends QiniuError {

  /**
   * @description 标志当前的 error 类型是一个 RequestError
   * @deprecated 下一个大版本将会移除
   */
  public isRequestError = true

  constructor(public code: number, public reqId: string, message: string) {
    super(QiniuErrorName.RequestError, message)
  }
}
