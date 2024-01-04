import { Result } from './types'

export interface IBlob {
  size(): number
}

export interface IFile {
  /** 释放文件；当文件已经使用完之后会调用该方法 */
  free(): Promise<Result<true>>
  /** 文件尺寸；返回文件大小信息 */
  size(): Promise<Result<number>>
  /** 文件路径；返回文件的完整路径 */
  path(): Promise<Result<string>>
  /** 文件名 */
  name(): Promise<Result<string | null>>
  /** 媒体类型 */
  mimeType(): Promise<Result<string | null>>
  /** 文件分片；返回文件分片 */
  slice(size: number): Promise<Result<IBlob[]>>
}
