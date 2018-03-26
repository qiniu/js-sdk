import { isChunkExpired, filterParams, sum, setLocalFileInfo, getLocalFileInfo, createMkFileUrl } from "../utils";
import { urlSafeBase64Encode } from "../base64";

describe("utils test", () => {
  test("isChunkExpired", () => {
    expect(isChunkExpired(new Date().getTime())).toBeFalsy();
  })

  test("filterParams", () => {
    let params = {
      "x:key": "file",
      "x:domain": "domain"
    };
    expect(filterParams(params)).toEqual([["x:key", "file"], ["x:domain", "domain"]]);
  })

  test("sum", () => {
    expect(sum([1, 2, 3, 4, 5, 6])).toBe(21);
  })

  test("test LocalFileInfo", () => {
    let mockFile = { name: "test", size: 1024 };
    let info = { code: 200 };
    setLocalFileInfo(mockFile, info);
    expect(getLocalFileInfo(mockFile)).toEqual(info);
  })

  test("createMkFileUrl", () => {
    let putExtra = {
      fname: "",
      params: {
        "x:start": "qiniu"
      },
      mimeType: null,
    };
    let url = "http://upload-z1.qiniup.com";
    expect(createMkFileUrl(url, 1024, "qiniu", putExtra)).toBe(
      "http://upload-z1.qiniup.com/mkfile/1024" + "/key/" + urlSafeBase64Encode("qiniu") +
      "/" + encodeURIComponent("x:start") + "/" + urlSafeBase64Encode("qiniu")
    );
  })
})