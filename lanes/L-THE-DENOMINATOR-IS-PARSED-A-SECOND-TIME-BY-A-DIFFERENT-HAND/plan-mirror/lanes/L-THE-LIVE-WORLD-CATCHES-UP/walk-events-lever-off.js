// The second half of the walk: the operator turns the lever back OFF from the same screen.
//
// This is not tidying-up hidden in a script. It is the other half of the claim, and it is the half
// that protects somebody else's evidence: with the lever on, every pass spends an attempt against an
// SMTP endpoint this world cannot complete a TLS handshake with, and the budget runs out in about
// eight minutes — at which point ten queued guest links are DeadLettered, which is terminal. Turning
// it off leaves them exactly where they were found, minus the one attempt the walk deliberately
// spent to show the drain now selects them.
//
// Run:  node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/walk-events-lever-off.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = 'http://127.0.0.1:3971';
const API = 'http://127.0.0.1:5971';
const OUT = __dirname;
const STATE = path.join(OUT, 'session-state.json');
const FLAG = 'Events.Dispatch';

function log (...args) { process.stdout.write(args.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, storageState: STATE });
  const page = await context.newPage();

  let step = 'boot';
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push({ step, text: m.text().slice(0, 300) }); } });
  page.on('requestfailed', r => { failedRequests.push({ step, url: r.url().slice(0, 200), why: (r.failure() || {}).errorText }); });
  page.on('response', r => { if (r.status() >= 400) { failedRequests.push({ step, url: r.url().slice(0, 200), why: 'HTTP ' + r.status() }); } });

  const record = { web: WEB, api: API, at: new Date().toISOString(), flag: FLAG, steps: [] };

  step = '25-turn-off';
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const row = page.locator('.ff-row').filter({ has: page.locator('code', { hasText: FLAG }) }).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  await row.locator('.ff-row__note input').fill('L-THE-LIVE-WORLD-CATCHES-UP: walk recorded; held again so the ten queued links keep their attempt budget');
  await page.locator('[data-flag-off="' + FLAG + '"]').click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  const rowOff = (await row.innerText()).trim();
  log('--- ' + FLAG + ' row AFTER turning it off ---\n' + rowOff);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, '24-switchboard-off.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), row: rowOff });

  step = '26-events-held-again';
  await page.goto(WEB + '/admin/events-pipeline', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const panel = (await page.locator('[data-test="notify-dispatch"]').first().innerText().catch(() => '<panel not rendered>')).trim();
  log('--- events board with the lever held again ---\n' + panel);
  await page.screenshot({ path: path.join(OUT, '25-events-held-again.png'), fullPage: true });
  record.steps.push({ step, url: page.url(), panel });

  record.consoleErrors = consoleErrors;
  record.failedRequests = failedRequests;
  fs.writeFileSync(path.join(OUT, 'walk-events-lever-off.json'), JSON.stringify(record, null, 2));
  log('--- failed requests: ' + JSON.stringify(failedRequests));
  log('--- console errors: ' + JSON.stringify(consoleErrors));
  await browser.close();
}

main().catch(e => { process.stderr.write('WALK FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
