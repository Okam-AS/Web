// Where does a dev build ADDRESS its API calls? Reads the address; never lets the packet leave.
//
// Every request the page makes is intercepted. Same-origin requests (the dev server's own bundles)
// are served; EVERY off-origin request is ABORTED and only its host and path are recorded. So this
// can be pointed at a dev server built against the production default without one byte reaching
// production — which is the only honest way to demonstrate the defect, since the whole claim is
// about where a request is addressed, not about what an API would answer.
//
// Query strings are dropped from what is recorded: a token, an id or a phone number can ride one,
// and this file is evidence that gets read. Host + method + path is the entire claim.
//
// Subject: `/vilkar-store?id=1` — `pages/vilkar-store.vue`'s `mounted()` calls
// `this._storeService.Get(id)`, which is `core/services` over `getEnv('API_BASE_URL')`. It is
// UNAUTHENTICATED and it is a GET, which is the mildest surface in the app that still proves the
// point.
//
// Named `.playwright.js` so no jest run collects it.
// Run: node lanes/<lane>/where-do-requests-go.playwright.js <baseUrl> <out.json>

const fs = require('fs');
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'http://127.0.0.1:3873';
const OUT = process.argv[3] || null;
const PATH_UNDER_TEST = '/vilkar-store?id=1';

function addressOf (url) {
  try {
    const u = new URL(url);
    return { origin: u.origin, host: u.host, path: u.pathname };
  } catch (e) {
    return { origin: '<unparseable>', host: '<unparseable>', path: '' };
  }
}

(async () => {
  const baseOrigin = new URL(BASE).origin;
  const offOrigin = [];
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.route('**', async (route) => {
    const req = route.request();
    const a = addressOf(req.url());
    if (a.origin === baseOrigin) {
      await route.continue();
      return;
    }
    offOrigin.push({ method: req.method(), host: a.host, path: a.path, resourceType: req.resourceType() });
    await route.abort();
  });

  const page = await context.newPage();
  let navigationError = null;
  try {
    await page.goto(BASE + PATH_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 300000 });
    // The subject call happens in `mounted()`, after hydration. Give it room, then a little more for
    // the retry the page makes when the first call fails (`.catch(... setStore(1))`).
    await page.waitForTimeout(8000);
  } catch (e) {
    navigationError = String(e.message || e).split('\n')[0];
  }

  await browser.close();

  const byHost = {};
  for (const r of offOrigin) {
    byHost[r.host] = byHost[r.host] || { count: 0, paths: [] };
    byHost[r.host].count += 1;
    if (byHost[r.host].paths.indexOf(r.method + ' ' + r.path) === -1) {
      byHost[r.host].paths.push(r.method + ' ' + r.path);
    }
  }

  const report = {
    subject: BASE + PATH_UNDER_TEST,
    baseOrigin,
    navigationError,
    offOriginRequestCount: offOrigin.length,
    offOriginHosts: byHost,
    everyOffOriginRequestWasAborted: true
  };

  const text = JSON.stringify(report, null, 2);
  process.stdout.write(text + '\n');
  if (OUT) { fs.writeFileSync(OUT, text + '\n'); }
})().catch((e) => {
  process.stderr.write(String(e && e.stack || e) + '\n');
  process.exit(1);
});
