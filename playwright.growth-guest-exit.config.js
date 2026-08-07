// The guest-exit cross-origin journey runs under its OWN config, and that is the point of the file.
//
// `playwright.config.js` is the shared one: it starts the throwaway fixture and `nuxt dev` itself, it
// serves everything over plain http on one origin, and it is depended on by thirty-odd journeys that
// three other lanes are editing. This journey needs three things none of those want —
//
//   • TLS, with a certificate generated per run by the backend world, hence `ignoreHTTPSErrors`.
//     (Node-side verification is NOT skipped: the harness sets `NODE_EXTRA_CA_CERTS` to that same
//     certificate, so the journey's own live preflight verifies properly. This flag is the BROWSER's,
//     which would otherwise show an interstitial instead of the page.)
//   • Both servers already standing, started and torn down by
//     `test/e2e/scripts/growth-guest-exit-world.sh`. There is no `webServer` here at all — and so no
//     `reuseExistingServer`, which is what silently adopted two foreign fixtures on this machine on
//     2026-08-04 and produced a 401 indistinguishable from a missing route.
//   • A base URL on a DIFFERENT HOST from the API's, which is the whole subject: the page is served
//     from `https://localhost:<port>` and the API from `https://127.0.0.1:<port>`, so every call the
//     page makes is cross-origin and cross-site and is decided by the API's real CORS policy.
//
// Adding those to the shared config would change the meaning of every other journey's run. A second
// config costs one file; `playwright.consumer.config.js` is the precedent.

const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL;
const API_BASE_URL = process.env.E2E_API_BASE_URL;

if (!BASE_URL || !API_BASE_URL) {
  throw new Error(
    'growth-guest-exit: E2E_BASE_URL and E2E_API_BASE_URL must both be set, and must name DIFFERENT\n' +
    'origins — the journey is about a cross-origin withdrawal, and pointing both at one origin would\n' +
    'produce a green run that proved nothing it claims.\n' +
    'Stand the world up with test/e2e/scripts/growth-guest-exit-world.sh, which sets both.');
}

if (new URL(BASE_URL).origin === new URL(API_BASE_URL).origin) {
  throw new Error(
    'growth-guest-exit: E2E_BASE_URL and E2E_API_BASE_URL name the SAME origin (' + BASE_URL + ').\n' +
    'Then no request the page makes is cross-origin, the API\'s CORS policy is never consulted, and\n' +
    'the run cannot say anything about the blocker this journey exists to answer.');
}

module.exports = defineConfig({
  testDir: './test/e2e/journeys',
  testMatch: 'growth-guest-exit-cross-origin.spec.js',
  outputDir: './artifacts/playwright-output',

  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,

  // `nuxt dev` compiles a route the first time it is asked for and holds the request open until the
  // bundle is ready, so a first navigation against a cold `.nuxt` can sit well past thirty seconds.
  timeout: 180 * 1000,
  expect: { timeout: 15 * 1000 },

  reporter: [['list']],

  use: {
    baseURL: BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20 * 1000,
    navigationTimeout: 120 * 1000
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
