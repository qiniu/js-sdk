import { BLOCK_SIZE } from "./config";
import {
  initCurrentState,
  getCurrentStateItem,
  getChunks,
  isChunkExpired,
  createXHR,
  createMkFileUrl,
  updateLocalItem,
  checkLocalFileInfo,
  checkFileMd5Info,
  getLocalItemInfo,
  setLocalItemStatus,
  isMagic,
  getResumeUploadXHR,
  getUploadUrl
} from "./utils";

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
    let xhr = createXHR();
    xhr.open("POST", this.uploadUrl);
    this.currentState = initCurrentState(this.file);
    let multipart_params = {};
    formData.append("file", this.file);
    formData.append("token", this.token);
    if (this.key !== null && this.key !== undefined) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    for (let k in this.putExtra.params) {
      if (isMagic(k, this.putExtra.params)) {
        formData.append(k, this.putExtra.params[k].toString());
      }
    }
    return this.request(xhr, formData, event =>
      this.updateDirectProgress(event)
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
    let chunks = getChunks(this.file, BLOCK_SIZE); // 返回根据file.size所产生的分段数据数组
    return this.uploadFileChunks(chunks);
  }

  uploadFileChunks(chunks) {
    checkLocalFileInfo(this.file);
    this.currentState = initCurrentState(this.file);
    let localFileInfo = getLocalItemInfo(this.file.name);
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
          this.stop();
          this.onError(err);
        });
      })
      .catch(err => {
        this.stop();
        this.onError(err);
      });
  }

  request(xhr, data, onProgress) {
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", evt => {
        if (this.stopped) {
          xhr.abort();
        }
        onProgress(evt);
        this.onData(this.currentState);
      });
      xhr.upload.addEventListener("error", evt => {
        reject(new Error("An error occurred while transferring the file."));
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
          reject(new Error("已暂停..."));
          return;
        }
        let response = JSON.parse(responseText);
        resolve(response);
      };
      xhr.send(data);
    });
  }

  mkblkReq(chunk, index) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      this.currentState.chunks[index] = getCurrentStateItem();
      let requestURI = this.uploadUrl + "/mkblk/" + chunk.size;
      reader.readAsArrayBuffer(chunk);
      reader.onload = evt => {
        let xhr = getResumeUploadXHR(requestURI, this.token, "chunk");
        let binary = evt.target.result;
        let option = {
          data: chunk,
          index: index
        };
        this.request(xhr, binary, event =>
          this.updateChunkProgress(event, index)
        )
          .then(response => {
            option.response = response;
            updateLocalItem(this.file.name, option, this.file.size);
            resolve(response);
          })
          .catch(err => reject(err));
      };
      reader.onerror = () => {
        reject(new Error("fileReader 读取错误"));
      };
    });
  }

  mkfileReq(ctxList) {
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
      let xhr = getResumeUploadXHR(requestURI, this.token, "ctx");
      let postBody = ctxList.join(",");
      this.request(xhr, postBody, () => {})
        .then(res => {
          this.updateMkFileProgress();
          this.onData(this.currentState);
          // 设置上传成功的本地状态
          setLocalItemStatus(this.file.name);
          this.onComplete(res);
        })
        .catch(err => {
          this.stop();
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

  updateChunkProgress(evt, index) {
    let currentStateUnit = this.currentState.chunks[index];
    if (evt.lengthComputable) {
      currentStateUnit.total = evt.total;
      currentStateUnit.loaded = evt.loaded;
      currentStateUnit.percent = evt.loaded / evt.total * 100;
    }
    this.calculateTotalProgress();
  }

  updateDirectProgress(evt) {
    let currentStateTotal = this.currentState.total;
    let totalPercent = 0;
    if (evt.lengthComputable) {
      totalPercent = evt.loaded / this.file.size * 100;
      currentStateTotal.percent =
        totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
    }
  }

  updateMkFileProgress() {
    this.currentState.mkFileReqState = 1;
    this.calculateTotalProgress();
  }
}
