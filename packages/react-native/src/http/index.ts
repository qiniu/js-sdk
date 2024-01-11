import common, { HttpResponse, MockProgress, UploadError, isHttpFormData, generateRandomString } from '@internal/common'

import { isUploadBlob, isUploadFile } from '../file'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

class XhrHttpClient implements common.HttpClient {
  async request(url: string, options: RequestOptions): Promise<common.Result<HttpResponse>> {
    return new Promise(resolve => {
      const xhr = new XMLHttpRequest()
      xhr.open(options.method, url)

      if (options.abort) {
        options.abort.onAbort(() => xhr.abort())
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

        for (const [key, value] of bodyEntries) {
          formData.append(key, value)
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

      if (options.headers) {
        const headers = options.headers
        Object.keys(headers).forEach(k => {
          xhr.setRequestHeader(k, headers[k])
        })
      }

      console.log(11111111, options.headers)
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

export class FetchHttpClient implements common.HttpClient {
  async request(url: string, options: RequestOptions): Promise<common.Result<HttpResponse>> {
    return new Promise(resolve => {
      const request: RequestInit = {
        body: options.body as any,
        method: options.method
      }

      if (options.abort) {
        const ctrl = new AbortController()
        request.signal = ctrl.signal
        options.abort.onAbort(() => ctrl.abort())
      }

      if (options.headers) {
        request.headers = options.headers
      }

      const mockProgress = new MockProgress()

      if (options.onProgress) {
        const onProgress = options.onProgress
        mockProgress.onProgress(v => onProgress({ percent: v }))
      }

      if (isHttpFormData(options.body)) {
        const formData = new FormData()
        const bodyEntries = options.body.entries()

        for (const [key, value] of bodyEntries) {
          formData.append(key, value)
        }

        request.body = formData
      }

      if (isUploadFile(options.body)) {
        request.body = options.body.readAsBrowserFile()
      }

      if (isUploadBlob(options.body)) {
        request.body = options.body.readAsBrowserBlob()
      }

      mockProgress.start()
      console.log('222222', request)
      fetch(url, request)
        .then(async response => {
          mockProgress.end()
          resolve({
            result: {
              code: response.status,
              data: await response.text(),
              reqId: response.headers.get('x-reqid') || undefined,
            }
          })
        })
        .catch(error => {
          mockProgress.stop()
          resolve({ error: new UploadError('NetworkError', error?.message) })
        })
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
