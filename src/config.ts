export enum Region {
  Z0 = 'z0',
  Z1 = 'z1',
  Z2 = 'z2',
  Na0 = 'na0',
  As0 = 'as0'
}

export const regionUphostMap = {
  [Region.Z0]: {
    srcUphost: 'up.qiniup.com',
    cdnUphost: 'upload.qiniup.com'
  },
  [Region.Z1]: {
    srcUphost: 'up-z1.qiniup.com',
    cdnUphost: 'upload-z1.qiniup.com'
  },
  [Region.Z2]: {
    srcUphost: 'up-z2.qiniup.com',
    cdnUphost: 'upload-z2.qiniup.com'
  },
  [Region.Na0]: {
    srcUphost: 'up-na0.qiniup.com',
    cdnUphost: 'upload-na0.qiniup.com'
  },
  [Region.As0]: {
    srcUphost: 'up-as0.qiniup.com',
    cdnUphost: 'upload-as0.qiniup.com'
  }
} as const
