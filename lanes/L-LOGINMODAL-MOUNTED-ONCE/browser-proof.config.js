// A private Playwright config for this lane's browser arm. It exists so the arm can live in the
// lane directory instead of in `test/e2e/journeys/`, which 31 shared journeys select from.
//
// Ports 3891 (web) and 4891 (fixture) are this lane's. 4010 was already held by another lane's
// fixture when this was written and is not touched. Both servers are started OUTSIDE this config
// (see run-browser-arm.sh) so that three consecutive runs share one `nuxt dev` compile; Playwright
// reuses a server that is already answering and leaves it alone at the end.
const { defineConfig, devices } = require('@playwright/test');

const WEB_PORT = process.env.E2E_WEB_PORT || '3891';
const BASE_URL = 'http://127.0.0.1:' + WEB_PORT;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.arm.spec.js',
  outputDir: require('path').join(__dirname, 'runs', 'playwright-output'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180 * 1000,
  expect: { timeout: 30 * 1000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15 * 1000,
    navigationTimeout: 120 * 1000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
