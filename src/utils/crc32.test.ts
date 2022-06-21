import { CRC32 } from './crc32'
import { MB } from './helper'

function mockFile(size = 4, name = 'mock.jpg', type = 'image/jpg'): File {
  if (size >= 1024) throw new Error('the size is set too large.')

  const blob = new Blob(['1'.repeat(size * MB)], { type })
  return new File([blob], name)
}

describe('test crc32', () => {
  test('file', async () => {
    const crc32One = new CRC32()
    await expect(crc32One.file(mockFile(0))).resolves.toEqual(0)

    const crc32Two = new CRC32()
    await expect(crc32Two.file(mockFile(0.5))).resolves.toEqual(1610895105)

    const crc32Three = new CRC32()
    await expect(crc32Three.file(mockFile(1))).resolves.toEqual(3172987001)

    const crc32Four = new CRC32()
    await expect(crc32Four.file(mockFile(2))).resolves.toEqual(847982614)
  })
})
