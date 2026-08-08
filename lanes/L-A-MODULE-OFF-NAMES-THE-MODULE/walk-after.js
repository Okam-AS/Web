// The fix, in a browser, against the OWNER'S LIVE API (:5971).
//
// :3971 (the owner's web dev server, `web-livewalk`) is NOT written to, restarted or rebuilt. This
// lane runs its OWN Nuxt dev server on :3979 from its own worktree, pointed at the same
// `API_BASE_URL=http://127.0.0.1:5971`, so the two servers differ in exactly one thing: the nine
// pages' refusal branch.
//
// ONE DARK WINDOW, TWO BROWSERS. `workforce.module` is switched off ONCE, from the board, and while
// it is off both the OLD roster (:3971) and the FIXED roster (:3979) are read. Same store, same
// flag, same 403 body, one instant apart — so the difference in what they print cannot be anything
// but the client change. The flag goes back on in a `finally`.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OLD = 'http://localhost:3971';   // the owner's served tree, untouched
const NEW = 'http://localhost:3979';   // this lane's worktree
const PHONE = '99681931';
const OTP = '849666';
const OUT = __dirname;

const t = [];
function say (line) { const s = String(line); t.push(s); console.log(s); }

async function signIn (page, origin) {
  await page.goto(origin + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(3000);
  await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.first().waitFor({ timeout: 40000 });
  const digits = OTP.split('');
  for (let i = 0; i < 6; i++) {
    try { await boxes.nth(i).fill(digits[i], { timeout: 8000 }); } catch (e) { break; }
  }
  await modal.waitFor({ state: 'detached', timeout: 60000 });
  await page.waitForTimeout(1500);
}

async function flip (page, origin, action, key) {
  await page.goto(origin + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 60000 });
  const btn = page.locator('[data-flag-' + action + '="' + key + '"]');
  await btn.waitFor({ timeout: 30000 });
  await btn.click();
  await page.locator('.ff-page__toast').waitFor({ timeout: 20000 });
  await page.waitForTimeout(900);
  return await page.evaluate(k => {
    const row = [...document.querySelectorAll('.ff-row')].find(r => {
      const c = r.querySelector('.ff-row__key');
      return c && c.textContent.trim() === k;
    });
    return row ? {
      badge: row.querySelector('.ff-row__badge').textContent.trim(),
      facts: [...row.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim())
    } : null;
  }, key);
}

async function readPage (page, origin, route, shotName) {
  const wire = [];
  const onResp = async (res) => {
    const u = res.url();
    if (!/:5971\/workforce\//.test(u)) { return; }
    wire.push({ status: res.status(), path: u.replace(/^https?:\/\/[^/]+/, '') });
  };
  page.on('response', onResp);
  await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const text = await page.evaluate(() => {
    const main = document.querySelector('.admin__content') || document.body;
    return main.innerText.replace(/\n{2,}/g, '\n').trim().slice(0, 700);
  });
  page.off('response', onResp);
  if (shotName) { await page.screenshot({ path: path.join(OUT, shotName + '.png') }); }
  return { origin, route, wire, text };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const record = { steps: {} };
  let darkened = false;
  const oldCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const newCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const oldPage = await oldCtx.newPage();
  const newPage = await newCtx.newPage();

  try {
    await signIn(oldPage, OLD);
    say('signed in on :3971 (the owner\'s served tree)');
    await signIn(newPage, NEW);
    say('signed in on :3979 (this lane\'s worktree)');

    const lit = await readPage(newPage, NEW, '/admin/workforce-roster', 'after-roster-lit');
    record.steps.lit = lit;
    say('module ON, :3979 roster wire: ' + JSON.stringify(lit.wire.map(w => w.status + ' ' + w.path)));
    say('module ON, :3979 roster: ' + lit.text.split('\n').slice(0, 4).join(' | '));

    // ---- the dark window ------------------------------------------------------------------------
    const off = await flip(newPage, NEW, 'off', 'workforce.module');
    darkened = true;
    record.steps.flagOff = off;
    say('workforce.module OFF from the board -> ' + JSON.stringify(off));

    const darkOld = await readPage(oldPage, OLD, '/admin/workforce-roster', 'after-roster-dark-3971-old');
    record.steps.darkOld = darkOld;
    say(':3971 (old code)  roster prints: ' + darkOld.text.split('\n').slice(2, 5).join(' | '));

    const darkNew = await readPage(newPage, NEW, '/admin/workforce-roster', 'after-roster-dark-3979-fixed');
    record.steps.darkNew = darkNew;
    say(':3979 (fixed)     roster prints: ' + darkNew.text.split('\n').slice(2, 5).join(' | '));

    // The sweep: the same defect lived on all nine pages, so one sibling is read in the same window.
    const darkSchedule = await readPage(newPage, NEW, '/admin/workforce-schedule', 'after-schedule-dark-3979-fixed');
    record.steps.darkSchedule = darkSchedule;
    say(':3979 (fixed)     schedule prints: ' + darkSchedule.text.split('\n').slice(0, 5).join(' | '));
  } catch (e) {
    say('THREW: ' + (e && e.message));
    record.threw = String((e && e.stack) || e);
  } finally {
    if (darkened) {
      try {
        const back = await flip(newPage, NEW, 'on', 'workforce.module');
        record.steps.flagRestored = back;
        say('workforce.module BACK ON -> ' + JSON.stringify(back));
        const relit = await readPage(newPage, NEW, '/admin/workforce-roster', 'after-roster-relit');
        record.steps.relit = relit;
        say('module ON again, :3979 roster: ' + relit.text.split('\n').slice(0, 3).join(' | '));
      } catch (e) {
        say('RESTORE FAILED: ' + (e && e.message) + ' — workforce.module may still be OFF for store 1');
      }
    }
    fs.writeFileSync(path.join(OUT, 'walk-after.json'), JSON.stringify(record, null, 2));
    fs.writeFileSync(path.join(OUT, 'walk-after.log'), t.join('\n') + '\n');
    await browser.close();
  }
})();
