module.exports = {
  "extends": "eslint:recommended",
  "env": {
    "browser": true,
    "node": true,
    "commonjs": true,
    "amd": true,
    "worker":true,
    "es6":true,
    "mocha":true
  },
  "parserOptions": {
    "sourceType": "module",//module
    // 想使用的额外的语言特性:
    "ecmaFeatures": {
      // 允许在全局作用域下使用 return 语句
      "globalReturn":true,
      // impliedStric
      "impliedStrict":true,
      "experimentalObjectRestSpread": true
    }
  },
  "rules": {
    "no-console": "off",
    "no-redeclare": 2,
    "keyword-spacing": 1,
    "prefer-spread": 0,
    "indent":[
      0, 
      2
    ],
    "array-bracket-spacing": [1, "never"],
    "comma-spacing": [1, { "before": false, "after": true }],
    "no-var": 1,
    "eqeqeq": 0,
    "brace-style": 1,
    "camelcase": 0,
    "space-infix-ops": 1,
    "no-unused-vars": [1, { "vars": "all", "args": "none" }],
    "spaced-comment": [1, "always", { "markers": ["global", "globals", "eslint", "eslint-disable", "*package", "!"] }],
    "quotes": [
      "error",
      "double"
    ],
    "no-shadow": 0,
    "semi": [
      1,
      "always"
    ]
  },
}