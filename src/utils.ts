import SparkMD5 from 'spark-md5'
import { Progress, LocalInfo } from './upload'
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

export function setLocalFileInfo(localKey: string, info: LocalInfo) {
  try {
    localStorage.setItem(localKey, JSON.stringify(info))
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('setLocalFileInfo failed')
    }
  }
}

export function createLocalKey(name: string, key: string, size: number): string {
  return `qiniu_js_sdk_upload_file_name_${name}_key_${key}_size_${size}`
}

export function removeLocalFileInfo(localKey: string) {
  try {
    localStorage.removeItem(localKey)
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('removeLocalFileInfo failed')
    }
  }
}

export function getLocalFileInfo(localKey: string): LocalInfo | null {
  try {
    const localInfo = localStorage.getItem(localKey)
    return localInfo ? JSON.parse(localInfo) : null
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('getLocalFileInfo failed')
    }
    return null
  }
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

  return window.ActiveXObject('Microsoft.XMLHTTP')
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
        reject(new Error('progress event target is undefined'))
      }
    }

    reader.onerror = () => {
      reject(new Error('fileReader read failed'))
    }

    reader.readAsArrayBuffer(data)
  })
}

export interface ResponseSuccess<T> {
  data: T
  reqId: string
}

export interface ResponseError {
  code: number /** 请求错误状态码，只有在 err.isRequestError 为 true 的时候才有效。可查阅码值对应说明。*/
  message: string /** 错误信息，包含错误码，当后端返回提示信息时也会有相应的错误信息。 */
  isRequestError: true | undefined /** 用于区分是否 xhr 请求错误当 xhr 请求出现错误并且后端通过 HTTP 状态码返回了错误信息时，该参数为 true否则为 undefined 。 */
  reqId: string /** xhr请求错误的 X-Reqid。 */
}

export type CustomError = ResponseError | Error | any

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
      if (xhr.status !== 200) {
        let message = `xhr request failed, code: ${xhr.status}`
        if (responseText) {
          message += ` response: ${responseText}`
        }
        reject({
          code: xhr.status,
          message,
          reqId,
          isRequestError: true
        })
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

export function getPortFromUrl(url: string) {
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

export function getDomainFromUrl(url: string): string {
  if (url && url.match) {
    const groups = url.match(/^https?:\/\/([^:^/]*)/)
    return groups ? groups[1] : ''
  }

  return ''
}

export function getAPIProtocol(): string {
  if (window.location.protocol === 'http:') {
    return 'http:'
  }
  return 'https:'
}

interface PutPolicy {
  ak: string
  scope: string
}

export function getPutPolicy(token: string) {
  const segments = token.split(':')
  const ak = segments[0]
  const putPolicy: PutPolicy = JSON.parse(urlSafeBase64Decode(segments[2]))

  return {
    ak,
    bucket: putPolicy.scope.split(':')[0]
  }
}

export function createObjectURL(file: File) {
  const URL = window.URL || window.webkitURL || window.mozURL
  return URL.createObjectURL(file)
}

export interface TransformValue {
  width: number
  height: number
  matrix: [number, number, number, number, number, number]
}

export function getTransform(image: HTMLImageElement, orientation: number): TransformValue {
  const { width, height } = image

  switch (orientation) {
    case 1:
      // default
      return {
        width,
        height,
        matrix: [1, 0, 0, 1, 0, 0]
      }
    case 2:
      // horizontal flip
      return {
        width,
        height,
        matrix: [-1, 0, 0, 1, width, 0]
      }
    case 3:
      // 180° rotated
      return {
        width,
        height,
        matrix: [-1, 0, 0, -1, width, height]
      }
    case 4:
      // vertical flip
      return {
        width,
        height,
        matrix: [1, 0, 0, -1, 0, height]
      }
    case 5:
      // vertical flip + -90° rotated
      return {
        width: height,
        height: width,
        matrix: [0, 1, 1, 0, 0, 0]
      }
    case 6:
      // -90° rotated
      return {
        width: height,
        height: width,
        matrix: [0, 1, -1, 0, height, 0]
      }
    case 7:
      // horizontal flip + -90° rotate
      return {
        width: height,
        height: width,
        matrix: [0, -1, -1, 0, height, width]
      }
    case 8:
      // 90° rotated
      return {
        width: height,
        height: width,
        matrix: [0, -1, 1, 0, 0, width]
      }
    default:
      throw new Error(`orientation ${orientation} is unavailable`)
  }
}
