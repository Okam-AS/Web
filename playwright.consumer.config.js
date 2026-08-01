// Browser journeys for the CONSUMER app (../ConsumerWeb, Nuxt 3), kept in a config of its own.
//
// WHY SEPARATE FROM playwright.config.js. That one starts this repo's Nuxt 2 admin app and its
// fixture, and every journey under test/e2e/journeys/ needs them. A consumer journey needs neither,
// and needs a sibling repo instead. Folding both into one config would make `npm run test:e2e` — the
// command everyone runs — depend on ../ConsumerWeb being checked out and installed, and pay a Nuxt 3
// cold start for journeys that never touch it. Two configs, two commands, one artifact contract:
// both write through test/e2e/support/journey.js into artifacts/journeys/.
//
//   npm run test:e2e:consumer
//
// Two servers, both started here and both on loopback:
//
//   localhost:3020   test/e2e/scripts/consumer-dev-server.js   ../ConsumerWeb `nuxi dev`
//   127.0.0.1:4020   test/e2e/fixture/consumer-api-server.js   the throwaway backend
//
// ConsumerWeb's dev server binds ::1 and answers on `localhost`, not on the 127.0.0.1 literal, which
// is why BASE_URL is spelled with the hostname while the fixture is spelled with the address.
//
// AGAINST A REAL BACKEND. `E2E_API_BASE_URL=http://localhost:5080 npx playwright test -c
// playwright.consumer.config.js` starts no fixture, points the app at that origin and excludes every
// `@fixture` journey — today that is the only one, because it depends on a seeded company agreement,
// an active membership and a signed-in guest that only the fixture has. A journey that can honestly
// run against a live API declares a different tag and is then the only thing that runs in that mode.

const { defineConfig, devices } = require('@playwright/test');

const WEB_PORT = process.env.E2E_CONSUMER_WEB_PORT || '3020';
const FIXTURE_PORT = process.env.E2E_CONSUMER_FIXTURE_PORT || '4020';
const LIVE_API = process.env.E2E_API_BASE_URL || null;
const BASE_URL = process.env.E2E_BASE_URL || ('http://localhost:' + WEB_PORT);

// test/e2e/support/journey.js resets and interrogates the fixture through E2E_FIXTURE_PORT. The
// consumer fixture answers the same `/__fixture/*` contract on its own port, so pointing the shared
// support module at it here keeps ONE artifact writer for both apps.
process.env.E2E_FIXTURE_PORT = FIXTURE_PORT;
process.env.E2E_CONSUMER_FIXTURE_PORT = FIXTURE_PORT;
process.env.E2E_CONSUMER_WEB_PORT = WEB_PORT;

const fixtureServer = {
  command: 'node test/e2e/fixture/consumer-api-server.js',
  url: 'http://127.0.0.1:' + FIXTURE_PORT + '/__fixture/health',
  reuseExistingServer: !process.env.CI,
  stdout: 'pipe',
  stderr: 'pipe'
};

const webServer = {
  command: 'node test/e2e/scripts/consumer-dev-server.js',
  url: BASE_URL,
  // Vite is fast warm and slow cold: the first run in a fresh checkout re-optimises dependencies.
  timeout: 5 * 60 * 1000,
  reuseExistingServer: !process.env.CI,
  gracefulShutdown: { signal: 'SIGTERM', timeout: 10 * 1000 },
  stdout: 'pipe',
  stderr: 'pipe'
};

module.exports = defineConfig({
  testDir: './test/e2e/journeys/consumer',
  testMatch: '**/*.spec.js',
  outputDir: './artifacts/playwright-output-consumer',

  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },

  grepInvert: LIVE_API ? /@fixture/ : undefined,

  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'artifacts/playwright-report-consumer', open: 'never' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15 * 1000,
    navigationTimeout: 60 * 1000
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],

  webServer: LIVE_API ? [webServer] : [fixtureServer, webServer]
});
