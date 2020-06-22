import StatisticsLogger from './statisticsLog'
import createUploadManager, { Extra, Config, UploadOptions, UploadProgress } from './upload'
import { Observable, IObserver } from './observable'
import { CustomError } from './utils'
import { UploadCompleteData } from './api'
import compressImage from './compress'

const statisticsLogger = new StatisticsLogger()

/**
 * @param file 上传文件
 * @param key 目标文件名
 * @param token 上传凭证
 * @param putExtra 上传文件的相关资源信息配置
 * @param config 上传任务的配置
 * @returns 返回用于上传任务的可观察对象
 */
function upload(
  file: File,
  key: string,
  token: string,
  putExtra?: Partial<Extra>,
  config?: Partial<Config>
): Observable<UploadProgress, CustomError, UploadCompleteData> {

  const options: UploadOptions = {
    file,
    key,
    token,
    putExtra,
    config
  }

  return new Observable((observer: IObserver<UploadProgress, CustomError, UploadCompleteData>) => {
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
  getHeadersForMkFile,
  getHeadersForChunkUpload
} from './utils'

export { CompressResult } from './compress'

export { deleteUploadedChunks, getUploadUrl } from './api'
export { imageMogr2, watermark, imageInfo, exif, pipeline } from './image'
export { region } from './config'

export { upload, compressImage }
