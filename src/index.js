import { zoneUphostMap, ZONES } from "./config";
import { createFileUrl, checkExpire, getUploadUrl } from "./utils";
import { UploadManager } from "./upload";
import { imageMogr2, watermark, imageInfo, exif, pipeline } from "./image";
import { Observable } from "./observable";

function upload(file, key, token, putExtra, config) {
  let option = {
    file: file,
    key: key,
    token: token,
    putExtra: putExtra,
    config: config
  };
  let uploadManager = new UploadManager(option);
  return new Observable(observer => {
    uploadManager.onData = e => observer.next(e);
    uploadManager.onError = e => observer.error(e);
    uploadManager.onComplete = e => observer.complete(e);
    uploadManager.putFile();
    return uploadManager.stop.bind(uploadManager);
  });
}

export {
  upload,
  ZONES,
  createFileUrl,
  checkExpire,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  pipeline
};
