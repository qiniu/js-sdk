// 原类型有问题，这里覆盖下
declare module 'exif-js' {
  interface EXIFStatic {
    getData(img: HTMLImageElement, callback: () => void): void
    getTag(img: HTMLImageElement, tag: string): number
  }

  const EXIF: EXIFStatic
  export { EXIF }
}
