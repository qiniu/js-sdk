import { urlSafeBase64Encode, urlSafeBase64Decode } from "./base64";
import { regionUphostMap } from "./config";
import SparkMD5 from "spark-md5";

// 对上传块本地存储时间检验是否过期
// TODO: 最好用服务器时间来做判断
export function isChunkExpired(time) {
  let expireAt = time + 3600 * 24 * 1000;
  return new Date().getTime() > expireAt;
}

// 文件分块
export function getChunks(file, blockSize) {
  let chunks = [];
  let count = Math.ceil(file.size / blockSize);
  for (let i = 0; i < count; i++) {
    let chunk = file.slice(
      blockSize * i,
      i === count - 1 ? file.size : blockSize * (i + 1)
    );
    chunks.push(chunk);
  }
  return chunks;
}

export function filterParams(params) {
  return Object.keys(params)
    .filter(value => value.startsWith("x:"))
    .map(k => [k, params[k].toString()]);
}

export function sum(list){
  return list.reduce((sum, loaded) => {
    return sum + loaded;
  }, 0);
}

export function setLocalFileInfo(file, info) {
  try {
    localStorage.setItem(createLocalKey(file), JSON.stringify(info));
  } catch (err) {
    if (window.console && window.console.warn){
      console.warn("setLocalFileInfo failed");
    }
  }
}

function createLocalKey(file){
  return "qiniu_js_sdk_upload_file_" + file.name + "_size_" + file.size;
}

export function removeLocalFileInfo(file) {
  try {
    localStorage.removeItem(createLocalKey(file));
  } catch (err) {
    if (window.console && window.console.warn){
      console.warn("removeLocalFileInfo failed");
    }
  }
}

export function getLocalFileInfo(file) {
  try {
    return JSON.parse(localStorage.getItem(createLocalKey(file))) || [];
  } catch (err) {
    if (window.console && window.console.warn){
      console.warn("getLocalFileInfo failed");
    }
    return [];
  }
}

export function getResumeUploadedSize(file) {
  return getLocalFileInfo(file).filter(
      value => value && !isChunkExpired(value.time)
    ).reduce(
      (result, value) => result + value.size,
      0
    );
}

// 构造file上传url
export function createMkFileUrl(url, file, key, putExtra) {
  let requestUrl = url + "/mkfile/" + file.size;
  if (key != null) {
    requestUrl += "/key/" + urlSafeBase64Encode(key);
  }
  if (putExtra.mimeType) {
    requestUrl += "/mimeType/" + urlSafeBase64Encode(file.type);
  }
  let fname = putExtra.fname;
  if (fname) {
    requestUrl += "/fname/" + urlSafeBase64Encode(fname);
  }
  if (putExtra.params) {
    filterParams(putExtra.params).forEach(
      item =>
        (requestUrl += "/" + encodeURIComponent(item[0]) + "/" + urlSafeBase64Encode(item[1]))
    );
  }
  return requestUrl;
}

function getAuthHeaders(token) {
  let auth = "UpToken " + token;
  return { Authorization: auth };
}

export function getHeadersForChunkUpload(token) {
  let header = getAuthHeaders(token);
  return Object.assign({ "content-type": "application/octet-stream" }, header);
}

export function getHeadersForMkFile(token) {
  let header = getAuthHeaders(token);
  return Object.assign({ "content-type": "text/plain" }, header);
}

export function createXHR() {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  return new window.ActiveXObject("Microsoft.XMLHTTP");
}

export function computeMd5(data) {
  return readAsArrayBuffer(data).then(buffer => {
    let spark = new SparkMD5.ArrayBuffer();
    spark.append(buffer);
    return spark.end();
  });
}

export function readAsArrayBuffer(data) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.readAsArrayBuffer(data);
    reader.onload = evt => {
      let body = evt.target.result;
      resolve(body);
    };
    reader.onerror = () => {
      reject(new Error("fileReader 读取错误"));
    };
  });
}

export function request(url, options) {
  return new Promise((resolve, reject) => {
    let xhr = createXHR();
    xhr.open(options.method, url);

    if (options.onCreate) {
      options.onCreate(xhr);
    }
    if (options.headers) {
      Object.keys(options.headers).forEach(k =>
        xhr.setRequestHeader(k, options.headers[k])
      );
    }

    xhr.upload.addEventListener("progress", evt => {
      if (evt.lengthComputable && options.onProgress) {
        options.onProgress({loaded: evt.loaded, total: evt.total});
      }
    });

    xhr.onreadystatechange = () => {
      let responseText = xhr.responseText;
      if (xhr.readyState !== 4) {
        return;
      }
      let reqId = xhr.getResponseHeader("x-reqId") || "";
      if (xhr.status !== 200) {
        let message = `xhr request failed, code: ${xhr.status};`;
        if (responseText) {
          message = message + ` response: ${responseText}`;
        }
        reject({code: xhr.status, message: message, reqId: reqId, isRequestError: true});
        return;
      }
      try {
        resolve({data: JSON.parse(responseText), reqId: reqId});
      } catch (err) {
        reject(err);
      }
    };

    xhr.send(options.body);
  });
}

export function getPortFromUrl(url) {
  if (url && url.match) {
    let groups = url.match(/(^https?)/);
    if (!groups) {
        return "";
    }
    let type = groups[1];
    groups = url.match(/^https?:\/\/([^:^/]*):(\d*)/);
    if (groups) {
      return groups[2];
    }
    if (type === "http") {
      return "80";
    }
    return "443";
  }
  return "";
}

export function getDomainFromUrl (url) {
  if (url && url.match) {
      let groups = url.match(/^https?:\/\/([^:^/]*)/);
      return groups ? groups[1] : "";
  }
  return "";
}

// 构造区域上传url
export function getUploadUrl(config, token) {
  let protocol = getAPIProtocol();

  if (config.uphost != null) {
    return Promise.resolve(`${protocol}//${config.uphost}`);
  }

  if (config.region != null) {
    let upHosts = regionUphostMap[config.region];
    let host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
    return Promise.resolve(`${protocol}//${host}`);
  }

  return getUpHosts(token)
    .then(res => {
      let hosts = res.data.up.acc.main;
      return (`${protocol}//${hosts[0]}`);
    });
}

function getAPIProtocol() {
  if (window.location.protocol === "http:") {
    return "http:";
  }
  return "https:";
}

function getPutPolicy(token) {
  let segments = token.split(":");
  let ak = segments[0];
  let putPolicy = JSON.parse(urlSafeBase64Decode(segments[2]));
  putPolicy.ak = ak;
  putPolicy.bucket = putPolicy.scope.split(":")[0];
  return putPolicy;
}

function getUpHosts(token) {
  try {
    let putPolicy = getPutPolicy(token);
    let url = getAPIProtocol() + "//api.qiniu.com/v2/query?ak=" + putPolicy.ak + "&bucket=" + putPolicy.bucket;
    return request(url, { method: "GET" });
  } catch (e) {
    return Promise.reject(e);
  }
}

export function isContainFileMimeType(fileType, mimeType) {
  return mimeType.indexOf(fileType) > -1;
}

export function createObjectURL(file) {
  let URL = window.URL || window.webkitURL || window.mozURL;
  return URL.createObjectURL(file);
}

export function getTransform(image, orientation) {
  let { width, height } = image;

  switch (orientation) {
    case 1:
      // default
      return {
          width, height,
          matrix: [1, 0, 0, 1, 0, 0]
      };
    case 2:
      // horizontal flip
      return {
          width, height,
          matrix: [-1, 0, 0, 1, width, 0]
      };
    case 3:
      // 180° rotated
      return {
          width, height,
          matrix: [-1, 0, 0, -1, width, height]
      };
    case 4:
      // vertical flip
      return {
          width, height,
          matrix: [1, 0, 0, -1, 0, height]
      };
    case 5:
      // vertical flip + -90° rotated
      return {
        width: height,
        height: width,
        matrix: [0, 1, 1, 0, 0, 0]
      };
    case 6:
      // -90° rotated
      return {
          width: height,
          height: width,
          matrix: [0, 1, -1, 0, height, 0]
        };
    case 7:
      // horizontal flip + -90° rotate
      return {
          width: height,
          height: width,
          matrix: [0, -1, -1, 0, height, width]
      };
    case 8:
      // 90° rotated
      return {
          width: height,
          height: width,
          matrix: [0, -1, 1, 0, 0, width]
        };
  }
}
