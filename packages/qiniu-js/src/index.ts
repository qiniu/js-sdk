export type {
  UploadKey,
  UploadError,
  UploadExtra,
  UploadProgress,
  UploadObservable
} from './upload'

export type {
  QiniuError,
  QiniuErrorName,
  QiniuRequestError,
  QiniuNetworkError
} from './errors'

export { upload } from './upload'
export { region } from './config'

export {
  getUploadUrl,
  deleteUploadedChunks
} from './api'

export {
  compressImage,
  urlSafeBase64Encode,
  urlSafeBase64Decode,
  getHeadersForMkFile,
  getHeadersForChunkUpload
} from './utils'

export type { CompressResult } from './utils'

export { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
