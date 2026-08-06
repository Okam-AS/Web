module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '^vue$': 'vue/dist/vue.common.js'
  },
  // The browser journeys are also `*.spec.js`, and Jest's default testMatch would happily pick them
  // up, load `@playwright/test` outside a Playwright runner and fail the whole suite. They are run
  // by `npm run test:e2e`.
  //
  // `lanes/` is the same hazard from a second direction. It holds lane working directories — the
  // evidence a lane records for its own defect — and what lands there is not this suite's input:
  //   - Playwright probes a lane wrote to demonstrate a defect. Jest collects them, loads
  //     `@playwright/test` outside a runner and reports "N failed suites, 0 failed tests". The count
  //     grows as siblings land, so every lane inherits a red it must explain away.
  //   - Archived COPIES of real jest tests (e.g. a `*.OLD.test.js` kept to show what a fix replaced).
  //     These are worse than the red, because they RUN and PASS: the superseded assertions rejoin
  //     the green count as duplicates of the live test that replaced them.
  // Both are run deliberately elsewhere or kept deliberately as evidence. The defect was that jest
  // collected them, not that they exist — so this excludes, and nothing here is deleted.
  //
  // Anchored to `<rootDir>/` on purpose. These entries are regexes matched against the whole path,
  // so a bare `lanes` would also match `docs/plan/lanes/` (14 paths in this repo) and any future
  // file whose name merely contains the word.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/e2e/',
    '<rootDir>/lanes/'
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
