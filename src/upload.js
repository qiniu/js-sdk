import {
  initCurrentState,
  getCurrentStateItem,
  getChunks,
  isChunkExpired,
  createXHR,
  createMkFileUrl,
  xhrStateDeal,
  getLocalFileInfoAndMd5,
  setLocalFileInfoAndMd5,
  removeLocalFileInfoAndMd5,
  getHeadersForChunkUpload,
  getHeadersForMkfile,
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
    this.xhrList = [];
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
    let upload =
      this.file.size > BLOCK_SIZE ? this.resumeUpload() : this.directUpload();
    return upload.catch(err => {
      this.stop();
      this.onError(err);
    });
  }

  stop() {
    this.xhrList.map(xhr => xhr.abort());
  }

  // 直传
  directUpload() {
    this.currentState = initCurrentState(this.file.size);
    let formData = new FormData();
    let multipart_params = {};
    formData.append("file", this.file);
    formData.append("token", this.token);
    if (this.key !== null && this.key !== undefined) {
      formData.append("key", this.key);
    }
    formData.append("fname", this.putExtra.fname);
    filterParams(this.putExtra.params).map(k =>
      formData.append(k, this.putExtra.params[k].toString())
    );

    return this.postRequest(this.uploadUrl, {
      body: formData,
      onProgress: loaded => this.updateDirectProgress(loaded)
    }).then(res => {
      this.onComplete(res);
    });
  }

  // 分片上传
  resumeUpload() {
    return getLocalFileInfoAndMd5(this.file).then(res => {
      this.ctxList = [];
      this.localInfo = res.info;
      let md5 = res.md5;
      this.currentState = initCurrentState(this.file.size, this.localInfo);
      let chunks = getChunks(this.file, BLOCK_SIZE);
      let uploadChunks = chunks.map((chunk, index) => {
        return this.mkblkReq(chunk, index);
      });

      let result = Promise.all(uploadChunks).then(() => {
        return this.mkfileReq();
      });

      return result.then(
        res => {
          let progress = 1;
          this.updateMkFileProgress(progress);
          this.onData(this.currentState);
          removeLocalFileInfoAndMd5(this.file.name, md5);
          this.onComplete(res);
        },
        err => {
          setLocalFileInfoAndMd5(this.file.name, md5, this.ctxList);
          return Promise.reject(err);
        }
      );
    });
  }

  postRequest(url, options) {
    return new Promise((resolve, reject) => {
      let xhr = createXHR();
      this.xhrList.push(xhr);
      xhr.open("POST", url);
      if (options.headers) {
        Object.keys(options.headers).map(k =>
          xhr.setRequestHeader(k, options.headers[k])
        );
      }
      xhr.upload.addEventListener("progress", evt => {
        if (evt.lengthComputable && options.onProgress) {
          options.onProgress(evt.loaded);
        }
        this.onData(this.currentState);
      });
      xhr.onreadystatechange = () => xhrStateDeal(resolve, reject, xhr);
      xhr.send(options.body);
    });
  }

  mkblkReq(chunk, index) {
    return new Promise((resolve, reject) => {
      let info = this.localInfo[index];
      let item = { blockSize: chunk.size, loaded: 0, percent: 0 };
      if (info && !isChunkExpired(info.expired_at)) {
        item.percent = 100;
        item.loaded = chunk.size;
        this.currentState.chunks[index] = getCurrentStateItem(item);
        this.ctxList[index] = { ctx: info.ctx, time: info.expired_at };
        resolve();
        return;
      }
      let reader = new FileReader();
      this.currentState.chunks[index] = getCurrentStateItem(item);
      let requestURI = this.uploadUrl + "/mkblk/" + chunk.size;
      reader.readAsArrayBuffer(chunk);
      reader.onload = evt => {
        let body = evt.target.result;
        let headers = getHeadersForChunkUpload(this.token);
        let onProgress = loaded => this.updateChunkProgress(loaded, index);
        resolve(
          this.postRequest(requestURI, { headers, body, onProgress }).then(
            response => {
              this.ctxList[index] = {
                expired_at: response.expired_at,
                ctx: response.ctx
              };
            }
          )
        );
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
        this.file.size,
        this.key,
        putExtra
      );
      let body = this.ctxList.map(value => value.ctx).join(",");
      let headers = getHeadersForMkfile(this.token);
      resolve(this.postRequest(requestURI, { body, headers }));
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

  updateChunkProgress(loaded, index) {
    let currentStateUnit = this.currentState.chunks[index];
    let total = this.currentState.chunks[index].total;
    currentStateUnit.loaded = loaded;
    currentStateUnit.percent = loaded / total * 100;
    this.calculateTotalProgress();
  }

  updateDirectProgress(loaded) {
    let currentStateTotal = this.currentState.total;
    let totalPercent = 0;
    totalPercent = loaded / this.file.size * 100;
    currentStateTotal.percent =
      totalPercent >= 100 ? 100 : totalPercent.toFixed(1);
  }

  updateMkFileProgress(progress) {
    this.currentState.mkFileReqState = progress;
    this.calculateTotalProgress();
  }
}
