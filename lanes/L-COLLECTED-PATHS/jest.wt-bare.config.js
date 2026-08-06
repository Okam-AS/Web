// The pattern the fix did NOT use: bare `lanes` instead of the anchored `<rootDir>/lanes/`.
// Listed only to measure what the anchor buys, against the same canaries.
const base = require('/Users/svendaneel/okam/web-collected/jest.config.js')
module.exports = {
  ...base,
  rootDir: '/Users/svendaneel/okam/web-collected',
  testPathIgnorePatterns: base.testPathIgnorePatterns.map((p) => (p === '<rootDir>/lanes/' ? 'lanes' : p))
}
