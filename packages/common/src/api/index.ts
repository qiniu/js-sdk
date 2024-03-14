import { Token } from '../types/token'
import { HttpRequestError } from '../types/error'
import { UploadBlob, UploadFile } from '../types/file'
import { urlSafeBase64Encode } from '../helper/base64'
import { removeUndefinedKeys } from '../helper/object'
import { Result, isSuccessResult } from '../types/types'
import { HttpAbort, HttpClient, HttpFormData, HttpHeader, HttpResponse, OnHttpProgress } from '../types/http'

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
  part: UploadBlob
  partIndex: number
  md5?: string
  key?: string
}

interface ListPartsParams extends BasicWithAuthParams {
  uploadId: string
  bucket: string
  key?: string
}

export interface UploadedPart extends PartMeta {
  size: number
  putTime: number
}

interface ListPartsData {
  uploadId: string
  expireAt: number
  partNumberMarker: number
  parts: UploadedPart[] | null
}

export interface PartMeta {
  etag: string
  partNumber: number
}

interface CompleteMultipartUploadParams extends BasicWithAuthParams {
  key?: string
  fileName: string
  uploadId: string
  parts: PartMeta[]
  mimeType?: string
  metadata?: Record<string, string>
  customVars?: Record<string, string>
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

interface MkblkParams extends BasicWithAuthParams {
  // 第一个块的二进制内容
  firstChunkBinary: UploadBlob
}

export interface MkblkData {
  ctx: string
  checksum: string
  crc32: number
  offset: number
  host: string
  expired_at: number
}

interface MkfileParams extends BasicWithAuthParams {
  fileSize: number // 资源文件大小，单位字节。
  key?: string // 进行URL 安全的 Base64 编码后的资源名。若未指定，则使用saveKey；若未指定 saveKey，则使用资源内容的 SHA1 值作为资源名。
  fname?: string // 进行URL安全的Base64编码后的文件名称。若未指定，则魔法变量中无法使用fname, ext, fprefix。
  mimeType?: string // 进行URL 安全的 Base64 编码后的文件 mimeType。若未指定，则根据文件内容自动检测 mimeType。
  userVars?: Record<string, string> // 指定自定义变量，进行URL 安全的 Base64 编码后的 user-var。
  lastCtxOfBlock: string[]
}

interface DirectUploadParams extends BasicWithAuthParams {
  file: UploadFile
  fileName: string
  key?: string
  crc32?: string
  metadata?: Record<string, string>
  customVars?: Record<string, string>
}

async function parseResponseJson<T>(response: HttpResponse): Promise<Result<T>> {
  let parsedData: T | undefined
  try {
    parsedData = JSON.parse(response.data || '')
  } catch (error) {
    const message = `Bad response data, cannot be parsed: ${response.data}`
    return { error: new HttpRequestError(response.code, message) }
  }

  return { result: parsedData as T }
}

async function handleResponseError<T>(response: HttpResponse): Promise<Result<T>> {
  if (response.code === 404) {
    const message = 'Invalid apiServerUrl: the URL is wrong or the storage cluster version is not supported.'
    return { error: new HttpRequestError(response.code, message, '') }
  }

  // 错误接口格式
  interface ApiError {
    error: string
  }

  let responseData: ApiError | T | undefined
  try {
    responseData = JSON.parse(response.data || '')
  } catch (error) {
    const message = `Bad response data, cannot be parsed: ${response.data}`
    return { error: new HttpRequestError(response.code, message, response.reqId) }
  }

  if (responseData !== null && typeof responseData === 'object' && 'error' in responseData) {
    return { error: new HttpRequestError(response.code, responseData.error, response.reqId) }
  }

  const message = `Unknown response error: ${response.data}`
  return { error: new HttpRequestError(response.code, message, response.reqId) }
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

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return parseResponseJson<InitPartsUploadData>(response.result)
  }

  // v2 接口

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

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return parseResponseJson<UploadChunkData>(response.result)
  }

  async listParts(params: ListPartsParams): Promise<Result<ListPartsData>> {
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

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return parseResponseJson<ListPartsData>(response.result)
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

    if (params.customVars) {
      body.customVars = {} as Record<string, unknown>
      for (const [key, value] of Object.entries(params.customVars)) {
        body.customVars[`x:${key}`] = value
      }
    }

    if (params.metadata) {
      body.metadata = {} as Record<string, unknown>
      for (const [key, value] of Object.entries(params.metadata)) {
        body.metadata[`x-qn-meta-${key}`] = value
      }
    }

    const response = await this.httpClient.post(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress,
      body: removeUndefinedKeys(body)
    })

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return { result: response.result.data }
  }

  async abortMultipartUpload(params: AbortMultipartUploadParams): Promise<Result<string>> {
    const requestPathResult = await this.getBaseRequestPath(params)
    if (!isSuccessResult(requestPathResult)) return requestPathResult

    const url = `${requestPathResult.result}/${params.uploadId}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/json'

    const response = await this.httpClient.delete(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress
    })

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return { result: response.result.data }
  }

  // v1 接口

  async mkblk(params: MkblkParams): Promise<Result<MkblkData>> {
    const blobSize = params.firstChunkBinary.size()
    const url = `${params.uploadHostUrl}/mkblk/${blobSize}`
    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'application/octet-stream'

    const response = await this.httpClient.post(url, {
      headers,
      abort: params.abort,
      body: params.firstChunkBinary,
      onProgress: params.onProgress
    })

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return parseResponseJson<MkblkData>(response.result)
  }

  async mkfile(params: MkfileParams): Promise<Result<string>> {
    let url = `${params.uploadHostUrl}/mkfile/${params.fileSize}`

    if (params.key) {
      url += `/key/${urlSafeBase64Encode(params.key)}`
    }

    if (params.fname) {
      url += `/fname/${urlSafeBase64Encode(params.fname)}`
    }

    if (params.mimeType) {
      url += `/mimeType/${urlSafeBase64Encode(params.mimeType)}`
    }

    if (params.userVars && Array.isArray(params.userVars)) {
      for (const [key, value] of Object.entries(params.userVars)) {
        url += `/x:${key}/${value}`
      }
    }

    const headers = this.generateAuthHeaders(params.token.signature)
    headers['content-type'] = 'text/plain'

    const response = await this.httpClient.post(url, {
      headers,
      abort: params.abort,
      onProgress: params.onProgress,
      body: params.lastCtxOfBlock.join(',')
    })

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return { result: response.result.data }
  }

  //  直传接口

  async directUpload<T>(params: DirectUploadParams): Promise<Result<string>> {
    const formData = new HttpFormData()
    formData.set('token', params.token.signature)
    if (params.key !== undefined) formData.set('key', params.key)
    if (params.crc32 !== undefined) formData.set('crc32', params.crc32)
    if (params.file !== undefined) formData.set('file', params.file, params.fileName)

    if (params.customVars) {
      for (const [key, value] of Object.entries(params.customVars)) {
        formData.set(`x:${key}`, value)
      }
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        formData.set(`x-qn-meta-${key}`, value)
      }
    }

    const headers = { 'content-type': 'multipart/form-data' }
    const response = await this.httpClient.post(params.uploadHostUrl, {
      headers,
      body: formData,
      abort: params.abort,
      onProgress: params.onProgress
    })

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return { result: response.result.data }
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

    if (!isSuccessResult(response)) {
      return response
    }

    if (response.result.code !== 200) {
      return handleResponseError(response.result)
    }

    return parseResponseJson<HostConfig>(response.result)
  }
}
