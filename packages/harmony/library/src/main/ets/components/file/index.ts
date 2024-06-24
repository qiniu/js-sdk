import fs from '@ohos.file.fs'
import fileUri from '@ohos.file.fileuri'
import ohCommon from '@ohos.app.ability.common'

import * as common from '../@internal'

function isURI(uri: string): boolean {
  if (typeof uri !== 'string') {
    return false
  }

  return /^\w+:\/\/.+/.test(uri)
}

export class UploadFile implements common.FileData {
  type: string
  data: string | ArrayBuffer

  /** 文件名；如果未指定，则为 filename */
  key?: string

  /** 本地文件名；如果未指定，默认为随机字符串 */
  filename?: string

  /** 文件的媒体类型；该文件保存到空间时的媒体类型 */
  mimeType?: string

  /** 文件的元数据；该文件保存到空间时的元数据，不需要添加 x-qn-meta 前缀 */
  metadata?: Record<string, string>

  private constructor(type: string, data: string | ArrayBuffer) {
    this.type = type
    this.data = data
  }

  static fromUri(uri: string): UploadFile {
    if (!isURI(uri)) {
      const error = new Error(`This doesn't seem to be a correct uri: ${uri}`)
      console.error('Creating file via fromUri failed', error)
      throw error
    }

    return new UploadFile('uri', uri)
  }
  static fromPath(path: string): UploadFile {
    if (isURI(path)) {
      const error = new Error(`This looks like a uri, please use formURI: ${path}`)
      console.error('Creating file via fromPath failed', error)
      throw error
    }

    return new UploadFile('path', path)
  }

  static fromString(data: string): UploadFile {
    return new UploadFile('string', data)
  }

  static fromArrayBuffer(data: ArrayBuffer): UploadFile {
    return new UploadFile('array-buffer', data)
  }
}

class InternalUploadBlob implements common.UploadBlob {
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

export class InternalUploadFile implements common.UploadFile {
  private file: fs.File | null = null
  private unlinkPath: string | null = null
  private initPromise: Promise<common.Result<boolean>> | null = null
  constructor(public context: ohCommon.Context, private data: UploadFile) {}

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

    // file 主要为分片上传提供
    // pathUri 的格式为 file://pathUri
    const initFile = async (pathUri: string): Promise<common.Result<boolean>> => {
      const openResult = await fs.open(pathUri, fs.OpenMode.READ_ONLY)
        .then<common.Result<fs.File>>(file => ({ result: file }))
        .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

      if (!common.isSuccessResult(openResult)) {
        return openResult
      }

      this.file = openResult.result
      return { result: true }
    }

    const initData = async (): Promise<common.Result<boolean>> => {
      if (!canIUse('SystemCapability.FileManagement.File.FileIO')) {
        return { error: new common.UploadError('FileSystemError', 'The current system api version does not support') }
      }

      if (this.data.type === 'uri') {
        if (typeof this.data.data !== 'string') {
          return {
            error: new common.UploadError('FileSystemError', 'Invalid file data')
          }
        }
        if (typeof this.data.data !== 'string') {
          return {
            error: new common.UploadError('FileSystemError', 'Invalid file data')
          }
        }

        // 标准 file uri
        if (this.data.data.startsWith('file://')) {
          return initFile(this.data.data)
        }

        // 一般是来自其他应用的文件
        if (this.data.data.startsWith('datashare://')) {
          return initFile(this.data.data)
        }

        return { error: new common.UploadError('FileSystemError', 'Unsupported uri schema type') }
      }

      if (this.data.type === 'path') {
        if (typeof this.data.data !== 'string') {
          return {
            error: new common.UploadError('FileSystemError', 'Invalid file data')
          }
        }

        return initFile(fileUri.getUriFromPath(this.data.data))
      }

      // 如果是数据，需要先写入临时位置，然后打开
      if (this.data.type === 'array-buffer' || this.data.type === 'string') {
        const storageKey = `qiniu-upload@${Date.now()}`
        // 这里有一处冗余文件写入
        const cacheFilePath = `${this.context.cacheDir}/${storageKey}`
        const openResult = await fs.open(cacheFilePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE)
          .then<common.Result<fs.File>>(file => ({ result: file }))
          .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

        if (!common.isSuccessResult(openResult)) return openResult

        const writeResult = await fs.write(openResult.result.fd, this.data.data)
          .then<common.Result<number>>(value => ({ result: value }))
          .catch<common.Result<number>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

        if (!common.isSuccessResult(writeResult)) return writeResult
        this.unlinkPath = cacheFilePath

        return initFile(fileUri.getUriFromPath(cacheFilePath))
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
    await this.initPromise
    this.initPromise = null

    let closeResult: common.Result<boolean>
    let unlinkResult: common.Result<boolean>

    if (this.file) {
      closeResult = await fs.close(this.file.fd)
        .then<common.Result<boolean>>(() => { this.file = null; return { result: true } })
        .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))
    }

    if (this.unlinkPath) {
      unlinkResult = await fs.unlink(this.unlinkPath)
        .then<common.Result<boolean>>(() => { this.unlinkPath = null; return { result: true } })
        .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))
    }

    if (!common.isSuccessResult(closeResult)) return closeResult
    if (!common.isSuccessResult(unlinkResult)) return unlinkResult
    return { result: true }
  }

  async path(): Promise<common.Result<string>> {
    throw new Error('Has not yet implemented path')
  }

  async key(): Promise<common.Result<string | null>> {
    return { result: this.data?.key || null }
  }

  async name(): Promise<common.Result<string | null>> {
    return { result: this.data?.filename || null }
  }

  async size(): Promise<common.Result<number>> {
    const fileStat = await this.statFile()
    if (!common.isSuccessResult(fileStat)) return fileStat
    return { result: fileStat.result.size }
  }

  async mimeType(): Promise<common.Result<string | null>> {
    return { result: this.data?.mimeType || null }
  }

  async metadata(): Promise<common.Result<Record<string, string>>> {
    return { result: this.data?.metadata || {} }
  }

  async slice(chunkSize?: number): Promise<common.Result<common.UploadBlob[]>> {
    const sizeResult = await this.size()
    if (!common.isSuccessResult(sizeResult)) return sizeResult
    const normalizedChunkSize = chunkSize || sizeResult.result
    return {
      result: common.sliceChunk(sizeResult.result, normalizedChunkSize)
        .map(({ offset, size }) => (new InternalUploadBlob(this.file, offset, size)))
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

export function isInternalUploadFile(data: unknown): data is InternalUploadFile {
  return data instanceof InternalUploadFile
}

export function isInternalUploadBlob(data: unknown): data is InternalUploadBlob {
  return data instanceof InternalUploadBlob
}
