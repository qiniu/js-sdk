module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    "browser": true,
    "node": true,
    "commonjs": true,
    "amd": true,
    "worker":true,
    "es6":true,
    "mocha":true
  },
  parserOptions: {
    "sourceType": "module",//module
    "project": './tsconfig.json',
    // 想使用的额外的语言特性:
    "ecmaFeatures": {
      // 允许在全局作用域下使用 return 语句
      "globalReturn":true,
      // impliedStric
      "impliedStrict":true,
      "experimentalObjectRestSpread": true
    }
  },
  rules: {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "indent": "off",
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/array-type": ["error", { "default": "array-simple" }],
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-this-alias": "off",
    "quotes": "off",
    "@typescript-eslint/quotes": ["error", "single", { "avoidEscape": true }],
    "@typescript-eslint/member-delimiter-style": "off",
    "@typescript-eslint/interface-name-prefix": ["error", { "prefixWithI": "always", "allowUnderscorePrefix": true }],
    "camelcase": "off",
    "@typescript-eslint/camelcase": "off",
    "no-redeclare":["error", { "builtinGlobals": true }],
    "keyword-spacing": "error",
    "prefer-spread": "warn",
    "array-bracket-spacing": ["error", "never", { "objectsInArrays": false }],
    "comma-spacing": ["error", { "before": false, "after": true }],
    "eqeqeq": ["error", "smart"],
    "spaced-comment": ["error", "always", { "markers": ["global", "globals", "eslint", "eslint-disable", "*package", "!"] }],
    "space-before-function-paren": ["error", {
      "anonymous": "never",
      "asyncArrow": "always",
      "named": "never"
    }],
    "arrow-body-style": ["error", "as-needed"],
    "max-len": ["warn", 120, { "ignoreUrls": true, "ignoreStrings": true }],
    "semi": ["error", "never"]
  },
}
