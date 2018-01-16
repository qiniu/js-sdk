export class Config {
  constructor(options) {
    options = options || {};
    //use http or https protocol
    this.useHttpsDomain = options.useHttpsDomain || false;
    //use cdn accerlated domains
    this.useCdnDomain = options.useCdnDomain || true;
    //zone of the bucket
    //z0 huadong, z1 huabei, z2 huanan, na0 beimei
    this.zone = options.zone || null;
    this.zoneExpire = options.zoneExpire || -1;
    this.BLOCK_SIZE = 4 * 1024 * 1024;
    this.putThreshhold = options.putThreshhold || 512 * 1024;
    this.reponseTimeout = options.reponseTimeout || 60;
  }
}

export var Zone = {
  Zone_z0: {
    srcUphost: "up.qiniup.com",
    cdnUphost: "upload.qiniup.com"
  },
  Zone_z1: {
    srcUphost: "up-z1.qiniup.com",
    cdnUphost: "upload-z1.qiniup.com"
  },
  Zone_z2: {
    srcUphost: "up-z2.qiniup.com",
    cdnUphost: "upload-z2.qiniup.com"
  },
  Zone_na0: {
    srcUphost: "up-na0.qiniup.com",
    cdnUphost: "upload-na0.qiniup.com"
  }
};
export var Zones = {
  Zone_z0: "Zone_z0",
  Zone_z1: "Zone_z1",
  Zone_z2: "Zone_z2",
  Zone_na0: "Zone_na0"
};

export function PutExtra(fname, params, mimeType) {
  this.fname = fname || "";
  this.params = params || {};
  this.mimeType = mimeType || null;
}
