/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { CRC32 } from './crc32'
import { MB } from './helper'

function mockUint8Array(size = 4, name = 'mock.jpg', type = 'image/jpg'): Uint8Array {
  if (size >= 1024) throw new Error('the size is set too large.')

  return new Uint8Array(size * MB).fill(1)
}

describe('test crc32', async () => {
  test('append', async () => {
    const crc32One = new CRC32()
    // @ts-ignore
    crc32One.append(mockUint8Array(0))
    // @ts-ignore
    expect(crc32One.crc >>> 0).toEqual(4294967295)

    const crc32Two = new CRC32()
    // @ts-ignore
    crc32Two.append(mockUint8Array(0.5))
    // @ts-ignore
    expect(crc32Two.crc >>> 0).toEqual(3897118240)

    const crc32Three = new CRC32()
    // @ts-ignore
    crc32Three.append(mockUint8Array(1))
    // @ts-ignore
    expect(crc32Three.crc >>> 0).toEqual(3531509824)

    const crc32Four = new CRC32()
    // @ts-ignore
    crc32Four.append(mockUint8Array(2))
    // @ts-ignore
    expect(crc32Four.crc >>> 0).toEqual(1962810473)
  })
})
