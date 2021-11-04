import * as React from 'react'
import * as utils from '../../utils'

import { Input } from '../Input'
import classnames from './style.less'

interface IProps { }

export function Settings(props: IProps) {
  const setting = React.useMemo(() => utils.loadSetting(), [])
  const [uphost, seUphost] = React.useState<string | undefined>(setting.uphost)
  const [deadline, setDeadline] = React.useState<number>(setting.deadline || 3600)
  const [assessKey, setAssessKey] = React.useState<string | undefined>(setting.assessKey)
  const [secretKey, setSecretKey] = React.useState<string | undefined>(setting.secretKey)
  const [bucketName, setBucketName] = React.useState<string | undefined>(setting.bucketName)

  React.useEffect(() => {
    utils.saveSetting({
      assessKey,
      secretKey,
      bucketName,
      deadline,
      uphost
    })
  }, [assessKey, secretKey, bucketName, deadline, uphost])

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
