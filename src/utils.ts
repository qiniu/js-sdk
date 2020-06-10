import SparkMD5 from 'spark-md5'
import { urlSafeBase64Encode, urlSafeBase64Decode } from './base64'
import { regionUphostMap } from './config'
import { Config, Extra, Progress, XHRHandler, CtxInfo } from './upload'

// 对上传块本地存储时间检验是否过期
// TODO: 最好用服务器时间来做判断
export function isChunkExpired(time: number) {
  const expireAt = time + 3600 * 24 * 1000
  return new Date().getTime() > expireAt
}

// 文件分块
export function getChunks(file: File, blockSize: number): Blob[] {
  const chunks: Blob[] = []
  const count = Math.ceil(file.size / blockSize)
  for (let i = 0; i < count; i++) {
    const chunk = file.slice(
      blockSize * i,
      i === count - 1 ? file.size : blockSize * (i + 1)
    )
    chunks.push(chunk)
  }
  return chunks
}

export function filterParams(params: { [key: string]: string }) {
  return Object.keys(params)
    .filter(value => value.indexOf('x:') === 0)
    .map(k => [k, params[k].toString()])
}

export function sum(list: number[]) {
  return list.reduce((data, loaded) => data + loaded, 0)
}

export function setLocalFileInfo(file: File, info: CtxInfo[]) {
  try {
    localStorage.setItem(createLocalKey(file), JSON.stringify(info))
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('setLocalFileInfo failed')
    }
  }
}

function createLocalKey(file: File) {
  return 'qiniu_js_sdk_upload_file_' + file.name + '_size_' + file.size
}

export function removeLocalFileInfo(file: File) {
  try {
    localStorage.removeItem(createLocalKey(file))
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('removeLocalFileInfo failed')
    }
  }
}

export function getLocalFileInfo(file: File): CtxInfo[] {
  try {
    const localInfo = localStorage.getItem(createLocalKey(file))
    return localInfo ? JSON.parse(localInfo) : []
  } catch (err) {
    if (window.console && window.console.warn) {
      // eslint-disable-next-line no-console
      console.warn('getLocalFileInfo failed')
    }
    return []
  }
}

export function getResumeUploadedSize(file: File) {
  return getLocalFileInfo(file).filter(
    value => value && !isChunkExpired(value.time)
  ).reduce(
    (result, value) => result + value.size,
    0
  )
}

// 构造file上传url
export function createMkFileUrl(url: string, file: File, key: string, putExtra: Extra) {
  let requestUrl = url + '/mkfile/' + file.size
  if (key != null) {
    requestUrl += '/key/' + urlSafeBase64Encode(key)
  }

  if (putExtra.mimeType) {
    requestUrl += '/mimeType/' + urlSafeBase64Encode(file.type)
  }

  const fname = putExtra.fname
  if (fname) {
    requestUrl += '/fname/' + urlSafeBase64Encode(fname)
  }

  if (putExtra.params) {
    filterParams(putExtra.params).forEach(
      item => { requestUrl += '/' + encodeURIComponent(item[0]) + '/' + urlSafeBase64Encode(item[1]) }
    )
  }

  return requestUrl
}

function getAuthHeaders(token: string) {
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
    'content-type': 'text/plain',
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
        reject(new Error('progress event target is null'))
      }
    }

    reader.onerror = () => {
      reject(new Error('fileReader read failed'))
    }

    reader.readAsArrayBuffer(data)
  })
}

export interface IRequestResponse<T> {
  data: T
  reqId: string
}

export interface IRequestOptions {
  method: string
  onProgress?: (data: Progress) => void
  onCreate?: XHRHandler
  body?: BodyInit | null
  headers?: { [key: string]: string }
}

export type Response<T> = Promise<IRequestResponse<T>>

export function request<T extends object>(url: string, options: IRequestOptions): Response<T> {
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
          message += `response: ${responseText}`
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

// 构造区域上传url
export async function getUploadUrl(config: Config, token: string): Promise<string> {
  const protocol = getAPIProtocol()

  if (config.uphost) {
    return `${protocol}//${config.uphost}`
  }

  if (config.region) {
    const upHosts = regionUphostMap[config.region]
    const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost
    return `${protocol}//${host}`
  }

  const res = await getUpHosts(token)
  const hosts = res.data.up.acc.main
  return `${protocol}//${hosts[0]}`
}

function getAPIProtocol(): string {
  if (window.location.protocol === 'http:') {
    return 'http:'
  }
  return 'https:'
}

interface PutPolicy {
  ak: string
  scope: string
}

function getPutPolicy(token: string) {
  const segments = token.split(':')
  const ak = segments[0]
  const putPolicy: PutPolicy = JSON.parse(urlSafeBase64Decode(segments[2]))

  return {
    ak,
    bucket: putPolicy.scope.split(':')[0]
  }
}

// 返回类型嵌套太多层，并且类型单一，返回直接以 any 代替
interface UpHosts {
  data: {
    up: {
      acc: {
        main: string[]
      }
    }
  }
}

async function getUpHosts(token: string): Promise<UpHosts> {
  const putPolicy = getPutPolicy(token)
  const url = getAPIProtocol() + '//api.qiniu.com/v2/query?ak=' + putPolicy.ak + '&bucket=' + putPolicy.bucket
  return request(url, { method: 'GET' })

}

export function isContainFileMimeType(fileType: string, mimeType: string[]) {
  return mimeType.indexOf(fileType) > -1
}

export function createObjectURL(file: File) {
  const URL = window.URL || window.webkitURL || window.mozURL
  return URL.createObjectURL(file)
}

export interface TransformValue {
  width: number
  height: number
  matrix: [number, number, number, number, number, number] // TODO: 有没有简便的方法？
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
