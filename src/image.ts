import { request } from './utils'
import { urlSafeBase64Encode } from './base64'

export interface IImageViewOptions {
  mode?: number
  format?: string
  w?: number
  h?: number
  q?: number
}

export interface IImageWatermark {
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

export interface IImageMogr2 {
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

type Pipeline = (IImageViewOptions | IImageWatermark | IImageMogr2) & { fop: string }

function getImageUrl(key: string, domain: string) {
  key = encodeURIComponent(key)
  if (domain.slice(domain.length - 1) !== '/') {
    domain += '/'
  }
  return domain + key
}

export function imageView2(op: IImageViewOptions, key?: string, domain?: string) {
  if (!/^\d$/.test(String(op.mode))) {
    throw 'mode should be number in imageView2'
  }
  const mode = op.mode
  const w = op.w
  const h = op.h
  const q = op.q
  const format = op.format

  if (!w && !h) {
    throw 'param w and h is empty in imageView2'
  }

  let imageUrl = 'imageView2/' + encodeURIComponent(mode)
  imageUrl += w ? '/w/' + encodeURIComponent(w) : ''
  imageUrl += h ? '/h/' + encodeURIComponent(h) : ''
  imageUrl += q ? '/q/' + encodeURIComponent(q) : ''
  imageUrl += format ? '/format/' + encodeURIComponent(format) : ''
  if (key) {
    imageUrl = getImageUrl(key, domain) + '?' + imageUrl
  }
  return imageUrl
}

// invoke the imageMogr2 api of Qiniu
export function imageMogr2(op: IImageMogr2, key?: string, domain?: string) {
  const auto_orient = op['auto-orient']
  const thumbnail = op.thumbnail
  const strip = op.strip
  const gravity = op.gravity
  const crop = op.crop
  const quality = op.quality
  const rotate = op.rotate
  const format = op.format
  const blur = op.blur

  let imageUrl = 'imageMogr2'

  imageUrl += auto_orient ? '/auto-orient' : ''
  imageUrl += thumbnail ? '/thumbnail/' + encodeURIComponent(thumbnail) : ''
  imageUrl += strip ? '/strip' : ''
  imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : ''
  imageUrl += quality ? '/quality/' + encodeURIComponent(quality) : ''
  imageUrl += crop ? '/crop/' + encodeURIComponent(crop) : ''
  imageUrl += rotate ? '/rotate/' + encodeURIComponent(rotate) : ''
  imageUrl += format ? '/format/' + encodeURIComponent(format) : ''
  imageUrl += blur ? '/blur/' + encodeURIComponent(blur) : ''
  if (key) {
    imageUrl = getImageUrl(key, domain) + '?' + imageUrl
  }
  return imageUrl
}

// invoke the watermark api of Qiniu
export function watermark(op: IImageWatermark, key?: string, domain?: string) {
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
    const text = op.text
    const font = op.font
    const fontsize = op.fontsize
    const fill = op.fill
    if (!text) {
      throw "text can't be empty in watermark"
    }
    imageUrl += text ? '/text/' + urlSafeBase64Encode(text) : ''
    imageUrl += font ? '/font/' + urlSafeBase64Encode(font) : ''
    imageUrl += fontsize ? '/fontsize/' + fontsize : ''
    imageUrl += fill ? '/fill/' + urlSafeBase64Encode(fill) : ''
  }

  const dissolve = op.dissolve
  const gravity = op.gravity
  const dx = op.dx
  const dy = op.dy

  imageUrl += dissolve ? '/dissolve/' + encodeURIComponent(dissolve) : ''
  imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : ''
  imageUrl += dx ? '/dx/' + encodeURIComponent(dx) : ''
  imageUrl += dy ? '/dy/' + encodeURIComponent(dy) : ''
  if (key) {
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

export function pipeline(arr: Pipeline[], key: string, domain: string) {
  const isArray = Object.prototype.toString.call(arr) === '[object Array]'
  let option
  let errOp
  let imageUrl = ''
  if (isArray) {
    for (let i = 0, len = arr.length; i < len; i++) {
      option = arr[i]
      const { fop, ...params } = option
      if (!fop) {
        throw "fop can't be empty in pipeline"
      }
      switch (fop) {
        case 'watermark':
          imageUrl += watermark(params as IImageWatermark) + '|'
          break
        case 'imageView2':
          imageUrl += imageView2(params as IImageViewOptions) + '|'
          break
        case 'imageMogr2':
          imageUrl += imageMogr2(params as IImageMogr2) + '|'
          break
        default:
          errOp = true
          break
      }
      if (errOp) {
        throw 'fop is wrong in pipeline'
      }
    }

    if (key) {
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
