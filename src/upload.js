import { PutExtra, Config, BLOCK_SIZE } from "./config";
import {
  initProgress,
  getProgressItem,
  getChunks,
  checkExpire,
  createAjax,
  createFileUrl,
  setLocalItem,
  checkLocalFileInfo,
  getLocal,
  getUploadUrl
} from "./utils";

export class UploadManager {
  constructor(option) {
    this.config = new Config(option.config);
    this.size = "";
    this.stopped = false;
    this.option = option;
    this.otime = "";
  }
  putFile() {
    if (this.stopped) {
      this.stopped = false;
    }
    this.file = this.option.file;
    this.key = this.option.key;
    this.uptoken = this.option.token;
    this.putExtra = this.option.putExtra || new PutExtra();
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
      this.resumeUpload();
    } else {
      this.directUpload();
    }
  }

  stop() {
    this.stopped = true;
  }
  // 分片上传
  resumeUpload() {
    let arrayChunk = getChunks(this.file, BLOCK_SIZE); //返回根据file.size所产生的分段数据数组
    this.uploadChunks(arrayChunk);
  }

  uploadChunks(arrayChunk) {
    checkLocalFileInfo(this.file);
    this.progress = initProgress(this.file);
    let size;
    let that = this;
    let localFileInfo = getLocal(this.file.name, "info");
    let promises = arrayChunk.map(function(chunk, index) {
      let info = localFileInfo[index];
      if (info) {
        if (!checkExpire(info.expire_at)) {
          //本地存储的进度放到progress里
          that.progress[index] = getProgressItem(info);
          return Promise.resolve(info);
        } else {
          return that.mkblkReq(chunk, index);
        }
      } else {
        return that.mkblkReq(chunk, index);
      }
    });
    Promise.all(promises)
      //这边不用传storage,接收一个context数组
      .then(function(context) {
        that.mkfileReq(context);
      })
      .catch(err => {
        this.stopped = true;
        if (this.onError) {
          this.onError(err);
        }
      });
  }

  ajax(url, xhr, option, type) {
    let that = this;
    return new Promise((resolve, reject) => {
      xhr.open("POST", url);
      let auth = "UpToken " + this.uptoken;
      xhr.setRequestHeader("Authorization", auth);
      if (type == "block") {
        xhr.setRequestHeader("content-type", "application/octet-stream");
      }
      if (type == "file") {
        xhr.setRequestHeader("content-type", "text/plain");
      }
      if (type == "block" || type == "direct") {
        xhr.upload.addEventListener("progress", function(evt) {
          if (that.stopped) {
            xhr.abort();
          }
          that.updateProgress(evt, option.index, that.file.size);
          if (that.onData) {
            that.onData(that.progress);
          }
        });
      }
      xhr.upload.addEventListener("error", function(evt) {
        reject({ message: "An error occurred while transferring the file." });
      });
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let respo = JSON.parse(this.responseText);
            if (type == "block") {
              option.respo = respo;
              setLocalItem(that.file.name, option, that.file.size);
            }
            resolve(respo);
          } else {
            if (this.responseText) {
              reject(JSON.parse(this.responseText));
            } else {
              reject({ message: "已暂停" });
            }
          }
        }
      };
      xhr.send(option.body);
    });
  }

  mkblkReq(chunk, index) {
    let reader = new FileReader();
    this.progress[index] = getProgressItem();
    reader.readAsArrayBuffer(chunk);
    let status = true;
    let that = this;
    return new Promise((resolve, reject) => {
      reader.onload = function() {
        let xhr = createAjax();
        let binary = this.result;
        let requestURI = that.uploadUrl + "/mkblk/" + chunk.size;
        let option = {
          data: chunk,
          index: index,
          body: binary
        };
        that
          .ajax(requestURI, xhr, option, "block")
          .then(res => resolve(res))
          .catch(res => reject(res));
      };
    });
  }
  updateProgress(evt, index, totalSize) {
    // evt.total是需要传输的总字节，evt.loaded是已经传输的字节。如果evt.lengthComputable不为真，则evt.total等于0
    let progressTotal = this.progress.total;
    let newLoad = 0;
    if (evt.lengthComputable) {
      if (index !== "") {
        let progressUnit = this.progress[index];
        progressUnit.total = evt.total;
        newLoad = evt.loaded - progressUnit.loaded;
        progressUnit.loaded = evt.loaded;
        progressUnit.percent = Math.floor(evt.loaded / evt.total * 100);
      } else {
        newLoad = evt.loaded - progressTotal.loaded;
      }
    }
    progressTotal.loaded = progressTotal.loaded + newLoad;
    let totalPercent = progressTotal.loaded / totalSize * 100;
    progressTotal.percent =
      totalPercent >= 100 ? 100 - 1 : Math.floor(totalPercent);
  }

  mkfileReq(context) {
    let that = this;
    let putExtra = Object.assign(
      {
        mimeType: "application/octet-stream"
      },
      that.putExtra
    );
    return new Promise((resolve, reject) => {
      let requestURI = createFileUrl(
        that.uploadUrl,
        that.file,
        that.key,
        putExtra
      );
      let xhr = createAjax();
      let ctxList = [];
      for (let m = 0; m < context.length; m++) {
        ctxList.push(context[m].ctx);
      }
      let postBody = ctxList.join(",");
      let option = { body: postBody };
      that
        .ajax(requestURI, xhr, option, "file")
        .then(res => {
          //设置上传成功的本地状态
          localStorage.setItem(
            "qiniu_js_sdk_upload_file_status_" + that.file.name,
            "success"
          );
          if (this.onData) {
            this.progress["total"].percent = 100;
            this.onData(this.progress);
          }
          if (this.onComplete) {
            this.onComplete(res);
          }
        })
        .catch(err => {
          this.stopped = true;
          if (this.onError) {
            this.onError(err);
          }
        });
    });
  }
  // 直传
  directUpload() {
    let that = this;
    let formData = new FormData();
    let xhr = createAjax();
    this.progress = initProgress(this.file);
    let status = true;
    let multipart_params = {};
    formData.append("file", that.file);
    formData.append("token", that.uptoken);
    formData.append("key", that.key);
    formData.append("fname", that.putExtra.fname);
    for (let k in that.putExtra.params) {
      if (k.startsWith("x:")) {
        formData.append(k, that.putExtra.params[k].toString());
      }
    }
    let option = {
      body: formData,
      index: ""
    };
    that
      .ajax(this.uploadUrl, xhr, option, "direct")
      .then(res => {
        if (this.onComplete) {
          this.onComplete(res);
        }
      })
      .catch(err => {
        this.stopped = true;
        if (this.onError) {
          this.onError(err);
        }
      });
  }
}
