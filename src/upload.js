import {
  getChunks,
  isChunkExpired,
  createXHR,
  createMkFileUrl,
  getLocalFileInfoAndMd5,
  setLocalFileInfo,
  removeLocalFileInfo,
  getHeadersForChunkUpload,
  getHeadersForMkfile,
  request,
  readAsArrayBuffer,
  getUploadUrl,
  filterParams
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
    this.currentState = {
      total: {
        loaded: 0,
        percent: 0
      },
      mkfileProgress: 0,
      chunks: []
    };
    this.xhrList = [];
    this.handler = xhr => this.xhrList.push(xhr);
    this.file = options.file;
    this.key = options.key;
    this.token = options.token;
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
    Object.assign(this, handlers);
  }

  putFile() {

    if (!this.putExtra.fname) {
      this.putExtra.fname = this.file.name;
    }
    if (this.putExtra.mimeType && this.file.type !== this.putExtra.mimeType) {
      let err = new Error("file type doesn't match with what you specify");
      this.onError(err);
      return Promise.reject(err);
    }

    this.uploadUrl = getUploadUrl(this.config);

    let upload = this.file.size > BLOCK_SIZE ? this.resumeUpload() : this.directUpload();
    return upload.then(res => this.onComplete(res)).catch(err => {
      this.stop();
      this.onError(err);
    });
  }

  stop() {
    this.xhrList.forEach(xhr => xhr.abort());
    this.xhrList = [];
  }

  // 直传
  directUpload() {

    let formData = new FormData();
    formData.append("file", this.file);
    formData.append("token", this.token);
    if (this.key !== null && this.key !== undefined) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    filterParams(this.putExtra.params).map(k => formData.append(k[0], k[1]));

    return request(this.uploadUrl, {
      method: "POST",
      body: formData,
      onProgress: loaded => {
        this.updateDirectProgress(loaded);
        this.onData(this.currentState);
      },
      onPush: this.handler
    });
  }

  // 分片上传
  resumeUpload() {

    return getLocalFileInfoAndMd5(this.file).then(res => {
      this.ctxList = [];
      let md5 = res.md5;
      this.localInfo = res.info;

      let chunks = getChunks(this.file, BLOCK_SIZE);
      let uploadChunks = chunks.map((chunk, index) => {
        return this.uploadChunk(chunk, index);
      });

      let result = Promise.all(uploadChunks).then(() => {
        return this.mkfileReq();
      })

      result.then(
        res => {
          removeLocalFileInfo(this.file.name, md5);
        },
        err => {
          setLocalFileInfo(this.file.name, md5, this.ctxList);
        }
      );
      return result;
    });
  }

  uploadChunk(chunk, index) {

    this.initChunkProgress(chunk.size, index)

    let info = this.localInfo[index];
    if (info && !isChunkExpired(info.time)) {
      this.updateChunkProgress(chunk.size, index)
      this.ctxList[index] = { ctx: info.ctx, time: info.time };
      return Promise.resolve();
    }

    let requestUrl = this.uploadUrl + "/mkblk/" + chunk.size;

    return readAsArrayBuffer(chunk).then(body => {
      let headers = getHeadersForChunkUpload(this.token);
      let onProgress = loaded => {
        this.updateChunkProgress(loaded, index);
        this.onData(this.currentState);
      };
      let onPush = this.handler;
      let method = "POST";

      return request(requestUrl, {
        method,
        headers,
        body,
        onProgress,
        onPush
      }).then(response => {
        this.ctxList[index] = {
          time: new Date().getTime(),
          ctx: response.ctx
        };
      });
    });
  }

  mkfileReq() {

    let putExtra = Object.assign({ mimeType: "application/octet-stream" }, this.putExtra);

    let requestUrL = createMkFileUrl(
      this.uploadUrl,
      this.file.size,
      this.key,
      putExtra
    );

    let body = this.ctxList.map(value => value.ctx).join(",");
    let headers = getHeadersForMkfile(this.token);
    let onPush = this.handler;
    let method = "POST";

    return request(requestUrL, { method, body, headers, onPush }).then(
      res => {
        this.updateMkFileProgress(1);
        this.onData(this.currentState);
        return Promise.resolve(res)
      }
    );
  }

  calculateTotalProgress() {
    let uploadedSize = this.currentState.chunks.reduce((sum, chunk) => {
      if(chunk){
        return sum + chunk.loaded;
      }
    }, 0);
    let uploadPercent = uploadedSize / this.file.size;
    let totalPercent = uploadPercent * 99 + this.currentState.mkfileProgress;
    this.currentState.total.loaded = uploadedSize;
    this.currentState.total.percent = totalPercent >= 100 ? 100 : totalPercent;
  }

  updateDirectProgress(loaded) {
    let currentStateTotal = this.currentState.total;
    let totalPercent = 0;
    totalPercent = loaded / this.file.size * 100;
    currentStateTotal.percent =
      totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
  }

  initChunkProgress(size, index){
    this.currentState.chunks[index] = { total: size, loaded: 0, percent: 0 };
  }

  updateChunkProgress(loaded, index) {
    let currentStateUnit = this.currentState.chunks[index];
    let total = this.currentState.chunks[index].total;
    currentStateUnit.loaded = loaded;
    currentStateUnit.percent = loaded / total * 100;
    this.calculateTotalProgress();
  }

  updateMkFileProgress(progress) {
    this.currentState.mkfileProgress = progress;
    this.calculateTotalProgress();
  }
}
