import * as React from 'react'

import qiniuLogo from './assets/logo.svg'
import classnames from './style.less'

interface IProps { }

export function Layout(props: React.PropsWithChildren<IProps>) {
  return (
    <>
      <div className={classnames.layout}>
        <img width={80} height={80} src={qiniuLogo} />
        {props.children}
      </div>
      <footer className={classnames.footer}>
        对象存储文件上传 DEMO
        © {new Date().getFullYear()} <a href="https://www.qiniu.com/" rel="noopener" target="_blank" >七牛云</a>
      </footer>
    </>
  )
}
