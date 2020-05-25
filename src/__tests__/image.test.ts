import { imageView2, imageMogr2, watermark, imageInfo } from '../image';
import { urlSafeBase64Encode } from "../base64";

import { request } from "../utils";
jest.mock("../utils")
describe("image func test", () => {
  let domain = "http://otxza7yo2.bkt.clouddn.com";
  let key = "test.png";

  test("imageView2", () => {
    let m = {
      "fop": "imageView2",
      "mode": 2,
      "h": 450,
      "q": 100
    }
    let url = imageView2(m, key, domain)
    expect(url).toBe(
      "http://otxza7yo2.bkt.clouddn.com/" + key + "?" + 
      "imageView2/" + encodeURIComponent(m.mode) +
      "/h" + "/" + encodeURIComponent(m.h) +
      "/q" + "/" + encodeURIComponent(m.q)
    )
  });

  test("imageMogr2", () => {
    let m = {
      thumbnail: 1,
      strip: true,
      gravity: 1,
      crop: 1,
      quality: 1,
      rotate: 1,
      format: 1,
      blur: 1
    };

    let url = imageMogr2(m, key, domain);
    expect(url).toBe(
      "http://otxza7yo2.bkt.clouddn.com/" + key + "?imageMogr2/" + 
      "thumbnail/1/strip/gravity/1/quality/1/crop/1/rotate/1/format/1/blur/1"
    )
  });

  test("watermark", () => {
    let m ={
      fop: "watermark",
      mode: 1,
      image: "http://www.b1.qiniudn.com/images/logo-2.png",
      dissolve: 100,
      dx: 100,
      dy: 100
    };
    let url = watermark(m, key, domain);
    expect(url).toBe(
      "http://otxza7yo2.bkt.clouddn.com/" + key + "?" +
      "watermark/" + m.mode + "/image/" + urlSafeBase64Encode(m.image) +
      "/dissolve/100/dx/100/dy/100"
    );
    m.mode = 3;
    expect(()=> {
      watermark(m, key, domain)
    }).toThrow("mode is wrong")
  });

  test("imageInfo", () => {
     let info = imageInfo(key, domain)
     let url = domain + "/" + key + "?imageInfo";
     expect(request.mock.calls[0]).toEqual([url, { method: "GET" }])
  })
})