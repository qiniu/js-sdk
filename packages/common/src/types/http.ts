import type { Result } from './types'

export type HttpProgress = {
  percent: number
}

export interface HttpAbort {
  abort(): void
  aborted: boolean
  onAbort(callback: () => void): void
}

export type HttpRequestBody = unknown
export type HttpProtocol = 'HTTP' | 'HTTPS'
export type HttpHeader = Record<string, string>
export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE'
export type OnHttpProgress = (progress: HttpProgress) => void

export interface HttpClientOptions {
  abort?: HttpAbort
  onProgress?: OnHttpProgress
  headers?: HttpHeader
  body?: HttpRequestBody
}

export interface HttpResponse {
  code: number
  data: string
  // keep this optional even if added hijack error.
  // because there will be other errors, like network error,
  // that interrupts the request before got reqId of response.
  reqId?: string
}

export interface HttpClient {
  get(url: string, options?: HttpClientOptions): Promise<Result<HttpResponse>>
  put(url: string, options?: HttpClientOptions): Promise<Result<HttpResponse>>
  post(url: string, options?: HttpClientOptions): Promise<Result<HttpResponse>>
  delete(url: string, options?: HttpClientOptions): Promise<Result<HttpResponse>>
}

export class HttpAbortController implements HttpAbort {
  public aborted = false
  private listeners = new Array<() => void>()

  abort(): void {
    if (this.aborted) {
      return
    }
    this.aborted = true
    for (const listener of this.listeners) {
      listener()
    }
  }

  onAbort(callback: () => void): void {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback)
    }
  }
}

interface FormDataItem {
  value: any
  option?: any
}
export class HttpFormData {
  private value = new Map<string, FormDataItem>()

  set(key: string, value: any, option?: any) {
    this.value.set(key, { value, option })
  }

  get(key: string): FormDataItem | undefined {
    return this.value.get(key)
  }

  forEach(callback: (value: any, key?: string, option?: any) => void) {
    this.value.forEach((value, key) => callback(key, value.value, value.option))
  }

  entries(): Array<[string, any, any | undefined]> {
    const result: Array<[string, any, any | undefined]> = []
    this.forEach((key, value, option) => result.push([key, value, option]))
    return result
  }
}

export function isHttpFormData(data: any): data is HttpFormData {
  return data && data instanceof HttpFormData
}
