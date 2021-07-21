module.exports = {
  transform: {
    ".ts": 'ts-jest'
  },
  testRegex: '.+\\.test\\.ts$',
  testPathIgnorePatterns: [
    "esm",
    "lib",
    "examples",
    "node_modules"
  ]
};
