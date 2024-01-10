function getProjectConfig(name) {
  return {
    displayName: name,
    testEnvironment: 'jsdom',
    transform: {
      ".ts": 'ts-jest'
    },
    testMatch: [`<rootDir>/${name}/src/**/*.test.ts`],
  }
}

module.exports = {
  projects: [
    getProjectConfig('common'),
    getProjectConfig('browser'),
    getProjectConfig('wechat-miniprogram'),
  ]
}
