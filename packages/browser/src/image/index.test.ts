import { urlSafeBase64Encode } from '../utils'

import { imageView2, imageMogr2, watermark } from '.'

describe('image func test', () => {
  const domain = 'http://otxza7yo2.bkt.clouddn.com'
  const key = 'test.png'

  test('imageView2', () => {
    const m = {
      fop: 'imageView2',
      mode: 2,
      h: 450,
      q: 100
    }
    const url = imageView2(m, key, domain)
    expect(url).toBe(
      'http://otxza7yo2.bkt.clouddn.com/' + key + '?'
      + 'imageView2/' + encodeURIComponent(m.mode)
      + '/h'
      + '/'
      + encodeURIComponent(m.h)
      + '/q'
      + '/' + encodeURIComponent(m.q)
    )
  })

  test('imageMogr2', () => {
    const m = {
      thumbnail: 1,
      strip: true,
      gravity: 1,
      crop: 1,
      quality: 1,
      rotate: 1,
      format: 1,
      blur: 1
    }

    const url = imageMogr2(m, key, domain)
    expect(url).toBe(
      'http://otxza7yo2.bkt.clouddn.com/' + key + '?imageMogr2/'
      + 'thumbnail/1/strip/gravity/1/quality/1/crop/1/rotate/1/format/1/blur/1'
    )
  })

  test('watermark', () => {
    const m = {
      fop: 'watermark',
      mode: 1,
      image: 'http://www.b1.qiniudn.com/images/logo-2.png',
      dissolve: 100,
      dx: 100,
      dy: 100
    }
    const url = watermark(m, key, domain)
    expect(url).toBe(
      'http://otxza7yo2.bkt.clouddn.com/' + key + '?'
      + 'watermark/' + m.mode + '/image/' + urlSafeBase64Encode(m.image)
      + '/dissolve/100/dx/100/dy/100'
    )
    m.mode = 3
    expect(() => {
      watermark(m, key, domain)
    }).toThrow('mode is wrong')
  })
})
