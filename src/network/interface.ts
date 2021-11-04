export interface Progress {
  total: number
  loaded: number
}

export interface RequestOptions {
  timeout?: number
  headers?: Record<string, string>
  onProgress?: (data: Progress) => void

}

export interface Abort {
  abort: ()=> void
}

export interface Response<T = any> {
  data: T
  reqId: string
  status: number
}

export type Body = Blob | File | ArrayBuffer | FormData

export type NetworkPromise<T> = PromiseLike<T> & Abort

export abstract class NetworkClient {
  abstract get<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>>
  abstract delete<T>(url: string, options?: RequestOptions): NetworkPromise<Response<T>>
  abstract put<T>(url: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>>
  abstract post<T>(url: string, body?: Body, options?: RequestOptions): NetworkPromise<Response<T>>
}
