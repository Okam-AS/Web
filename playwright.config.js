// Browser-level journeys for this Nuxt 2 app.
//
// ---- WHY PLAYWRIGHT, AND WHY THIS SHAPE -------------------------------------------------------
//
// The repo already has 91 Jest suites and 1,506 assertions, and not one of them opens a page: they
// mount components in jsdom. That is why sixteen module capabilities cannot get past
// `built-unverified` — the standard refuses suite evidence as proof of reachability, and it is right
// to, because a green suite has repeatedly coexisted with a page no caller could reach. This config
// exists to produce the other kind of evidence.
//
// Playwright rather than Cypress or Nightwatch, for reasons specific to this app:
//
//   • It drives a REAL browser process out of band, so it works against `nuxt dev` unchanged. This
//     app is Nuxt 2 / Vue 2 / webpack 4; a runner that wants to own the bundler (Cypress component
//     testing, Vitest browser mode) would need a second build of an app whose build is the thing
//     under test.
//   • The admin area is `<client-only>` and hydrates from `localStorage`. Playwright's per-test
//     browser CONTEXT is a clean profile — fresh localStorage, fresh cookies — which is the only way
//     a sign-in journey and a refusal journey can run in the same suite without one leaking into the
//     other. `storageState` also makes it cheap to add pre-authenticated journeys later without
//     re-driving the login modal.
//   • Its artifacts (trace, video, screenshot) are per-test files on disk, which is the same shape
//     the evidence contract wants — see test/e2e/support/journey.js.
//   • It has no runtime dependency on the app's own toolchain: `@playwright/test` is three packages
//     and a browser download. Adding Cypress to a Node-22 / webpack-4 tree is not three packages.
//
// ---- HOW A RUN IS PUT TOGETHER ----------------------------------------------------------------
//
// Two servers, both started by Playwright:
//
//   127.0.0.1:4010   test/e2e/fixture/api-server.js   the throwaway backend
//   127.0.0.1:3010   test/e2e/scripts/dev-server.js   `nuxt dev` with API_BASE_URL pointed at it
//
// So `npm run test:e2e` works on a laptop with nothing else running — no backend, no SQL Server, no
// container. That is a requirement rather than a convenience: an instrument that needs a stack
// nobody has running is an instrument nobody runs.
//
// ---- RUNNING AGAINST A REAL BACKEND -----------------------------------------------------------
//
//   E2E_API_BASE_URL=http://localhost:5080 npm run test:e2e
//
// starts no fixture, points the app at the given origin, and AUTOMATICALLY excludes every journey
// tagged `@fixture` — which today is all three, because each depends on state only the fixture has
// (a proposal token, a store with no schedule this week, a phone number whose OTP is 123123). A
// journey that can honestly run against a live API declares a different tag and is then the only
// thing that runs in that mode. The tag is not decoration: it is the difference between evidence and
// a test that quietly asserted against the wrong world.

const { defineConfig, devices } = require('@playwright/test');

const WEB_PORT = process.env.E2E_WEB_PORT || '3010';
const FIXTURE_PORT = process.env.E2E_FIXTURE_PORT || '4010';
const LIVE_API = process.env.E2E_API_BASE_URL || null;
const BASE_URL = process.env.E2E_BASE_URL || ('http://127.0.0.1:' + WEB_PORT);

const fixtureServer = {
  command: 'node test/e2e/fixture/api-server.js',
  url: 'http://127.0.0.1:' + FIXTURE_PORT + '/__fixture/health',
  reuseExistingServer: !process.env.CI,
  stdout: 'pipe',
  stderr: 'pipe'
};

const webServer = {
  command: 'node test/e2e/scripts/dev-server.js',
  url: BASE_URL,
  // Nuxt 2 + webpack 4 compiles this app cold in roughly a minute on a laptop and appreciably
  // longer on a cold CI runner. The default 60s is not enough and the failure it produces ("Timed
  // out waiting for the server") reads like a broken config rather than a slow build.
  timeout: 5 * 60 * 1000,
  reuseExistingServer: !process.env.CI,
  // Without this Playwright kills the webServer's process TREE with SIGKILL, which no exit handler
  // survives — and the dev-server wrapper's handler is what returns a borrowed `core/` to an empty
  // directory. `globalTeardown` is the backstop for when even this does not run.
  gracefulShutdown: { signal: 'SIGTERM', timeout: 10 * 1000 },
  stdout: 'pipe',
  stderr: 'pipe'
};

module.exports = defineConfig({
  testDir: './test/e2e/journeys',
  testMatch: '**/*.spec.js',
  // `journeys/consumer/` drives a DIFFERENT app — the sibling ConsumerWeb checkout — against a
  // different fixture on different ports. Run here it would open this repo's admin app and find no
  // checkout at all, so it belongs to playwright.consumer.config.js and is excluded by path rather
  // than by a tag, because a tag can be forgotten on the next spec somebody adds to that folder.
  testIgnore: '**/journeys/consumer/**',
  outputDir: './artifacts/playwright-output',
  globalTeardown: './test/e2e/scripts/global-teardown.js',

  // Journeys share one fixture backend whose state is global, so they are serialised. Parallelising
  // them would mean a per-worker fixture port, and the cost of that indirection is not worth paying
  // for three journeys that take seconds each.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },

  // In live mode the fixture-seeded journeys must not run — see the header.
  grepInvert: LIVE_API ? /@fixture/ : undefined,

  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    // Headless in CI, headed locally with `npm run test:e2e:headed` (which sets PWDEBUG/--headed).
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],

  webServer: LIVE_API ? [webServer] : [fixtureServer, webServer]
});
