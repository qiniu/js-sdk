import { Token } from '../types/token'
import { IBlob, IFile } from '../types/file'
import { urlSafeBase64Encode } from '../helper/base64'
import { removeUndefinedKeys } from '../helper/object'
import { Result, isSuccessResult } from '../types/types'
import { HttpAbort, HttpClient, HttpHeader, OnHttpProgress } from '../types/http'

interface BasicParams {
  abort?: HttpAbort
  onProgress?: OnHttpProgress
}

interface BasicWithAuthParams extends BasicParams {
  token: Token
  uploadHostUrl: string
}

interface DirectUploadParams extends BasicWithAuthParams {
}

interface InitMultipartUploadParams extends BasicWithAuthParams {
  key?: string
  bucket: string
}

interface UploadPartParams extends BasicWithAuthParams {
  bucket: string
  uploadId: string
  part: IBlob
  partIndex: number
  md5?: string
  key?: string
}

interface ListMultipartUploadPartsParams extends BasicWithAuthParams {
  uploadId: string
  bucket: string
  key?: string
}

interface ListUploadPartsData {
  uploadId: string
  expireAt: number
  partNumberMarker: number
  parts: Array<{
    Etag: string
    Size: number
    PutTime: number
    PartNumber: number
  }>
}

export interface PartMeta {
  etag: string
  partNumber: number
}

interface CompleteMultipartUploadParams extends BasicWithAuthParams {
  fileName: string
  uploadId: string
  parts: PartMeta[]
  mimeType?: string
  meta?: Record<string, string>
  customVar?: Record<string, string>
}

interface AbortMultipartUploadParams extends BasicWithAuthParams {
  uploadId: string
  key?: string
}

interface UploadChunkData {
  etag: string
  md5: string
}

export interface InitPartsUploadData {
  /** 该文件的上传 id， 后续该文件其他各个块的上传，已上传块的废弃，已上传块的合成文件，都需要该 id */
  uploadId: string
  /** uploadId 的过期时间 */
  expireAt: number
}

interface GetChunkRequestPathParams extends BasicWithAuthParams {
  key?: string
}

interface DirectUploadParams extends BasicWithAuthParams {
  file: IFile
  fileName: string
  key?: string
  crc32?: string
  meta?: Record<string, string>
  customVar?: Record<string, string>
}

export class UploadApis {
  constructor(
    /** http 请求客户端；通过实现不同的 HttpClient 来实现多环境支持 */
    private httpClient: HttpClient
  ) {}

  private generateAuthHeaders(token: string): HttpHeader {
    const auth = 'UpToken ' + token
    return { Authorization: auth }
  }

  private async getBaseRequestPath(params: GetChunkRequestPathParams): Promise<Result<string>> {
    const realKey = params.key != null ? urlSafeBase64Encode(params.key) : '~'
    const url = `${params.uploadHostUrl}/buckets/${params.token.bucket}/objects/${realKey}/uploads`
    return { result: url }
  }

  async initMultipartUpload(params: InitMultipartUploadParams): Promise<Result<InitPartsUploadData>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/json'
    const response = await this.httpClient.post(requestPathResult.result, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress
    })

    if (!isSuccessResult(response)) return response
    return { result: JSON.parse(response.result) }
  }

  async uploadPart(params: UploadPartParams): Promise<Result<UploadChunkData>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult

    const url = `${requestPathResult.result}/${params.uploadId}/${params.partIndex}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/octet-stream' // 固定为此值
    if (params.md5) headers['Content-MD5'] = params.md5

    const response = await this.httpClient.put(url, {
      onProgress: params.onProgress,
      abort: params.abort,
      body: params.part,
      headers
    })
    if (!isSuccessResult(response)) return response
    return { result: JSON.parse(response.result) }
  }

  async listUploadParts(params: ListMultipartUploadPartsParams): Promise<Result<ListUploadPartsData>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult

    const url = `${requestPathResult.result}/${params.uploadId}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/json'
    const response = await this.httpClient.get(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress
    })
    if (!isSuccessResult(response)) return response
    return { result: JSON.parse(response.result) }
  }

  async completeMultipartUpload(params: CompleteMultipartUploadParams): Promise<Result<string>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult

    const url = `${requestPathResult.result}/${params.uploadId}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/json' // 固定为改值

    const body: Record<string, any> = {
      parts: params.parts,
      fname: params.fileName,
      mimeType: params.mimeType
    }

    if (params.customVar) {
      body.customVars = {} as Record<string, unknown>
      for (const [key, value] of Object.entries(params.customVar)) {
        body.customVars[`x:${key}`] = value
      }
    }

    if (params.meta) {
      body.metadata = {} as Record<string, unknown>
      for (const [key, value] of Object.entries(params.meta)) {
        body.metadata[`x-qn-meta-${key}`] = value
      }
    }

    return this.httpClient.post(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress,
      body: removeUndefinedKeys(body)
    })
  }

  async abortMultipartUpload(params: AbortMultipartUploadParams): Promise<Result<string>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult

    const url = `${requestPathResult.result}/${params.uploadId}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/json'
    return this.httpClient.delete(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress
    })
  }

  async directUpload<T>(params: DirectUploadParams): Promise<Result<string>> {
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'multipart/form-data'

    const body: Record<string, unknown> = {
      token: params.token.signature,

      key: params.key,
      file: params.file,
      crc32: params.crc32
    }

    if (params.customVar) {
      for (const [key, value] of Object.entries(params.customVar)) {
        body[`x:${key}`] = value
      }
    }

    if (params.meta) {
      for (const [key, value] of Object.entries(params.meta)) {
        body[`x-qn-meta-${key}`] = value
      }
    }

    return this.httpClient.post(params.uploadHostUrl, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress,
      body: removeUndefinedKeys(body)
    })
  }
}

interface GetHostConfigParams {
  assessKey: string
  bucket: string
}

interface HostConfig {
  hosts: Array<{
    region: string
    ttl: number
    up: {
      domains: string[]
      old: string[]
    }
    io: {
      domains: string[]
      old: string[]
    }
    io_src: {
      domains: string[]
    }
    s3: {
      region_alias: string
      domains: string[]
    }
  }>
}

export class ConfigApis {
  constructor(
    /** 配置中心的服务地址 */
    private serverUrl: string,
    /** http 请求客户端；通过实现不同的 HttpClient 来实现多环境支持 */
    private httpClient: HttpClient
  ) {}

  /** 从服务中心获取接口服务地址 */
  async getHostConfig(params: GetHostConfigParams): Promise<Result<HostConfig>> {
    /** 从配置中心获取上传服务地址 */
    const query = `ak=${encodeURIComponent(params.assessKey)}&bucket=${encodeURIComponent(params.bucket)}`
    // TODO: 支持设置，私有云自动获取上传地址
    const url = `${this.serverUrl}/v4/query?${query}`
    const response = await this.httpClient.get(url)
    if (!isSuccessResult(response)) return response
    return { result: JSON.parse(response.result) }
  }
}
