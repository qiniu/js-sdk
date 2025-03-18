import * as common from '../@internal'
import { HttpResponse, MockProgress, UploadError, isHttpFormData } from '../@internal'

import { isUploadBlob, isUploadFile } from '../file'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

function removeSpecifiedKeyForHeader(header: common.HttpHeader, keys: string[]) {
  const headerKeys = Object.keys(header)

  for (let index = 0; index < headerKeys.length; index++) {
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      const key = keys[keyIndex].toLowerCase()
      const headerKey = headerKeys[index].toLowerCase()
      if (key === headerKey) delete header[headerKeys[index]]
    }
  }
}

function normalizeBody(body: unknown): XMLHttpRequestBodyInit {
  if (isHttpFormData(body)) {
    const formData = new FormData()
    const bodyEntries = body.entries()

    for (const [key, value, option] of bodyEntries) {
      if (isUploadFile(value)) {
        formData.set(key, value.readAsBrowserFile(), option)
      } else if (isUploadBlob(value)) {
        formData.set(key, value.readAsBrowserBlob(), option)
      } else if (typeof option === 'string') {
        // 如果无脑传第三个参数无法通过浏览器检查
        formData.set(key, value, option)
      } else {
        formData.set(key, value)
      }
    }

    return formData
  }

  if (isUploadFile(body)) {
    return body.readAsBrowserFile()
  }
  if (isUploadBlob(body)) {
    return body.readAsBrowserBlob()
  }

  return JSON.stringify(body)
}

export class HttpClient implements common.HttpClient {
  async request(url: string, options: RequestOptions): Promise<common.Result<HttpResponse>> {
    return new Promise(resolve => {
      // 默认是用 Xhr
      const xhr = new XMLHttpRequest()
      xhr.open(options.method, url)

      if (options.abort) {
        options.abort.onAbort(() => xhr.abort())
      }

      let mockProgress: MockProgress | undefined

      if (options.onProgress) {
        const onProgress = options.onProgress

        // 实际上没有 body 可能导致即使添加了 upload.Listener 也不会触发
        if (xhr.upload && xhr.upload.addEventListener && options.body) {
          xhr.upload.addEventListener('load', () => {
            onProgress({ percent: 1 })
          })

          xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
            if (evt.lengthComputable) onProgress({ percent: evt.loaded / evt.total })
          })
        } else {
          // 对于不支持 xhr.upload 的一种兼容办法
          mockProgress = new MockProgress()
          mockProgress.onProgress(v => onProgress({ percent: v }))
        }
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return
        }

        if (xhr.status === 0) {
          mockProgress?.stop()
          // 发生 0 基本都是网络错误，常见的比如跨域、断网、host 解析失败、系统拦截等等
          resolve({ error: new UploadError('NetworkError', 'Unknown network error') })
          return
        }

        mockProgress?.end()

        resolve({
          result: {
            reqId: xhr.getResponseHeader('x-reqId') || undefined,
            code: xhr.status,
            data: xhr.responseText
          }
        })
      }

      const normalizedBody = normalizeBody(options.body)

      if (isHttpFormData(options.body)) {
        if (options.headers) {
          // formData 需要删除该字段让浏览器自动填充
          removeSpecifiedKeyForHeader(options.headers, ['content-type'])
        }
      }

      if (options.headers) {
        const headers = options.headers
        Object.keys(headers).forEach(k => {
          xhr.setRequestHeader(k, headers[k])
        })
      }

      xhr.send(normalizedBody)
      if (mockProgress) {
        mockProgress.start()
      }
    })
  }

  get(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<HttpResponse>> {
    return this.request(url, { method: 'GET', ...options })
  }
  put(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<HttpResponse>> {
    return this.request(url, { method: 'PUT', ...options })
  }
  post(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<HttpResponse>> {
    return this.request(url, { method: 'POST', ...options })
  }
  delete(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<HttpResponse>> {
    return this.request(url, { method: 'DELETE', ...options })
  }
}
