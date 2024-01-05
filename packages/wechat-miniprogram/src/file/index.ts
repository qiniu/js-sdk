import { IBlob, IFile, UploadError, Result, isSuccessResult, sliceChunk } from '@internal/common'

interface FileMeta {
  /** 文件名；设定上传之后存储的文件名 */
  filename?: string
  /** 文件的媒体类型; 目前仅在分片上传中指定有效 */
  mimeType?: string
}

class UploadBlob implements IBlob {
  constructor(
    private filePath: string,
    private offset: number,
    private length: number
  ) {}

  size(): number {
    return this.length
  }

  readAsArrayBuffer(): Promise<Result<ArrayBuffer>> {
    const fs = wx.getFileSystemManager()
    return new Promise(resolve => {
      fs.readFile({
        length: this.length,
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

export type FileData =
  | { type: 'path', data: string, meta?: FileMeta }
  | { type: 'string', data: string, meta?: FileMeta }
  | { type: 'array-buffer', data: ArrayBuffer, meta?: FileMeta }

export class UploadFile implements IFile {
  private shouldUnlink = false
  private filePath: string | null = null
  private initPromise: Promise<Result<boolean>> | null = null
  constructor(private initData: FileData, private meta?: FileMeta) {}

  static fromPath(filePath: string, meta?: FileMeta) {
    return new UploadFile({ type: 'path', data: filePath }, meta)
  }

  static fromString(data: string, meta?: FileMeta) {
    return new UploadFile({ type: 'string', data }, meta)
  }

  static fromArrayBuffer(data: ArrayBuffer, meta?: FileMeta) {
    return new UploadFile({ type: 'array-buffer', data }, meta)
  }

  /** 初始化数据并写入磁盘&检查文件 */
  private autoInit(): Promise<Result<boolean>> {
    if (this.initPromise) return this.initPromise

    // 将内容写入文件用于后面上传
    const autoCreateFile = (): Promise<Result<boolean>> => {
      if (this.initData.type === 'path') {
        this.filePath = this.initData.data
        return Promise.resolve({ result: true })
      }

      if (this.initData.type === 'array-buffer' || this.initData.type === 'string') {
        // TODO: 文件清理
        const tempFilePath = `${wx.env.USER_DATA_PATH}/qiniu-js@${Date.now()}`
        return new Promise(resolve => {
          const fs = wx.getFileSystemManager()
          fs.writeFile({
            data: this.initData!.data,
            filePath: tempFilePath,
            success: () => {
              resolve({ result: true })
              this.shouldUnlink = true
              this.filePath = tempFilePath
            },
            fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
          })
        })
      }

      return Promise.resolve({ result: true })
    }

    const initPromise = autoCreateFile()
    this.initPromise = initPromise
    return this.initPromise
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
    await this.initPromise
    return new Promise(resolve => {
      if (this.shouldUnlink && this.filePath) {
        const fs = wx.getFileSystemManager()
        fs.unlink({
          filePath: this.filePath!,
          success: () => {
            this.filePath = null
            this.initPromise = null
            this.shouldUnlink = false
            return resolve({ result: true })
          },
          fail: error => resolve({ error: new UploadError('FileSystemError', error.errMsg) })
        })
      } else {
        resolve({ result: true })
      }
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
