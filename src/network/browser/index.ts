import { NetworkClient, RequestOptions, Response, Body, NetworkPromise } from 'network'
import { QiniuError, QiniuErrorName, QiniuNetworkError, QiniuRequestError } from 'errors'

export class XhrNetworkClient implements NetworkClient {
  public get<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'GET', undefined, options)
  }

  public delete<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'DELETE', undefined, options)
  }

  public put<T>(url: string, body: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'PUT', body, options)
  }

  public post<T>(url: string, body: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'POST', body, options)
  }

  private createXHR(): XMLHttpRequest {
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

  private request<T>(url: string, method: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    const promise = new Promise<Response<T>>((resolve, reject) => {
      const xhr = this.createXHR()
      xhr.open(method, url);

      (promise as any).abort = () => {
        if (xhr != null) xhr.abort()
      }

      if (options != null && options.headers) {
        const headers = options.headers
        Object.keys(headers).forEach(k => {
          xhr.setRequestHeader(k, headers[k])
        })
      }

      xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
        if (evt.lengthComputable && options && options.onProgress) {
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
            status: xhr.status,
            reqId
          })
        } catch (err) {
          reject(err)
        }
      }

      xhr.send(body)
    })

    return promise as unknown as NetworkPromise<Response<T>>
  }
}
