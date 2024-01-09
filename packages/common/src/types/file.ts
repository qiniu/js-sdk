import { Result } from './types'

export type FileData = {
  /** 文件名；该文件保存到空间时的名称 */
  filename?: string
  /** 文件的媒体类型；该文件保存到空间时的媒体类型 */
  mimeType?: string
  /** 文件的元数据；该文件保存到空间时的元数据，不需要添加 x-qn-meta 前缀 */
  metadata?: Record<string, string>
}

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
  /** 文件自定义元数据 */
  metadata(): Promise<Result<Record<string, string>>>

  /** 文件分片；返回文件分片 */
  slice(size: number): Promise<Result<IBlob[]>>
}
