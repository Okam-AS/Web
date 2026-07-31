module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '^vue$': 'vue/dist/vue.common.js'
  },
  // The browser journeys are also `*.spec.js`, and Jest's default testMatch would happily pick them
  // up, load `@playwright/test` outside a Playwright runner and fail the whole suite. They are run
  // by `npm run test:e2e`.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/e2e/'
  ],
  moduleFileExtensions: [
    'ts',
    'js',
    'vue',
    'json'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
    '.*\\.(vue)$': 'vue-jest'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/components/**/*.vue',
    '<rootDir>/pages/**/*.vue'
  ]
}
