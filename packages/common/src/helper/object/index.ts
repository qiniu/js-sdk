export function removeUndefinedKeys<T extends { [key: string]: any }>(obj: T): T {
  const newOby: T = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key] !== undefined) {
        newOby[key] = obj[key]
      }
    }
  }

  return newOby
}
