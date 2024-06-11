import * as React from 'react'

import { Queue } from '../Queue'
import { Layout } from '../Layout'
import { Settings } from '../Settings'
import { SelectFile, UniqueFile } from '../SelectFile'

import classnames from './style.less'

export const App = () => {
  const [fileList, setFileList] = React.useState<UniqueFile[]>([])

  const selectFile = (file: UniqueFile) => {
    setFileList(files => [file, ...files])
  }

  return (
    <Layout>
      <div className={classnames.content}>
        <SelectFile onFile={selectFile} />
        <div className={classnames.setting}>
          <Settings />
        </div>
      </div>
      <Queue fileList={fileList} />
    </Layout>
  )
}
