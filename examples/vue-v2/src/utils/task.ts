export function generateTaskId (filename: string): string {
  return window.encodeURI(filename + (new Date()).getTime())
}
