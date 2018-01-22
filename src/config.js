export class Config {
  constructor(options) {
    const defaultOption = {
      useHttpsDomain: false,
      useCdnDomain: true,
      zone: null
    };
    Object.assign(this, defaultOption, options);
  }
}

export const BLOCK_SIZE = 4 * 1024 * 1024;

export var ZONE = {
  z0: {
    srcUphost: "up.qiniup.com",
    cdnUphost: "upload.qiniup.com"
  },
  z1: {
    srcUphost: "up-z1.qiniup.com",
    cdnUphost: "upload-z1.qiniup.com"
  },
  z2: {
    srcUphost: "up-z2.qiniup.com",
    cdnUphost: "upload-z2.qiniup.com"
  },
  na0: {
    srcUphost: "up-na0.qiniup.com",
    cdnUphost: "upload-na0.qiniup.com"
  }
};
export var ZONES = {
  z0: "z0",
  z1: "z1",
  z2: "z2",
  na0: "na0"
};

export class PutExtra {
  constructor(options) {
    const defaultOption = {
      fname: "",
      params: {},
      mimeType: null
    };
    Object.assign(this, defaultOption, options);
  }
}
