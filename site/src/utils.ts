import { Base64 } from 'js-base64'
import * as createHmac from 'create-hmac'

export interface TokenOptions {
  assessKey?: string
  secretKey?: string
  bucketName?: string
  deadline?: number
}

function base64UrlSafe(target: string): string {
  return target.replace(/\//g, '_').replace(/\+/g, '-')
}

export function generateUploadToken(options: Required<TokenOptions>) {
  const { deadline, bucketName, assessKey } = options
  const hmacEncoder = createHmac('sha1', options.secretKey)
  const putPolicy = JSON.stringify({ scope: bucketName, deadline })
  const encodedPutPolicy = base64UrlSafe(Base64.encode(putPolicy))
  const sign = hmacEncoder.update(encodedPutPolicy).digest('hex')
  const encodedSign = base64UrlSafe(Base64.encode(sign))

  return `${assessKey}:${encodedSign}:${encodedPutPolicy}`
}

export interface SettingsData extends TokenOptions {
  uphost?: string
}

// 加载配置、此配置由 Setting 组件设置
export function loadSetting(): SettingsData {
  const data = localStorage.getItem('setting')
  if (data != null) return JSON.parse(data)
  return {}
}

export function saveSetting(data: SettingsData) {
  localStorage.setItem('setting', JSON.stringify(data))
}
