import fs from '@ohos.file.fs'
import fileUri from '@ohos.file.fileuri'
import ohCommon from '@ohos.app.ability.common'

import * as common from '../@internal'

class UploadBlob implements common.UploadBlob {
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

export type FileData =
  | { type: 'uri', data: string } & common.FileData
  | { type: 'path', data: string } & common.FileData
  | { type: 'string', data: string } & common.FileData
  | { type: 'array-buffer', data: ArrayBuffer } & common.FileData

// 通过这个来减少非必要复制操作
export type UseOf = 'direct' | 'multipart'

export class UploadFile implements common.UploadFile {
  private file: fs.File | null = null
  private fileUri: string | null = null
  private unlinkPath: string | null = null
  private initPromise: Promise<common.Result<boolean>> | null = null
  constructor(public context: ohCommon.Context, private data: FileData, private useOf: UseOf) {}

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

    // fileUri 主要为直传提供
    // path 的格式为 file://path
    const initFileUri = async (path: string): Promise<common.Result<boolean>> => {
      // 如果不是直传，不初始化 uri，减少复制操作
      if (this.useOf !== 'direct') return ({ result: true })

      const storageKey = `qiniu-upload@${Date.now()}`
      const cacheFilePath = `${this.context.cacheDir}/${storageKey}`
      const targetResult = await fs.open(cacheFilePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE)
        .then<common.Result<fs.File>>(file => ({ result: file }))
        .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

      if (!common.isSuccessResult(targetResult)) {
        return targetResult
      }

      const sourceResult = await fs.open(path, fs.OpenMode.READ_ONLY)
        .then<common.Result<fs.File>>(file => ({ result: file }))
        .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

      if (!common.isSuccessResult(sourceResult)) {
        await fs.close(targetResult.result)
        return sourceResult
      }

      const copyResult = await fs.copyFile(sourceResult.result.fd, targetResult.result.fd)
        .then<common.Result<boolean>>(() => ({ result: true }))
        .catch<common.Result<boolean>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

      if (!common.isSuccessResult(copyResult)) {
        await fs.close(targetResult.result)
        await fs.close(sourceResult.result)
        return copyResult
      }

      await fs.close(sourceResult.result)
      await fs.close(targetResult.result)

      this.fileUri = `internal://cache/${storageKey}`
      this.unlinkPath = cacheFilePath
      return { result: true }
    }

    // file 主要为分片上传提供
    // path 的格式为 file://path
    const initFile = async (path: string): Promise<common.Result<boolean>> => {
      const openResult = await fs.open(path, fs.OpenMode.READ_ONLY)
        .then<common.Result<fs.File>>(file => ({ result: file }))
        .catch<common.Result<fs.File>>(error => ({ error: new common.UploadError('FileSystemError', error.message) }))

      if (!common.isSuccessResult(openResult)) {
        return openResult
      }

      this.file = openResult.result
      return initFileUri(path)
    }

    const initData = async (): Promise<common.Result<boolean>> => {
      if (!canIUse('SystemCapability.FileManagement.File.FileIO')) {
        return { error: new common.UploadError('FileSystemError', 'The current system api version does not support') }
      }

      if (this.data.type === 'uri') {
        // 来自其他应用的文件
        if (this.data.data.startsWith('datashare://')) {
          return initFile(this.data.data)
        }

        return { error: new common.UploadError('FileSystemError', 'Unsupported uri schema type') }
      }

      if (this.data.type === 'path') {
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

  /**
   * 返回的永远是 file://path 的 uri
   */
  async path(): Promise<common.Result<string>> {
    const initResult = await this.autoInit()
    if (!common.isSuccessResult(initResult)) return initResult
    return { result: this.fileUri! }
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
