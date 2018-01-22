import { BLOCK_SIZE } from "./config";
import {
  initCurrentState,
  getCurrentStateItem,
  getChunks,
  isExpired,
  createAjax,
  createFileUrl,
  setLocalItem,
  checkLocalFileInfo,
  getLocal,
  isMagic,
  getUploadUrl
} from "./utils";

export class UploadManager {
  constructor(option) {
    this.config =
      typeof option.config === "object"
        ? option.config
        : {
            useHttpsDomain: false,
            useCdnDomain: true,
            zone: null
          };
    this.stopped = false;
    this.file = option.file;
    this.key = option.key;
    this.uptoken = option.token;
    this.putExtra =
      typeof option.putExtra === "object"
        ? option.putExtra
        : {
            fname: "",
            params: {},
            mimeType: null
          };
    this.otime = "";
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
  }

  calculateTotalProgress() {
    const uploadedSize = this.currentState.chunks.reduce((sum, chunk) => {
      return sum + chunk.loaded;
    }, 0);
    const uploadPercent = uploadedSize / this.file.size;
    const mkFilePercent = this.currentState.mkFileReq;
    let totalPercent = uploadPercent * 0.99 + mkFilePercent * 0.01;
    this.currentState.total =
      totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
    this.onData(this.currentState);
  }

  updateChunkProgress(evt, index) {
    if (this.stopped) {
      xhr.abort();
    }
    if (evt.lengthComputable) {
      let currentStateUnit = this.currentState.chunks[index];
      currentStateUnit.total = evt.total;
      currentStateUnit.loaded = evt.loaded;
      currentStateUnit.percent = evt.loaded / evt.total;
    }
    this.calculateTotalProgress();
  }

  updateDirectProgress(evt) {
    let progressTotal = this.currentState.total;
    let totalPercent = 0;
    if (this.stopped) {
      xhr.abort();
    }
    if (evt.lengthComputable) {
      totalPercent = evt.loaded / this.file.size * 100;
      progressTotal.percent =
        totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
      this.onData(this.currentState);
    }
  }

  updateMkFileProgress() {
    this.currentState.mkFileReq = 1;
    this.calculateTotalProgress();
  }

  putFile() {
    if (this.stopped) {
      this.stopped = false;
    }
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.key ? this.key : this.file.name;
    }
    if (this.putExtra.mimeType && file.type !== this.putExtra.mimeType) {
      return Promise.reject({
        message: "file type doesn't match with what you specify"
      });
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
  // 分片上传
  resumeUpload() {
    let arrayChunk = getChunks(this.file, BLOCK_SIZE); //返回根据file.size所产生的分段数据数组
    return this.uploadChunks(arrayChunk);
  }

  uploadChunks(arrayChunk) {
    try {
      checkLocalFileInfo(this.file);
      this.currentState = initCurrentState(this.file);
      let localFileInfo = getLocal(this.file.name, "info");
      let updatePromises = arrayChunk.map((chunk, index) => {
        let info = localFileInfo[index];
        if (info && !isExpired(info.expire_at)) {
          this.currentState.chunks[index] = getCurrentStateItem(info);
          return Promise.resolve(info);
        }
        return this.mkblkReq(chunk, index);
      });
    } catch (err) {
      return Promise.reject(this.onError(err));
    }
    return Promise.all(updatePromises)
      .then(context => {
        let ctxList = [];
        for (let m = 0; m < context.length; m++) {
          ctxList.push(context[m].ctx);
        }
        this.mkfileReq(ctxList).catch(err => {
          this.stopped = true;
          this.onError(err);
        });
      })
      .catch(err => {
        this.stopped = true;
        this.onError(err);
      });
  }

  request(xhr, option, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        let auth = "UpToken " + this.uptoken;
        let index = option.index;
        xhr.setRequestHeader("Authorization", auth);
        xhr.upload.addEventListener("progress", evt => {
          onProgress(evt);
        });
        xhr.upload.addEventListener("error", evt => {
          reject({ message: "An error occurred while transferring the file." });
        });
        xhr.onreadystatechange = evt => {
          let responseText = evt.target.responseText;
          if (xhr.readyState !== 4) {
            return;
          }
          if (xhr.status !== 200 && responseText) {
            reject(JSON.parse(responseText));
          }
          if (xhr.status !== 200 && !responseText) {
            reject({ message: "已暂停" });
            return;
          }
          let response = JSON.parse(responseText);
          resolve(response);
        };
        xhr.send(option.body);
      } catch (err) {
        reject(err);
      }
    });
  }

  mkblkReq(chunk, index) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      this.currentState.chunks[index] = getProgressItem();
      let requestURI = this.uploadUrl + "/mkblk/" + chunk.size;
      reader.readAsArrayBuffer(chunk);
      reader.onload = evt => {
        let xhr = createAjax();
        xhr.open("POST", requestURI);
        xhr.setRequestHeader("content-type", "application/octet-stream");
        let binary = evt.target.result;
        let option = {
          data: chunk,
          index: index,
          body: binary
        };
        this.request(xhr, option, event =>
          updateChunkProgress(event, option.index)
        )
          .then(response => {
            option.response = response;
            setLocalItem(this.file.name, option, this.file.size);
            resolve(response);
          })
          .catch(res => reject(res));
      };
    });
  }

  mkfileReq(ctxList) {
    return new Promise((resolve, reject) => {
      try {
        let putExtra = Object.assign(
          {
            mimeType: "application/octet-stream"
          },
          this.putExtra
        );
        let requestURI = createFileUrl(
          this.uploadUrl,
          this.file,
          this.key,
          putExtra
        );
        let xhr = createAjax();
        xhr.open("POST", requestURI);
        xhr.setRequestHeader("content-type", "text/plain");
        let postBody = ctxList.join(",");
        let option = { body: postBody, index: -2 };
        this.request(xhr, option, fileProgressListener)
          .then(res => {
            this.updateMkFileProgress();
            // 设置上传成功的本地状态
            localStorage.setItem(
              "qiniu_js_sdk_upload_file_status_" + this.file.name,
              "success"
            );
            this.onComplete(res);
          })
          .catch(err => {
            this.stopped = true;
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  // 直传
  directUpload() {
    let formData = new FormData();
    let xhr = createAjax();
    xhr.open("POST", this.uploadUrl);
    this.currentState = initCurrentState(this.file);
    let status = true;
    let multipart_params = {};
    formData.append("file", this.file);
    formData.append("token", this.uptoken);
    if (this.key) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    for (let k in this.putExtra.params) {
      if (isMagic(k, this.putExtra.params)) {
        formData.append(k, this.putExtra.params[k].toString());
      }
    }
    let option = {
      body: formData,
      index: -1
    };
    return this.request(xhr, option, updateDirectProgress)
      .then(res => {
        this.onComplete(res);
      })
      .catch(err => {
        this.stopped = true;
        this.onError(err);
      });
  }
}
