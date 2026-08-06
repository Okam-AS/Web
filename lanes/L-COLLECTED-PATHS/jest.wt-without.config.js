const base = require('/Users/svendaneel/okam/web-collected/jest.config.js')
module.exports = {
  ...base,
  rootDir: '/Users/svendaneel/okam/web-collected',
  testPathIgnorePatterns: base.testPathIgnorePatterns.filter((p) => p !== '<rootDir>/lanes/')
}
