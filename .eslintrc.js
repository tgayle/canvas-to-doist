module.exports = {
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": [
    '@typescript-eslint'
  ],
  "extends": ["eslint:recommended", "plugin:prettier/recommended"],
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2018
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    "no-unused-vars": "off",
    "linebreak-style": ["error", "unix"],
  }
}