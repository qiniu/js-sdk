import { compressImage } from 'qiniu-js'

export async function useCompress(file: File): Promise<Blob> {
  const dist = (await compressImage(file, {
    quality: 0.72,
    maxWidth: 1000,
    noCompressIfLarger: true
  })).dist as any

  return dist
}
