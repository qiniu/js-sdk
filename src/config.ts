export enum ZoneType {
  Z0 = 'z0',
  Z1 = 'z1',
  Z2 = 'z2',
  Na0 = 'na0',
  As0 = 'as0'
}

export const regionUphostMap = {
  [ZoneType.Z0]: {
    srcUphost: 'up.qiniup.com',
    cdnUphost: 'upload.qiniup.com'
  },
  [ZoneType.Z1]: {
    srcUphost: 'up-z1.qiniup.com',
    cdnUphost: 'upload-z1.qiniup.com'
  },
  [ZoneType.Z2]: {
    srcUphost: 'up-z2.qiniup.com',
    cdnUphost: 'upload-z2.qiniup.com'
  },
  [ZoneType.Na0]: {
    srcUphost: 'up-na0.qiniup.com',
    cdnUphost: 'upload-na0.qiniup.com'
  },
  [ZoneType.As0]: {
    srcUphost: 'up-as0.qiniup.com',
    cdnUphost: 'upload-as0.qiniup.com'
  }
}

export const region = {
  [ZoneType.Z0]: 'z0',
  [ZoneType.Z1]: 'z1',
  [ZoneType.Z2]: 'z2',
  [ZoneType.Na0]: 'na0',
  [ZoneType.As0]: 'as0'
}
