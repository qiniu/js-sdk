import SparkMD5 from 'spark-md5'

import { QiniuErrorName, QiniuError, QiniuRequestError, QiniuNetworkError } from '../errors'
import { Progress, LocalInfo } from '../upload'
import Logger from '../logger'

import { urlSafeBase64Decode } from './base64'

export const MB = 1024 ** 2

// 文件分块
export function getChunks(file: File, blockSize: number): Blob[] {

  let chunkByteSize = blockSize * MB // 转换为字节
  // 如果 chunkByteSize 比文件大，则直接取文件的大小
  if (chunkByteSize > file.size) {
    chunkByteSize = file.size
  } else {
    // 因为最多 10000 chunk，所以如果 chunkSize 不符合则把每片 chunk 大小扩大两倍
    while (file.size > chunkByteSize * 10000) {
      chunkByteSize *= 2
    }
  }

  const chunks: Blob[] = []
  const count = Math.ceil(file.size / chunkByteSize)
  for (let i = 0; i < count; i++) {
    const chunk = file.slice(
      chunkByteSize * i,
      i === count - 1 ? file.size : chunkByteSize * (i + 1)
    )
    chunks.push(chunk)
  }
  return chunks
}

export function isMetaDataValid(params: { [key: string]: string }) {
  return Object.keys(params).every(key => key.indexOf('x-qn-meta-') === 0)
}

export function isCustomVarsValid(params: { [key: string]: string }) {
  return Object.keys(params).every(key => key.indexOf('x:') === 0)
}

export function sum(list: number[]) {
  return list.reduce((data, loaded) => data + loaded, 0)
}

export function setLocalFileInfo(localKey: string, info: LocalInfo, logger: Logger) {
  try {
    localStorage.setItem(localKey, JSON.stringify(info))
  } catch (err) {
    logger.warn(new QiniuError(
      QiniuErrorName.WriteCacheFailed,
      `setLocalFileInfo failed: ${localKey}`
    ))
  }
}

export function createLocalKey(name: string, key: string | null | undefined, size: number): string {
  const localKey = key == null ? '_' : `_key_${key}_`
  return `qiniu_js_sdk_upload_file_name_${name}${localKey}size_${size}`
}

export function removeLocalFileInfo(localKey: string, logger: Logger) {
  try {
    localStorage.removeItem(localKey)
  } catch (err) {
    logger.warn(new QiniuError(
      QiniuErrorName.RemoveCacheFailed,
      `removeLocalFileInfo failed. key: ${localKey}`
    ))
  }
}

export function getLocalFileInfo(localKey: string, logger: Logger): LocalInfo | null {
  let localInfoString: string | null = null
  try {
    localInfoString = localStorage.getItem(localKey)
  } catch {
    logger.warn(new QiniuError(
      QiniuErrorName.ReadCacheFailed,
      `getLocalFileInfo failed. key: ${localKey}`
    ))
  }

  if (localInfoString == null) {
    return null
  }

  let localInfo: LocalInfo | null = null
  try {
    localInfo = JSON.parse(localInfoString)
  } catch {
    // 本地信息已被破坏，直接删除
    removeLocalFileInfo(localKey, logger)
    logger.warn(new QiniuError(
      QiniuErrorName.InvalidCacheData,
      `getLocalFileInfo failed to parse. key: ${localKey}`
    ))
  }

  return localInfo
}

export function getAuthHeaders(token: string) {
  const auth = 'UpToken ' + token
  return { Authorization: auth }
}

export function getHeadersForChunkUpload(token: string) {
  const header = getAuthHeaders(token)
  return {
    'content-type': 'application/octet-stream',
    ...header
  }
}

export function getHeadersForMkFile(token: string) {
  const header = getAuthHeaders(token)
  return {
    'content-type': 'application/json',
    ...header
  }
}

export function createXHR(): XMLHttpRequest {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest()
  }

  if (window.ActiveXObject) {
    return new window.ActiveXObject('Microsoft.XMLHTTP')
  }

  throw new QiniuError(
    QiniuErrorName.NotAvailableXMLHttpRequest,
    'the current environment does not support.'
  )
}

export async function computeMd5(data: Blob): Promise<string> {
  const buffer = await readAsArrayBuffer(data)
  const spark = new SparkMD5.ArrayBuffer()
  spark.append(buffer)
  return spark.end()
}

export function readAsArrayBuffer(data: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // evt 类型目前存在问题 https://github.com/Microsoft/TypeScript/issues/4163
    reader.onload = (evt: ProgressEvent<FileReader>) => {
      if (evt.target) {
        const body = evt.target.result
        resolve(body as ArrayBuffer)
      } else {
        reject(new QiniuError(
          QiniuErrorName.InvalidProgressEventTarget,
          'progress event target is undefined'
        ))
      }
    }

    reader.onerror = () => {
      reject(new QiniuError(
        QiniuErrorName.FileReaderReadFailed,
        'fileReader read failed'
      ))
    }

    reader.readAsArrayBuffer(data)
  })
}

export interface ResponseSuccess<T> {
  data: T
  reqId: string
}

export type XHRHandler = (xhr: XMLHttpRequest) => void

export interface RequestOptions {
  method: string
  onProgress?: (data: Progress) => void
  onCreate?: XHRHandler
  body?: BodyInit | null
  headers?: { [key: string]: string }
}

export type Response<T> = Promise<ResponseSuccess<T>>

export function request<T>(url: string, options: RequestOptions): Response<T> {
  return new Promise((resolve, reject) => {
    const xhr = createXHR()
    xhr.open(options.method, url)

    if (options.onCreate) {
      options.onCreate(xhr)
    }

    if (options.headers) {
      const headers = options.headers
      Object.keys(headers).forEach(k => {
        xhr.setRequestHeader(k, headers[k])
      })
    }

    xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
      if (evt.lengthComputable && options.onProgress) {
        options.onProgress({
          loaded: evt.loaded,
          total: evt.total
        })
      }
    })

    xhr.onreadystatechange = () => {
      const responseText = xhr.responseText
      if (xhr.readyState !== 4) {
        return
      }

      const reqId = xhr.getResponseHeader('x-reqId') || ''

      if (xhr.status === 0) {
        // 发生 0 基本都是网络错误，常见的比如跨域、断网、host 解析失败、系统拦截等等
        reject(new QiniuNetworkError('network error.', reqId))
        return
      }

      if (xhr.status !== 200) {
        let message = `xhr request failed, code: ${xhr.status}`
        if (responseText) {
          message += ` response: ${responseText}`
        }

        let data
        try {
          data = JSON.parse(responseText)
        } catch {
          // 无需处理该错误、可能拿到非 json 格式的响应是预期的
        }

        reject(new QiniuRequestError(xhr.status, reqId, message, data))
        return
      }

      try {
        resolve({
          data: JSON.parse(responseText),
          reqId
        })
      } catch (err) {
        reject(err)
      }
    }

    xhr.send(options.body)
  })
}

export function getPortFromUrl(url: string | undefined) {
  if (url && url.match) {
    let groups = url.match(/(^https?)/)

    if (!groups) {
      return ''
    }

    const type = groups[1]
    groups = url.match(/^https?:\/\/([^:^/]*):(\d*)/)

    if (groups) {
      return groups[2]
    }

    if (type === 'http') {
      return '80'
    }

    return '443'
  }

  return ''
}

export function getDomainFromUrl(url: string | undefined): string {
  if (url && url.match) {
    const groups = url.match(/^https?:\/\/([^:^/]*)/)
    return groups ? groups[1] : ''
  }

  return ''
}

// 非标准的 PutPolicy
interface PutPolicy {
  assessKey: string
  bucketName: string
  scope: string
}

export function getPutPolicy(token: string): PutPolicy {
  if (!token) throw new QiniuError(QiniuErrorName.InvalidToken, 'invalid token.')

  const segments = token.split(':')
  if (segments.length === 1) throw new QiniuError(QiniuErrorName.InvalidToken, 'invalid token segments.')

  // token 构造的差异参考：https://github.com/qbox/product/blob/master/kodo/auths/UpToken.md#admin-uptoken-authorization
  const assessKey = segments.length > 3 ? segments[1] : segments[0]
  if (!assessKey) throw new QiniuError(QiniuErrorName.InvalidToken, 'missing assess key field.')

  let putPolicy: PutPolicy | null = null

  try {
    putPolicy = JSON.parse(urlSafeBase64Decode(segments[segments.length - 1]))
  } catch (error) {
    throw new QiniuError(QiniuErrorName.InvalidToken, 'token parse failed.')
  }

  if (putPolicy == null) {
    throw new QiniuError(QiniuErrorName.InvalidToken, 'putPolicy is null.')
  }

  if (putPolicy.scope == null) {
    throw new QiniuError(QiniuErrorName.InvalidToken, 'scope field is null.')
  }

  const bucketName = putPolicy.scope.split(':')[0]
  if (!bucketName) {
    throw new QiniuError(QiniuErrorName.InvalidToken, 'resolve bucketName failed.')
  }

  return { assessKey, bucketName, scope: putPolicy.scope }
}

export function createObjectURL(file: File) {
  const URL = window.URL || window.webkitURL || window.mozURL
  // FIXME:  需要 revokeObjectURL
  return URL.createObjectURL(file)
}
