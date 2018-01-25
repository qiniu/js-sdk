import { uRLSafeBase64Encode } from "./base64";
import { zoneUphostMap, ZONES } from "./config";
import SparkMD5 from "spark-md5";
import { create } from "domain";
import { resolve } from "url";

// 对上传块本地存储时间检验是否过期
export function isChunkExpired(expireAt) {
  expireAt = (expireAt + 3600 * 24) * 1000;
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

// 按索引初始化currentState
export function getCurrentStateItem(item) {
  let currentState = {
    percent: item.percent,
    total: item.blockSize,
    loaded: item.loaded
  };
  return currentState;
}

// 初始化currentState
export function initCurrentState(file) {
  let currentState = {
    total: {
      loaded: 0,
      percent: 0,
      otime: new Date().getTime()
    },
    mkFileReqState: 0,
    chunks: []
  };
  let localFileInfo = getLocalItemInfo(file.name);
  let successStatus = getLocalItemStatus(file.name);
  if (localFileInfo && localFileInfo.length) {
    if (successStatus !== "success") {
      localFileInfo.map(function(value, index) {
        if (value) {
          currentState.total.loaded += value.blockSize;
        }
      });
      currentState.total.percent = Math.round(
        currentState.total.loaded / file.size * 100
      );
    }
  }
  return currentState;
}

// 更新分块的本地存储状态
export function updateLocalItem(name, option, size) {
  let index = option.index;
  let blkdata = option.data;
  let response = option.response;
  let localFileInfo = getLocalItemInfo(name);
  localFileInfo[index] = {
    ctx: response.ctx,
    blockSize: blkdata.size,
    totalSize: size,
    otime: new Date().getTime()
  };
  setLocalItemInfo(localFileInfo, name);
}

function getFileMd5Info(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    let spark = new SparkMD5.ArrayBuffer();
    reader.readAsArrayBuffer(file);
    reader.onload = evt => {
      let binary = evt.target.result;
      spark.append(binary);
      resolve(spark.end());
    };
    reader.onerror = () => reject(new Error("fileReader 读取错误"));
  });
}

// check本地存储的信息
export function getLocalFileInfo(file) {
  return new Promise((resolve, reject) => {
    getFileMd5Info(file)
      .then(md5 => {
        let localFileInfo = getLocal(file.name, md5);
        resolve({ md5: md5, info: localFileInfo });
      })
      .catch(err => {
        resolve({ md5: "", info: [] });
      });
  });
}

export function setLocalFileInfo(name, md5, info) {
  try {
    localStorage.setItem(
      "qiniu_js_sdk_upload_file_md5_" + md5 + "_" + name,
      JSON.stringify(info)
    );
  } catch (err) {
    console.warn("localStorage.setItem failed");
    return "";
  }
}

export function removeLocalFileInfo(name, md5) {
  try {
    localStorage.removeItem("qiniu_js_sdk_upload_file_md5_" + md5 + "_" + name);
  } catch (err) {
    console.warn("localStorage.removeItem failed");
    return "";
  }
}

function getLocal(name, md5) {
  try {
    let localFileInfo =
      JSON.parse(
        localStorage.getItem("qiniu_js_sdk_upload_file_md5_" + md5 + "_" + name)
      ) || [];
    return localFileInfo;
  } catch (err) {
    console.warn("localStorage.getItem failed");
    return "";
  }
}

export function isCustomVar(k, params) {
  return k.startsWith("x:") && params[k];
}

// 构造file上传url
export function createMkFileUrl(url, file, key, putExtra) {
  let requestURI = url + "/mkfile/" + file.size;
  if (key !== null && key !== undefined) {
    requestURI += "/key/" + uRLSafeBase64Encode(key);
  }
  if (putExtra.mimeType) {
    requestURI += "/mimeType/" + uRLSafeBase64Encode(putExtra.mimeType);
  }
  let fname = putExtra.fname;
  if (fname) {
    requestURI += "/fname/" + uRLSafeBase64Encode(fname);
  }
  if (putExtra.params) {
    for (let k in putExtra.params) {
      if (isCustomVar(k, putExtra.params)) {
        requestURI +=
          "/" +
          encodeURIComponent(k) +
          "/" +
          uRLSafeBase64Encode(putExtra.params[k].toString());
      }
    }
  }
  return requestURI;
}

export function getResumeUploadXHR(url, token, type) {
  let xhr = createXHR();
  xhr.open("POST", url);
  let auth = "UpToken " + token;
  xhr.setRequestHeader("Authorization", auth);
  if (type === "chunk") {
    xhr.setRequestHeader("content-type", "application/octet-stream");
  } else {
    xhr.setRequestHeader("Content-Type", "text/plain");
  }
  return xhr;
}

function getAuthHeaders(token) {
  let auth = "UpToken " + token;
  return { Authorization: auth };
}

export function getHeadersForChunkUpload(token) {
  let header = getAuthHeaders(token);
  return Object.assign({ "content-type": "application/octet-stream" }, header);
}
export function getHeadersForMkfile(token) {
  let header = getAuthHeaders(token);
  return Object.assign({ "content-type": "text/plain" }, header);
}

export let createXHR = () => {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  return new ActiveXObject("Microsoft.XMLHTTP");
};

// 构造区域上传url
export function getUploadUrl(config) {
  let upHosts = zoneUphostMap[config.zone] || zoneUphostMap[Zones.z0];
  const protocol = config.useHttpsDomain ? "https" : "http";
  const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
  return `${protocol}://${host}`;
}
