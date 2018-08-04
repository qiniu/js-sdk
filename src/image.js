import { request } from "./utils";
import { urlSafeBase64Encode } from "./base64";

function getImageUrl(key, domain) {
  key = encodeURIComponent(key);
  if (domain.slice(domain.length - 1) !== "/") {
    domain = domain + "/";
  }
  return domain + key;
}

export function imageView2(op, key, domain) {
  if (!/^\d$/.test(op.mode)) {
    throw "mode should be number in imageView2";
  }
  let mode = op.mode,
    w = op.w,
    h = op.h,
    q = op.q,
    format = op.format;

  if (!w && !h) {
    throw "param w and h is empty in imageView2";
  }

  let imageUrl = "imageView2/" + encodeURIComponent(mode);
  imageUrl += w ? "/w/" + encodeURIComponent(w) : "";
  imageUrl += h ? "/h/" + encodeURIComponent(h) : "";
  imageUrl += q ? "/q/" + encodeURIComponent(q) : "";
  imageUrl += format ? "/format/" + encodeURIComponent(format) : "";
  if (key) {
    imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

// invoke the imageMogr2 api of Qiniu

export function imageMogr2(op, key, domain) {
  let auto_orient = op["auto-orient"],
    thumbnail = op.thumbnail,
    strip = op.strip,
    gravity = op.gravity,
    crop = op.crop,
    quality = op.quality,
    rotate = op.rotate,
    format = op.format,
    blur = op.blur;

  let imageUrl = "imageMogr2";

  imageUrl += auto_orient ? "/auto-orient" : "";
  imageUrl += thumbnail ? "/thumbnail/" + encodeURIComponent(thumbnail) : "";
  imageUrl += strip ? "/strip" : "";
  imageUrl += gravity ? "/gravity/" + encodeURIComponent(gravity) : "";
  imageUrl += quality ? "/quality/" + encodeURIComponent(quality) : "";
  imageUrl += crop ? "/crop/" + encodeURIComponent(crop) : "";
  imageUrl += rotate ? "/rotate/" + encodeURIComponent(rotate) : "";
  imageUrl += format ? "/format/" + encodeURIComponent(format) : "";
  imageUrl += blur ? "/blur/" + encodeURIComponent(blur) : "";
  if (key) {
    imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

// invoke the watermark api of Qiniu

export function watermark(op, key, domain) {
  let mode = op.mode;
  if (!mode) {
    throw "mode can't be empty in watermark";
  }

  let imageUrl = "watermark/" + mode;
  if (mode !== 1 && mode !== 2) {
    throw "mode is wrong";
  }

  if (mode === 1) {
    let image = op.image;
    if (!image) {
      throw "image can't be empty in watermark";
    }
    imageUrl += image ? "/image/" + urlSafeBase64Encode(image) : "";
  }

  if (mode === 2) {
    let text = op.text,
      font = op.font,
      fontsize = op.fontsize,
      fill = op.fill;
    if (!text) {
      throw "text can't be empty in watermark";
    }
    imageUrl += text ? "/text/" + urlSafeBase64Encode(text) : "";
    imageUrl += font ? "/font/" + urlSafeBase64Encode(font) : "";
    imageUrl += fontsize ? "/fontsize/" + fontsize : "";
    imageUrl += fill ? "/fill/" + urlSafeBase64Encode(fill) : "";
  }
  let dissolve = op.dissolve,
    gravity = op.gravity,
    dx = op.dx,
    dy = op.dy;

  imageUrl += dissolve ? "/dissolve/" + encodeURIComponent(dissolve) : "";
  imageUrl += gravity ? "/gravity/" + encodeURIComponent(gravity) : "";
  imageUrl += dx ? "/dx/" + encodeURIComponent(dx) : "";
  imageUrl += dy ? "/dy/" + encodeURIComponent(dy) : "";
  if (key) {
    imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

// invoke the imageInfo api of Qiniu
export function imageInfo(key, domain) {
  let url = getImageUrl(key, domain) + "?imageInfo";
  return request(url, { method: "GET" });
}

// invoke the exif api of Qiniu
export function exif(key, domain) {
  let url = getImageUrl(key, domain) + "?exif";
  return request(url, { method: "GET" });
}

export function pipeline(arr, key, domain) {
  let isArray = Object.prototype.toString.call(arr) === "[object Array]";
  let option,
    errOp,
    imageUrl = "";
  if (isArray) {
    for (let i = 0, len = arr.length; i < len; i++) {
      option = arr[i];
      if (!option.fop) {
        throw "fop can't be empty in pipeline";
      }
      switch (option.fop) {
        case "watermark":
          imageUrl += watermark(option) + "|";
          break;
        case "imageView2":
          imageUrl += imageView2(option) + "|";
          break;
        case "imageMogr2":
          imageUrl += imageMogr2(option) + "|";
          break;
        default:
          errOp = true;
          break;
      }
      if (errOp) {
        throw "fop is wrong in pipeline";
      }
    }
    if (key) {
      imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
      let length = imageUrl.length;
      if (imageUrl.slice(length - 1) === "|") {
        imageUrl = imageUrl.slice(0, length - 1);
      }
    }
    return imageUrl;
  }
  throw "pipeline's first param should be array";
}
