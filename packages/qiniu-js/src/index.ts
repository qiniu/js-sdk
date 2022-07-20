export type { QiniuErrorName, QiniuError, QiniuRequestError, QiniuNetworkError } from './errors'
export { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
export { deleteUploadedChunks, getUploadUrl } from './api'

export {
  upload
} from './upload'
export type {
  UploadKey,
  UploadError,
  UploadExtra,
  UploadProgress,
  UploadObservable
} from './upload'

export { region } from './config'

export {
  compressImage,
  urlSafeBase64Encode,
  urlSafeBase64Decode,
  getHeadersForMkFile,
  getHeadersForChunkUpload
} from './utils'

export type { CompressResult } from './utils'
