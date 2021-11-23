import * as React from 'react'

import qiniuLogo from './assets/logo.svg'
import classnames from './style.less'


function OfficialSite() {
  return (
    <>
      © {new Date().getFullYear()} <a href="https://www.qiniu.com/" rel="noopener" target="_blank">七牛云</a>
    </>
  )
}

function OfficialDoc() {
  return (
    <a
      rel="noopener"
      target="_blank"
      href="http://developer.qiniu.com/code/v6/sdk/javascript.html"
    >
      官方文档
    </a>
  )
}

function Issue() {
  return (
    <a
      rel="noopener"
      target="_blank"
      href="https://github.com/qiniu/js-sdk/issues"
    >
      上报问题
    </a>
  )
}

function V2Link() {
  return (
    <a
      rel="noopener"
      target="_blank"
      href="http://jssdk-v2.demo.qiniu.io"
    >
      V2版本
    </a>
  )
}

interface IProps { }

export function Layout(props: React.PropsWithChildren<IProps>) {
  return (
    <>
      <div className={classnames.layout}>
        <img width={80} height={80} src={qiniuLogo} />
        {props.children}
      </div>
      <footer className={classnames.footer}>
        对象存储文件上传 DEMO <OfficialSite />
        <OfficialDoc />
        <Issue />
        <V2Link />
      </footer>
    </>
  )
}
