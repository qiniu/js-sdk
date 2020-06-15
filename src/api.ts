import * as utils from './utils'
import { regionUphostMap } from './config'
import { urlSafeBase64Encode } from './base64'
import { Config } from './upload'

interface UpHosts {
  data: {
    up: {
      acc: {
        main: string[]
      }
    }
  }
}

function getUpHosts(token: string): Promise<UpHosts> {
  try {
    const putPolicy = utils.getPutPolicy(token)
    const url = utils.getAPIProtocol() + '//api.qiniu.com/v2/query?ak=' + putPolicy.ak + '&bucket=' + putPolicy.bucket
    return utils.request(url, { method: 'GET' })
  } catch (e) {
    return Promise.reject(e)
  }
}

// 获取上传url
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

function getBaseUrl(
  bucket: string,
  key: string,
  uploadUrl: string,
  uploadId: string
) {
  return uploadUrl
  + `/buckets/${bucket}/objects/${urlSafeBase64Encode(key)}/uploads/${uploadId}`
}

export interface InitPartsData {
  uploadId: string // 该文件的上传 id， 后续该文件其他各个块的上传，已上传块的废弃，已上传块的合成文件，都需要该 id。
  expireAt: number // uploadId 的过期时间
}

export function initUploadParts(
  token: string,
  bucket: string,
  key: string,
  uploadUrl: string
): utils.Response<InitPartsData> {
  const url = uploadUrl + `/buckets/${bucket}/objects/${urlSafeBase64Encode(key)}/uploads`
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

export function uploadChunk(
  bucket: string,
  key: string,
  index: number,
  uploadUrl: string,
  uploadId: string,
  requestOptions: utils.RequestOptions
): utils.Response<UploadChunkData> {
  const url = getBaseUrl(bucket, key, uploadUrl, uploadId) + `/${index}`
  return utils.request<UploadChunkData>(url, requestOptions)
}

export interface UploadCompleteData {
  hash: string
  key: string
}

export function uploadComplete(
  bucket: string,
  key: string,
  uploadUrl: string,
  uploadId: string,
  requestOptions: utils.RequestOptions
): utils.Response<UploadCompleteData> {
  const url = getBaseUrl(bucket, key, uploadUrl, uploadId)
  return utils.request<UploadCompleteData>(url, requestOptions)
}

export function deleteUploadedChunks(
  token: string,
  bucket: string,
  key: string,
  uploadUrl: string,
  uploadId: string
): utils.Response {
  const url = getBaseUrl(uploadUrl, uploadId, bucket, key)
  return utils.request(
    url,
    {
      method: 'DELETE',
      headers: utils.getAuthHeaders(token)
    }
  )
}
