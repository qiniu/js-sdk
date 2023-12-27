import type { Result } from './types'

export type HttpProgress = {
  percent: number
}

export interface HttpAbort {
  abort(): void
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

export interface HttpClient {
  get(url: string, options?: HttpClientOptions): Promise<Result<string>>
  put(url: string, options?: HttpClientOptions): Promise<Result<string>>
  post(url: string, options?: HttpClientOptions): Promise<Result<string>>
  delete(url: string, options?: HttpClientOptions): Promise<Result<string>>
}

export class HttpAbortController implements HttpAbort {
  private isAborted = false
  private listeners = new Array<() => void>()

  abort(): void {
    if (this.isAborted) return
    for (const listener of this.listeners) {
      listener()
    }
    this.isAborted = true
  }
  onAbort(callback: () => void): void {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback)
    }
  }
}
