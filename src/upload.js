import {
  getChunks,
  isChunkExpired,
  createXHR,
  createMkFileUrl,
  getLocalFileInfoAndMd5,
  setLocalFileInfo,
  removeLocalFileInfo,
  sum,
  getHeadersForChunkUpload,
  getHeadersForMkFile,
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
    this.xhrList = [];
    this.xhrHandler = xhr => this.xhrList.push(xhr);
    this.file = options.file;
    this.key = options.key;
    this.token = options.token;
    this.onData = () => {};
    this.onError = () => {};
    this.onComplete = () => {};
    Object.assign(this, handlers);
  }

  putFile() {
    this.loaded = {
      direct: 0,
      mkFileProgress: 0,
      chunks: null
    };
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
    upload.then(res => this.onComplete(res)).catch(err => {
      this.stop();
      this.onError(err);
    });

    return upload;
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
    filterParams(this.putExtra.params).forEach(item =>
      formData.append(item[0], item[1])
    );

    return request(this.uploadUrl, {
      method: "POST",
      body: formData,
      onProgress: evt => {
        this.updateDirectProgress(evt.loaded, evt.total);
      },
      onCreate: this.xhrHandler
    });
  }

  // 分片上传
  resumeUpload() {
    return getLocalFileInfoAndMd5(this.file).then(res => {
      this.ctxList = [];
      let md5 = res.md5;
      this.localInfo = res.info;

      this.chunks = getChunks(this.file, BLOCK_SIZE);
      this.initChunksProgress();
      let uploadChunks = this.chunks.map((chunk, index) => {
        return this.uploadChunk(chunk, index);
      });

      let result = Promise.all(uploadChunks).then(() => {
        return this.mkFileReq();
      });

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
    let info = this.localInfo[index];
    if (info && !isChunkExpired(info.time)) {
      this.updateChunkProgress(chunk.size, index);
      this.ctxList[index] = { ctx: info.ctx, time: info.time };
      return Promise.resolve();
    }

    let requestUrl = this.uploadUrl + "/mkblk/" + chunk.size;

    return readAsArrayBuffer(chunk).then(body => {
      let headers = getHeadersForChunkUpload(this.token);
      let onProgress = evt => {
        this.updateChunkProgress(evt.loaded, index);
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
          ctx: response.ctx
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

    return request(requestUrL, { method, body, headers, onCreate }).then(
      res => {
        this.updateMkFileProgress(1);
        return Promise.resolve(res);
      }
    );
  }

  initChunksProgress() {
    this.loaded.chunks = this.chunks.map(_ => 0);
    this.notifyProgress();
  }

  updateDirectProgress(loaded, total) {
    this.loaded.direct = { loaded: loaded, total: total };
    this.notifyProgress();
  }

  updateChunkProgress(loaded, index) {
    this.loaded.chunks[index] = loaded;
    this.notifyProgress();
  }

  updateMkFileProgress(progress) {
    this.loaded.mkFileProgress = 1;
    this.notifyProgress();
  }

  notifyProgress() {
    this.onData(this.getProgressInfo());
  }

  getProgressInfo() {
    if (!this.loaded.chunks) {
      return {
        total: this.getProgressInfoItem(
          this.loaded.direct.loaded,
          this.loaded.direct.total
        )
      };
    }
    return {
      total: this.getProgressInfoItem(sum(this.loaded.chunks), this.file.size),
      chunks: this.chunks.map((chunk, index) => {
        return this.getProgressInfoItem(this.loaded.chunks[index], chunk.size);
      })
    };
  }

  getProgressInfoItem(loaded, size) {
    return {
      loaded: loaded,
      size: size,
      percent: this.loaded.mkFileProgress
        ? (loaded + 1) / (size + 1) * 100
        : loaded / (size + 1) * 100
    };
  }
}
