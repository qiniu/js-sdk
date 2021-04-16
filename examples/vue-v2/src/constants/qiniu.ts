import { Observable } from 'qiniu-js/esm/observable'
import { UploadProgress } from 'qiniu-js/esm/upload'
import { CustomError } from 'qiniu-js/esm/utils'
import { UploadCompleteData } from 'qiniu-js/esm/api'

export type Observer = Observable<UploadProgress, CustomError, UploadCompleteData>
