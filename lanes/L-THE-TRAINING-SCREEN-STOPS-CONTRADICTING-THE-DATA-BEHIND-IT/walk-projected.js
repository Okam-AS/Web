// The live Training screen, shown the completions document the FIXED API will serve it.
//
// WHAT THIS IS, AND WHAT IT IS NOT. The API holding :5971 was built before this lane and cannot be
// restarted, so the repaired document cannot come off the wire here. This walk therefore computes it
// in the browser — from this world's OWN rows, by the same rule the service now uses — and returns it
// to the page from a route interceptor. Nothing on the server changes and nothing is written.
//
// It is proof of exactly one thing, and the thing is worth proving: the served admin client already
// reads `courseTitle`/`versionNo`, so the empty Kurs column is the SERVER's omission and the wire
// model is the side that was wrong. Feed the client the field and the column fills, live, with no
// client change at all. It is NOT proof that :5971 serves it — only a rebuilt binary can be that.
//
// The projection mirrors the service: the title is resolved from the row's OWN courseId, the version
// number from its courseVersionId, and a reference that does not resolve yields null rather than
// removing the row.
//
// Run: MANAGER_CODE=... node walk-projected.js
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const WEB = 'http://127.0.0.1:3971';
const MANAGER_PHONE = process.env.MANAGER_PHONE || '99681931';
const MANAGER_CODE = process.env.MANAGER_CODE;
if (!MANAGER_CODE) { throw new Error('MANAGER_CODE must be set in the environment; this walk carries no credential of its own.'); }
const OUT = __dirname;

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  const titleOf = {};        // courseId  -> title
  const versionNoOf = {};    // versionId -> versionNo
  const versionsOfCourse = {};
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push(m.text().slice(0, 300)); } });
  page.on('requestfailed', r => failedRequests.push({ url: r.url().slice(0, 160), why: (r.failure() || {}).errorText }));
  page.on('response', async (r) => {
    const url = r.url();
    if (r.status() >= 400) { failedRequests.push({ url: url.slice(0, 160), why: 'HTTP ' + r.status() }); return; }
    try {
      if (/\/training\/stores\/\d+\/courses(\?|$)/.test(url)) {
        for (const c of ((await r.json()).courses || [])) { titleOf[c.courseId] = c.title; }
      } else if (/\/training\/stores\/\d+\/courses\/[0-9a-f-]+$/i.test(url)) {
        const detail = await r.json();
        versionsOfCourse[detail.courseId] = (detail.versions || []).map(v => ({
          courseVersionId: v.courseVersionId, versionNo: v.versionNo, state: v.state, passThresholdPercent: v.passThresholdPercent
        }));
        for (const v of (detail.versions || [])) { versionNoOf[v.courseVersionId] = v.versionNo; }
      }
    } catch (e) { /* not a body this walk can read */ }
  });

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

  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);

  // Every course opened once, through the page's own control, so the version numbers come from the
  // server rather than from anything this script assumed.
  const rows = page.locator('[data-test="course-row"]');
  const courseCount = await rows.count();
  for (let i = 0; i < courseCount; i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(1200);
  }
  log('courses opened: ' + courseCount + '; titles known: ' + Object.keys(titleOf).length + '; versions known: ' + Object.keys(versionNoOf).length);
  fs.writeFileSync(path.join(OUT, 'walk-projected-versions.json'), JSON.stringify({ titleOf, versionsOfCourse }, null, 2));

  // The service's projection, applied where the service cannot be: on the way back to the page.
  await page.route(/\/training\/stores\/\d+\/completions/, async (route) => {
    const response = await route.fetch();
    let body;
    try { body = await response.json(); } catch (e) { return route.fulfill({ response }); }
    for (const c of (body.completions || [])) {
      c.courseTitle = Object.prototype.hasOwnProperty.call(titleOf, c.courseId) ? titleOf[c.courseId] : null;
      c.versionNo = Object.prototype.hasOwnProperty.call(versionNoOf, c.courseVersionId) ? versionNoOf[c.courseVersionId] : null;
    }
    await route.fulfill({ response, json: body });
  });

  await page.goto(WEB + '/admin/training-courses', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const cells = await page.$$eval('[data-test="completion-course"]', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  log('completion rows: ' + cells.length);
  log('their Kurs column now reads: ' + JSON.stringify(cells));
  log('rows still unnamed: ' + cells.filter(t => t === '—').length);

  const body = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim());
  fs.writeFileSync(path.join(OUT, 'walk-projected.txt'), body);
  await page.screenshot({ path: path.join(OUT, 'walk-projected-completions.png'), fullPage: true });

  log('\n---- console errors ----\n' + JSON.stringify(consoleErrors, null, 2));
  log('---- failed requests ----\n' + JSON.stringify(failedRequests, null, 2));

  await browser.close();
}

main().catch(e => { log('WALK FAILED: ' + e); process.exit(1); });
