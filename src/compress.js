import { EXIF } from "exif-js";
import { createObjectURL, getTransform } from "./utils";

let mimeTypes = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
  BMP: "image/bmp"
};

let maxSteps = 4;
let scaleFactor = Math.log(2);
let supportMimeTypes = Object.keys(mimeTypes).map(type => mimeTypes[type]);
let defaultType = mimeTypes.JPEG;

function isSupportedType(type) {
  return supportMimeTypes.includes(type);
}

class Compress {
  constructor(file, option) {
    this.config = Object.assign(
      {
        quality:0.92,
        noCompressIfLarger:false
      },
      option
    );
    this.file = file;
  }

  process() {
    this.outputType = this.file.type;
    let srcDimension = {};
    if (!isSupportedType(this.file.type)) {
      return Promise.reject(new Error(`unsupported file type: ${this.file.type}`));
    }

    return this.getOriginImage()
    .then(img => {
      return this.getCanvas(img);
    })
    .then(canvas => {
      // 计算图片缩小比例，取最小值，如果大于1则保持图片原尺寸
      let scale = 1;
      if (this.config.maxWidth) {
        scale = Math.min(1, this.config.maxWidth / canvas.width);
      }
      if (this.config.maxHeight) {
        scale = Math.min(1, scale, this.config.maxHeight / canvas.height);
      }
      srcDimension.width = canvas.width;
      srcDimension.height = canvas.height;
      return this.doScale(canvas, scale);
    })
    .then(result => {
      let distBlob = this.toBlob(result);
      if (distBlob.size > this.file.size && this.config.noCompressIfLarger){
        return {
          dist: this.file,
          width: srcDimension.width,
          height: srcDimension.height
        };
      }
      return ({
        dist: distBlob,
        width: result.width,
        height: result.height
      });
    });
  }

  clear(ctx, width, height) {
    // jpeg 没有 alpha 通道，透明区间会被填充成黑色，这里把透明区间填充为白色
    if (this.outputType === defaultType) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.clearRect(0, 0, width, height);
    }
  }
  // 通过 file 初始化 image 对象
  getOriginImage() {
    return new Promise((resolve, reject) => {
      let url = createObjectURL(this.file);
      let img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject("image load error");
      };
      img.src = url;
    });
  }

  getCanvas(img) {
    return new Promise((resolve, reject) => {
      // 通过得到图片的信息来调整显示方向以正确显示图片，主要解决 ios 系统上的图片会有旋转的问题
      EXIF.getData(img, () => {
        let orientation = EXIF.getTag(img, "Orientation") || 1;
        let { width, height, matrix } = getTransform(img, orientation);
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        this.clear(context, width, height);
        context.transform(...matrix);
        context.drawImage(img, 0, 0);
        resolve(canvas);
      });
    });
  }

  doScale(source, scale) {
    if (scale === 1) {
      return Promise.resolve(source);
    }
    // 不要一次性画图，通过设定的 step 次数，渐进式的画图，这样可以增加图片的清晰度，防止一次性画图导致的像素丢失严重
    let sctx = source.getContext("2d");
    let steps = Math.min(maxSteps, Math.ceil((1 / scale) / scaleFactor));

    let factor = Math.pow(scale, 1 / steps);

    let mirror = document.createElement("canvas");
    let mctx = mirror.getContext("2d");

    let { width, height } = source;
    let originWidth = width;
    let originHeight = height;
    mirror.width = width;
    mirror.height = height;
    let src, context;

    for (let i = 0; i < steps; i++) {

      let dw = width * factor | 0;
      let dh = height * factor | 0;
      // 到最后一步的时候 dw, dh 用 目标缩放尺寸，否则会出现最后尺寸偏小的情况
      if (i === steps - 1) {
        dw = originWidth * scale;
        dh = originHeight * scale;
      }

      if (i % 2 === 0) {
        src = source;
        context = mctx;
      } else {
        src = mirror;
        context = sctx;
      }
      // 每次画前都清空，避免图像重叠
      this.clear(context, width, height);
      context.drawImage(src, 0, 0, width, height, 0, 0, dw, dh);
      width = dw;
      height = dh;
    }

    let canvas = src === source ? mirror : source;
    // save data
    let data = context.getImageData(0, 0, width, height);

    // resize
    canvas.width = width;
    canvas.height = height;

    // store image data
    context.putImageData(data, 0, 0);

    return Promise.resolve(canvas);
  }

  // 这里把 base64 字符串转为 blob 对象
  toBlob(result) {
    let dataURL = result.toDataURL(this.outputType, this.config.quality);
    let buffer = atob(dataURL.split(",")[1]).split("").map(char => char.charCodeAt(0));
    let blob = new Blob([new Uint8Array(buffer)], { type: this.outputType });
    return blob;
  }
}

let compressImage = (file, options) => {
  return new Compress(file, options).process();
};

export default compressImage;
