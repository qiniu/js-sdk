/* eslint-disable no-bitwise */

import { MB } from './helper'

export class CRC32 {
  private crc = -1
  private table = this.makeTable()

  private makeTable() {
    const table = new Array<number>()
    for (let i = 0; i < 256; i++) {
      let t = i
      for (let j = 0; j < 8; j++) {
        if (t & 1) {
          // IEEE 标准
          t = (t >>> 1) ^ 0xEDB88320
        } else {
          t >>>= 1
        }
      }
      table[i] = t
    }

    return table
  }

  private append(data: Uint8Array) {
    let crc = this.crc
    for (let offset = 0; offset < data.byteLength; offset++) {
      crc = (crc >>> 8) ^ this.table[(crc ^ data[offset]) & 0xFF]
    }
    this.crc = crc
  }

  async file(file: File): Promise<number> {
    if (file.size <= MB) {
      // arrayBuffer 方法 jest(jsdom) 暂时不支持、所以不对该方法添加单测
      // https://github.com/jsdom/jsdom/issues/3206 => https://github.com/jsdom/jsdom/issues/2555
      const block = await file.arrayBuffer()
      this.append(new Uint8Array(block))
      return (this.crc ^ -1) >>> 0
    }

    const count = Math.ceil(file.size / MB)
    for (let index = 0; index < count; index++) {
      const start = index * MB
      const end = index === (count - 1) ? file.size : start + MB
      // eslint-disable-next-line no-await-in-loop
      const chuck = await file.slice(start, end).arrayBuffer()
      this.append(new Uint8Array(chuck))
    }

    return (this.crc ^ -1) >>> 0
  }

  static file(file: File): Promise<number> {
    const crc = new CRC32()
    return crc.file(file)
  }
}
