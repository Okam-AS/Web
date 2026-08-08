// C5 — a PERSON opening the Training admin surface after the seed ran, not a suite reporting green.
//
// The exit this lane is measured against names four things the screen has to carry: courses,
// assignments, completions and the three certificate states the seed wrote. So this walk reads the
// rendered text of each panel and prints it, rather than asserting a selector exists — a locator that
// matches proves the markup, and only the words prove a manager can read what the seed put there.
//
// It signs in fresh rather than reusing /tmp/lwtwo-state.json: another lane is walking this same world,
// and a shared storage state is exactly the kind of thing that goes stale underneath you.
//
// Run: node walk-training.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const WEB = 'http://127.0.0.1:3971';
// The verification code comes from the environment and is never a constant here. It is a demo code on
// a laptop world, not a live credential, but a checked-in artifact that carries one is how the habit of
// checking one in gets established -- and this file is committed beside run logs a reader will grep.
const MANAGER_PHONE = process.env.MANAGER_PHONE || '99681931';
const MANAGER_CODE = process.env.MANAGER_CODE;
if (!MANAGER_CODE) { throw new Error('MANAGER_CODE must be set in the environment; this walk carries no credential of its own.'); }
const OUT = __dirname;

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function panelText (page, heading) {
  return await page.evaluate((h) => {
    const nodes = Array.from(document.querySelectorAll('section, .trn-panel, div'));
    const hit = nodes.find(n => {
      const t = (n.querySelector('h2, h3') || {}).innerText;
      return t && t.trim().toLowerCase().includes(h.toLowerCase());
    });
    return hit ? hit.innerText.replace(/\n{2,}/g, '\n').trim() : null;
  }, heading);
}

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  let step = 'boot';
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push({ step, text: m.text().slice(0, 300) }); } });
  page.on('requestfailed', r => failedRequests.push({ step, url: r.url().slice(0, 200), why: (r.failure() || {}).errorText }));
  page.on('response', r => { if (r.status() >= 400) { failedRequests.push({ step, url: r.url().slice(0, 200), why: 'HTTP ' + r.status() }); } });

  // ---- the door -------------------------------------------------------------------------------
  step = 'login';
  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

  // ---- the surface ----------------------------------------------------------------------------
  step = 'training-courses';
  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const gate = await page.locator('[data-test="gate"]').count();
  log('gate panel present (a dark module): ' + (gate > 0));

  const body = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim());
  fs.writeFileSync(path.join(OUT, 'walk-training.txt'), body);
  await page.screenshot({ path: path.join(OUT, 'walk-training-1-courses.png'), fullPage: true });

  // The seed's own rows, named so the screenshot cannot later be read as showing something else.
  const wanted = [
    'Alkoholservering og skjenkeregler',
    'Naringsmiddelhygiene',
    'Brannvern og romningsveier',
    'Utkast',
    'Publisert',
    'Nora Berg',
    'Jonas Lie',
    'Astrid Vik',
  ];
  for (const w of wanted) { log('on screen: ' + JSON.stringify(w) + ' -> ' + body.includes(w)); }

  // Select the fire-safety course, which is the one that exists only as a draft.
  step = 'select-draft-only';
  await page.getByText('Brannvern og romningsveier', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'walk-training-2-draft-only.png'), fullPage: true });
  const afterSelect = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim());
  fs.writeFileSync(path.join(OUT, 'walk-training-draft-only.txt'), afterSelect);

  log('\n---- console errors ----\n' + JSON.stringify(consoleErrors, null, 2));
  log('---- failed requests ----\n' + JSON.stringify(failedRequests, null, 2));

  await browser.close();
}

main().catch(e => { log('WALK FAILED: ' + e); process.exit(1); });
