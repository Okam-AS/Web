// Override config: the repo's real jest config with the ONE entry under test removed.
//
// Used only with `--listTests`, which collects and prints paths and executes no test. This file
// exists so the "before" number can be measured against the SAME tree at the SAME instant as the
// "after" number, without editing the shared `jest.config.js` that concurrent lanes are reading.
//
// `rootDir` is pinned explicitly: with `--config <path>`, jest defaults rootDir to the directory
// holding the config file, which here would be this lane directory. Pinning it to the repo root
// makes the `<rootDir>/` tokens in the inherited patterns resolve exactly as they do in a real run.
const base = require('/Users/svendaneel/okam/Web-modules/jest.config.js')

const REMOVED = '<rootDir>/lanes/'

if (!base.testPathIgnorePatterns.includes(REMOVED)) {
  throw new Error(
    'PRECONDITION FAILED: jest.config.js does not contain ' + REMOVED + ' — ' +
    'there is no "before" to measure and the diff below would be meaningless.'
  )
}

module.exports = {
  ...base,
  rootDir: '/Users/svendaneel/okam/Web-modules',
  testPathIgnorePatterns: base.testPathIgnorePatterns.filter((p) => p !== REMOVED)
}
