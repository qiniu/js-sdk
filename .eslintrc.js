module.exports = {
  extends: [
    '@qiniu'
  ],
  settings: {
    "import/resolver": {
      node: {
        extensions: ['.js', '.ts'],
        moduleDirectory: ['node_modules', 'src/']
      }
    }
  }
}
