import * as React from 'react'

import { Item } from './item'

import classnames from './style.less'

interface IProps {
  fileList: UniqueFile[]
}

export function Queue(props: IProps) {
  return (
    <ul className={classnames.queue}>
      {props.fileList.map(uniqueFile => (
        <Item key={uniqueFile.key} file={uniqueFile.file} />
      ))}
    </ul>
  )
}
