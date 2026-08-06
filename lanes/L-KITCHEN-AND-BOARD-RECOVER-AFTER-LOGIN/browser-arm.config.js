// A lane-private Playwright config, so this arm can live in the lane directory rather than in
// `test/e2e/journeys/`, which 31 shared journeys select from.
//
// Ports 3903 (web) and 4903 (fixture) are this lane's. 4010, 4971 and 4973 were held by other lanes'
// fixtures when this was written and are not touched; 3881/3882, 4881/4882, 3891/4891 and 3897/4897
// belong to siblings. Both servers are started OUTSIDE this config by `run-browser-arm.sh`, which
// restarts the compiler between arms — Playwright is not asked to manage or reuse them.
//
// `testMatch` is `*.arm.playwright.js`, never `*.spec.js`: jest's default `testMatch` collects
// `*.spec.js` anywhere under the root, and `lanes/` is not excluded on every branch this may run
// from. A Playwright spec collected by jest loads `@playwright/test` outside its runner and reds a
// suite that has nothing to do with it.
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const WEB_PORT = process.env.E2E_WEB_PORT || '3903';

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.arm.playwright.js',
  outputDir: path.join(__dirname, 'runs', 'playwright-output'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180 * 1000,
  expect: { timeout: 30 * 1000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:' + WEB_PORT,
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20 * 1000,
    navigationTimeout: 120 * 1000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
