import * as React from 'react'

import { Queue } from '../Queue'
import { Layout } from '../Layout'
import { Settings } from '../Settings'
import { SelectFile } from '../SelectFile'

import settingIcon from '../Settings/assets/setting.svg'
import classnames from './style.less'

export const App = () => {
  const [fileList, setFileList] = React.useState<UniqueFile[]>([])
  const [settingVisible, setSettingVisible] = React.useState(false)

  const selectFile = (file: UniqueFile) => {
    setFileList(files => [file, ...files])
  }

  const toggleSettingVisible = () => {
    setSettingVisible(!settingVisible)
  }

  const settingsClassName = React.useMemo(() => {
    const list = [classnames.setting]
    if (settingVisible) {
      list.push(classnames.show)
    } else {
      list.push(classnames.hidden)
    }
    return list.join(' ')
  }, [settingVisible])

  return (
    <Layout>
      <div className={classnames.content}>
        <SelectFile onFile={selectFile} />
        <div className={settingsClassName}>
          <Settings />
        </div>
        <img
          src={settingIcon}
          className={classnames.settingIcon}
          onClick={toggleSettingVisible}
        />
      </div>
      <Queue fileList={fileList} />
    </Layout>
  )
}
