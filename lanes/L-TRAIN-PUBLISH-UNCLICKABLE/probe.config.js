// Lane-local Playwright config for L-TRAIN-PUBLISH-UNCLICKABLE.
//
// Same two servers as playwright.config.js, on THIS lane's own ports (3098 web / 4098 fixture) so it
// cannot collide with the sibling lanes holding 4010 and the 39xx range. It exists only so the probe
// spec can live under lanes/ instead of test/e2e/journeys/ — a measurement is not a journey, and
// dropping it in the journeys directory would put it in every future `npm run test:e2e`.
const { defineConfig, devices } = require('@playwright/test');

const WEB_PORT = process.env.E2E_WEB_PORT || '3098';
const FIXTURE_PORT = process.env.E2E_FIXTURE_PORT || '4098';
const BASE_URL = 'http://127.0.0.1:' + WEB_PORT;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/probe.spec.js',
  outputDir: __dirname + '/probe-output',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180 * 1000,
  expect: { timeout: 10 * 1000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15 * 1000,
    navigationTimeout: 90 * 1000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node test/e2e/fixture/api-server.js',
      cwd: __dirname + '/../..',
      url: 'http://127.0.0.1:' + FIXTURE_PORT + '/__fixture/health',
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'node test/e2e/scripts/dev-server.js',
      cwd: __dirname + '/../..',
      url: BASE_URL,
      // 10 minutes rather than 5. A cold `nuxt dev` compile of this app is ~30s on an idle laptop and
      // blew straight through 300s on 2026-08-04 while the host sat at load 59 — which fails looking
      // exactly like a broken config and is not one.
      timeout: 10 * 60 * 1000,
      reuseExistingServer: true,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10 * 1000 },
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});
