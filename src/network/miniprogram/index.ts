import { NetworkClient, RequestOptions, Response, Body, NetworkPromise } from 'network/interface'
import { QiniuError, QiniuErrorName, QiniuNetworkError, QiniuRequestError } from 'errors'

export class WeixinNetworkClient implements NetworkClient {
  public get<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'GET', undefined, options)
  }

  public delete<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'DELETE', undefined, options)
  }

  public put<T>(url: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'PUT', body, options)
  }

  public post<T>(url: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    return this.request(url, 'POST', body, options)
  }

  private getBodySize(body?: Body): number {
    if (body == null) return 0
    if (body instanceof Blob) return body.size
    if (Array.isArray(body)) return body.length
    return 0
  }

  private request<T>(url: string, method: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    const promise = new Promise<Response<T>>((resolve, reject) => {
      let isAbort = false
      const fileSize = this.getBodySize(body)
      const headers = options ? options.headers : undefined

      const onProgress = (done: boolean) => {
        if (options && options.onProgress != null) {
          options.onProgress({
            total: fileSize,
            loaded: done ? fileSize : 0
          })
        }
      }

      const handleFail = (err: any) => {
        if (isAbort) return

        reject(err)
        onProgress(false)
      }

      const hanledSuccess = (res: any) => {
        if (isAbort) return

        resolve(res)
        onProgress(res)
      }

      // 微信小程序的 request 无法获取实时的进度
      // 为了优化用户体验、这里就 mock 了一下进度的效果
      const task = wx.request({
        url,
        method,
        headers,
        fail: handleFail,
        success: hanledSuccess
      });

      (promise as any).abort = () => {
        if (task != null) {
          // 阻止响应 hanledSuccess、handleFail
          isAbort = true
          task.abort()
        }
      }
    })

    return promise as unknown as NetworkPromise<Response<T>>
  }
}
