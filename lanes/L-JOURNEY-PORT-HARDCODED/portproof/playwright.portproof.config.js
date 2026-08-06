// A lane-local Playwright config for the port-resolution red proof.
//
// It deliberately does NOT reuse the repo config: that one starts `nuxt dev` (not needed here, and a
// second dev server writing this repo's shared `.nuxt/` is a cost with no return) and it points
// testDir at test/e2e/journeys, whose specs write to the SHARED artifact slots under
// artifacts/journeys/. This proof writes nothing outside the lane directory.

const { defineConfig } = require('@playwright/test');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE_PORT = process.env.E2E_FIXTURE_PORT || '4010';

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.js',
  outputDir: path.join(__dirname, 'output'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30 * 1000,
  expect: { timeout: 8 * 1000 },
  reporter: [['list']],
  // `reuseExistingServer: false` on purpose. Silently borrowing a fixture somebody else started is
  // the very failure under investigation; if the chosen port is occupied this run must refuse.
  webServer: {
    command: 'node test/e2e/fixture/api-server.js',
    cwd: REPO_ROOT,
    url: 'http://127.0.0.1:' + FIXTURE_PORT + '/__fixture/health',
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
