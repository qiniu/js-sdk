/* eslint-disable */

// https://github.com/locutusjs/locutus/blob/master/src/php/xml/utf8_encode.js
function utf8Encode(argString: string) {
  // http://kevin.vanzonneveld.net
  // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: sowberry
  // +    tweaked by: Jack
  // +   bugfixed by: Onno Marsman
  // +   improved by: Yves Sucaet
  // +   bugfixed by: Onno Marsman
  // +   bugfixed by: Ulrich
  // +   bugfixed by: Rafal Kukawski
  // +   improved by: kirilloid
  // +   bugfixed by: kirilloid
  // *     example 1: this.utf8Encode('Kevin van Zonneveld')
  // *     returns 1: 'Kevin van Zonneveld'

  if (argString === null || typeof argString === 'undefined') {
    return ''
  }

  let string = argString + '' // .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  let utftext = '',
    start,
    end,
    stringl = 0

  start = end = 0
  stringl = string.length
  for (let n = 0; n < stringl; n++) {
    let c1 = string.charCodeAt(n)
    let enc = null

    if (c1 < 128) {
      end++
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128)
    } else if ((c1 & 0xf800 ^ 0xd800) > 0) {
      enc = String.fromCharCode(
        (c1 >> 12) | 224,
        ((c1 >> 6) & 63) | 128,
        (c1 & 63) | 128
      )
    } else {
      // surrogate pairs
      if ((c1 & 0xfc00 ^ 0xd800) > 0) {
        throw new RangeError('Unmatched trail surrogate at ' + n)
      }
      let c2 = string.charCodeAt(++n)
      if ((c2 & 0xfc00 ^ 0xdc00) > 0) {
        throw new RangeError('Unmatched lead surrogate at ' + (n - 1))
      }
      c1 = ((c1 & 0x3ff) << 10) + (c2 & 0x3ff) + 0x10000
      enc = String.fromCharCode(
        (c1 >> 18) | 240,
        ((c1 >> 12) & 63) | 128,
        ((c1 >> 6) & 63) | 128,
        (c1 & 63) | 128
      )
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.slice(start, end)
      }
      utftext += enc
      start = end = n + 1
    }
  }

  if (end > start) {
    utftext += string.slice(start, stringl)
  }

  return utftext
}

// https://github.com/locutusjs/locutus/blob/master/src/php/xml/utf8_decode.js
function utf8Decode(strData: string) {
  // eslint-disable-line camelcase
  //  discuss at: https://locutus.io/php/utf8_decode/
  // original by: Webtoolkit.info (https://www.webtoolkit.info/)
  //    input by: Aman Gupta
  //    input by: Brett Zamir (https://brett-zamir.me)
  // improved by: Kevin van Zonneveld (https://kvz.io)
  // improved by: Norman "zEh" Fuchs
  // bugfixed by: hitwork
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Kevin van Zonneveld (https://kvz.io)
  // bugfixed by: kirilloid
  // bugfixed by: w35l3y (https://www.wesley.eti.br)
  //   example 1: utf8_decode('Kevin van Zonneveld')
  //   returns 1: 'Kevin van Zonneveld'

  const tmpArr = []
  let i = 0
  let c1 = 0
  let seqlen = 0

  strData += ''

  while (i < strData.length) {
    c1 = strData.charCodeAt(i) & 0xFF
    seqlen = 0

    // https://en.wikipedia.org/wiki/UTF-8#Codepage_layout
    if (c1 <= 0xBF) {
      c1 = (c1 & 0x7F)
      seqlen = 1
    } else if (c1 <= 0xDF) {
      c1 = (c1 & 0x1F)
      seqlen = 2
    } else if (c1 <= 0xEF) {
      c1 = (c1 & 0x0F)
      seqlen = 3
    } else {
      c1 = (c1 & 0x07)
      seqlen = 4
    }

    for (let ai = 1; ai < seqlen; ++ai) {
      c1 = ((c1 << 0x06) | (strData.charCodeAt(ai + i) & 0x3F))
    }

    if (seqlen === 4) {
      c1 -= 0x10000
      tmpArr.push(String.fromCharCode(0xD800 | ((c1 >> 10) & 0x3FF)))
      tmpArr.push(String.fromCharCode(0xDC00 | (c1 & 0x3FF)))
    } else {
      tmpArr.push(String.fromCharCode(c1))
    }

    i += seqlen
  }

  return tmpArr.join('')
}

function base64Encode(data: any) {
  // http://kevin.vanzonneveld.net
  // +   original by: Tyler Akins (http://rumkin.com)
  // +   improved by: Bayron Guevara
  // +   improved by: Thunder.m
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Pellentesque Malesuada
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // -    depends on: this.utf8Encode
  // *     example 1: this.base64Encode('Kevin van Zonneveld')
  // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
  // mozilla has this native
  // - but breaks in 2.0.0.12!
  // if (typeof this.window['atob'] == 'function') {
  //    return atob(data)
  // }
  let b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let o1,
    o2,
    o3,
    h1,
    h2,
    h3,
    h4,
    bits,
    i = 0,
    ac = 0,
    enc = '',
    tmp_arr = []

  if (!data) {
    return data
  }

  data = utf8Encode(data + '')

  do {
    // pack three octets into four hexets
    o1 = data.charCodeAt(i++)
    o2 = data.charCodeAt(i++)
    o3 = data.charCodeAt(i++)

    bits = (o1 << 16) | (o2 << 8) | o3

    h1 = (bits >> 18) & 0x3f
    h2 = (bits >> 12) & 0x3f
    h3 = (bits >> 6) & 0x3f
    h4 = bits & 0x3f

    // use hexets to index into b64, and append result to encoded string
    tmp_arr[ac++] =
      b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
  } while (i < data.length)

  enc = tmp_arr.join('')

  switch (data.length % 3) {
    case 1:
      enc = enc.slice(0, -2) + '=='
      break
    case 2:
      enc = enc.slice(0, -1) + '='
      break
  }

  return enc
}

function base64Decode(data: string) {
  // http://kevin.vanzonneveld.net
  // +   original by: Tyler Akins (http://rumkin.com)
  // +   improved by: Thunder.m
  // +      input by: Aman Gupta
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   bugfixed by: Pellentesque Malesuada
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==')
  // *     returns 1: 'Kevin van Zonneveld'
  // mozilla has this native
  // - but breaks in 2.0.0.12!
  // if (typeof this.window['atob'] == 'function') {
  //    return atob(data)
  // }
  let b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
    ac = 0,
    dec = '',
    tmp_arr = []

  if (!data) {
    return data
  }

  data += ''

  do { // unpack four hexets into three octets using index points in b64
    h1 = b64.indexOf(data.charAt(i++))
    h2 = b64.indexOf(data.charAt(i++))
    h3 = b64.indexOf(data.charAt(i++))
    h4 = b64.indexOf(data.charAt(i++))

    bits = h1 << 18 | h2 << 12 | h3 << 6 | h4

    o1 = bits >> 16 & 0xff
    o2 = bits >> 8 & 0xff
    o3 = bits & 0xff

    if (h3 === 64) {
      tmp_arr[ac++] = String.fromCharCode(o1)
    } else if (h4 === 64) {
      tmp_arr[ac++] = String.fromCharCode(o1, o2)
    } else {
      tmp_arr[ac++] = String.fromCharCode(o1, o2, o3)
    }
  } while (i < data.length)

  dec = tmp_arr.join('')

  return utf8Decode(dec)
}

export function urlSafeBase64Encode(v: any) {
  v = base64Encode(v)

  // 参考 https://tools.ietf.org/html/rfc4648#section-5
  return v.replace(/\//g, '_').replace(/\+/g, '-')
}

export function urlSafeBase64Decode(v: any) {
  v = v.replace(/_/g, '/').replace(/-/g, '+')
  return base64Decode(v)
}
