module.exports = {
  env: {
    commonjs: true,
    es2020: true,
    node: true,
    "jest/globals": true
  },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["jest", "prettier"],
  parserOptions: {
    ecmaVersion: 11
  },
  rules: {
    "prettier/prettier": ["error"]
  }
};
