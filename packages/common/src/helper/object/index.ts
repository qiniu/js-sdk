export function removeUndefinedKeys(obj: { [key: string]: any }): object {
  const newOby: { [key: string]: any } = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key] !== undefined) {
        newOby[key] = obj[key]
      }
    }
  }

  return newOby
}
