import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import { babel } from '@rollup/plugin-babel'
import pkg from './package.json'

const baseOutputOptions = {
	sourcemap: true,
	name: pkg.jsName
}

const iifeOutputOptions = {
	...baseOutputOptions,
	plugins: [terser()],
	file: pkg.iife,
	format: 'umd', // umd 包含 iife，这里为了向前保持兼容，同时避免用户存在手动引用此文件的情况，遂打包成 umd
}

const umdOutputOptions = {
	...baseOutputOptions,
	file: pkg.main,
	format: 'umd',
}

const esmOutputOptions = {
	...baseOutputOptions,
	file: pkg.module,
	format: 'esm',
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
			iifeOutputOptions,
			umdOutputOptions,
			esmOutputOptions
		]
	}
]
