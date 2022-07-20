import { CRC32 } from '../utils/crc32'

import { direct } from '../api'

import Base from './base'

export default class Direct extends Base {

  protected async run() {
    this.logger.info('start run Direct.')

    const formData = new FormData()
    formData.append('file', this.file)
    formData.append('token', this.token)
    if (this.key != null) {
      formData.append('key', this.key)
    }
    formData.append('fname', this.putExtra.fname)

    if (this.config.checkByServer) {
      const crcSign = await CRC32.file(this.file)
      formData.append('crc32', crcSign.toString())
    }

    if (this.putExtra.customVars) {
      this.logger.info('init customVars.')
      const { customVars } = this.putExtra
      Object.keys(customVars).forEach(key => formData.append(key, customVars[key].toString()))
      this.logger.info('customVars inited.')
    }

    this.logger.info('formData inited.')
    const result = await direct(this.uploadHost!.getUrl(), formData, {
      onProgress: data => {
        this.updateDirectProgress(data.loaded, data.total)
      },
      onCreate: xhr => this.addXhr(xhr)
    })

    this.logger.info('Direct progress finish.')
    this.finishDirectProgress()
    return result
  }

  private updateDirectProgress(loaded: number, total: number) {
    // 当请求未完成时可能进度会达到100，所以total + 1来防止这种情况出现
    this.progress = { total: this.getProgressInfoItem(loaded, total + 1) }
    this.onData(this.progress)
  }

  private finishDirectProgress() {
    // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里 fake 下
    if (!this.progress) {
      this.logger.warn('progress is null.')
      this.progress = { total: this.getProgressInfoItem(this.file.size, this.file.size) }
      this.onData(this.progress)
      return
    }

    const { total } = this.progress
    this.progress = { total: this.getProgressInfoItem(total.loaded + 1, total.size) }
    this.onData(this.progress)
  }
}
