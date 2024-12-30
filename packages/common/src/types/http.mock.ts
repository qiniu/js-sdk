import { HttpClient, HttpClientOptions, HttpResponse } from './http'
import { Result } from './types'

export class MockHttpClient implements HttpClient {
  get = jest.fn<Promise<Result<HttpResponse>>, [string, HttpClientOptions | undefined]>()
  put = jest.fn<Promise<Result<HttpResponse>>, [string, HttpClientOptions | undefined]>()
  post = jest.fn<Promise<Result<HttpResponse>>, [string, HttpClientOptions | undefined]>()
  delete = jest.fn<Promise<Result<HttpResponse>>, [string, HttpClientOptions | undefined]>()
}
