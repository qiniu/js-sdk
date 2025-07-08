import * as React from 'react'

import * as utils from '../../utils'

import { Input } from '../Input'
import classnames from './style.less'

interface IProps { }

export function Settings(props: IProps) {
  const setting = React.useMemo(() => utils.loadSetting(), [])
  const [deadline, setDeadline] = React.useState<number>(0)
  const [uphost, seUphost] = React.useState<string>(setting.uphost || '')
  const [assessKey, setAssessKey] = React.useState<string>(setting.assessKey || '')
  const [secretKey, setSecretKey] = React.useState<string>(setting.secretKey || '')
  const [bucketName, setBucketName] = React.useState<string>(setting.bucketName || '')

  React.useEffect(() => {
    utils.saveSetting({
      assessKey,
      secretKey,
      bucketName,
      deadline,
      uphost
    })
  }, [assessKey, secretKey, bucketName, deadline, uphost])

  React.useEffect(() => {
    if (deadline > 0) return
    // 基于当前时间加上 3600s
    setDeadline(Math.floor(Date.now() / 1000) + 3600)
  }, [deadline])

  return (
    <div className={classnames.settings}>
      <div className={classnames.content}>
        <span>
          <span className={classnames.title}>assessKey：</span>
          <Input value={assessKey} onChange={v => setAssessKey(v)} placeholder="请输入 assessKey" />
        </span>
        <span>
          <span className={classnames.title}>secretKey：</span>
          <Input value={secretKey} onChange={v => setSecretKey(v)} placeholder="请输入 secretKey" />
        </span>
        <span>
          <span className={classnames.title}>bucketName：</span>
          <Input value={bucketName} onChange={v => setBucketName(v)} placeholder="请输入 bucketName" />
        </span>
        <span>
          <span className={classnames.title}>uphost：</span>
          <Input value={uphost} onChange={v => seUphost(v)} placeholder="可选，多个用 , 隔开" />
        </span>
        <span>
          <span className={classnames.title}>deadline：</span>
          <Input value={deadline + ''} onChange={v => setDeadline(+(v || 0))} placeholder="可选，请输入 deadline" />
        </span>
      </div>
    </div>
  )
}
