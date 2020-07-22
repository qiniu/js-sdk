module.exports = {
  testURL: "http://localhost",
  transform: {
    ".ts": 'ts-jest'
  },
  testRegex: '.+\\.test\\.(ts|js)$',
  testPathIgnorePatterns: [
    "esm",
    "lib",
    "node_modules"
  ]
};
