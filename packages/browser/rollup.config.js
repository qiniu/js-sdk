import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { babel } from '@rollup/plugin-babel'

import pkg from './package.json'

const baseOutputOptions = {
  sourcemap: true,
  name: pkg.jsName
}

const umdOutputOptions = {
  ...baseOutputOptions,
  file: pkg.main,
  format: 'umd',
  name: 'qiniu-js'
}

export default [
  {
    input: 'src/index.ts',
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript(),
      babel({ babelHelpers: 'bundled' })
    ],
    output: [
      umdOutputOptions
    ]
  }
]
