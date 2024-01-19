import * as React from 'react'
import byteSize from 'byte-size'

import { Status, useUpload } from '../../upload'
import startIcon from './assets/start.svg'
import stopIcon from './assets/stop.svg'
import classnames from './style.less'
import { Progress } from 'qiniu-js'

type KeysOf<T> = T extends Record<infer R, any> ? R[] : string[]
function keysOf<T extends Record<string, any>>(data: T): KeysOf<T> {
  return Object.keys(data) as KeysOf<T>
}

function splitArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}


interface IProps {
  file: File
}

export function Item(props: IProps) {
  const {
    stop, start,
    state, error, progress, completeInfo
  } = useUpload(props.file)

  return (
    <div className={classnames.item}>
      <div className={classnames.content}>
        <div className={classnames.top}>
          <FileName fileName={props.file.name} />
          <div className={classnames.actions}>
            {(state != null && [Status.Processing].includes(state)) && (
              <img
                className={classnames.img}
                onClick={() => stop()}
                src={stopIcon}
                height="14"
                width="14"
              />
            )}
            {(state != null && [Status.Ready, Status.Finished].includes(state)) && (
              <img
                onClick={() => start()}
                className={classnames.img}
                src={startIcon}
                height="14"
                width="14"
              />
            )}
          </div>
        </div>
        <div className={classnames.down}>
          <ProgressBar progress={progress} />
        </div>
      </div>
      <ErrorView error={error} />
      <CompleteView completeInfo={completeInfo} />
    </div>
  )
}

// 文件名
function FileName(prop: { fileName: string }) {
  return (
    <span title={prop.fileName} className={classnames.fileName}>
      {prop.fileName}
    </span>
  )
}

// 上传速度
function Speed(props: { speed: number | null, peak: number | null }) {
  const render = (name: string, value: number) => (
    <span className={classnames.speedItem}>
      <span className={classnames.speedTitle}>{name}:</span>
      <span className={classnames.speedValue}>
        {byteSize(value || 0, { precision: 2 }).toString()}/s
      </span>
    </span>
  )

  return (
    <span className={classnames.speed}>
      {render('最大上传速度', props.peak || 0)}
      {render('实时平均速度', props.speed || 0)}
    </span>
  )
}

// 进度条
function ProgressBar(props: { progress: Partial<Progress> | null }) {
  if (props.progress == null) return null
  if (props.progress.details == null) return null

  interface Item {
    name: string
    percent: number
    fromCache?: boolean
  }

  const data: Item[] = []

  const {
    prepareUploadToken,
    prepareUploadHost,
    directUpload,
    initMultipartUpload,
    completeMultipartUpload,
    ...uploadParts
  } = props.progress.details

  if (prepareUploadToken) {
    data.push({
      name: '获取 token',
      percent: prepareUploadToken.percent,
      fromCache: prepareUploadToken.fromCache
    })
  }

  if (prepareUploadHost) {
    data.push({
      name: '查询上传路线',
      percent: prepareUploadHost.percent,
      fromCache: prepareUploadHost.fromCache
    })
  }

  if (directUpload) {
    data.push({
      name: '表单直传文件',
      percent: directUpload.percent,
      fromCache: directUpload.fromCache
    })
  }

  if (initMultipartUpload) {
    data.push({
      name: '初始化分片任务',
      percent: initMultipartUpload.percent,
      fromCache: initMultipartUpload.fromCache
    })
  }

  const multipartUploadKeys = keysOf(uploadParts)
    .filter(key => key.startsWith('multipartUpload'))
    .sort((a, b) => parseInt(a.split(':')[1]) - parseInt(b.split(':')[1]))

  for (const multipartUploadKey of multipartUploadKeys) {
    const index = multipartUploadKey.split(':')[1]
    data.push({
      name: `上传分片 ${index}`,
      percent: uploadParts[multipartUploadKey].percent,
      fromCache: uploadParts[multipartUploadKey].fromCache
    })
  }

  if (completeMultipartUpload) {
    data.push({
      name: '合并分片文件',
      percent: completeMultipartUpload.percent,
      fromCache: completeMultipartUpload.fromCache
    })
  }

  const rowSize = 4

  const renderGroup = (data: Item[], groupIndex: number) => {
    return (
      <ul key={groupIndex} className={classnames.progressBar}>
        {data.map((item, index) => {
          const cacheName = item.fromCache ? classnames.cachedChunk : ''
          return (
            <li key={index} className={classnames.expanded}>
              <div className={classnames.partName}>{item.name}</div>
              <span className={cacheName} style={{ width: (item.percent * 100) + '%' }}></span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <>
      {renderGroup([{ name: '总进度', percent: props.progress.percent || 0 }], 10000)}
      {splitArray(data, rowSize).map((item, index) => renderGroup(item, index))}
    </>
  )
}

// 错误信息
function ErrorView(props: { error: any }) {
  return (
    <div
      className={classnames.error}
      // eslint-disable-next-line no-console
      onClick={() => console.error(props.error)}
      style={props.error == null ? { height: 0, padding: 0 } : {}}
    >
      {props.error?.message || '发生未知错误！'}
    </div>
  )
}

// 完成信息
function CompleteView(props: { completeInfo: string | null }) {
  const getCompleteInfo = (): Record<string, string> => {
    if (props.completeInfo == null) {
      return {}
    }

    try {
      return JSON.parse(props.completeInfo)
    } catch {
      return { '无法解析的原始数据': props.completeInfo }
    }
  }

  const render = (key: string, value: any) => (
    <div key={key} className={classnames.completeItem}>
      <span className={classnames.key}>{key}:</span>
      <span className={classnames.value}>{value}</span>
    </div>
  )

  return (
    <div
      className={classnames.complete}
      // eslint-disable-next-line no-console
      onClick={() => console.log(props.completeInfo)}
      style={props.completeInfo == null ? { height: 0, padding: 0 } : {}}
    >
      {Object.entries(getCompleteInfo()).map(([key, value]) => render(key, value))}
    </div>
  )
}
