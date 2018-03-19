import {
  getChunks,
  isChunkExpired,
  createMkFileUrl,
  setLocalFileInfo,
  removeLocalFileInfo,
  getLocalFileInfo,
  isContainFileMimeType,
  sum,
  getDomainFromUrl,
  getPortFromUrl,
  getHeadersForChunkUpload,
  getHeadersForMkFile,
  request,
  readAsArrayBuffer,
  getUploadUrl,
  filterParams
} from "./utils";

import { Pool } from "./pool";
import SparkMD5 from "spark-md5";

let BLOCK_SIZE = 4 * 1024 * 1024;

export class UploadManager {
  constructor(options, handlers, statisticsLogger) {
    this.config = Object.assign(
      {
        useCdnDomain: true,
        disableStatisticsReport: false,
        retryCount: 3,
        md5: false,
        thread: 3,
        region: null
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
    this.statisticsLogger = statisticsLogger;
    this.progress = null;
    this.xhrList = [];
    this.xhrHandler = xhr => this.xhrList.push(xhr);
    this.abort = false;
    this.file = options.file;
    this.key = options.key;
    this.token = options.token;
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
    this.retryCount = 0;
    Object.assign(this, handlers);
  }

  putFile() {
    this.abort = false;
    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name;
    }
    if (this.putExtra.mimeType && this.putExtra.mimeType.length) {
      if (!isContainFileMimeType(this.file.type, this.putExtra.mimeType)){
        let err = new Error("file type doesn't match with what you specify");
        this.onError(err);
        return Promise.reject(err);
      }
    }
    let upload = getUploadUrl(this.config, this.token).then(res => {
      this.uploadUrl = res;
      this.uploadAt = new Date().getTime();
      return this.file.size > BLOCK_SIZE ? this.resumeUpload() : this.directUpload();
    });
    upload.then(res => {
      this.onComplete(res.data);
      if (!this.config.disableStatisticsReport){
        this.sendLog(res.reqId, 200);
      }
    }, err => {
      
      if (err.isRequestError){
        if (!this.config.disableStatisticsReport){
          if (this.abort){
            this.sendLog("", -2);
            return;
          } else {
            this.sendLog(err.reqId, err.code);
          }
        }

        if (err.code === 0 && !this.abort){
          if (--this.config.retryCount >= 0){
            this.stop();
            this.putFile();
            return;
          }
        }

        if (err.code === 701 || (err.message && err.message === "md5不一致")) {
          this.stop();
          this.putFile();
          return;
        }
      }
      this.stop();
      this.onError(err);
    });
    return upload;
  }

  stop() {
    this.xhrList.forEach(xhr => xhr.abort());
    this.xhrList = [];
    this.abort = true;
  }

  sendLog(reqId, code){
    this.statisticsLogger.log({
      code: code,
      reqId: reqId,
      host: getDomainFromUrl(this.uploadUrl),
      remoteIp: "",
      port: getPortFromUrl(this.uploadUrl),
      duration: (new Date().getTime() - this.uploadAt) / 1000,
      time: Math.floor(this.uploadAt / 1000),
      bytesSent: this.progress ? this.progress.total.loaded : 0,
      upType: "jssdk-h5",
      size: this.file.size
    }, this.token);
  }

  // 直传
  directUpload() {
    let formData = new FormData();
    formData.append("file", this.file);
    formData.append("token", this.token);
    if (this.key != null) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    filterParams(this.putExtra.params).forEach(item =>
      formData.append(item[0], item[1])
    );

    return request(this.uploadUrl, {
      method: "POST",
      body: formData,
      onProgress: (data) => {
        this.updateDirectProgress(data.loaded, data.total);
      },
      onCreate: this.xhrHandler
    }).then(res => {
      this.finishDirectProgress();
      return res;
    });
  }

  // 分片上传
  resumeUpload() {

    this.loaded = {
      mkFileProgress: 0,
      chunks: null
    };

    this.ctxList = [];
    this.localInfo = getLocalFileInfo(this.file);
    this.chunks = getChunks(this.file, BLOCK_SIZE);
    this.initChunksProgress();

    let pool = new Pool((chunkInfo) => this.uploadChunk(chunkInfo), this.config.thread);
    let uploadChunks = this.chunks.map((chunk, index) => {
      return pool.insertQueue({chunk, index});
    });
    let result = Promise.all(uploadChunks).then(() => {
      return this.mkFileReq();
    });
    result.then(
      res => {
        removeLocalFileInfo(this.file);
      },
      err => {
        // ctx错误或者过期情况下，或者md5不匹配时，清除本地存储数据
        if (err.code === 701 || (err.message && err.message === "md5不一致")) {
          removeLocalFileInfo(this.file);
          return;
        }
         setLocalFileInfo(this.file, this.ctxList);
      }
    );
    return result;
  }

  uploadChunk(chunkInfo) {
    let {index, chunk} = chunkInfo;
    let info = this.localInfo[index];
    if (info && !isChunkExpired(info.time)) {
      this.updateChunkProgress(chunk.size, index);
      this.ctxList[index] = { ctx: info.ctx, time: info.time };
      if (!this.config.md5) {
        return Promise.resolve();
      }
    }

    let requestUrl = this.uploadUrl + "/mkblk/" + chunk.size;

    return readAsArrayBuffer(chunk).then(body => {
      let spark = new SparkMD5.ArrayBuffer();
      spark.append(body);
      let md5 = spark.end();
      if (info && info.md5 !== md5 && this.config.md5) {
        return Promise.reject(new Error("md5不一致"));
      }

      let headers = getHeadersForChunkUpload(this.token);
      let onProgress = data => {
        this.updateChunkProgress(data.loaded, index);
      };
      let onCreate = this.xhrHandler;
      let method = "POST";

      return request(requestUrl, {
        method,
        headers,
        body,
        onProgress,
        onCreate
      }).then(response => {
        this.ctxList[index] = {
          time: new Date().getTime(),
          ctx: response.data.ctx,
          md5: md5
        };
      });
    });
  }

  mkFileReq() {
    let putExtra = Object.assign(
      { mimeType: "application/octet-stream" },
      this.putExtra
    );

    let requestUrL = createMkFileUrl(
      this.uploadUrl,
      this.file.size,
      this.key,
      putExtra
    );

    let body = this.ctxList.map(value => value.ctx).join(",");
    let headers = getHeadersForMkFile(this.token);
    let onCreate = this.xhrHandler;
    let method = "POST";
    return request(requestUrL, { method, body, headers, onCreate}).then(
      res => {
        this.updateMkFileProgress(1);
        return Promise.resolve(res);
      }
    );
  }

  updateDirectProgress(loaded, total) {
    // 当请求未完成时可能进度会达到100，所以total + 1来防止这种情况出现
    this.progress = {total: this.getProgressInfoItem(loaded, total + 1)};
    this.onData(this.progress);
  }

  finishDirectProgress(){
    let total = this.progress.total;
    this.progress.total = this.getProgressInfoItem(total.loaded + 1, total.size);
    this.onData(this.progress);
  }

  initChunksProgress() {
    this.loaded.chunks = this.chunks.map(_ => 0);
    this.notifyResumeProgress();
  }

  updateChunkProgress(loaded, index) {
    this.loaded.chunks[index] = loaded;
    this.notifyResumeProgress();
  }

  updateMkFileProgress(progress) {
    this.loaded.mkFileProgress = progress;
    this.notifyResumeProgress();
  }

  notifyResumeProgress() {
    this.progress = {
      total: this.getProgressInfoItem(
        sum(this.loaded.chunks) + this.loaded.mkFileProgress,
        this.file.size + 1
      ),
      chunks: this.chunks.map((chunk, index) => {
        return this.getProgressInfoItem(this.loaded.chunks[index], chunk.size);
      })
    };
    this.onData(this.progress);
  }

  getProgressInfoItem(loaded, size) {
    return {
      loaded: loaded,
      size: size,
      percent: loaded / size * 100
    };
  }
}
