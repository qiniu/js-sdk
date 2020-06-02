import { region } from './config'
import {
  createMkFileUrl,
  getUploadUrl,
  getResumeUploadedSize,
  getHeadersForMkFile,
  getHeadersForChunkUpload,
  filterParams
} from './utils'
import { UploadManager, IExtra, IConfig, IUploadOptions } from './upload'
import { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
import { Observable, Observer } from './observable'
import compressImage from './compress'

function upload(
  file: File,
  key: string,
  token: string,
  putExtra: Partial<IExtra>,
  config: Partial<IConfig>
): Observable {

  const options: IUploadOptions = {
    file,
    key,
    token,
    putExtra,
    config
  }

  return new Observable((observer: Observer) => {
    const uploadManager = new UploadManager(options, {
      onData: e => observer.next(e),
      onError: e => observer.error(e),
      onComplete: () => observer.complete()
    })
    uploadManager.putFile()
    return uploadManager.stop.bind(uploadManager)
  })
}

export {
  upload,
  region,
  createMkFileUrl,
  getHeadersForChunkUpload,
  getResumeUploadedSize,
  getHeadersForMkFile,
  filterParams,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  compressImage,
  pipeline
}
