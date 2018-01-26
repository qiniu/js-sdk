import { uRLSafeBase64Encode } from "./base64";
import { zoneUphostMap, zones } from "./config";
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
        let localFileInfo = getLocal(file.name, md5);
        resolve({ md5: md5, info: localFileInfo });
      })
      .catch(err => {
        resolve({ md5: "", info: [] });
      });
  });
}

export function setLocalFileInfoAndMd5(name, md5, info) {
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

export function removeLocalFileInfoAndMd5(name, md5) {
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
    return [];
  }
}

// 构造file上传url
export function createMkFileUrl(url, size, key, putExtra) {
  let requestURI = url + "/mkfile/" + size;
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
    filterParams(putExtra.params).map(
      k =>
        (requestURI +=
          "/" + encodeURIComponent(k[0]) + "/" + uRLSafeBase64Encode(k[1]))
    );
  }
  return requestURI;
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

    if (options.onHandler) {
      options.onHandler(xhr);
    }
    if (options.headers) {
      Object.keys(options.headers).map(k =>
        xhr.setRequestHeader(k, options.headers[k])
      );
    }

    xhr.upload.addEventListener("progress", evt => {
      if (evt.lengthComputable && options.onProgress) {
        options.onProgress(evt.loaded);
      }
    });

    xhr.onreadystatechange = () => {
      let responseText = xhr.responseText;
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status !== 200) {
        let message = `xhr request failed, code: ${xhr.status}; `;
        if (responseText) {
          message = message + `response: ${responseText}`;
        }
        reject(new Error(message));
      }
      try {
        responseText = JSON.parse(responseText);
      } catch (err) {}
      resolve(responseText);
    };

    xhr.send(options.body);
  });
}

// 构造区域上传url
export function getUploadUrl(config) {
  let upHosts = zoneUphostMap[config.zone] || zoneUphostMap[Zones.z0];
  const protocol = config.useHttpsDomain ? "https" : "http";
  const host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
  return `${protocol}://${host}`;
}
