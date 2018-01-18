import { URLSafeBase64Encode } from "./base64";
import { ZONE } from "./config";
// check是否时间过期
export function checkExpire(expireAt) {
  expireAt = (expireAt + 3600 * 24) * 1000;
  return new Date().getTime() > expireAt;
}
// 文件分块
export function getChunks(file, BLOCK_SIZE) {
  let arrayBlob = [];
  let count = Math.ceil(file.size / BLOCK_SIZE);
  for (let i = 0; i < count; i++) {
    let chunk = file.slice(
      BLOCK_SIZE * i,
      i === count ? file.size : BLOCK_SIZE * (i + 1)
    );
    arrayBlob.push(chunk);
  }
  return arrayBlob;
}
// 按索引初始化progress
export function getProgressItem(info) {
  let progress = {};
  if (info) {
    progress = {
      percent: 100,
      otime: info.otime,
      loaded: info.blockSize
    };
  } else {
    progress = {
      percent: 0,
      otime: new Date().getTime(),
      loaded: 0
    };
  }
  return progress;
}
// 初始化progress
export function initProgress(file) {
  let progress = {
    total: {
      loaded: 0,
      percent: 0,
      otime: new Date().getTime()
    }
  };
  let localFileInfo = getLocal(file.name, "info");
  let successStatus = getLocal(file.name, "status");
  if (localFileInfo && localFileInfo.length) {
    if (successStatus !== "success") {
      localFileInfo.map(function(value, index) {
        if (value) {
          progress.total.loaded += value.blockSize;
        }
      });
      progress.total.percent = Math.round(
        progress.total.loaded / file.size * 100
      );
    }
  }
  return progress;
}

function getLocal(name, type) {
  try {
    let localFileInfo =
      JSON.parse(
        localStorage.getItem("qiniu_js_sdk_upload_file_info_" + name)
      ) || [];
    let localFileStatus = localStorage.getItem(
      "qiniu_js_sdk_upload_file_status_" + name
    );
    if (type === "info") {
      return localFileInfo;
    } else {
      return localFileStatus;
    }
  } catch (error) {
    console.log(error);
  }
}
// 每次分块上传后都更新本地存储状态
export function setLocalItem(name, option, size) {
  let index = option.index;
  let blkdata = option.data;
  let respo = option.respo;
  let localFileInfo = getLocal(name, "info");
  localFileInfo[index] = {
    ctx: respo.ctx,
    blockSize: blkdata.size,
    totalSize: size,
    otime: new Date().getTime()
  };
  localStorage.setItem(
    "qiniu_js_sdk_upload_file_info_" + name,
    JSON.stringify(localFileInfo)
  );
}
// check本地存储的信息
export function checkLocalFileInfo(file) {
  let size = 0;
  let totalSize;
  let localFileInfo = getLocal(file.name, "info");
  let localFileStatus = getLocal(file.name, "status");
  if (!localFileInfo.length) {
    return removeItemInfo(file.name);
  }
  for (let i = 0; i < localFileInfo.length; i++) {
    if (localFileInfo[i]) {
      size += localFileInfo[i].blockSize;
      totalSize = localFileInfo[i].totalSize;
    }
  }
  if (totalSize !== file.size) {
    return removeItemInfo(file.name);
  }
  if (size === file.size && localFileStatus === "success") {
    removeItemInfo(file.name);
    removeItemStatus(file.name);
  }
}

function removeItemInfo(name) {
  localStorage.removeItem("qiniu_js_sdk_upload_file_info_" + name);
}

function removeItemStatus(name) {
  localStorage.removeItem("qiniu_js_sdk_upload_file_status_" + name);
}

export function updateProgress(evt, index, progress, totalSize) {
  // evt.total是需要传输的总字节，evt.loaded是已经传输的字节。如果evt.lengthComputable不为真，则evt.total等于0
  let progressTotal = progress["total"];
  let newLoad;
  if (evt.lengthComputable) {
    if (index !== "no") {
      let progressUnit = progress[index];
      progressUnit.total = evt.total;
      newLoad = evt.loaded - progressUnit.loaded;
      progressUnit.loaded = evt.loaded;
      progressUnit.percent = Math.round(evt.loaded / evt.total * 100);
    } else {
      newLoad = evt.loaded - progressTotal.loaded;
    }
  } else {
    return false;
  }
  progressTotal.loaded = progressTotal.loaded + newLoad;
  let totalPercent = Math.round(progressTotal.loaded / totalSize * 100);
  progressTotal.percent = totalPercent >= 100 ? 100 - 1 : totalPercent;
  return progress;
}
// 构造file上传url
export function createFileUrl(uploadUrl, file, key, putExtra) {
  let requestURI = uploadUrl + "/mkfile/" + file.size;
  if (key) {
    requestURI += "/key/" + URLSafeBase64Encode(key);
  }
  if (putExtra.mimeType) {
    requestURI += "/mimeType/" + URLSafeBase64Encode(putExtra.mimeType);
  }
  if (!putExtra.fname) {
    putExtra.fname = key ? key : file.name;
  }
  requestURI += "/fname/" + URLSafeBase64Encode(putExtra.fname);
  if (putExtra.params) {
    for (var k in putExtra.params) {
      if (k.startsWith("x:") && putExtra.params[k]) {
        requestURI +=
          "/" + k + "/" + URLSafeBase64Encode(putExtra.params[k].toString());
      }
    }
  }
  return requestURI;
}

export var createAjax = () => {
  if (window.XMLHttpRequest) {
    xmlhttp = new XMLHttpRequest();
  } else {
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  return xmlhttp;
};
// 构造区域上传url
export function getUploadUrl(config) {
  let upHosts = {};
  switch (config.zone) {
    case "z0":
      upHosts = ZONE.z0;
      break;
    case "z1":
      upHosts = ZONE.z1;
      break;
    case "z2":
      upHosts = ZONE.z2;
      break;
    case "na0":
      upHosts = ZONE.na0;
      break;
    default:
      upHosts = ZONE.z0;
  }
  let scheme = config.useHttpsDomain ? "https://" : "http://";
  let uploadUrl = config.useCdnDomain
    ? scheme + upHosts["cdnUphost"]
    : scheme + upHosts["srcUphost"];
  return uploadUrl;
}
