module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: [
    '@nuxtjs/eslint-config-typescript',
    'plugin:nuxt/recommended'
  ],
  plugins: [
  ],
  // add your custom rules here
  rules: {
    quotes: ['warn', 'single'],
    indent: ['warn', 2],
    'eol-last': 'off',
    'space-before-function-paren': ['warn', 'always'],
    'comma-dangle': ['warn'],
    'no-trailing-spaces': 'warn',
    'padded-blocks': 'warn',
    'no-irregular-whitespace': 'warn',
    'no-tabs': 'warn',
    'no-mixed-spaces-and-tabs': 'warn'
  }
}
