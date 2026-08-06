// Playwright config for THIS LANE's browser arms only.
//
// Deliberately separate from the repo's playwright.config.js: that one carries the journey
// recorder, which POSTs `/__fixture/reset` before the browser opens and refuses an origin that does
// not answer. These arms run outside the recorder — no fixture, no artifact contract — because the
// whole point is to compile a MUTATED source and watch it, which is not a journey anybody should
// record. `webServer` is absent on purpose: run-browser-arm.sh starts the compiler itself, after the
// mutation, so a server can never outlive the source it was built from.

module.exports = {
  testDir: __dirname,
  testMatch: /browser-arm\.playwright\.js$/,
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    actionTimeout: 20000
  }
};
