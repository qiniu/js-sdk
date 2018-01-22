import { BLOCK_SIZE } from "./config";
import {
  initProgress,
  getProgressItem,
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
      this.progress = initProgress(this.file);
      let localFileInfo = getLocal(this.file.name, "info");
      let updatePromises = arrayChunk.map((chunk, index) => {
        let info = localFileInfo[index];
        if (info && !isExpired(info.expire_at)) {
          this.progress[index] = getProgressItem(info);
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

  ajax(xhr, option, type) {
    return new Promise((resolve, reject) => {
      try {
        let auth = "UpToken " + this.uptoken;
        let index = option.index;
        xhr.setRequestHeader("Authorization", auth);
        xhr.upload.addEventListener("progress", evt => {
          if (this.stopped) {
            xhr.abort();
          }
          let progressTotal = this.progress.total;
          let newLoad = 0;
          let ctxLoaded = 0;
          let ctxTotal = evt.total;
          let totalPercent = 0;
          if (evt.lengthComputable) {
            if (index !== -1 && index !== -2) {
              let progressUnit = this.progress[index];
              progressUnit.total = evt.total;
              newLoad = evt.loaded - progressUnit.loaded;
              progressUnit.loaded = evt.loaded;
              progressUnit.percent = (evt.loaded / evt.total).toFixed(1);
            }
            progressTotal.loaded = progressTotal.loaded + newLoad;
            totalPercent = progressTotal.loaded / this.file.size * 99;
            if (index === -1) {
              newLoad = evt.loaded - progressTotal.loaded;
              progressTotal.loaded = progressTotal.loaded + newLoad;
              totalPercent = progressTotal.loaded / this.file.size * 100;
            }
            if (index === -2) {
              ctxLoaded = evt.loaded;
              totalPercent = 99 + ctxLoaded / ctxTotal;
            }
          }
          progressTotal.percent =
            totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
          //this.updateProgress(evt, option.index, this.file.size);
          this.onData(this.progress);
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
          if (type === "block") {
            option.response = response;
            setLocalItem(this.file.name, option, this.file.size);
          }
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
      this.progress[index] = getProgressItem();
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
        this.ajax(xhr, option, "block")
          .then(res => resolve(res))
          .catch(res => reject(res));
      };
    });
  }
  // updateProgress(evt, index, totalSize) {
  //   // evt.total是需要传输的总字节，evt.loaded是已经传输的字节。如果evt.lengthComputable不为真，则evt.total等于0
  //   let progressTotal = this.progress.total;
  //   let newLoad = 0;
  //   let ctxLoaded = 0;
  //   let ctxTotal = evt.total;
  //   let totalPercent = 0;
  //   if (evt.lengthComputable) {
  //     if (index !== -1 && index !== -2) {
  //       let progressUnit = this.progress[index];
  //       progressUnit.total = evt.total;
  //       newLoad = evt.loaded - progressUnit.loaded;
  //       progressUnit.loaded = evt.loaded;
  //       progressUnit.percent = (evt.loaded / evt.total).toFixed(1);
  //     }
  //     progressTotal.loaded = progressTotal.loaded + newLoad;
  //     totalPercent = progressTotal.loaded / totalSize * 99;
  //     if (index === -1) {
  //       newLoad = evt.loaded - progressTotal.loaded;
  //       progressTotal.loaded = progressTotal.loaded + newLoad;
  //       totalPercent = progressTotal.loaded / totalSize * 100;
  //     }
  //     if (index === -2) {
  //       ctxLoaded = evt.loaded;
  //       totalPercent = 99 + ctxLoaded / ctxTotal;
  //     }
  //   }
  //   progressTotal.percent = totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
  // }

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
        this.ajax(xhr, option, "file")
          .then(res => {
            // 设置上传成功的本地状态
            localStorage.setItem(
              "qiniu_js_sdk_upload_file_status_" + this.file.name,
              "success"
            );
            this.onData(this.progress);
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
    this.progress = initProgress(this.file);
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
    return this.ajax(xhr, option, "direct")
      .then(res => {
        this.onComplete(res);
      })
      .catch(err => {
        this.stopped = true;
        this.onError(err);
      });
  }
}
