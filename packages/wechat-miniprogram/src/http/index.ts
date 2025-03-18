import * as common from '../@internal'
import { UploadFile, isUploadBlob, isUploadFile } from '../file'
import { HttpResponse, MockProgress, UploadError, isHttpFormData, isSuccessResult } from '../@internal'

interface RequestOptions extends common.HttpClientOptions {
  method: common.HttpMethod
}

function shouldUseUploadFile(option?: RequestOptions): boolean {
  if (option?.method !== 'POST') return false
  if (!isHttpFormData(option.body)) return false

  const files = option.body.entries().filter(([_, value]) => isUploadFile(value))
  return files.length > 0
}

export class WxHttpClient implements common.HttpClient {
  async request(url: string, options?: RequestOptions): Promise<common.Result<HttpResponse>> {
    if (shouldUseUploadFile(options)) {
      let fileKey: string | null = null
      let fileData: UploadFile | null = null
      const formData: Record<string, any> = {}
      const bodyEntries = (options!.body as common.HttpFormData).entries()

      for (const [key, value] of bodyEntries) {
        if (isUploadFile(value)) {
          fileKey = key
          fileData = value
        } else {
          formData[key] = value
        }
      }

      // 删除 content-type，让 wx 自动填充
      const header = { ...options?.headers }
      for (const key in header) {
        if (Object.prototype.hasOwnProperty.call(header, key)) {
          if (key.toLowerCase() === 'content-type') {
            delete header[key]
          }
        }
      }

      const filePathResult = await fileData!.path()
      if (!isSuccessResult(filePathResult)) return filePathResult
      return new Promise(resolve => {
        const uploadTask = wx.uploadFile({
          url,
          header,
          formData,
          name: fileKey!,
          filePath: filePathResult.result,
          success: response => resolve({
            result: {
              code: response.statusCode,
              data: response.data as string,
              reqId: 'WeChat UploadFile api cannot get this value'
            }
          }),
          fail: error => {
            if (options?.abort?.aborted || error.errMsg.includes('abort')) {
              return resolve({ canceled: true })
            }

            resolve({ error: new UploadError('NetworkError', error.errMsg) })
          }
        })

        if (options?.abort) {
          if (options.abort.aborted) uploadTask.abort()
          options.abort.onAbort(() => uploadTask.abort())
        }

        if (options?.onProgress) {
          const onProgress = options?.onProgress
          uploadTask.onProgressUpdate(data => {
            onProgress({ percent: data.progress / 100 })
          })
        }
      })
    }

    let estimatedTime = 5 // 预估耗时默认为 5s
    let normalizedBody: string | ArrayBuffer | AnyObject | undefined = options?.body as any

    // 如果 body 是文件，则直接读取 arrayBuffer 去发送请求
    if (isUploadFile(options?.body) || isUploadBlob(options?.body)) {
      const arrayBufferResult = await options!.body.readAsArrayBuffer()
      if (!isSuccessResult(arrayBufferResult)) return arrayBufferResult
      // 根据文件大小估计重新预估一个时间
      estimatedTime = Math.max(1, (arrayBufferResult.result.byteLength / (1024 ** 2)))
      normalizedBody = arrayBufferResult.result
    }

    const mockProgress = new MockProgress(estimatedTime)

    if (options?.onProgress) {
      const onProgress = options.onProgress
      mockProgress.onProgress(progress => {
        onProgress({ percent: progress })
      })
    }

    return new Promise(resolve => {
      mockProgress.start()
      const request = wx.request({
        url,
        dataType: '其他', // 强制返回 string 类型
        data: normalizedBody,
        method: options?.method,
        header: options?.headers,
        success: response => {
          mockProgress.end()
          return resolve({
            result: {
              code: response.statusCode,
              data: response.data as string,
              reqId: response.header['X-Reqid']
            }
          })
        },
        fail: error => {
          mockProgress.stop()
          if (options?.abort?.aborted && error.errMsg.includes('abort')) {
            return resolve({ canceled: true })
          }
          resolve({ error: new UploadError('NetworkError', error.errMsg) })
        }
      })
      if (options?.abort) {
        options.abort.onAbort(() => request.abort())
      }
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
