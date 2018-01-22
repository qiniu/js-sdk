import { createAjax } from "./utils";
import { URLSafeBase64Encode } from "./base64";

function getImageUrl(key, domain) {
  if (!key) {
    throw "key can't be empty";
  }
  key = encodeURI(key);
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
    w = op.w || "",
    h = op.h || "",
    q = op.q || "",
    format = op.format || "";

  if (!w && !h) {
    throw "param w or h is empty in imageView2";
  }

  let imageUrl = "imageView2/" + mode;
  imageUrl += w ? "/w/" + w : "";
  imageUrl += h ? "/h/" + h : "";
  imageUrl += q ? "/q/" + q : "";
  imageUrl += format ? "/format/" + format : "";
  if (key) {
    imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

// invoke the imageMogr2 api of Qiniu

export function imageMogr2(op, key, domain) {
  let auto_orient = op["auto-orient"] || "",
    thumbnail = op.thumbnail || "",
    strip = op.strip || "",
    gravity = op.gravity || "",
    crop = op.crop || "",
    quality = op.quality || "",
    rotate = op.rotate || "",
    format = op.format || "",
    blur = op.blur || "";

  let imageUrl = "imageMogr2";

  imageUrl += auto_orient ? "/auto-orient" : "";
  imageUrl += thumbnail ? "/thumbnail/" + thumbnail : "";
  imageUrl += strip ? "/strip" : "";
  imageUrl += gravity ? "/gravity/" + gravity : "";
  imageUrl += quality ? "/quality/" + quality : "";
  imageUrl += crop ? "/crop/" + crop : "";
  imageUrl += rotate ? "/rotate/" + rotate : "";
  imageUrl += format ? "/format/" + format : "";
  imageUrl += blur ? "/blur/" + blur : "";

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

  if (mode === 1) {
    let image = op.image || "";
    if (!image) {
      throw "image can't be empty in watermark";
    }
    imageUrl += image ? "/image/" + URLSafeBase64Encode(image) : "";
  } else if (mode === 2) {
    let text = op.text ? op.text : "",
      font = op.font ? op.font : "",
      fontsize = op.fontsize ? op.fontsize : "",
      fill = op.fill ? op.fill : "";
    if (!text) {
      throw "text can't be empty in watermark";
    }
    imageUrl += text ? "/text/" + URLSafeBase64Encode(text) : "";
    imageUrl += font ? "/font/" + URLSafeBase64Encode(font) : "";
    imageUrl += fontsize ? "/fontsize/" + fontsize : "";
    imageUrl += fill ? "/fill/" + URLSafeBase64Encode(fill) : "";
  } else {
    throw "mode is wrong";
  }
  let dissolve = op.dissolve || "",
    gravity = op.gravity || "",
    dx = op.dx || "",
    dy = op.dy || "";

  imageUrl += dissolve ? "/dissolve/" + dissolve : "";
  imageUrl += gravity ? "/gravity/" + gravity : "";
  imageUrl += dx ? "/dx/" + dx : "";
  imageUrl += dy ? "/dy/" + dy : "";

  if (key) {
    imageUrl = getImageUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

// invoke the imageInfo api of Qiniu
export function imageInfo(key, domain) {
  return new Promise((resolve, reject) => {
    try {
      if (!key) {
        throw "key can't be empty in imageInfo";
      }
      let url = getImageUrl(key, domain) + "?imageInfo";
      let xhr = createAjax();
      let info;
      let that = this;
      xhr.open("GET", url);
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
          return;
        }
        let info = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          resolve(info);
        }
      };
      xhr.send();
      return info;
    } catch (err) {
      reject(err);
    }
  });
}

// invoke the exif api of Qiniu
export function exif(key, domain) {
  return new Promise((resolve, reject) => {
    try {
      if (!key) {
        throw "key can't be empty in exif";
      }
      let url = getImageUrl(key, domain) + "?exif";
      let xhr = createAjax();
      let info;
      let that = this;
      xhr.open("GET", url);
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
          return;
        }
        let info = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          resolve(info);
        }
      };
      xhr.send();
    } catch (err) {
      reject(err);
    }
  });
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
