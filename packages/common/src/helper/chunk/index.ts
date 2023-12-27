interface Chunk {
  offset: number
  size: number
}

export function sliceChunk(fileSize: number, chunkSize: number): Chunk[] {
  const result: Chunk[] = []

  let offset = 0
  while (offset < fileSize) {
    const size = Math.min(chunkSize, fileSize - offset)
    result.push({ offset, size })
    offset += chunkSize
  }

  return result
}
