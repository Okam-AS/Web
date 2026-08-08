// What the Training admin surface says TODAY, against the world running on :3971 / :5971.
//
// This walk changes nothing. It exists to establish two things by observation rather than by reading
// source: that the two defects are on the screen a manager opens, and that the API holding the port
// is the one that cannot fix them — the completions document it serves carries no `courseTitle` and
// the course list carries no `versions`, so neither half of this lane's repair is reachable from
// here without the binary being rebuilt.
//
// It signs in fresh rather than reusing a stored state: other lanes are walking this same world.
//
// Run: MANAGER_CODE=... node walk-before.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const WEB = 'http://127.0.0.1:3971';
const MANAGER_PHONE = process.env.MANAGER_PHONE || '99681931';
// Never a constant in this file. It is a demo code on a laptop world, but a committed artifact that
// carries a credential is how the habit of committing one gets established.
const MANAGER_CODE = process.env.MANAGER_CODE;
if (!MANAGER_CODE) { throw new Error('MANAGER_CODE must be set in the environment; this walk carries no credential of its own.'); }
const OUT = __dirname;

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const page = await context.newPage();

  let step = 'boot';
  const consoleErrors = [];
  const failedRequests = [];
  // The wire, captured as the page receives it. The claim "the running API omits the field" is only
  // worth anything if it is read off the running API.
  const wire = {};
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push({ step, text: m.text().slice(0, 300) }); } });
  page.on('requestfailed', r => failedRequests.push({ step, url: r.url().slice(0, 200), why: (r.failure() || {}).errorText }));
  page.on('response', async (r) => {
    const url = r.url();
    if (r.status() >= 400) { failedRequests.push({ step, url: url.slice(0, 200), why: 'HTTP ' + r.status() }); return; }
    if (!/\/training\/stores\/\d+\/(completions|courses)(\?|$)/.test(url)) { return; }
    const key = url.includes('/completions') ? 'completions' : 'courses';
    try { wire[key] = await r.json(); } catch (e) { /* not a body this walk can read */ }
  });

  step = 'login';
  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const boxes = modal.locator('.otp-input input');
  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    await modal.locator('.input-wrapper input[type="tel"]').fill(MANAGER_PHONE);
    await modal.getByRole('button', { name: /Send kode|Send/i }).click();
    try { await boxes.first().waitFor({ state: 'visible', timeout: 15000 }); sent = true; } catch (e) { log('login: no OTP boxes after click ' + attempt); }
  }
  if (!sent) { throw new Error('the OTP step never appeared after three clicks on «Send kode»'); }
  const digits = MANAGER_CODE.split('');
  for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i]); }
  await modal.waitFor({ state: 'detached', timeout: 45000 });
  await page.waitForTimeout(2500);

  step = 'training-courses';
  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const gate = await page.locator('[data-test="gate"]').count();
  log('gate panel present (a dark module): ' + (gate > 0));

  // ---- defect one: the course column of every completion row --------------------------------
  const courseCells = await page.$$eval('[data-test="completion-course"]', els => els.map(e => e.innerText.trim()));
  const rowCount = await page.locator('[data-test="completion-row"]').count();
  log('completion rows on screen: ' + rowCount);
  log('their Kurs column reads: ' + JSON.stringify(courseCells));

  // ---- defect two: what the two write forms say with nothing selected ------------------------
  const noPublished = await page.locator('[data-test="assignment-no-published"]').count();
  const noPublishedText = noPublished ? (await page.locator('[data-test="assignment-no-published"]').innerText()).trim() : null;
  const noFrozen = await page.locator('[data-test="completion-no-frozen"]').count();
  const noFrozenText = noFrozen ? (await page.locator('[data-test="completion-no-frozen"]').innerText()).trim() : null;
  const assignPicker = await page.locator('[data-test="assignment-version"]').count();
  log('nothing selected -> «Ny tildeling» says: ' + JSON.stringify(noPublishedText));
  log('nothing selected -> «For en gjennomforing» says: ' + JSON.stringify(noFrozenText));
  log('nothing selected -> an assign version picker exists: ' + (assignPicker > 0));

  // ---- what the store actually holds, off the same page's own reads ---------------------------
  const courses = (wire.courses && wire.courses.courses) || [];
  const completions = (wire.completions && wire.completions.completions) || [];
  log('GET /courses returned ' + courses.length + ' courses; ' + courses.filter(c => c.hasPublishedVersion).length + ' carry a published version');
  log('GET /courses course keys: ' + JSON.stringify(Object.keys(courses[0] || {})));
  log('  -> the list carries per-course versions: ' + courses.some(c => Array.isArray(c.versions)));
  log('GET /completions returned ' + completions.length + ' rows');
  log('GET /completions row keys: ' + JSON.stringify(Object.keys(completions[0] || {})));
  log('  -> the row carries courseTitle: ' + completions.some(c => Object.prototype.hasOwnProperty.call(c, 'courseTitle')));
  log('  -> the row carries versionNo: ' + completions.some(c => Object.prototype.hasOwnProperty.call(c, 'versionNo')));

  fs.writeFileSync(path.join(OUT, 'walk-before-wire.json'), JSON.stringify(wire, null, 2));
  const body = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim());
  fs.writeFileSync(path.join(OUT, 'walk-before.txt'), body);
  await page.screenshot({ path: path.join(OUT, 'walk-before-training.png'), fullPage: true });

  log('\n---- console errors ----\n' + JSON.stringify(consoleErrors, null, 2));
  log('---- failed requests ----\n' + JSON.stringify(failedRequests, null, 2));

  await browser.close();
}

main().catch(e => { log('WALK FAILED: ' + e); process.exit(1); });
