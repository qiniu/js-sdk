import { stringify } from 'querystring'

import { normalizeUploadConfig } from '../utils'
import { Config, InternalConfig, UploadInfo } from '../upload'
import * as utils from '../utils'
import { network } from 'network'
import { NetworkPromise, RequestOptions, Response } from 'network/interface'

interface UpHosts {
  data: {
    up: {
      acc: {
        main: string[]
        backup: string[]
      }
    }
  }
}

export async function getUpHosts(accessKey: string, bucketName: string, protocol: InternalConfig['upprotocol']): Promise<UpHosts> {
  const params = stringify({ ak: accessKey, bucket: bucketName })
  const url = `${protocol}://api.qiniu.com/v2/query?${params}`
  return network.get(url)
}

/**
 * @param bucket 空间名
 * @param key 目标文件名
 * @param uploadInfo 上传信息
 */
function getBaseUrl(bucket: string, key: string | null | undefined, uploadInfo: UploadInfo) {
  const { url, id } = uploadInfo
  return `${url}/buckets/${bucket}/objects/${key != null ? utils.urlSafeBase64Encode(key) : '~'}/uploads/${id}`
}

export interface InitPartsData {
  /** 该文件的上传 id， 后续该文件其他各个块的上传，已上传块的废弃，已上传块的合成文件，都需要该 id */
  uploadId: string
  /** uploadId 的过期时间 */
  expireAt: number
}

/**
 * @param token 上传鉴权凭证
 * @param bucket 上传空间
 * @param key 目标文件名
 * @param uploadUrl 上传地址
 */
export function initUploadParts(
  token: string,
  bucket: string,
  key: string | null | undefined,
  uploadUrl: string
) {
  const url = `${uploadUrl}/buckets/${bucket}/objects/${key != null ? utils.urlSafeBase64Encode(key) : '~'}/uploads`
  return network.post(url, undefined, { headers: utils.getAuthHeaders(token) })
}

export interface UploadChunkData {
  etag: string
  md5: string
}

/**
 * @param token 上传鉴权凭证
 * @param index 当前 chunk 的索引
 * @param uploadInfo 上传信息
 * @param options 请求参数
 */
export function uploadChunk(data: {
  token: string,
  index: number,
  key: string | null | undefined,
  uploadInfo: UploadInfo,
  chunk: Blob,
  options: Partial<RequestOptions & { md5: string }>
}): NetworkPromise<Response<UploadChunkData>> {
  const { key, token, index, chunk, options, uploadInfo } = data

  const { md5, ...rest } = options
  const bucket = utils.getPutPolicy(token).bucketName
  const url = getBaseUrl(bucket, key, uploadInfo) + `/${index}`

  const headers = utils.getHeadersForChunkUpload(token)
  if (md5) headers['Content-MD5'] = options.md5
  return network.put(url, chunk, { ...rest, headers })
}

export type UploadCompleteData = any

/**
 * @param token 上传鉴权凭证
 * @param key 目标文件名
 * @param uploadInfo 上传信息
 * @param options 请求参数
 */
export function uploadComplete(
  token: string,
  key: string | null | undefined,
  uploadInfo: UploadInfo,
  options: Partial<RequestOptions>
) {
  const bucket = utils.getPutPolicy(token).bucketName
  const url = getBaseUrl(bucket, key, uploadInfo)
  return network.post(url, undefined, { headers: utils.getHeadersForMkFile(token) })
}

/**
 * @param token 上传鉴权凭证
 * @param key 目标文件名
 * @param uploadInfo 上传信息
 */
export function deleteUploadedChunks(
  token: string,
  key: string | null | undefined,
  uploadinfo: UploadInfo
) {
  const bucket = utils.getPutPolicy(token).bucketName
  const url = getBaseUrl(bucket, key, uploadinfo)
  return network.delete(url, { headers: utils.getAuthHeaders(token) })
}

/**
 * @param  {string} url
 * @param  {FormData} data
 * @param  {Partial<utils.RequestOptions>} options
 * @returns Promise
 * @description 直传接口
 */
export function direct(
  url: string,
  data: FormData,
  options: RequestOptions
) {
  return network.post(url, data, options)
}

export type UploadUrlConfig = Partial<Pick<Config, 'upprotocol' | 'uphost' | 'region' | 'useCdnDomain'>>

/**
 * @param  {UploadUrlConfig} config
 * @param  {string} token
 * @returns Promise
 * @description 获取上传 url
 */
export async function getUploadUrl(_config: UploadUrlConfig, token: string): Promise<string> {
  const config = normalizeUploadConfig(_config)
  const protocol = config.upprotocol

  if (config.uphost.length > 0) {
    return `${protocol}://${config.uphost[0]}`
  }
  const putPolicy = utils.getPutPolicy(token)
  const res = await getUpHosts(putPolicy.assessKey, putPolicy.bucketName, protocol)
  const hosts = res.data.up.acc.main
  return `${protocol}://${hosts[0]}`
}
