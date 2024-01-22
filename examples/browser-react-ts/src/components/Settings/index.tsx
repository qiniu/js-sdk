import * as React from 'react'
import * as utils from '../../utils'

import { Checkbox, Input } from '../Input'
import classnames from './style.less'

interface IProps {}

export function Settings(props: IProps) {
  const setting = React.useMemo(() => utils.loadSetting(), [])

  const [assessKey, setAssessKey] = React.useState<string>(setting.assessKey || '')
  const [secretKey, setSecretKey] = React.useState<string>(setting.secretKey || '')
  const [bucketName, setBucketName] = React.useState<string>(setting.bucketName || '')
  const [useDirect, setDirect] = React.useState<boolean>(setting.forceDirect || false)
  const [useWebWorker, setUseWebWorker] = React.useState<boolean>(setting.useWebWorker || false)
  const [apiServer, seApiServer] = React.useState<string>(setting.server || 'https://api.qiniu.com')

  utils.saveSetting({
    assessKey,
    secretKey,
    bucketName,
    server: apiServer,
    forceDirect: useDirect,
    useWebWorker: useWebWorker
  })

  return (
    <div className={classnames.settings}>
      <div className={classnames.content}>
        <span>
          <span className={classnames.title}>server：</span>
          <Input value={apiServer} onChange={v => seApiServer(v)} placeholder="服务地址" />
        </span>
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
          <span className={classnames.title}>webWorker：</span>
          <span>
            <Checkbox value={useWebWorker} onChange={v => setUseWebWorker(v)} />
          </span>
        </span>
        <span>
          <span className={classnames.title}>强制直传：</span>
          <span>
            <Checkbox value={useDirect} onChange={v => setDirect(v)} />
          </span>
        </span>
      </div>
    </div>
  )
}
