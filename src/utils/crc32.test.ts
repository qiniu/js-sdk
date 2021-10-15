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
    const crc32 = new CRC32()
    // @ts-ignore
    crc32.append(mockUint8Array(0.5))
    // @ts-ignore
    expect(crc32.crc >>> 0).toEqual(3897118240)

    const crc322 = new CRC32()
    // @ts-ignore
    crc322.append(mockUint8Array(1))
    // @ts-ignore
    expect(crc322.crc >>> 0).toEqual(3531509824)

    const crc323 = new CRC32()
    // @ts-ignore
    crc323.append(mockUint8Array(2))
    // @ts-ignore
    expect(crc323.crc >>> 0).toEqual(1962810473)
  })
})
