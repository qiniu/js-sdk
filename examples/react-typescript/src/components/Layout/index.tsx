import * as React from 'react'

import qiniuLogo from './assets/logo.svg'
import classnames from './style.less'

interface IProps { }

export function Layout(props: React.PropsWithChildren<IProps>) {
  return (
    <div className={classnames.layout}>
      <img width={80} height={80} src={qiniuLogo} />
      {props.children}
    </div>
  )
}
