import common, { HttpResponse, MockProgress, UploadError, isHttpFormData } from '@internal/common'

import { isUploadBlob, isUploadFile } from '../file'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

export class WxHttpClient implements common.HttpClient {
  async request(url: string, options: RequestOptions): Promise<common.Result<HttpResponse>> {
    return new Promise(resolve => {
      // 默认是用 Xhr
      const xhr = new XMLHttpRequest()
      xhr.open(options.method, url)

      if (options.abort) {
        options.abort.onAbort(() => xhr.abort())
      }

      if (options.headers) {
        const headers = options.headers
        Object.keys(headers).forEach(k => {
          xhr.setRequestHeader(k, headers[k])
        })
      }

      let mockProgress: MockProgress | undefined

      if (options.onProgress) {
        const onProgress = options.onProgress
        if (xhr.upload && xhr.upload.addEventListener) {
          xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
            if (evt.lengthComputable && options.onProgress) {
              onProgress({ percent: evt.total / evt.loaded })
            }
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

      let normalizedBody: XMLHttpRequestBodyInit | undefined

      if (isHttpFormData(options.body)) {
        const formData = new FormData()
        const bodyEntries = options.body.entries()

        for (const [key, value, option] of bodyEntries) {
          formData.set(key, value, option)
        }

        normalizedBody = formData
      }

      if (isUploadFile(options.body)) {
        normalizedBody = options.body.readAsBrowserFile()
      } else if (isUploadBlob(options.body)) {
        normalizedBody = options.body.readAsBrowserBlob()
      } else if (typeof options.body === 'object') {
        normalizedBody = JSON.stringify(options.body)
      }

      xhr.send(normalizedBody || options.body as any)
      if (mockProgress) mockProgress.start()
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
