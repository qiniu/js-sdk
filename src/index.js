import { ZONES } from "./config";
import {
  createMkFileUrl,
  isChunkExpired,
  getUploadUrl,
  isCustomVar
} from "./utils";
import { UploadManager } from "./upload";
import { imageMogr2, watermark, imageInfo, exif, pipeline } from "./image";
import { Observable } from "./observable";

function upload(file, key, token, putExtra, config) {
  let options = {
    file: file,
    key: key,
    token: token,
    putExtra: putExtra,
    config: config
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
  ZONES,
  createMkFileUrl,
  isChunkExpired,
  checkLocalFileInfo,
  setLocalItemInfo,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  pipeline,
  isCustomVar
};
