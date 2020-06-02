import SparkMD5 from 'spark-md5'
import { urlSafeBase64Encode, urlSafeBase64Decode } from './base64'
import { regionUphostMap } from './config'
import { IConfig, IExtra, IProgress, XHRHandler, ICtxInfo } from './upload'

// 对上传块本地存储时间检验是否过期
// TODO: 最好用服务器时间来做判断
export function isChunkExpired(time: number) {
  const expireAt = time + 3600 * 24 * 1000
  return new Date().getTime() > expireAt
}

// 文件分块
export function getChunks(file: File, blockSize: number) {
  const chunks = []
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
    .filter(value => value.startsWith('x:'))
    .map(k => [k, params[k].toString()])
}

export function sum(list: number[]) {
  return list.reduce((data, loaded) => data + loaded, 0)
}

export function setLocalFileInfo(file: File, info: ICtxInfo[]) {
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

export function getLocalFileInfo(file: File): ICtxInfo[] {
  try {
    return JSON.parse(localStorage.getItem(createLocalKey(file))) || []
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
export function createMkFileUrl(url: string, size: number, key: string, putExtra: IExtra) {
  let requestUrl = url + '/mkfile/' + size
  if (key != null) {
    requestUrl += '/key/' + urlSafeBase64Encode(key)
  }

  if (putExtra.mimeType) {
    requestUrl += '/mimeType/' + urlSafeBase64Encode(putExtra.mimeType)
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
  return { 'content-type': 'application/octet-stream', ...header }
}

export function getHeadersForMkFile(token: string) {
  const header = getAuthHeaders(token)
  return { 'content-type': 'text/plain', ...header }
}

export function createXHR() {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest()
  }

  return window.ActiveXObject('Microsoft.XMLHTTP')
}

export async function computeMd5(data: Blob) {
  const buffer = await readAsArrayBuffer(data)
  const spark = new SparkMD5.ArrayBuffer()
  spark.append(buffer)
  return spark.end()
}

export function readAsArrayBuffer(data: Blob): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // evt 类型目前存在问题 https://github.com/Microsoft/TypeScript/issues/4163
    reader.onload = (evt: any) => {
      const body = evt.target.result
      resolve(body)
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
  body?: Document | BodyInit | null
  headers?: { [key: string]: string | number }
  onProgress?: (data: IProgress) => void
  onCreate?: XHRHandler
}

export type Response<T> = Promise<IRequestResponse<T>>

export function request<T>(url: string, options: IRequestOptions): Response<T> {
  return new Promise((resolve, reject) => {
    const xhr = createXHR()
    xhr.open(options.method, url)

    if (options.onCreate) {
      options.onCreate(xhr)
    }

    if (options.headers) {
      Object.keys(options.headers).forEach(k => {
        xhr.setRequestHeader(k, options.headers[k])
      })
    }

    xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
      if (evt.lengthComputable && options.onProgress) {
        options.onProgress({ loaded: evt.loaded, total: evt.total })
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
        reject({ code: xhr.status, message, reqId, isRequestError: true })
        return
      }

      try {
        resolve({ data: JSON.parse(responseText), reqId })
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
export async function getUploadUrl(config: IConfig, token: string): Promise<string> {
  const protocol = getAPIProtocol()

  if (config.uphost != null) {
    return Promise.resolve(`${protocol}//${config.uphost}`)
  }

  if (config.region != null) {
    const upHosts = regionUphostMap[config.region]
    const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost
    return Promise.resolve(`${protocol}//${host}`)
  }

  const res = await getUpHosts(token)
  const hosts = res.data.up.acc.main
  return (`${protocol}//${hosts[0]}`)
}

function getAPIProtocol(): string {
  if (window.location.protocol === 'http:') {
    return 'http:'
  }
  return 'https:'
}

function getPutPolicy(token: string) {
  const segments = token.split(':')
  const ak = segments[0]
  const putPolicy = JSON.parse(urlSafeBase64Decode(segments[2]))
  putPolicy.ak = ak
  putPolicy.bucket = putPolicy.scope.split(':')[0]
  return putPolicy
}

// 返回类型嵌套太多层，并且类型单一，返回直接以 any 代替
function getUpHosts(token: string): Promise<any> {
  try {
    const putPolicy = getPutPolicy(token)
    const url = getAPIProtocol() + '//api.qiniu.com/v2/query?ak=' + putPolicy.ak + '&bucket=' + putPolicy.bucket
    return request(url, { method: 'GET' })
  } catch (e) {
    return Promise.reject(e)
  }
}

export function isContainFileMimeType(fileType: string, mimeType: string[]) {
  return mimeType.indexOf(fileType) > -1
}

export function createObjectURL(file: File) {
  const URL = window.URL || window.webkitURL || (window as any).mozURL
  return URL.createObjectURL(file)
}

export interface ITransformValue {
  width: number
  height: number
  matrix: [number, number, number, number, number, number] // TODO: 有没有简便的方法？
}

export function getTransform(image: HTMLImageElement, orientation: number): ITransformValue {
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
  }
}
