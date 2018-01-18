import { createAjax } from "./utils";
import { URLSafeBase64Encode } from "./base64";

function getUrl(key, domain) {
  if (!key) {
    return false;
  }
  key = encodeURI(key);
  if (domain.slice(domain.length - 1) !== "/") {
    domain = domain + "/";
  }
  return domain + key;
}

export function imageView2(op, key, domain) {
  if (!/^\d$/.test(op.mode)) {
    return false;
  }
  var mode = op.mode,
    w = op.w || "",
    h = op.h || "",
    q = op.q || "",
    format = op.format || "";

  if (!w && !h) {
    return false;
  }

  var imageUrl = "imageView2/" + mode;
  imageUrl += w ? "/w/" + w : "";
  imageUrl += h ? "/h/" + h : "";
  imageUrl += q ? "/q/" + q : "";
  imageUrl += format ? "/format/" + format : "";
  if (key) {
    imageUrl = getUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

/**
 * invoke the imageMogr2 api of Qiniu
 */
export function imageMogr2(op, key, domain) {
  var auto_orient = op["auto-orient"] || "",
    thumbnail = op.thumbnail || "",
    strip = op.strip || "",
    gravity = op.gravity || "",
    crop = op.crop || "",
    quality = op.quality || "",
    rotate = op.rotate || "",
    format = op.format || "",
    blur = op.blur || "";
  //Todo check option

  var imageUrl = "imageMogr2";

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
    imageUrl = getUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

/**
 * invoke the watermark api of Qiniu
 */
export function watermark(op, key, domain) {
  var mode = op.mode;
  if (!mode) {
    return false;
  }

  var imageUrl = "watermark/" + mode;

  if (mode === 1) {
    var image = op.image || "";
    if (!image) {
      return false;
    }
    imageUrl += image ? "/image/" + URLSafeBase64Encode(image) : "";
  } else if (mode === 2) {
    var text = op.text ? op.text : "",
      font = op.font ? op.font : "",
      fontsize = op.fontsize ? op.fontsize : "",
      fill = op.fill ? op.fill : "";
    if (!text) {
      return false;
    }
    imageUrl += text ? "/text/" + URLSafeBase64Encode(text) : "";
    imageUrl += font ? "/font/" + URLSafeBase64Encode(font) : "";
    imageUrl += fontsize ? "/fontsize/" + fontsize : "";
    imageUrl += fill ? "/fill/" + URLSafeBase64Encode(fill) : "";
  } else {
    // Todo mode3
    return false;
  }
  var dissolve = op.dissolve || "",
    gravity = op.gravity || "",
    dx = op.dx || "",
    dy = op.dy || "";

  imageUrl += dissolve ? "/dissolve/" + dissolve : "";
  imageUrl += gravity ? "/gravity/" + gravity : "";
  imageUrl += dx ? "/dx/" + dx : "";
  imageUrl += dy ? "/dy/" + dy : "";

  if (key) {
    imageUrl = getUrl(key, domain) + "?" + imageUrl;
  }
  return imageUrl;
}

/**
 * invoke the imageInfo api of Qiniu
 */
export function imageInfo(key, domain) {
  if (!key) {
    return false;
  }
  var url = getUrl(key, domain) + "?imageInfo";
  var xhr = createAjax();
  var info;
  var that = this;
  xhr.open("GET", url, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      info = that.parseJSON(xhr.responseText);
    }
  };
  xhr.send();
  return info;
}

/**
 * invoke the exif api of Qiniu
 */
export function exif(key, domain) {
  if (!key) {
    return false;
  }
  var url = getUrl(key, domain) + "?exif";
  var xhr = createAjax();
  var info;
  var that = this;
  xhr.open("GET", url, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      info = that.parseJSON(xhr.responseText);
    }
  };
  xhr.send();
  return info;
}

export function pipeline(arr, key, domain) {
  var isArray = Object.prototype.toString.call(arr) === "[object Array]";
  var option,
    errOp,
    imageUrl = "";
  if (isArray) {
    for (var i = 0, len = arr.length; i < len; i++) {
      option = arr[i];
      if (!option.fop) {
        return false;
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
        return false;
      }
    }
    if (key) {
      imageUrl = getUrl(key, domain) + "?" + imageUrl;
      var length = imageUrl.length;
      if (imageUrl.slice(length - 1) === "|") {
        imageUrl = imageUrl.slice(0, length - 1);
      }
    }
    return imageUrl;
  }
  return false;
}
