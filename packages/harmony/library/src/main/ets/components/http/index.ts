import http from '@ohos.net.http'
import requestApi from '@ohos.request'
import ohCommon from '@ohos.app.ability.common'

import * as common from '../@internal'
import { isInternalUploadFile, isInternalUploadBlob } from '../file'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

function transformRequestMethod(method: common.HttpMethod): http.RequestMethod {
  if (method === 'PUT') return http.RequestMethod.PUT
  if (method === 'GET') return http.RequestMethod.GET
  if (method === 'POST') return http.RequestMethod.POST
  if (method === 'DELETE') return http.RequestMethod.DELETE
}

function shouldUseFormUploadFile(option: RequestOptions): boolean {
  if (option?.method !== 'POST') return false
  if (!common.isHttpFormData(option.body)) return false

  const files = option.body.entries().filter(([_, value]) => isInternalUploadFile(value))
  return files.length > 0
}

export class HttpClient implements HttpClient {
  constructor(private context: ohCommon.BaseContext) {}

  private async request(url: string, options: RequestOptions): Promise<common.Result<common.HttpResponse>> {
    if (!canIUse('SystemCapability.Communication.NetStack')) {
      return { error: new common.UploadError('NetworkError', 'The current system api version does not support') }
    }

    const httpOptions: http.HttpRequestOptions = {
      usingCache: false,
      header: options.headers,
      extraData: options?.body,
      method: transformRequestMethod(options.method),
      expectDataType: http.HttpDataType.STRING // 强制返回字符串
    }

    // 表单
    if (shouldUseFormUploadFile(options)) {
      if (common.isHttpFormData(options.body)) {
        const formDataList: http.MultiFormData[] = []
        for await (const [key, value] of options.body.entries()) {
          if (isInternalUploadFile(value)) {
            const arrayBufferResult = await value.readAsArrayBuffer()
            if (!common.isSuccessResult(arrayBufferResult)) return arrayBufferResult

            const mimeTypeResult = await value.mimeType()
            if (!common.isSuccessResult(mimeTypeResult)) return mimeTypeResult

            const nameResult = await value.name()
            if (!common.isSuccessResult(nameResult)) return nameResult


            formDataList.push({
              name: key,
              data: arrayBufferResult.result,
              remoteFileName: nameResult.result,
              contentType: mimeTypeResult.result
            })
          } else {
            formDataList.push({
              name: key,
              data: value,
              contentType: ''
            })
          }
        }
        httpOptions.multiFormDataList = formDataList
      }
    }

    let estimatedTime = 5 // 预估耗时默认为 5s

    // 如果 body 是文件，则直接读取 arrayBuffer 去发送请求
    if (isInternalUploadFile(options?.body) || isInternalUploadBlob(options?.body)) {
      const arrayBufferResult = await options!.body.readAsArrayBuffer()
      if (!common.isSuccessResult(arrayBufferResult)) return arrayBufferResult
      // 根据文件大小估计重新预估一个时间
      estimatedTime = Math.max(1, (arrayBufferResult.result.byteLength / (1024 ** 2)))
      httpOptions.extraData = arrayBufferResult.result
    }

    const mockProgress = new common.MockProgress(estimatedTime)

    if (options?.onProgress) {
      const onProgress = options.onProgress
      mockProgress.onProgress(progress => {
        onProgress({ percent: progress })
      })
    }

    return new Promise(resolve => {
      mockProgress.start()
      const httpRequest = http.createHttp()

      if (options?.abort) {
        options.abort.onAbort(() => {
          mockProgress.stop()
          // TODO: destroy 调了没什么作用，所以这里是伪取消的设计
          httpRequest.destroy()
          resolve({ canceled: true })
        })

        if (options.abort.aborted) return resolve({ canceled: true })
      }

      try {
        httpRequest.request(url, common.removeUndefinedKeys(httpOptions))
          .then(response => {
            if (options.abort?.aborted) {
              // 已经取消了，丢弃结果
              return
            }

            mockProgress.end()
            return resolve({
              result: {
                code: response.responseCode,
                data: response.result as string,
                reqId: response.header?.['x-reqid']
              }
            })
          })
          .catch(error => {
            mockProgress.stop()
            if (options.abort?.aborted) {
              // 已经取消了，丢弃结果
              return
            }

            mockProgress.end()
            return resolve({
              error: new common.UploadError('HttpRequestError', error.errMsg)
            })
          })
      } catch (error) {
        if (options.abort?.aborted) {
          // 已经取消了，丢弃结果
          return
        }

        return resolve({
          error: new common.UploadError('HttpRequestError', error.errMsg)
        })
      }
    })
  }

  get(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<common.HttpResponse>> {
    return this.request(url, { method: 'GET', ...options })
  }
  put(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<common.HttpResponse>> {
    return this.request(url, { method: 'PUT', ...options })
  }
  post(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<common.HttpResponse>> {
    return this.request(url, { method: 'POST', ...options })
  }
  delete(url: string, options?: common.HttpClientOptions | undefined): Promise<common.Result<common.HttpResponse>> {
    return this.request(url, { method: 'DELETE', ...options })
  }
}
