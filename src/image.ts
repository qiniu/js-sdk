import { request } from './utils'
import { urlSafeBase64Encode } from './base64'

export interface ImageViewOptions {
  mode: number
  format?: string
  w?: number
  h?: number
  q?: number
}

export interface ImageWatermark {
  image: string
  mode: number
  fontsize?: number
  dissolve?: number
  dx?: number
  dy?: number
  gravity?: string
  text?: string
  font?: string
  fill?: string
}

export interface ImageMogr2 {
  'auto-orient'?: boolean
  strip?: boolean
  thumbnail?: number
  crop?: number
  gravity?: number
  format?: number
  blur?: number
  quality?: number
  rotate?: number
}

type Pipeline =
  | (ImageWatermark & { fop: 'watermark' })
  | (ImageViewOptions & { fop: 'imageView2' })
  | (ImageMogr2 & { fop: 'imageMogr2' })

export interface Entry {
  domain: string
  key: string
}

function getImageUrl(key: string, domain: string) {
  key = encodeURIComponent(key)
  if (domain.slice(domain.length - 1) !== '/') {
    domain += '/'
  }

  return domain + key
}

export function imageView2(op: ImageViewOptions, key?: string, domain?: string) {
  if (!/^\d$/.test(String(op.mode))) {
    throw 'mode should be number in imageView2'
  }

  const { mode, w, h, q, format } = op

  if (!w && !h) {
    throw 'param w and h is empty in imageView2'
  }

  let imageUrl = 'imageView2/' + encodeURIComponent(mode)
  imageUrl += w ? '/w/' + encodeURIComponent(w) : ''
  imageUrl += h ? '/h/' + encodeURIComponent(h) : ''
  imageUrl += q ? '/q/' + encodeURIComponent(q) : ''
  imageUrl += format ? '/format/' + encodeURIComponent(format) : ''
  if (key && domain) {
    imageUrl = getImageUrl(key, domain) + '?' + imageUrl
  }
  return imageUrl
}

// invoke the imageMogr2 api of Qiniu
export function imageMogr2(op: ImageMogr2, key?: string, domain?: string) {
  const autoOrient = op['auto-orient']
  const { thumbnail, strip, gravity, crop, quality, rotate, format, blur } = op

  let imageUrl = 'imageMogr2'

  imageUrl += autoOrient ? '/auto-orient' : ''
  imageUrl += thumbnail ? '/thumbnail/' + encodeURIComponent(thumbnail) : ''
  imageUrl += strip ? '/strip' : ''
  imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : ''
  imageUrl += quality ? '/quality/' + encodeURIComponent(quality) : ''
  imageUrl += crop ? '/crop/' + encodeURIComponent(crop) : ''
  imageUrl += rotate ? '/rotate/' + encodeURIComponent(rotate) : ''
  imageUrl += format ? '/format/' + encodeURIComponent(format) : ''
  imageUrl += blur ? '/blur/' + encodeURIComponent(blur) : ''
  if (key && domain) {
    imageUrl = getImageUrl(key, domain) + '?' + imageUrl
  }
  return imageUrl
}

// invoke the watermark api of Qiniu
export function watermark(op: ImageWatermark, key?: string, domain?: string) {
  const mode = op.mode
  if (!mode) {
    throw "mode can't be empty in watermark"
  }

  let imageUrl = 'watermark/' + mode
  if (mode !== 1 && mode !== 2) {
    throw 'mode is wrong'
  }

  if (mode === 1) {
    const image = op.image
    if (!image) {
      throw "image can't be empty in watermark"
    }
    imageUrl += image ? '/image/' + urlSafeBase64Encode(image) : ''
  }

  if (mode === 2) {
    const { text, font, fontsize, fill } = op
    if (!text) {
      throw "text can't be empty in watermark"
    }
    imageUrl += text ? '/text/' + urlSafeBase64Encode(text) : ''
    imageUrl += font ? '/font/' + urlSafeBase64Encode(font) : ''
    imageUrl += fontsize ? '/fontsize/' + fontsize : ''
    imageUrl += fill ? '/fill/' + urlSafeBase64Encode(fill) : ''
  }

  const { dissolve, gravity, dx, dy } = op

  imageUrl += dissolve ? '/dissolve/' + encodeURIComponent(dissolve) : ''
  imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : ''
  imageUrl += dx ? '/dx/' + encodeURIComponent(dx) : ''
  imageUrl += dy ? '/dy/' + encodeURIComponent(dy) : ''
  if (key && domain) {
    imageUrl = getImageUrl(key, domain) + '?' + imageUrl
  }
  return imageUrl
}

// invoke the imageInfo api of Qiniu
export function imageInfo(key: string, domain: string) {
  const url = getImageUrl(key, domain) + '?imageInfo'
  return request(url, { method: 'GET' })
}

// invoke the exif api of Qiniu
export function exif(key: string, domain: string) {
  const url = getImageUrl(key, domain) + '?exif'
  return request(url, { method: 'GET' })
}

export function pipeline(arr: Pipeline[], key?: string, domain?: string) {
  const isArray = Object.prototype.toString.call(arr) === '[object Array]'
  let option: Pipeline
  let errOp = false
  let imageUrl = ''
  if (isArray) {
    for (let i = 0, len = arr.length; i < len; i++) {
      option = arr[i]
      if (!option.fop) {
        throw "fop can't be empty in pipeline"
      }
      switch (option.fop) {
        case 'watermark':
          imageUrl += watermark(option) + '|'
          break
        case 'imageView2':
          imageUrl += imageView2(option) + '|'
          break
        case 'imageMogr2':
          imageUrl += imageMogr2(option) + '|'
          break
        default:
          errOp = true
          break
      }
      if (errOp) {
        throw 'fop is wrong in pipeline'
      }
    }

    if (key && domain) {
      imageUrl = getImageUrl(key, domain) + '?' + imageUrl
      const length = imageUrl.length
      if (imageUrl.slice(length - 1) === '|') {
        imageUrl = imageUrl.slice(0, length - 1)
      }
    }
    return imageUrl
  }

  throw "pipeline's first param should be array"
}
