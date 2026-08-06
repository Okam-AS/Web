// Who rewrites the URL, and from where. Patches history.pushState/replaceState before any app code
// runs and keeps the stack of every call, so the loss of the `redirect` query is attributed to a
// line rather than guessed at.
//
// Usage: node trace-url.js [WEB_ORIGIN] [OUT_TAG]
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = process.argv[2] || 'http://127.0.0.1:3971';
const TAG = process.argv[3] || 'live';
const PHONE = '99681931';
const CODE = '849666';

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    window.__urlLog = [];
    const t0 = Date.now();
    const wrap = (name) => {
      const original = history[name];
      history[name] = function (state, title, url) {
        window.__urlLog.push({
          ms: Date.now() - t0,
          how: name,
          to: String(url),
          from: location.pathname + location.search,
          stack: (new Error().stack || '').split('\n').slice(1, 9).join(' | ')
        });
        return original.apply(this, arguments);
      };
    };
    wrap('pushState');
    wrap('replaceState');
  });
  const page = await context.newPage();

  await page.goto(WEB + '/admin/overview', { waitUntil: 'commit' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const beforeSignIn = await page.evaluate(() => ({ url: location.href, log: window.__urlLog.slice() }));

  await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.first().waitFor({ state: 'visible', timeout: 20000 });
  const digits = CODE.split('');
  for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i]); }
  await modal.waitFor({ state: 'detached', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const after = await page.evaluate(() => ({ url: location.href, log: window.__urlLog.slice() }));
  await browser.close();

  const out = { web: WEB, at: new Date().toISOString(), urlBeforeSignIn: beforeSignIn.url, urlAfterSignIn: after.url, log: after.log };
  fs.writeFileSync(path.join(__dirname, 'trace-url-' + TAG + '.json'), JSON.stringify(out, null, 2));
  log('URL when the modal was ready:', beforeSignIn.url);
  log('URL after sign-in          :', after.url);
  log('\n--- every history write ---');
  for (const e of after.log) {
    log(`\n[${e.ms}ms] ${e.how}  ${e.from}  ->  ${e.to}`);
    log('   ' + e.stack.replace(/ \| /g, '\n   '));
  }
}

main().catch(e => { log('FATAL', String(e)); process.exit(1); });
