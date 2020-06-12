export const region = {
  z0: 'z0',
  z1: 'z1',
  z2: 'z2',
  na0: 'na0',
  as0: 'as0'
} as const

export const regionUphostMap = {
  [region.z0]: {
    srcUphost: 'up.qiniup.com',
    cdnUphost: 'upload.qiniup.com'
  },
  [region.z1]: {
    srcUphost: 'up-z1.qiniup.com',
    cdnUphost: 'upload-z1.qiniup.com'
  },
  [region.z2]: {
    srcUphost: 'up-z2.qiniup.com',
    cdnUphost: 'upload-z2.qiniup.com'
  },
  [region.na0]: {
    srcUphost: 'up-na0.qiniup.com',
    cdnUphost: 'upload-na0.qiniup.com'
  },
  [region.as0]: {
    srcUphost: 'up-as0.qiniup.com',
    cdnUphost: 'upload-as0.qiniup.com'
  }
} as const
