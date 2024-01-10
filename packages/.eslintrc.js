module.exports = {
  root: true,
  extends: ['@qiniu'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./packages/*/tsconfig.json'],
  }
}
