// THE WALK — the Events guest-link dispatch lever, turned on from a screen.
//
// Nothing here asserts. Everything here RECORDS: what the two surfaces said before the click, what
// the click did, and what they said after. The claim this walk exists to make good is narrow and
// checkable — a store row written from /admin/feature-flags changes what /admin/events-pipeline
// says about its own queue, because the board resolves that answer through the SAME gate the drain
// obeys (EventsNotificationHealthService reads IsStoreFlagEnabledAsync, not the config key).
//
// It does NOT claim delivery. This world's SMTP password is the appsettings placeholder
// ("Set in Azure. For development, set in User Secrets") and no user secret supplies one, so every
// attempt fails and the backlog would dead-letter in about eight minutes. So the lever is turned
// back OFF by walk-events-lever-off.js once the surface change is recorded, which leaves the ten
// queued guest links a sibling lane's evidence depends on where they were found.
//
// Run:  node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/walk-events-lever.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = 'http://127.0.0.1:3971';
const API = 'http://127.0.0.1:5971';
const OUT = __dirname;
const STATE = path.join(OUT, 'session-state.json');
const MANAGER_PHONE = '99681931';
const MANAGER_CODE = '849666';
const FLAG = 'Events.Dispatch';

function log (...args) { process.stdout.write(args.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  let step = 'boot';
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push({ step, text: m.text().slice(0, 300) }); } });
  page.on('requestfailed', r => { failedRequests.push({ step, url: r.url().slice(0, 200), why: (r.failure() || {}).errorText }); });
  page.on('response', r => {
    if (r.status() >= 400) { failedRequests.push({ step, url: r.url().slice(0, 200), why: 'HTTP ' + r.status() }); }
  });

  const record = { web: WEB, api: API, at: new Date().toISOString(), flag: FLAG, steps: [] };

  // ---- the door --------------------------------------------------------------------------------
  step = '20-login';
  await page.goto(WEB + '/admin/events-pipeline', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  // Hydration first. A click on «Send kode» before the client settles binds no handler, sends no
  // request and renders no OTP boxes — indistinguishable from a dead backend (recorded 2026-08-06).
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const boxes = modal.locator('.otp-input input');
  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    await modal.locator('.input-wrapper input[type="tel"]').fill(MANAGER_PHONE);
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
    try { await boxes.first().waitFor({ state: 'visible', timeout: 15000 }); sent = true; if (attempt > 1) { log('login: «Send kode» took', attempt, 'clicks'); } } catch (e) { log('login: no OTP boxes after click', attempt); }
  }
  if (!sent) { throw new Error('the OTP step never appeared after three clicks on «Send kode»'); }
  for (const [i, d] of MANAGER_CODE.split('').entries()) { await boxes.nth(i).fill(d); }
  await modal.waitFor({ state: 'detached', timeout: 45000 });
  await page.waitForTimeout(3000);
  const who = await page.evaluate(() => { try { return JSON.parse(window.localStorage.getItem('state')).currentUser.id; } catch (e) { return null; } });
  log('signed in as', who, '— landed at', page.url());
  record.signedInUserId = who;
  await context.storageState({ path: STATE });

  // ---- BEFORE: what the Events board says about its own queue -----------------------------------
  step = '21-events-before';
  await page.goto(WEB + '/admin/events-pipeline', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const panel = page.locator('[data-test="notify-dispatch"]');
  const before = (await panel.first().innerText().catch(() => '<panel not rendered>')).trim();
  log('--- events board BEFORE ---\n' + before);
  await page.screenshot({ path: path.join(OUT, '20-events-before.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), panel: before });

  // ---- the screen: /admin/feature-flags ---------------------------------------------------------
  step = '22-switchboard';
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const row = page.locator('.ff-row').filter({ has: page.locator('code', { hasText: FLAG }) }).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  const rowBefore = (await row.innerText()).trim();
  log('--- ' + FLAG + ' row BEFORE ---\n' + rowBefore);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, '21-switchboard-before.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), row: rowBefore });

  // The disclosures this trunk added — neither string exists in the binary that held :5971 before.
  const precondition = (await page.locator('[data-precondition="' + FLAG + '"]').innerText().catch(() => '<absent>')).trim();
  const offMeaning = (await page.locator('[data-off-meaning="' + FLAG + '"]').innerText().catch(() => '<absent>')).trim();
  log('--- precondition ---\n' + precondition);
  log('--- what off means ---\n' + offMeaning);
  record.precondition = precondition;
  record.offMeaning = offMeaning;

  // ---- the click ---------------------------------------------------------------------------------
  step = '23-turn-on';
  await row.locator('.ff-row__note input').fill('L-THE-LIVE-WORLD-CATCHES-UP: walking the dispatch lever against the rebuilt world');
  await page.locator('[data-flag-on="' + FLAG + '"]').click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  const rowAfter = (await row.innerText()).trim();
  log('--- ' + FLAG + ' row AFTER the click ---\n' + rowAfter);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, '22-switchboard-on.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), row: rowAfter, did: 'clicked [data-flag-on="' + FLAG + '"] with a note' });

  // ---- AFTER: the same board, the same panel -----------------------------------------------------
  step = '24-events-after';
  await page.goto(WEB + '/admin/events-pipeline', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const after = (await panel.first().innerText().catch(() => '<panel not rendered>')).trim();
  log('--- events board AFTER ---\n' + after);
  await page.screenshot({ path: path.join(OUT, '23-events-after.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), panel: after });

  record.consoleErrors = consoleErrors;
  record.failedRequests = failedRequests;
  fs.writeFileSync(path.join(OUT, 'walk-events-lever.json'), JSON.stringify(record, null, 2));
  log('--- failed requests: ' + JSON.stringify(failedRequests));
  log('--- console errors: ' + JSON.stringify(consoleErrors));
  await browser.close();
}

main().catch(e => { process.stderr.write('WALK FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
