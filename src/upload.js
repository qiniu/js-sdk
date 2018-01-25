import {
  initCurrentState,
  getCurrentStateItem,
  getChunks,
  isChunkExpired,
  createXHR,
  createMkFileUrl,
  updateLocalItem,
  getLocalFileInfo,
  setLocalFileInfo,
  getHeadersForChunkUpload,
  getHeadersForMkfile,
  removeLocalFileInfo,
  isCustomVar,
  getResumeUploadXHR,
  getUploadUrl
} from "./utils";

const BLOCK_SIZE = 4 * 1024 * 1024;

export class UploadManager {
  constructor(options, handlers) {
    this.config = Object.assign(
      {
        useHttpsDomain: false,
        useCdnDomain: true,
        zone: null
      },
      options.config
    );
    this.putExtra = Object.assign(
      {
        fname: "",
        params: {},
        mimeType: null
      },
      options.putExtra
    );
    this.stopped = true;
    this.file = options.file;
    this.key = options.key;
    this.token = options.token;
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
    Object.assign(this, handlers);
  }

  putFile() {
    if (this.stopped) {
      this.stopped = false;
    }
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name;
    }
    if (this.putExtra.mimeType && this.file.type !== this.putExtra.mimeType) {
      let err = new Error("file type doesn't match with what you specify");
      this.onError(err);
      return Promise.reject(err);
    }
    this.uploadUrl = getUploadUrl(this.config);
    if (this.file.size > BLOCK_SIZE) {
      return this.resumeUpload();
    } else {
      return this.directUpload();
    }
  }

  stop() {
    this.stopped = true;
  }

  // 直传
  directUpload() {
    let formData = new FormData();
    this.currentState = initCurrentState(this.file);
    let multipart_params = {};
    formData.append("file", this.file);
    formData.append("token", this.token);
    if (this.key !== null && this.key !== undefined) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    for (let k in this.putExtra.params) {
      if (isCustomVar(k, this.putExtra.params)) {
        formData.append(k, this.putExtra.params[k].toString());
      }
    }
    return this.request(
      "POST",
      this.uploadUrl,
      "",
      formData,
      (loaded, lengthComputable) =>
        this.updateDirectProgress(loaded, lengthComputable)
    )
      .then(res => {
        this.onComplete(res);
      })
      .catch(err => {
        this.stop();
        this.onError(err);
      });
  }

  // 分片上传
  resumeUpload() {
    return getLocalFileInfo(this.file).then(res => {
      console.log(res);
      this.currentState = initCurrentState(this.file);
      this.ctxList = [];
      this.localInfo = res.info;
      let md5 = res.md5;
      console.log(this.config);
      let chunks = getChunks(this.file, BLOCK_SIZE);
      console.log(chunks);
      let uploadChunks = chunks.map((chunk, index) => {
        return this.mkblkReq(chunk, index);
      });
      let result = Promise.all(uploadChunks)
        .then(() => {
          return this.mkfileReq();
        })
        .catch(err => {
          Promise.reject(err);
        });
      return result
        .then(res => {
          this.updateMkFileProgress();
          this.onData(this.currentState);
          // 设置上传成功的本地状态
          removeLocalFileInfo(this.file.name, md5);
          this.onComplete(res);
        })
        .catch(err => {
          setLocalFileInfo(this.file.name, md5, this.ctxList);
          this.stop();
          this.onError(err);
        });
    });
    // const uploadChunks = chunks.map(uploadChunk);
    // const result = uploadChunks.then(() => mkFile());
    // result.catch(() => saveLocalInfo());
  }

  request(method, url, headers, body, onProgress) {
    return new Promise((resolve, reject) => {
      let xhr = createXHR();
      xhr.open(method, url);
      if (headers) {
        for (let key in headers) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
      xhr.upload.addEventListener("progress", evt => {
        if (this.stopped) {
          xhr.abort();
        }
        onProgress(evt.loaded, evt.lengthComputable);
        this.onData(this.currentState);
      });
      xhr.onreadystatechange = evt => {
        let responseText = evt.target.responseText;
        if (xhr.readyState !== 4) {
          return;
        }
        if (xhr.status !== 200 && responseText) {
          reject(
            new Error(
              "xhr request failed,code:" +
                xhr.status +
                ";response:" +
                responseText
            )
          );
          return;
        }
        if (xhr.status !== 200 && !responseText) {
          reject(new Error("xhr request failed,code:" + xhr.status));
          return;
        }
        let response = JSON.parse(responseText);
        resolve(response);
      };
      xhr.send(body);
    });
  }

  mkblkReq(chunk, index) {
    return new Promise((resolve, reject) => {
      let info = this.localInfo[index];
      console.log("this.localInfo:" + this.localInfo);
      let item = { blockSize: chunk.size, loaded: 0, percent: 0 };
      if (info && !isChunkExpired(info.time)) {
        item.percent = 100;
        item.loaded = chunk.size;
        this.currentState.chunks[index] = getCurrentStateItem(item);
        this.ctxList[index] = info.ctx;
        resolve();
      }
      console.log(index);
      let reader = new FileReader();
      this.currentState.chunks[index] = getCurrentStateItem(item);
      let requestURI = this.uploadUrl + "/mkblk/" + chunk.size;
      reader.readAsArrayBuffer(chunk);
      reader.onload = evt => {
        let body = evt.target.result;
        let headers = getHeadersForChunkUpload(this.token);
        this.request(
          "POST",
          requestURI,
          headers,
          body,
          (loaded, lengthComputable) =>
            this.updateChunkProgress(loaded, lengthComputable, index)
        )
          .then(response => {
            this.ctxList[index] = {
              time: response.expire_at,
              ctx: response.ctx
            };
            resolve();
          })
          .catch(err => reject(err));
      };
      reader.onerror = () => {
        reject(new Error("fileReader 读取错误"));
      };
    });
  }

  mkfileReq() {
    return new Promise((resolve, reject) => {
      let putExtra = Object.assign(
        {
          mimeType: "application/octet-stream"
        },
        this.putExtra
      );
      let requestURI = createMkFileUrl(
        this.uploadUrl,
        this.file,
        this.key,
        putExtra
      );
      let ctxs = [];
      for (let m = 0; m < this.ctxList.length; m++) {
        ctxs.push(this.ctxList[m].ctx);
      }
      let postBody = ctxs.join(",");
      let headers = getHeadersForMkfile(this.token);
      this.request("POST", requestURI, headers, postBody, () => {})
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  calculateTotalProgress() {
    let uploadedSize = this.currentState.chunks.reduce((sum, chunk) => {
      return sum + chunk.loaded;
    }, 0);
    let uploadPercent = uploadedSize / this.file.size;
    let mkFilePercent = this.currentState.mkFileReqState;
    let totalPercent = uploadPercent * 99 + mkFilePercent * 1;
    this.currentState.total.loaded = uploadedSize;
    this.currentState.total.percent = totalPercent >= 100 ? 100 : totalPercent;
  }

  updateChunkProgress(loaded, lengthComputable, index) {
    let currentStateUnit = this.currentState.chunks[index];
    let total = this.currentState.chunks[index].total;
    if (lengthComputable) {
      currentStateUnit.loaded = loaded;
      currentStateUnit.percent = loaded / total * 100;
    }
    this.calculateTotalProgress();
  }

  updateDirectProgress(loaded, lengthComputable) {
    let currentStateTotal = this.currentState.total;
    let totalPercent = 0;
    if (lengthComputable) {
      totalPercent = loaded / this.file.size * 100;
      currentStateTotal.percent =
        totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
    }
  }

  updateMkFileProgress() {
    this.currentState.mkFileReqState = 1;
    this.calculateTotalProgress();
  }
}
