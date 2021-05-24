declare module 'byte-size' {
  interface Result {
    value: string
    unit: string
    long: string

    toString(): string
  }

  const byteSize: (v: number, options: { precision: number }) => Result
  export default byteSize
}
