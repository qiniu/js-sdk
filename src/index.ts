export { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
export { deleteUploadedChunks } from './api'
export { default as upload } from './upload'
export { region } from './config'

export {
  compressImage,
  CompressResult,
  urlSafeBase64Encode,
  urlSafeBase64Decode,
  getHeadersForMkFile,
  getHeadersForChunkUpload
} from './utils'
