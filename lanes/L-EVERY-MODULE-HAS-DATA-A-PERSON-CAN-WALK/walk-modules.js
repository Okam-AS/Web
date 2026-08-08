// C5 — a PERSON opening each of the six module admin surfaces after its seed ran.
//
// One sign-in, six pages. For each page it writes the RENDERED TEXT and a full-page screenshot, and
// records every console error and every request the page made that came back >= 400. A module whose
// seed runs and whose screen shows nothing has not passed, so what is asserted here is the presence of
// the seed's own rows in the text a manager reads — not that a selector matched.
//
// It uses the Playwright MCP server's sibling install directly rather than the MCP tool, because that
// tool holds ONE shared browser profile and another lane already had it open. Driving the library from
// here needs no lock and cannot disturb whoever holds it.
//
// Run: MANAGER_CODE=... node walk-modules.js [pageKey ...]
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const WEB = process.env.WEB_BASE || 'http://127.0.0.1:3971';
// The verification code comes from the environment and is never a constant here. It is a demo code on a
// laptop world, but a checked-in artifact carrying one is how the habit of checking one in starts.
const MANAGER_PHONE = process.env.MANAGER_PHONE || '99681931';
const MANAGER_CODE = process.env.MANAGER_CODE;
if (!MANAGER_CODE) { throw new Error('MANAGER_CODE must be set in the environment; this walk carries no credential of its own.'); }
const OUT = __dirname;

// The rows each seed wrote, named so a screenshot cannot later be read as showing something else.
const PAGES = [
  { key: 'margin', route: '/admin/margin-recipes', want: ['Fiskesuppe', 'Safranrisotto', 'Husets vann', 'Dessertsaus'] },
  { key: 'events', route: '/admin/events-pipeline', want: ['Fagdag for Nordsjo Consulting', 'Julebord Havnekontoret', 'Bryllupsmiddag Haug/Berg', 'Sommerfest Bryggen Sport', 'Tapasaften Sjomat AS'] },
  { key: 'workforce', route: '/admin/workforce-schedule', want: ['Nora Berg', 'Jonas Lie', 'Selma Haug', 'Kokk', 'Servitor'] },
  { key: 'training', route: '/admin/training-courses', want: ['Alkoholservering og skjenkeregler', 'Brannvern og romningsveier', 'Publisert', 'Utkast'] },
  { key: 'meals', route: '/admin/meals-agreements', want: ['Akersgata Arkitekter', 'Havnekontoret', 'Nordsjo Consulting'] },
  { key: 'growth', route: '/admin/growth-newsletter', want: ['Samtykket', 'Målgruppe', 'Approved'] },
];

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const only = process.argv.slice(2);
  const pages = only.length ? PAGES.filter(p => only.includes(p.key)) : PAGES;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const page = await context.newPage();

  let step = 'boot';
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push({ step, text: m.text().slice(0, 300) }); } });
  page.on('requestfailed', r => failedRequests.push({ step, url: r.url().slice(0, 200), why: (r.failure() || {}).errorText }));
  page.on('response', r => { if (r.status() >= 400) { failedRequests.push({ step, url: r.url().slice(0, 200), why: 'HTTP ' + r.status() }); } });

  // ---- the door -------------------------------------------------------------------------------
  step = 'login';
  await page.goto(WEB + pages[0].route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  // «Send kode» against a half-hydrated modal binds no handler and sends no request, which is
  // indistinguishable from a dead backend. Recorded already on this world; retried rather than trusted.
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const boxes = modal.locator('.otp-input input');
  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    await modal.locator('.input-wrapper input[type="tel"]').fill(MANAGER_PHONE);
    await modal.getByRole('button', { name: /Send kode|Send/i }).click();
    try {
      await boxes.first().waitFor({ state: 'visible', timeout: 15000 });
      sent = true;
      if (attempt > 1) { log('login: «Send kode» took ' + attempt + ' clicks before the OTP step appeared'); }
    } catch (e) { log('login: no OTP boxes after click ' + attempt); }
  }
  if (!sent) { throw new Error('the OTP step never appeared after three clicks on «Send kode»'); }
  const digits = MANAGER_CODE.split('');
  for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i]); }
  await modal.waitFor({ state: 'detached', timeout: 45000 });
  await page.waitForTimeout(2500);
  log('after sign-in the browser is at ' + page.url());

  // ---- the six surfaces ------------------------------------------------------------------------
  for (const p of pages) {
    step = p.key;
    const before = failedRequests.length;
    await page.goto(WEB + p.route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4000);

    const body = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim());
    fs.writeFileSync(path.join(OUT, 'walk-' + p.key + '.txt'), body);
    await page.screenshot({ path: path.join(OUT, 'walk-' + p.key + '.png'), fullPage: true });

    log('\n=== ' + p.key + '  ' + p.route + '  (' + body.length + ' chars rendered, url ' + page.url() + ')');
    for (const w of p.want) { log('   on screen: ' + JSON.stringify(w) + ' -> ' + body.includes(w)); }
    const mine = failedRequests.slice(before);
    if (mine.length) { log('   failed requests: ' + JSON.stringify(mine)); }
  }

  log('\n---- console errors ----\n' + JSON.stringify(consoleErrors, null, 2));
  log('---- failed requests (all) ----\n' + JSON.stringify(failedRequests, null, 2));

  await browser.close();
}

main().catch(e => { log('WALK FAILED: ' + e); process.exit(1); });
