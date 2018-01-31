import { zones } from "./config";
import {
  createMkFileUrl,
  isChunkExpired,
  getUploadUrl,
  getHeadersForMkFile,
  getHeadersForChunkUpload,
  filterParams
} from "./utils";
import { UploadManager } from "./upload";
import { imageMogr2, watermark, imageInfo, exif, pipeline } from "./image";
import { Observable } from "./observable";

function upload(file, key, token, putExtra, config) {
  let options = {
    file,
    key,
    token,
    putExtra,
    config
  };

  return new Observable(observer => {
    let uploadManager = new UploadManager(options, {
      onData: e => observer.next(e),
      onError: e => observer.error(e),
      onComplete: e => observer.complete(e)
    });
    uploadManager.putFile();
    return uploadManager.stop.bind(uploadManager);
  });
}

export {
  upload,
  zones,
  createMkFileUrl,
  isChunkExpired,
  getHeadersForChunkUpload,
  getHeadersForMkFile,
  filterParams,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  pipeline
};
