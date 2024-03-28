import http from '@ohos.net.http'
import requestApi from '@ohos.request'
import ohCommon from '@ohos.app.ability.common'

import * as common from '../@internal'
import { isInternalUploadFile, isInternalUploadBlob } from '../file'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

function parseHeader(header: string): {
  statusCode: number
  header: common.HttpHeader
} {

  const newHeader: common.HttpHeader = {}
  const delimiter = '\r\n'
  const [first, ...lines] = header.split(delimiter).filter(v => v !== '')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const [key, value] = line.split(':')
    newHeader[key] = value.trim()
  }

  return {
    // HTTP/1.1 200 OK
    statusCode: parseInt(first.split(' ')[1], 10),
    header: newHeader
  }
}

function transformRequestMethod(method: common.HttpMethod): http.RequestMethod {
  if (method === 'PUT') return http.RequestMethod.PUT
  if (method === 'GET') return http.RequestMethod.GET
  if (method === 'POST') return http.RequestMethod.POST
  if (method === 'DELETE') return http.RequestMethod.DELETE
}

function shouldUseUploadFile(option: RequestOptions): boolean {
  if (option?.method !== 'POST') return false
  if (!common.isHttpFormData(option.body)) return false

  const files = option.body.entries().filter(([_, value]) => isInternalUploadFile(value))
  return files.length > 0
}

export class HttpClient implements HttpClient {
  constructor(private context: ohCommon.BaseContext) {}

  private async request(url: string, options: RequestOptions): Promise<common.Result<common.HttpResponse>> {
    // 使用 requestApi 接口发送请求
    if (shouldUseUploadFile(options)) {
      if (!canIUse('SystemCapability.MiscServices.Upload')) {
        return { error: new common.UploadError('NetworkError', 'The current system api version does not support') }
      }

      const files: requestApi.File[] = []
      const formData: requestApi.RequestData[] = []
      const bodyEntries = (options.body as common.HttpFormData).entries()

      for (const [key, value] of bodyEntries) {
        if (isInternalUploadFile(value)) {
          const nameResult = await value.name()
          if (!common.isSuccessResult(nameResult)) return nameResult

          const mimeTypeResult = await value.mimeType()
          if (!common.isSuccessResult(mimeTypeResult)) return mimeTypeResult

          const pathResult = await value.path()
          if (!common.isSuccessResult(pathResult)) return pathResult

          files.push({
            name: key, // 表单的 key
            uri: pathResult.result,
            type: mimeTypeResult.result || '',
            filename: nameResult.result || '',
          })
        } else {
          formData.push({ name: key, value: String(value) })
        }
      }

      return new Promise(resolve => {
        const uploadFileOptions: requestApi.UploadConfig = {
          files,
          data: formData,
          url: url.toLowerCase(),
          method: options.method,
          header: options.headers
        }

        try {
          requestApi.uploadFile(this.context, common.removeUndefinedKeys(uploadFileOptions))
            .then(task => {
              if (options.abort) {
                options.abort.onAbort(() => task.delete())
              }

              if (options.onProgress) {
                const onProgress = options.onProgress
                task.on('progress', (uploadedSize, totalSize) => (
                  onProgress({ percent: uploadedSize / totalSize })
                ))
              }

              let responseCode: number = 0
              let responseHeader: common.HttpHeader = {}
              task.on('headerReceive', header => {
                if (typeof header === 'string') {
                  const data = parseHeader(header)
                  responseCode = data.statusCode
                  header = data.header
                }
              })


              task.on('complete', () => {
                return resolve({
                  result: {
                    data: '', // TODO: 暂时不支持读取 body，next 版本将会支持
                    code: responseCode,
                    reqId: responseHeader['X-Reqid']
                  }
                })
              })

              task.on('fail', stats => {
                return resolve({
                  error: new common.UploadError('HttpRequestError', stats[0]?.message)
                })
              })
            })
            .catch(error => {
              return resolve({
                error: new common.UploadError('HttpRequestError', error.errMsg)
              })
            })
        } catch (error) {
          return resolve({
            error: new common.UploadError('HttpRequestError', error.message)
          })
        }
      })
    }

    if (!canIUse('SystemCapability.Communication.NetStack')) {
      return { error: new common.UploadError('NetworkError', 'The current system api version does not support') }
    }

    let estimatedTime = 5 // 预估耗时默认为 5s
    let normalizedBody: string | ArrayBuffer | Object | undefined = options?.body as any

    // 如果 body 是文件，则直接读取 arrayBuffer 去发送请求
    if (isInternalUploadFile(options?.body) || isInternalUploadBlob(options?.body)) {
      const arrayBufferResult = await options!.body.readAsArrayBuffer()
      if (!common.isSuccessResult(arrayBufferResult)) return arrayBufferResult
      // 根据文件大小估计重新预估一个时间
      estimatedTime = Math.max(1, (arrayBufferResult.result.byteLength / (1024 ** 2)))
      normalizedBody = arrayBufferResult.result
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
      const httpOptions: http.HttpRequestOptions = {
        usingCache: false,
        header: options.headers,
        extraData: normalizedBody,
        method: transformRequestMethod(options.method),
        expectDataType: http.HttpDataType.STRING // 强制返回字符串
      }

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
