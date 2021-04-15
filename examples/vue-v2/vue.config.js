/**
 * vue.config.js
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

function resolve (dir) {
  return path.join(__dirname, dir)
}

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  // devServer: {
  //   proxy: 'http://localhost:9000'
  // },
  chainWebpack: (config) => {
    // https://sourcegraph.com/github.com/PanJiaChen/vue-admin-template/-/blob/vue.config.js#L52
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
        include: 'initial'
      }
    ])

    // set svg-sprite-loader
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    config
      .plugin('html')
      .tap((args) => {
        args[0].title = '对象存储 JavaScript SDK 示例 - 七牛云'
        return args
      })
  }
}
