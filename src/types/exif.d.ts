// 原类型有问题，这里覆盖下
declare module "exif-js" {
  interface EXIFStatic {
    getData: (img: HTMLImageElement, callback: () => void) => void
    getTag(img: any, tag: any): any;
    getAllTags(img: any): any;
    pretty(img: any): string;
    readFromBinaryFile(file: any): any;
  }

  var EXIF : EXIFStatic
  export { EXIF }
}

