// The repo's own Playwright config, pointed at this lane's probe instead of at test/e2e/journeys.
//
// Reusing it rather than writing a second one is the point: the fixture backend, the dev server, the
// timeouts and the admin locale are then the SAME ones every journey runs against, so a sentence
// this probe photographs is a sentence the product renders and not one a bespoke harness produced.
const base = require('../../playwright.config.js');

module.exports = Object.assign({}, base, {
  testDir: __dirname,
  testMatch: '**/*.probe.spec.js',
  testIgnore: undefined,
  outputDir: __dirname + '/playwright-output',
  globalTeardown: undefined,
  reporter: [['list']],
  // Playwright resolves a webServer command relative to the CONFIG's directory, and this config does
  // not live at the repo root. Without this the fixture and dev-server commands resolve inside
  // lanes/ and the run dies before a browser opens.
  webServer: (base.webServer || []).map(server => Object.assign({}, server, { cwd: __dirname + '/../..' }))
});
