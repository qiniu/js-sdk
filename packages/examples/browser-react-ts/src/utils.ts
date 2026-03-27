import { Base64 } from 'js-base64'
import * as createHmac from 'create-hmac'

export interface TokenOptions {
  assessKey?: string
  secretKey?: string
  bucketName?: string
  deadline?: number
}

function base64UrlSafeEncode(target: string): string {
  return target.replace(/\//g, '_').replace(/\+/g, '-')
}

export function generateUploadToken(options: Required<TokenOptions>) {
  const { deadline, bucketName, assessKey, secretKey } = options
  
  const hmacEncoder = createHmac('sha1', secretKey)
  const putPolicy = JSON.stringify({ scope: bucketName, deadline })
  const encodedPutPolicy = base64UrlSafeEncode(Base64.encode(putPolicy))
  const sign = base64UrlSafeEncode(hmacEncoder.update(encodedPutPolicy).digest('base64'))
  const token = `${assessKey}:${sign}:${encodedPutPolicy}`
  return token
}

export interface SettingsData extends TokenOptions {
  server?: string
  forceDirect?: boolean
  useWebWorker?: boolean
}

// 加载配置，此配置由 Setting 组件设置
export function loadSetting(): SettingsData {
  try {
    const data = localStorage.getItem('setting')
    if (data != null) return JSON.parse(data)
  } catch {
    // 解析失败或 localStorage 不可用
  }
  return {}
}

export function saveSetting(data: SettingsData) {
  try {
    localStorage.setItem('setting', JSON.stringify(data))
  } catch {
    // 无痕模式等场景下 setItem 可能抛错，避免拖垮整个 React 树
  }
}
