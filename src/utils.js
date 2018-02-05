import { urlSafeBase64Encode } from "./base64";
import { regionUphostMap, region } from "./config";
import SparkMD5 from "spark-md5";

// 对上传块本地存储时间检验是否过期
export function isChunkExpired(time) {
  let expireAt = time + 3600 * 24* 1000;
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

// check本地存储的信息
export function getLocalFileInfoAndMd5(file) {
  return new Promise((resolve, reject) => {
    readAsArrayBuffer(file)
      .then(body => {
        let spark = new SparkMD5.ArrayBuffer();
        spark.append(body);
        let md5 = spark.end();
        let localFileInfo = getLocalFileInfo(file.name, md5);
        resolve({ md5: md5, info: localFileInfo });
      })
      .catch(err => {
        resolve({ md5: "", info: [] });
      });
  });
}

export function sum(list){
  return list.reduce((sum, loaded) => {
    return sum + loaded;
  },0)
}

export function setLocalFileInfo(name, md5, info) {
  try {
    localStorage.setItem(createLocalKey(name, md5), JSON.stringify(info));
  } catch (err) {
    if(window.console && window.console.warn){
      console.warn("setLocalFileInfo failed");
    }
  }
}

function createLocalKey(name, md5){
  return "qiniu_js_sdk_upload_file_md5_" + md5 + "_" + name
}

export function removeLocalFileInfo(name, md5) {
  try {
    localStorage.removeItem(createLocalKey(name, md5));
  } catch (err) {
    if(window.console && window.console.warn){
      console.warn("removeLocalFileInfo failed");
    }
  }
}

function getLocalFileInfo(name, md5) {
  try {
    return JSON.parse(localStorage.getItem(createLocalKey(name, md5))) || [];
  } catch (err) {
    if(window.console && window.console.warn){
      console.warn("getLocalFileInfo failed");
    }
    return [];
  }
}

// 构造file上传url
export function createMkFileUrl(url, size, key, putExtra) {
  let requestUrl = url + "/mkfile/" + size;
  if (key != null) {
    requestUrl += "/key/" + urlSafeBase64Encode(key);
  }
  if (putExtra.mimeType) {
    requestUrl += "/mimeType/" + urlSafeBase64Encode(putExtra.mimeType);
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
  return new ActiveXObject("Microsoft.XMLHTTP");
};

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
      if (xhr.status !== 200) {
        let message = `xhr request failed, code: ${xhr.status};`;
        if (responseText) {
          message = message + ` response: ${responseText}`;
        }
        reject(new Error(message));
        return;
      }
      try {
        resolve(JSON.parse(responseText))
      } catch (err) {
        reject(err)
      }
    };

    xhr.send(options.body);
  });
}

// 构造区域上传url
export function getUploadUrl(config) {
  let upHosts = regionUphostMap[config.region] || regionUphostMap[region.z0];
  let protocol = window.location.protocol === 'https:' ?  "https" : "http";
  let host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
  return `${protocol}://${host}`;
}

export function isContainFileMimeType(fileType, mimeType){
  return mimeTyp.indexOf(fileType) > -1
}
