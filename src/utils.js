import { uRLSafeBase64Encode } from "./base64";
import { zoneUphostMap } from "./config";

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

// 按索引初始化progress
export function getCurrentStateItem(info) {
  let currentState = {};
  if (info) {
    currentState = {
      percent: 100,
      otime: info.otime,
      loaded: info.blockSize
    };
  } else {
    currentState = {
      percent: 0,
      otime: new Date().getTime(),
      loaded: 0
    };
  }
  return currentState;
}

// 初始化progress
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
  let localFileInfo = getLocal(file.name, "info");
  let successStatus = getLocal(file.name, "status");
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

export function getLocal(name, type) {
  try {
    let localFileInfo = getLocalItemInfo(name) || [];
    let localFileStatus = localStorage.getItem(
      "qiniu_js_sdk_upload_file_status_" + name
    );
    if (type === "info") {
      return localFileInfo;
    } else {
      return localFileStatus;
    }
  } catch (error) {
    throw error;
  }
}

export function getLocalItemInfo(name) {
  try {
    let localFileInfo = JSON.parse(
      localStorage.getItem("qiniu_js_sdk_upload_file_info_" + name)
    );
    return localFileInfo;
  } catch (err) {
    throw err;
  }
}
// 更新分块的本地存储状态
export function updateLocalItem(name, option, size) {
  try {
    let index = option.index;
    let blkdata = option.data;
    let response = option.response;
    let localFileInfo = getLocal(name, "info");
    localFileInfo[index] = {
      ctx: response.ctx,
      blockSize: blkdata.size,
      totalSize: size,
      otime: new Date().getTime()
    };
    setLocalItem(localFileInfo, name);
  } catch (err) {
    throw err;
  }
}

export function setLocalItem(localFileInfo, name) {
  try {
    localStorage.setItem(
      "qiniu_js_sdk_upload_file_info_" + name,
      JSON.stringify(localFileInfo)
    );
  } catch (err) {
    throw err;
  }
}
// check本地存储的信息
export function checkLocalFileInfo(file) {
  let size = 0;
  let totalSize;
  let localFileInfo = getLocal(file.name, "info");
  let localFileStatus = getLocal(file.name, "status");
  if (!localFileInfo.length) {
    return removeLocalItemInfo(file.name);
  }
  for (let i = 0; i < localFileInfo.length; i++) {
    if (localFileInfo[i]) {
      size += localFileInfo[i].blockSize;
      totalSize = localFileInfo[i].totalSize;
    }
  }
  if (totalSize !== file.size) {
    return removeLocalItemInfo(file.name);
  }
  if (size === file.size && localFileStatus === "success") {
    removeLocalItemInfo(file.name);
    removeLocalItemStatus(file.name);
  }
}

export function removeLocalItemInfo(name) {
  localStorage.removeItem("qiniu_js_sdk_upload_file_info_" + name);
}

export function removeLocalItemStatus(name) {
  localStorage.removeItem("qiniu_js_sdk_upload_file_status_" + name);
}

export function isMagic(k, params) {
  return k.startsWith("x:") && params[k];
}

// 构造file上传url
export function createFileUrl(uploadUrl, file, key, putExtra) {
  let requestURI = uploadUrl + "/mkfile/" + file.size;
  if (key !== null && key !== undefined) {
    requestURI += "/key/" + uRLSafeBase64Encode(key);
  }
  if (putExtra.mimeType) {
    requestURI += "/mimeType/" + uRLSafeBase64Encode(putExtra.mimeType);
  }
  const fname = putExtra.fname || key || file.name;
  requestURI += "/fname/" + uRLSafeBase64Encode(fname);
  if (putExtra.params) {
    for (let k in putExtra.params) {
      if (isMagic(k, putExtra.params)) {
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

export function setChunkUploadOption(xhr, url) {
  xhr.open("POST", requestURI);
  xhr.setRequestHeader("content-type", "application/octet-stream");
}

export function setCtxUploadOption(xhr, url, token) {
  xhr.open("POST", url);
  xhr.setRequestHeader("Content-Type", "text/plain");
  var auth = "UpToken " + token;
  xhr.setRequestHeader("Authorization", auth);
}

export let createAjax = () => {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  return new ActiveXObject("Microsoft.XMLHTTP");
};

// 构造区域上传url
export function getUploadUrl(config) {
  let upHosts = zoneUphostMap[config.zone] || zoneUphostMap.z0;
  const protocol = config.useHttpsDomain ? "https" : "http";
  const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
  return `${protocol}://${host}`;
}
