// Control config: the repo's real jest config, inherited UNCHANGED, only rootDir pinned.
//
// Its only job is to prove the override machinery in jest.without-lanes.config.js is neutral — a
// listing taken through this file must be byte-identical to a listing taken through the repo's own
// jest.config.js. If it is not, the with/without diff is measuring the wrapper, not the pattern.
const base = require('/Users/svendaneel/okam/Web-modules/jest.config.js')

module.exports = {
  ...base,
  rootDir: '/Users/svendaneel/okam/Web-modules'
}
