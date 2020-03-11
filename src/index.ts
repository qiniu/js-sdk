import { region } from "./config";
import {
  createMkFileUrl,
  getUploadUrl,
  getResumeUploadedSize,
  getHeadersForMkFile,
  getHeadersForChunkUpload,
  filterParams
} from "./utils";
import { UploadManager } from "./upload";
import { imageMogr2, watermark, imageInfo, exif, pipeline } from "./image";
import { Observable } from "./observable";
import { StatisticsLogger } from "./statisticsLog";
import compressImage from "./compress";
let statisticsLogger = new StatisticsLogger();

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
    }, statisticsLogger);
    uploadManager.putFile();
    return uploadManager.stop.bind(uploadManager);
  });
}

export {
  upload,
  region,
  createMkFileUrl,
  getHeadersForChunkUpload,
  getResumeUploadedSize,
  getHeadersForMkFile,
  filterParams,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  compressImage,
  pipeline
};
