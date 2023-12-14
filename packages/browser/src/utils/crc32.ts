/* eslint-disable no-bitwise */

import { MB } from './helper'

/**
 * 以下 class 实现参考
 * https://github.com/Stuk/jszip/blob/d4702a70834bd953d4c2d0bc155fad795076631a/lib/crc32.js
 * 该实现主要针对大文件优化、对计算的值进行了 `>>> 0` 运算（为与服务端保持一致）
 */
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

  private compute() {
    return (this.crc ^ -1) >>> 0
  }

  private async readAsUint8Array(file: File | Blob): Promise<Uint8Array> {
    if (typeof file.arrayBuffer === 'function') {
      return new Uint8Array(await file.arrayBuffer())
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result == null) {
          reject()
          return
        }

        if (typeof reader.result === 'string') {
          reject()
          return
        }

        resolve(new Uint8Array(reader.result))
      }
      reader.readAsArrayBuffer(file)
    })
  }

  async file(file: File): Promise<number> {
    if (file.size <= MB) {
      this.append(await this.readAsUint8Array(file))
      return this.compute()
    }

    const count = Math.ceil(file.size / MB)
    for (let index = 0; index < count; index++) {
      const start = index * MB
      const end = index === (count - 1) ? file.size : start + MB
      // eslint-disable-next-line no-await-in-loop
      const chuck = await this.readAsUint8Array(file.slice(start, end))
      this.append(new Uint8Array(chuck))
    }

    return this.compute()
  }

  static file(file: File): Promise<number> {
    const crc = new CRC32()
    return crc.file(file)
  }
}
