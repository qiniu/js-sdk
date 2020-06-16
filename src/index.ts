import StatisticsLogger from './statisticsLog'
import createUploadManager, { Extra, Config, UploadOptions, UploadProgress } from './upload'
import { Observable, IObserver } from './observable'
import { CustomError } from './utils'
import compressImage from './compress'

const statisticsLogger = new StatisticsLogger()

function upload(
  bucket: string,
  file: File,
  key: string,
  token: string,
  putExtra?: Partial<Extra>,
  config?: Partial<Config>
): Observable<UploadProgress, CustomError> {

  const options: UploadOptions = {
    bucket,
    file,
    key,
    token,
    putExtra,
    config
  }

  return new Observable((observer: IObserver<UploadProgress, CustomError>) => {
    const manager = createUploadManager(options, {
      onData: (data: UploadProgress) => observer.next(data),
      onError: (err: CustomError) => observer.error(err),
      onComplete: (res: any) => observer.complete(res)
    }, statisticsLogger)
    manager.putFile()
    return manager.stop.bind(manager)
  })
}

export {
  getResumeUploadedSize,
  getHeadersForMkFile,
  getHeadersForChunkUpload
} from './utils'

export { deleteUploadedChunks, getUploadUrl } from './api'
export { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
export { region } from './config'

export { upload, compressImage }
