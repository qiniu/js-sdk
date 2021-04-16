export enum Regions {
  z0 = 'z0',
  z1 = 'z1',
  z2 = 'z2',
  na0 = 'na0',
  as0 = 'as0'
}

export const RegionNameMap = {
  [Regions.z0]: '华东',
  [Regions.z1]: '华北',
  [Regions.z2]: '华南',
  [Regions.na0]: '北美',
  [Regions.as0]: '新加坡'
} as const
