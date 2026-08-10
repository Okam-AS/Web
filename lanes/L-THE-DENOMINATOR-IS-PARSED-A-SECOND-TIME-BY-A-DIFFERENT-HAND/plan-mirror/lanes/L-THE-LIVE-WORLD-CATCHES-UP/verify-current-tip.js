// The claim "the web serving :3971 is the current trunk tip" re-checked in a browser AFTER the tip
// moved under the walk (8db65dd -> 6b98839) and the dev server hot-reloaded onto it.
//
// It checks two things a stale bundle could not both satisfy: the Events dispatch lever's disclosure
// copy (added at 8db65dd) and the workforce-me confirmation receipt string (added at 6b98839).
//
// Run:  node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/verify-current-tip.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = 'http://127.0.0.1:3971';
const OUT = __dirname;
const MANAGER_PHONE = '99681931';
const MANAGER_CODE = '849666';

function log (...args) { process.stdout.write(args.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const failedRequests = [];
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push(m.text().slice(0, 300)); } });
  page.on('requestfailed', r => failedRequests.push({ url: r.url().slice(0, 180), why: (r.failure() || {}).errorText }));
  page.on('response', r => { if (r.status() >= 400) { failedRequests.push({ url: r.url().slice(0, 180), why: 'HTTP ' + r.status() }); } });

  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const boxes = modal.locator('.otp-input input');
  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    await modal.locator('.input-wrapper input[type="tel"]').fill(MANAGER_PHONE);
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
    try { await boxes.first().waitFor({ state: 'visible', timeout: 15000 }); sent = true; } catch (e) { log('no OTP boxes after click', attempt); }
  }
  if (!sent) { throw new Error('the OTP step never appeared'); }
  for (const [i, d] of MANAGER_CODE.split('').entries()) { await boxes.nth(i).fill(d); }
  await modal.waitFor({ state: 'detached', timeout: 45000 });

  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const dispatchRow = (await page.locator('[data-precondition="Events.Dispatch"]').innerText().catch(() => '<absent>')).trim();
  const leverCopyPresent = dispatchRow.indexOf('hver lenke er en nøkkel') >= 0;
  log('Events.Dispatch precondition rendered (8db65dd copy):', leverCopyPresent);
  await page.screenshot({ path: path.join(OUT, '26-switchboard-current-tip.png'), fullPage: true });

  // The 6b98839 string, asked of the running client's own translation table rather than of a page
  // that would need a confirmed publication to exist in this world. `/_nuxt/app.js` is not a path
  // Nuxt 2 dev serves — asking for it answered 404, which is a fact about the harness and not about
  // the build, so it is not used as the check.
  const confirmed = await page.evaluate(() => {
    try { return window.$nuxt.$i('wfme_pub_title_confirmed'); } catch (e) { return '<no $i on $nuxt>'; }
  });
  log('workforce-me confirmation string in the served bundle (6b98839 copy):', confirmed);

  fs.writeFileSync(path.join(OUT, 'verify-current-tip.json'), JSON.stringify({
    web: WEB, at: new Date().toISOString(),
    leverCopyPresent, dispatchPrecondition: dispatchRow, confirmedStringInBundle: confirmed,
    failedRequests, consoleErrors
  }, null, 2));
  log('--- failed: ' + JSON.stringify(failedRequests));
  log('--- console: ' + JSON.stringify(consoleErrors));
  await browser.close();
}

main().catch(e => { process.stderr.write('VERIFY FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
