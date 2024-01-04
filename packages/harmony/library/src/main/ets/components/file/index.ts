import fs from '@ohos.file.fs'
import fileUri from "@ohos.file.fileuri"
import ohCommon from '@ohos.app.ability.common'

import * as common from '../@internal'

interface FileMeta {
  /** 文件名 */
  filename?: string
  /** 文件的媒体类型 */
  mimeType?: string
}

class UploadBlob implements common.IBlob {
  constructor(
    private file: fs.File,
    private offset: number,
    private length: number
  ) {}

  size(): number {
    return this.length
  }

  readAsArrayBuffer(): Promise<common.Result<ArrayBuffer>> {
    return new Promise(resolve => {
      const buffer = new ArrayBuffer(this.length)
      fs
        .read(this.file.fd, buffer, { offset: this.offset, length: this.length })
        .then(() => resolve({ result: buffer }))
        .catch(error => resolve({ error: new common.UploadError('FileSystemError', error.message) }))
    })
  }
}

type FileData =
  | { type: 'uri', data: string }
  | { type: 'string', data: string }
  | { type: 'array-buffer', data: ArrayBuffer }

export class UploadFile implements common.IFile {
  private file: fs.File | null = null
  private unlinkPath: string | null = null
  private internalCacheUri: string | null = null
  private initPromise: Promise<common.Result<boolean>> | null = null
  constructor(public context: ohCommon.Context, private data: FileData, private meta?: FileMeta) {}

  static fromUri(context: ohCommon.Context, uri: string, meta?: FileMeta) {
    return new UploadFile(context, { type: 'uri', data: uri }, meta)
  }

  static fromPath(context: ohCommon.Context, filePath: string, meta?: FileMeta) {
    const uri = fileUri.getUriFromPath(filePath)
    return new UploadFile(context, { type: 'uri', data: uri }, meta)
  }

  static fromString(context: ohCommon.Context, data: string, meta?: FileMeta) {
    return new UploadFile(context, { type: 'string', data }, meta)
  }

  static fromArrayBuffer(context: ohCommon.Context, data: ArrayBuffer, meta?: FileMeta) {
    return new UploadFile(context, { type: 'array-buffer', data }, meta)
  }

  /** 初始化数据并写入磁盘&打开文件 */
  private autoInit(): Promise<common.Result<boolean>> {
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.data == null) {
      return Promise.resolve({
        error: new common.UploadError('FileSystemError', 'Invalid file')
      })
    }

    const initData = async (): Promise<common.Result<boolean>> => {
      if (this.data.type === 'uri') {
        // 如果已经是 internal://cache/ 的文件 url 直接赋值更新
        if (this.data.data.startsWith('internal://cache/')) {
          this.internalCacheUri = this.data.data
          return { result: true }
        }

        // 普通的文件复制到 cache 位置
        const storageKey = `qiniu-upload@${Date.now()}`
        const cacheFilePath = `${this.context.cacheDir}/${storageKey}`
        const copyResult = await fs.copyFile(this.data.data, cacheFilePath)
          .then<common.Result<boolean>>(() => ({ result: true }))
          .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

        if (!common.isSuccessResult(copyResult)) return copyResult
        this.internalCacheUri = `internal://cache/${storageKey}`
        this.unlinkPath = cacheFilePath
        return { result: true }
      }

      // 如果是数据，需要先写入临时位置，然后打开
      if (this.data.type === 'array-buffer' || this.data.type === 'string') {
        const storageKey = `qiniu-upload@${Date.now()}`
        const cacheFilePath = `${this.context.cacheDir}/${storageKey}`
        const openResult = await fs.open(cacheFilePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE)
          .then<common.Result<fs.File>>(file => ({ result: file }))
          .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

        if (!common.isSuccessResult(openResult)) return openResult

        const writeResult = await fs.write(openResult.result.fd, this.data.data)
          .then<common.Result<number>>(value => ({ result: value }))
          .catch<common.Result<number>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

        if (!common.isSuccessResult(writeResult)) return writeResult

        this.internalCacheUri = `internal://cache/${storageKey}`
        this.unlinkPath = cacheFilePath
        this.file = openResult.result
        return { result: true }
      }

      return { result: true }
    }

    const initPromise = initData()
    this.initPromise = initPromise
    return this.initPromise
  }

  private async statFile(): Promise<common.Result<fs.Stat>> {
    const initResult = await this.autoInit()
    if (!common.isSuccessResult(initResult)) return initResult

    const statResult = await fs.stat(this.file.fd)
      .then<common.Result<fs.Stat>>(stat => ({ result: stat }))
      .catch<common.Result<fs.Stat>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

    if (!common.isSuccessResult(statResult)) return statResult

    return statResult
  }

  async free(): Promise<common.Result<true>> {
    let closeResult: common.Result<boolean>
    let unlinkResult: common.Result<boolean>

    if (this.file) {
       closeResult = await fs.close(this.file.fd)
        .then<common.Result<boolean>>(() => { this.unlinkPath = null; return { result: true } })
        .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))
    }

    if (this.unlinkPath) {
       unlinkResult = await fs.unlink(this.unlinkPath)
        .then<common.Result<boolean>>(() => { this.file = null; return { result: true } })
        .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))
    }

    if (!common.isSuccessResult(closeResult)) return closeResult
    if (!common.isSuccessResult(unlinkResult)) return unlinkResult
    return { result: true }
  }

  /**
   * 返回的永远是 internal://cache/ 的临时文件目录
   */
  async path(): Promise<common.Result<string>> {
    const initResult = await this.autoInit()
    if (!common.isSuccessResult(initResult)) return initResult
    return { result: this.internalCacheUri! }
  }

  async name(): Promise<common.Result<string | null>> {
    return { result: this.meta?.filename || null }
  }

  async size(): Promise<common.Result<number>> {
    const fileStat = await this.statFile()
    if (!common.isSuccessResult(fileStat)) return fileStat
    return { result: fileStat.result.size }
  }

  async mimeType(): Promise<common.Result<string | null>> {
    return { result: this.meta?.mimeType || null }
  }

  async slice(chunkSize?: number): Promise<common.Result<common.IBlob[]>> {
    const sizeResult = await this.size()
    if (!common.isSuccessResult(sizeResult)) return sizeResult
    const normalizedChunkSize = chunkSize || sizeResult.result
    return {
      result: common.sliceChunk(sizeResult.result, normalizedChunkSize)
        .map(({ offset, size }) => (new UploadBlob(this.file, offset, size)))
    }
  }

  async readAsArrayBuffer(): Promise<common.Result<ArrayBuffer>> {
    const initResult = await this.autoInit()
    if (!common.isSuccessResult(initResult)) return initResult

    const sizeResult = await this.size()
    if (!common.isSuccessResult(sizeResult)) return sizeResult

    return new Promise(resolve => {
      const buffer = new ArrayBuffer(sizeResult.result)
      fs
        .read(this.file.fd, buffer)
        .then(() => resolve({ result: buffer }))
        .catch(error => resolve({ error: new common.UploadError('FileSystemError', error.message) }))
    })
  }
}

export function isUploadFile(data: unknown): data is UploadFile {
  return data instanceof UploadFile
}

export function isUploadBlob(data: unknown): data is UploadBlob {
  return data instanceof UploadBlob
}
