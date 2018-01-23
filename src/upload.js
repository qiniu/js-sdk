import { BLOCK_SIZE } from "./config";
import {
  initCurrentState,
  getCurrentStateItem,
  getChunks,
  isChunkExpired,
  createAjax,
  createFileUrl,
  updateLocalItem,
  checkLocalFileInfo,
  getLocal,
  isMagic,
  setChunkUploadOption,
  setCtxUploadOption,
  getUploadUrl
} from "./utils";

export class UploadManager {
  constructor(options) {
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
    this.stopped = false;
    this.file = options.file;
    this.key = options.key;
    this.uptoken = options.token;
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
  }

  putFile() {
    if (this.stopped) {
      this.stopped = false;
    }
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.key ? this.key : this.file.name;
    }
    if (this.putExtra.mimeType && this.file.type !== this.putExtra.mimeType) {
      return Promise.reject(
        this.onError({
          message: "file type doesn't match with what you specify"
        })
      );
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
    let xhr = createAjax();
    xhr.open("POST", this.uploadUrl);
    this.currentState = initCurrentState(this.file);
    let status = true;
    let multipart_params = {};
    formData.append("file", this.file);
    formData.append("token", this.uptoken);
    if (this.key !== null && this.key !== undefined) {
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
    return this.request(xhr, option, event => this.updateDirectProgress(event))
      .then(res => {
        this.onComplete(res);
      })
      .catch(err => {
        this.stopped = true;
        this.onError(err);
      });
  }

  // 分片上传
  resumeUpload() {
    let chunks = getChunks(this.file, BLOCK_SIZE); //返回根据file.size所产生的分段数据数组
    return this.uploadChunks(chunks);
  }

  uploadChunks(chunks) {
    try {
      checkLocalFileInfo(this.file);
      this.currentState = initCurrentState(this.file);
      let localFileInfo = getLocal(this.file.name, "info");
      let updatePromises = chunks.map((chunk, index) => {
        let info = localFileInfo[index];
        if (info && !isChunkExpired(info.expire_at)) {
          this.currentState.chunks[index] = getCurrentStateItem(info);
          return Promise.resolve(info);
        }
        return this.mkblkReq(chunk, index);
      });
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
    } catch (err) {
      return Promise.reject(this.onError(err));
    }
  }

  request(xhr, option, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        //let auth = "UpToken " + this.uptoken;
        let index = option.index;
        //xhr.setRequestHeader("Authorization", auth);
        xhr.upload.addEventListener("progress", evt => {
          if (this.stopped) {
            xhr.abort();
          }
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
      this.currentState.chunks[index] = getCurrentStateItem();
      let requestURI = this.uploadUrl + "/mkblk/" + chunk.size;
      reader.readAsArrayBuffer(chunk);
      reader.onload = evt => {
        let xhr = createAjax();
        setChunkUploadOption(xhr, requestURI);
        let binary = evt.target.result;
        let option = {
          data: chunk,
          index: index,
          body: binary
        };
        this.request(xhr, option, event =>
          this.updateChunkProgress(event, option.index)
        )
          .then(response => {
            option.response = response;
            updateLocalItem(this.file.name, option, this.file.size);
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
        setCtxUploadOption(xhr, requestURI, this.token);
        let postBody = ctxList.join(",");
        let option = { body: postBody, index: -2 };
        this.request(xhr, option, () => {})
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

  updateChunkProgress(evt, index) {
    if (evt.lengthComputable) {
      let currentStateUnit = this.currentState.chunks[index];
      currentStateUnit.total = evt.total;
      currentStateUnit.loaded = evt.loaded;
      currentStateUnit.percent = evt.loaded / evt.total * 100;
    }
    this.calculateTotalProgress();
    this.onData(this.currentState);
  }

  updateDirectProgress(evt) {
    let currentStateTotal = this.currentState.total;
    let totalPercent = 0;
    if (evt.lengthComputable) {
      totalPercent = evt.loaded / this.file.size * 100;
      currentStateTotal.percent =
        totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
      this.onData(this.currentState);
    }
  }

  updateMkFileProgress() {
    this.currentState.mkFileReqState = 1;
    this.calculateTotalProgress();
  }
}
