import { PutExtra, Config } from "./config.js";
import {
  initProgress,
  initProgressIndex,
  getChunks,
  checkExpire,
  createAjax,
  createFileUrl,
  setLocalItem,
  checkLocalFileInfo,
  getUploadUrl,
  updateProgress
} from "./helpMethod.js";

export class UploadManager {
  constructor(option) {
    this.config = option.config || new Config();
    this.size = "";
    this.cancelControl = false;
    this.option = option;
    this.ot = "";
  }
  putFile() {
    this.cancelControl ? (this.cancelControl = false) : "";
    this.file = this.option.file;
    this.key = this.option.key;
    this.uptoken = this.option.token;
    this.putExtra = this.option.putExtra || new PutExtra();
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.key ? this.key : this.file.name;
    }
    if (this.putExtra.mimeType) {
      if (file.type != this.putExtra.mimeType) {
        return Promise.reject({
          message: "file type doesn't match with what you specify"
        });
      }
    }
    this.uploadUrl = getUploadUrl(this.config);
    if (this.file.size > this.config.BLOCK_SIZE) {
      //分片上传
      this.resumeUpload();
    } else {
      //直传
      this.directUpload();
    }
  }

  stop() {
    this.cancelControl = true;
  }

  resumeUpload() {
    let arrayBlob = getChunks(this.file, this.config.BLOCK_SIZE); //返回根据file.size所产生的分段数据数组
    this.uploadChunks(arrayBlob);
  }

  uploadChunks(arrayBlob) {
    //检查本地文件状态
    checkLocalFileInfo(this.file);
    //初始化progress
    this.progress = initProgress(this.file);
    let size;
    let that = this;
    let localFileInfo =
      JSON.parse(localStorage.getItem("qiniu_" + this.file.name)) || [];
    let promises = arrayBlob.map(function(blob, index) {
      let info = localFileInfo[index];
      if (info) {
        if (!checkExpire(info.expire_at)) {
          //本地存储的进度放到progress里
          initProgressIndex(info, index, that.progress);
          return Promise.resolve(info);
        } else {
          return that.mkblkReq(blob, index);
        }
      } else {
        return that.mkblkReq(blob, index);
      }
    });
    Promise.all(promises)
      //这边不用传storage,接收一个context数组
      .then(function(context) {
        that.mkfileReq(context);
      })
      ["catch"](err => {
        if (this.onError) {
          this.onError(err);
        }
      });
  }

  Ajax(url, xhr, option, type) {
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
          if (that.cancelControl) {
            console.log("已暂停...");
            xhr.abort();
          }
          let newProgress = Object.assign({}, that.progress);
          that.progress = updateProgress(
            evt,
            option.index,
            newProgress,
            that.file.size
          );
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

  mkblkReq(blob, index) {
    let reader = new FileReader();
    initProgressIndex("", index, this.progress);
    reader.readAsArrayBuffer(blob);
    let status = true;
    let that = this;
    return new Promise((resolve, reject) => {
      reader.onload = function() {
        let xhr = createAjax();
        let binary = this.result;
        let requestURI = that.uploadUrl + "/mkblk/" + blob.size;
        let option = {
          data: blob,
          index: index,
          body: binary
        };
        that
          .Ajax(requestURI, xhr, option, "block")
          .then(res => resolve(res))
          ["catch"](res => reject(res));
      };
    });
  }

  mkfileReq(context) {
    console.log("send file ctx list...");
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
        .Ajax(requestURI, xhr, option, "file")
        .then(res => {
          //设置上传成功的本地状态
          localStorage.setItem("qiniu_file_" + that.file.name, "success");
          if (this.onData) {
            this.progress["total"].percent = 100;
            this.onData(this.progress);
          }
          if (this.onComplete) {
            this.onComplete(res);
          }
        })
        ["catch"](err => {
          if (this.onError) {
            this.onError(err);
          }
        });
    });
  }

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
      index: "no"
    };
    that
      .Ajax(this.uploadUrl, xhr, option, "direct")
      .then(res => {
        if (this.onComplete) {
          this.onComplete(res);
        }
      })
      ["catch"](err => {
        if (this.onError) {
          this.onError(err);
        }
      });
  }
}
