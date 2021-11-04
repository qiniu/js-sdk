import * as React from 'react'
import type { UniqueFile } from '../SelectFile'

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
