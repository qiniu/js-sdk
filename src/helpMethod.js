import { URLSafeBase64Encode } from "./base64.js";
import { Zone } from "./config.js";
export function checkExpire(expireAt) {
  expireAt += 3600 * 24;
  if (expireAt < new Date().getTime() / 1000) {
    return true;
  }
  return false;
}
//辅助方法加注释
export function getChunks(file, BLOCK_SIZE) {
  let arrayBlob = [];
  let count = Math.ceil(file.size / BLOCK_SIZE);
  let start = 0;
  let end = 0;
  for (let i = 0; i < count; i++) {
    if (i == count) {
      end = file.size;
    } else {
      end = start + BLOCK_SIZE;
    }
    arrayBlob.push(file.slice(start, end));
    start = end;
  }
  return arrayBlob;
}

export function initProgressIndex(info, index, progress) {
  if (info) {
    progress[index] = {};
    progress[index].percent = 100;
    progress[index].ot = info.ot;
    progress[index].loaded = info.blockSize;
  } else {
    progress[index] = {};
    progress[index].percent = 0;
    progress[index].ot = new Date().getTime();
    progress[index].loaded = 0;
  }
}

export function initProgress(file) {
  let progress = {};
  progress["total"] = {};
  progress["total"].loaded = 0;
  progress["total"].percent = 0;
  progress["total"].ot = new Date().getTime();
  let localFileInfo = JSON.parse(localStorage.getItem("qiniu_" + file.name));
  let successStatus = localStorage.getItem("qiniu_file_" + file.name);
  console.log("successStatus:" + successStatus);
  if (localFileInfo && localFileInfo.length) {
    console.log("本地有该文件存储记录...");
    if (successStatus != "success") {
      localFileInfo.map(function(value, index) {
        if (value) {
          console.log(value.blockSize);
          progress["total"].loaded += value.blockSize;
        }
      });
      progress["total"].percent = Math.round(
        progress["total"].loaded / file.size * 100
      );
      console.log(progress);
    }
    //了解下map和forEach区别
  }
  return progress;
}

export function setLocalItem(name, option, size) {
  let index = option.index;
  let blkdata = option.data;
  let respo = option.respo;
  let localInfo = JSON.parse(localStorage.getItem("qiniu_" + name)) || [];
  localInfo[index] = {
    ctx: respo.ctx,
    blockSize: blkdata.size,
    totalSize: size,
    ot: new Date().getTime()
  };
  localStorage.setItem("qiniu_" + name, JSON.stringify(localInfo));
}

export function checkLocalFileInfo(file) {
  let size = 0;
  let totalSize;
  let localFileInfo =
    JSON.parse(localStorage.getItem("qiniu_" + file.name)) || [];
  let successStatus = localStorage.getItem("qiniu_file_" + file.name);
  if (localFileInfo.length) {
    for (let i = 0; i < localFileInfo.length; i++) {
      if (localFileInfo[i]) {
        size += localFileInfo[i].blockSize;
        totalSize = localFileInfo[i].totalSize;
      }
    }
    if (totalSize == file.size) {
      if (size === file.size && successStatus == "success") {
        console.log("remove for success");
        localStorage.removeItem("qiniu_" + file.name);
        localStorage.removeItem("qiniu_file_" + file.name);
      }
    } else {
      localStorage.removeItem("qiniu_" + file.name);
      console.log("remove for not equal");
    }
  } else {
    localStorage.removeItem("qiniu_" + file.name);
    console.log("remove....");
  }
}

export function updateProgress(evt, index, progress, totalSize) {
  // evt.total是需要传输的总字节，evt.loaded是已经传输的字节。如果evt.lengthComputable不为真，则evt.total等于0
  let progressTotal = progress["total"];
  let newLoad;
  if (evt.lengthComputable) {
    if (index != "no") {
      let progressUnit = progress[index];
      progressUnit.total = evt.total;
      newLoad = evt.loaded - progressUnit.loaded;
      progressUnit.loaded = evt.loaded;
      progressUnit.percent = Math.round(evt.loaded / evt.total * 100);
    } else {
      newLoad = evt.loaded - progressTotal.loaded;
    }
  } else {
    console.log("文件内容为空");
    return false;
  }
  progressTotal.loaded = progressTotal.loaded + newLoad;
  let totalPercent = Math.round(progressTotal.loaded / totalSize * 100);
  progressTotal.percent = totalPercent >= 100 ? 100 - 1 : totalPercent;
  return progress;
}

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
    //putExtra params
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

export function getUploadUrl(config) {
  let upHosts = {};
  switch (config.zone) {
    case "Zone_z0":
      upHosts = Zone.Zone_z0;
      break;
    case "Zone_z1":
      upHosts = Zone.Zone_z1;
      break;
    case "Zone_z2":
      upHosts = Zone.Zone_z2;
      break;
    case "Zone_na0":
      upHosts = Zone.Zone_na0;
      break;
    default:
      upHosts = Zone.Zone_z0;
  }
  let scheme = config.useHttpsDomain ? "https://" : "http://";
  let uploadUrl = config.useCdnDomain
    ? scheme + upHosts["cdnUphost"]
    : scheme + upHosts["srcUphost"];
  return uploadUrl;
}
