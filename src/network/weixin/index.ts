import { NetworkClient, RequestOptions, Response, Body, NetworkPromise } from 'network'
import { QiniuError, QiniuErrorName, QiniuNetworkError, QiniuRequestError } from 'errors'

export class WeixinNetworkClient implements NetworkClient {
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

  private request<T>(url: string, method: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>> {
    const promise = new Promise<Response<T>>((resolve, reject) => {
      if (wx == null || wx.request == null) {
        return //
      }

      const headers = options ? options.headers : undefined

      // 微信小程序的 request 无法获取实时的进度
      // 为了优化用户体验、这里就 mock 了一下进度的效果
      const task = wx.request({
        url,
        method,
        headers
      });

      (promise as any).abort = () => {
        if (task != null) task.abort()
      }

      if (options?.onProgress != null) {
        //
      }

    })

    return promise as unknown as NetworkPromise<Response<T>>
  }
}
