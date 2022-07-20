function getProjectConfig(name) {
  return {
    displayName: name,
    testEnvironment: 'jsdom',
    transform: {
      ".ts": 'ts-jest'
    },
    testMatch: [`<rootDir>/packages/${name}/src/**/*.test.ts`],
  }
}

module.exports = {
  projects: [
    getProjectConfig('qiniu-js'),
    getProjectConfig('doc-site')
  ]
}
