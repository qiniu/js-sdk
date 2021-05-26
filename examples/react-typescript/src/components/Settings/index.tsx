import * as React from 'react'

import { Input } from '../Input'
import classnames from './style.less'

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

interface IProps { }

export function Settings(_props: IProps) {
  const setting = React.useMemo(() => loadSetting(), [])
  const [uphost, seUphost] = React.useState<string | undefined>(setting.uphost)
  const [deadline, setDeadline] = React.useState<number>(setting.deadline || 3600)
  const [assessKey, setAssessKey] = React.useState<string | undefined>(setting.assessKey)
  const [secretKey, setSecretKey] = React.useState<string | undefined>(setting.secretKey)
  const [bucketName, setBucketName] = React.useState<string | undefined>(setting.bucketName)

  React.useEffect(() => {
    localStorage.setItem('setting', JSON.stringify({
      assessKey, secretKey, bucketName, deadline, uphost
    }))
  }, [assessKey, secretKey, bucketName, deadline, uphost])

  return (
    <div className={classnames.settings}>
      <div className={classnames.content}>
        <span>
          <span className={classnames.title}>assessKey：</span>
          <Input value={assessKey} onChange={setAssessKey} placeholder="请输入 assessKey" />
        </span>
        <span>
          <span className={classnames.title}>secretKey：</span>
          <Input value={secretKey} onChange={setSecretKey} placeholder="请输入 secretKey" />
        </span>
        <span>
          <span className={classnames.title}>bucketName：</span>
          <Input value={bucketName} onChange={setBucketName} placeholder="请输入 bucketName" />
        </span>
        <span>
          <span className={classnames.title}>uphost：</span>
          <Input value={uphost} onChange={seUphost} placeholder="可选，多个用 , 隔开" />
        </span>
        <span>
          <span className={classnames.title}>deadline：</span>
          <Input value={deadline + ''} onChange={v => setDeadline(Number(v) || 0)} placeholder="可选，请输入 deadline" />
        </span>
      </div>
    </div>
  )
}
