import {
  Result, isSuccessResult,
  UploadBlob as BaseUploadBlob,
  UploadFile as BaseUploadFile,
  sliceChunk, FileData as CommonFileData
} from '@internal/common'

class UploadBlob implements BaseUploadBlob {
  constructor(private blob: Blob) {}

  size(): number {
    return this.blob.size
  }

  readAsBrowserBlob() {
    return this.blob
  }
}

export type FileData =
  | { type: 'file', data: File } & CommonFileData
  | { type: 'string', data: string } & CommonFileData
  | { type: 'array-buffer', data: ArrayBuffer } & CommonFileData

export class UploadFile implements BaseUploadFile {
  private file: File
  constructor(private fileData: FileData) {
    if (this.fileData.type === 'file') {
      this.file = this.fileData.data
      return
    }

    if (this.fileData.type === 'array-buffer' || this.fileData.type === 'string') {
      this.file = new File(
        [this.fileData.data],
        this.fileData.filename || '',
        { type: this.fileData.mimeType }
      )
    }

    throw new Error('Unknown file type')
  }

  async free(): Promise<Result<true>> {
    return { result: true }
  }

  async path(): Promise<Result<string>> {
    return { result: 'browser platform files' }
  }

  async key(): Promise<Result<string | null>> {
    return { result: this.fileData?.key || null }
  }

  async name(): Promise<Result<string | null>> {
    const realFilename = this.fileData.type === 'file' && this.fileData.data.name
    return { result: this.fileData?.filename || realFilename || null }
  }

  async size(): Promise<Result<number>> {
    return { result: this.file.size }
  }

  async mimeType(): Promise<Result<string | null>> {
    return { result: this.fileData?.mimeType || null }
  }

  async metadata(): Promise<Result<Record<string, string>>> {
    return { result: this.fileData?.metadata || {} }
  }

  async slice(chunkSize?: number): Promise<Result<UploadBlob[]>> {
    const sizeResult = await this.size()
    if (!isSuccessResult(sizeResult)) return sizeResult
    const normalizedChunkSize = chunkSize || sizeResult.result
    return {
      result: sliceChunk(sizeResult.result, normalizedChunkSize)
        .map(({ offset, size }) => (new UploadBlob(this.file.slice(offset, offset + size, this.fileData.mimeType))))
    }
  }

  readAsBrowserFile() {
    return this.file
  }
}

export function isUploadFile(data: unknown): data is UploadFile {
  return data instanceof UploadFile
}

export function isUploadBlob(data: unknown): data is UploadBlob {
  return data instanceof UploadBlob
}
