import path from 'path-browserify'
import { IBlob, IFile, UploadError, Result, isSuccessResult, sliceChunk, urlSafeBase64Decode } from '@internal/common'

interface FileMeta {
  /** 文件名 */
  filename?: string
  /** 文件的媒体类型 */
  mimeType?: string
}

export class UploadBlob implements IBlob {
  constructor(
    private filePath: string,
    private offset: number,
    private size: number
  ) {}

  readAsArrayBuffer(): Promise<Result<ArrayBuffer>> {
    const fs = wx.getFileSystemManager()
    return new Promise(resolve => {
      fs.readFile({
        length: this.size,
        position: this.offset,
        filePath: this.filePath,
        success: result => {
          const data = result.data
          if (typeof data !== 'string') {
            return resolve({ result: data })
          }
          return resolve({ error: new UploadError('FileSystemError', 'Wrong file format read') })
        },
        fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
      })
    })
  }
}

type WxFileData =
  | { type: 'path', data: string }
  | { type: 'base64', data: string }
  | { type: 'string', data: string }
  | { type: 'array-buffer', data: ArrayBuffer }

export class UploadFile implements IFile {
  private freed = false
  private inited = false
  private shouldDeleteFile = false
  private filePath: string | null = null
  private initData: WxFileData | null = null

  constructor(private meta?: FileMeta) {}

  static fromPath(filePath: string, meta?: FileMeta) {
    const file = new UploadFile(meta)
    file.initData = { type: 'path', data: filePath }
    file.filePath = filePath
    file.inited = true
    return file
  }

  static fromString(data: string, meta?: FileMeta) {
    const file = new UploadFile(meta)
    file.initData = { type: 'string', data }
    return file
  }

  static fromBase64(data: string, meta?: FileMeta) {
    const file = new UploadFile(meta)
    file.initData = { type: 'base64', data }
    return file
  }

  static fromArrayBuffer(data: ArrayBuffer, meta?: FileMeta) {
    const file = new UploadFile(meta)
    file.initData = { type: 'array-buffer', data }
    return file
  }

  /** 初始化数据并写入磁盘&检查文件 */
  private autoInit(): Promise<Result<boolean>> {
    if (this.inited) return Promise.resolve({ result: true })
    if (this.initData == null) return Promise.resolve({ error: new UploadError('FileSystemError', 'Invalid file') })
    if (this.initData.type === 'path') return Promise.resolve({ result: true })
    if (this.filePath != null) return Promise.resolve({ result: true })

    let paddingFileData: ArrayBuffer | string | null = null
    const tempFilePath = `${wx.env.USER_DATA_PATH}/qiniu-js@${Date.now()}`

    if (this.initData.type === 'array-buffer') {
      paddingFileData = this.initData.data
    }

    if (this.initData.type === 'string') {
      paddingFileData = this.initData.data
    }

    if (this.initData.type === 'base64') {
      paddingFileData = urlSafeBase64Decode(this.initData.data)
    }

    if (paddingFileData != null) {
      const ensureData = paddingFileData
      return new Promise(resolve => {
        const fs = wx.getFileSystemManager()
        fs.writeFile({
          data: ensureData,
          filePath: tempFilePath,
          success: () => {
            this.inited = true
            this.initData = null // 写入文件后立即释放内存
            resolve({ result: true })
            this.filePath = tempFilePath
            // 对于创建的文件需要标记为应该删除
            this.shouldDeleteFile = true
          },
          fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
        })
      })
    }

    return Promise.resolve({ error: new UploadError('FileSystemError', 'Unknown file type') })
  }

  private async statFile(): Promise<Result<WechatMiniprogram.Stats>> {
    const initResult = await this.autoInit()
    if (!isSuccessResult(initResult)) return initResult
    const fs = wx.getFileSystemManager()
    return new Promise(resolve => {
      if (this.filePath == null) {
        resolve({ error: new UploadError('FileSystemError', 'Invalid file') })
        return
      }
      fs.stat({
        path: this.filePath,
        success: stat => {
          const error = new UploadError('FileSystemError', 'The path is not a valid file')
          if (Array.isArray(stat.stats) || !stat.stats.isFile()) return resolve({ error })
          return resolve({ result: stat.stats })
        },
        fail: error => {
          resolve({ error: new UploadError('FileSystemError', error.errMsg) })
        }
      })
    })
  }

  async free(): Promise<Result<true>> {
    if (this.freed) return { result: true }
    if (!this.shouldDeleteFile) return { result: true }

    const fs = wx.getFileSystemManager()
    return new Promise(resolve => {
      fs.unlink({
        filePath: this.filePath!,
        success: () => resolve({ result: true }),
        fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
      })
    })
  }

  async path(): Promise<Result<string>> {
    const initResult = await this.autoInit()
    if (!isSuccessResult(initResult)) return initResult
    return { result: this.filePath! }
  }

  async name(): Promise<Result<string | null>> {
    return { result: this.meta?.filename || null }
  }

  async size(): Promise<Result<number>> {
    const fileStat = await this.statFile()
    if (!isSuccessResult(fileStat)) return fileStat
    return { result: fileStat.result.size }
  }

  async mimeType(): Promise<Result<string | null>> {
    return { result: this.meta?.mimeType || null }
  }

  async slice(chunkSize?: number): Promise<Result<IBlob[]>> {
    const sizeResult = await this.size()
    if (!isSuccessResult(sizeResult)) return sizeResult
    const normalizedChunkSize = chunkSize || sizeResult.result
    return {
      result: sliceChunk(sizeResult.result, normalizedChunkSize)
        .map(({ offset, size }) => (new UploadBlob(this.filePath!, offset, size)))
    }
  }

  async readAsArrayBuffer(): Promise<Result<ArrayBuffer>> {
    const initResult = await this.autoInit()
    if (!isSuccessResult(initResult)) return initResult

    const fs = wx.getFileSystemManager()
    return new Promise(resolve => {
      fs.readFile({
        filePath: this.filePath!,
        success: result => {
          const data = result.data
          if (typeof data !== 'string') {
            return resolve({ result: data })
          }
          return resolve({ error: new UploadError('FileSystemError', 'Wrong file format read') })
        },
        fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
      })
    })
  }
}

export function isUploadFile(data: unknown): data is UploadFile {
  return data instanceof UploadFile
}

export function isUploadBlob(data: unknown): data is UploadBlob {
  return data instanceof UploadBlob
}
