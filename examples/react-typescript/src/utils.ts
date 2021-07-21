export interface SettingsData {
  assessKey?: string
  secretKey?: string
  bucketName?: string
  deadline?: number
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
