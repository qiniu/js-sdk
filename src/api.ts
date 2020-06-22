import * as utils from './utils'
import { regionUphostMap } from './config'
import { urlSafeBase64Encode } from './base64'
import { Config, UploadInfo } from './upload'

interface UpHosts {
  data: {
    up: {
      acc: {
        main: string[]
      }
    }
  }
}

async function getUpHosts(token: string): Promise<UpHosts> {
  const putPolicy = utils.getPutPolicy(token)
  const url = utils.getAPIProtocol() + '//api.qiniu.com/v2/query?ak=' + putPolicy.ak + '&bucket=' + putPolicy.bucket
  return utils.request(url, { method: 'GET' })
}

/** 获取上传url */
export async function getUploadUrl(config: Config, token: string): Promise<string> {
  const protocol = utils.getAPIProtocol()

  if (config.uphost) {
    return `${protocol}//${config.uphost}`
  }

  if (config.region) {
    const upHosts = regionUphostMap[config.region]
    const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost
    return `${protocol}//${host}`
  }

  const res = await getUpHosts(token)
  const hosts = res.data.up.acc.main
  return `${protocol}//${hosts[0]}`
}

/**
 * @param bucket 空间名
 * @param key 目标文件名
 * @param uploadInfo 上传信息
 */
function getBaseUrl(bucket: string, key: string, uploadInfo: UploadInfo) {
  const { url, id } = uploadInfo
  return `${url}/buckets/${bucket}/objects/${urlSafeBase64Encode(key)}/uploads/${id}`
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
  key: string,
  uploadUrl: string
): utils.Response<InitPartsData> {
  const url = `${uploadUrl}/buckets/${bucket}/objects/${urlSafeBase64Encode(key)}/uploads`
  return utils.request<InitPartsData>(
    url,
    {
      method: 'POST',
      headers: utils.getAuthHeaders(token)
    }
  )
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
export function uploadChunk(
  token: string,
  key: string,
  index: number,
  uploadInfo: UploadInfo,
  options: Partial<utils.RequestOptions>
): utils.Response<UploadChunkData> {
  const bucket = utils.getPutPolicy(token).bucket
  const url = getBaseUrl(bucket, key, uploadInfo) + `/${index}`
  return utils.request<UploadChunkData>(url, {
    ...options,
    method: 'PUT',
    headers: utils.getHeadersForChunkUpload(token)
  })
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
  key: string,
  uploadInfo: UploadInfo,
  options: Partial<utils.RequestOptions>
): utils.Response<UploadCompleteData> {
  const bucket = utils.getPutPolicy(token).bucket
  const url = getBaseUrl(bucket, key, uploadInfo)
  return utils.request<UploadCompleteData>(url, {
    ...options,
    method: 'POST',
    headers: utils.getHeadersForMkFile(token)
  })
}

/**
 * @param token 上传鉴权凭证
 * @param key 目标文件名
 * @param uploadInfo 上传信息
 */
export function deleteUploadedChunks(
  token: string,
  key: string,
  uploadinfo: UploadInfo
): utils.Response<void> {
  const bucket = utils.getPutPolicy(token).bucket
  const url = getBaseUrl(bucket, key, uploadinfo)
  return utils.request(
    url,
    {
      method: 'DELETE',
      headers: utils.getAuthHeaders(token)
    }
  )
}
