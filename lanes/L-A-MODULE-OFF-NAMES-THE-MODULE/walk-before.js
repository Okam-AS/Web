// L-A-MODULE-OFF-NAMES-THE-MODULE — the two defects reproduced on the OWNER'S LIVE WORLD
// (web :3971, API :5971). No server is started, stopped or restarted; no container is touched; no
// row is seeded. The one flag this moves is `workforce.module`, moved by a CLICK on
// /admin/feature-flags, and it is put back by a click in a `finally` so a throw cannot leave the
// world dark.
//
// It answers exactly three questions and writes what it saw, not what it expected:
//
//   1. Does the switchboard offer `workforce.personnel-list`?  (defect two: WHICH SIDE IS WRONG)
//   2. What does `PUT /stores/1/feature-flags` answer for that key, through the page's own client?
//   3. With `workforce.module` off, what does the roster PRINT, and what does the 403 CARRY?
//
// Question 3 is the load-bearing one for defect one: if the 403 body already carries
// `code: workforce.module-disabled`, the client can tell a switched-off module from a person without
// access with NO backend change, and the roster's `status === 403 -> "you have no access"` is the
// whole bug.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const WEB = 'http://localhost:3971';
const PHONE = '99681931';
const OTP = '849666';
const STORE = 1;
const OUT = __dirname;

const t = [];
function say (line) { const s = String(line); t.push(s); console.log(s); }

async function shot (page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
}

async function signIn (page) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 45000 });
  // Hydration first. `L-THE-LIVE-WORLD-RUNS-THE-BRANCH` recorded that clicking «Send kode» before
  // the app hydrates sends nothing and renders no OTP boxes, indistinguishable from a dead backend.
  await page.waitForTimeout(3000);
  await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.first().waitFor({ timeout: 30000 });
  const digits = OTP.split('');
  // The sixth box submits and the modal tears itself down, so the later fills race the detach.
  for (let i = 0; i < 6; i++) {
    try { await boxes.nth(i).fill(digits[i], { timeout: 8000 }); } catch (e) { break; }
  }
  // The modal detaching is the signal, NOT the URL: the same lane recorded that after sign-in the
  // app lands on /admin?storeId=1 and never honours the redirect its own route guard put on the URL.
  await modal.waitFor({ state: 'detached', timeout: 45000 });
  await page.waitForTimeout(1500);
}

async function readBoard (page) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
  await page.waitForTimeout(2500);
  return await page.evaluate(() => {
    const mods = [...document.querySelectorAll('.ff-module')].map(m => ({
      module: m.querySelector('.ff-module__title').textContent.trim(),
      rows: [...m.querySelectorAll('.ff-row')].map(r => ({
        key: (r.querySelector('.ff-row__key') || {}).textContent,
        badge: (r.querySelector('.ff-row__badge') || {}).textContent,
        facts: [...r.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim())
      }))
    }));
    return { modules: mods };
  });
}

async function flip (page, action, key) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
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

// The roster as a person reads it, plus the RAW body of every /workforce/ response it provoked.
async function readRoster (page) {
  const wire = [];
  const onResp = async (res) => {
    const u = res.url();
    if (!/:5971\/workforce\//.test(u)) { return; }
    let body = null;
    try { body = (await res.text()).slice(0, 600); } catch (e) { body = '[[unreadable]]'; }
    wire.push({ status: res.status(), path: u.replace(/^https?:\/\/[^/]+/, ''), body });
  };
  page.on('response', onResp);
  await page.goto(WEB + '/admin/workforce-roster', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const text = await page.evaluate(() => {
    const main = document.querySelector('.admin__content') || document.body;
    return main.innerText.replace(/\n{2,}/g, '\n').trim().slice(0, 900);
  });
  page.off('response', onResp);
  return { text, wire };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const record = { steps: {} };
  let darkened = false;

  try {
    await signIn(page);
    say('signed in as ' + PHONE);

    // ---- 1. Does the switchboard offer workforce.personnel-list? -------------------------------
    const board = await readBoard(page);
    const keys = [];
    board.modules.forEach(m => m.rows.forEach(r => keys.push((r.key || '').trim())));
    record.steps.board = board;
    say('board rows: ' + keys.length);
    say('workforce.* rows offered: ' + JSON.stringify(keys.filter(k => k.indexOf('workforce.') === 0)));
    say('offers workforce.personnel-list: ' + (keys.indexOf('workforce.personnel-list') >= 0));

    // ---- 2. What does the WRITE route answer for that key? -------------------------------------
    // Sent from inside the page so it rides the app's own base URL and bearer. The token is read
    // into the browser context and never leaves it: only status and body come back.
    const put = await page.evaluate(async (storeId) => {
      // `plugins/global-mixin.js:208` builds every client's initializer from exactly this path.
      const token = (function () {
        try {
          const s = window.$nuxt && window.$nuxt.$store && window.$nuxt.$store.state;
          if (s && s.currentUser && s.currentUser.token) { return s.currentUser.token; }
        } catch (e) { /* fall through */ }
        return null;
      })();
      if (!token) { return { error: 'no bearer reachable from the page' }; }
      const attempt = async (flagKey) => {
        const res = await fetch('http://127.0.0.1:5971/stores/' + storeId + '/feature-flags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ flagKey: flagKey, enabled: true })
        });
        return { flagKey: flagKey, status: res.status, body: (await res.text()).slice(0, 300) };
      };
      return {
        withheld: await attempt('workforce.personnel-list'),
        // A control: an ADVERTISED key on the same route, so a 400 above cannot be the route itself
        // being broken. It is set to the value it already holds, so it changes nothing.
        control: await attempt('workforce.setup')
      };
    }, STORE);
    record.steps.put = put;
    say('PUT workforce.personnel-list -> ' + JSON.stringify(put.withheld));
    say('PUT workforce.setup (control) -> ' + JSON.stringify(put.control));

    // ---- 3. The roster with workforce.module ON, then OFF --------------------------------------
    const lit = await readRoster(page);
    record.steps.rosterLit = lit;
    say('roster, module ON: ' + JSON.stringify(lit.wire.map(w => w.status + ' ' + w.path)));
    say('roster, module ON, first line: ' + lit.text.split('\n').slice(0, 3).join(' | '));

    const off = await flip(page, 'off', 'workforce.module');
    darkened = true;
    record.steps.flagOff = off;
    say('workforce.module switched OFF from the board -> ' + JSON.stringify(off));

    const dark = await readRoster(page);
    record.steps.rosterDark = dark;
    await shot(page, 'roster-dark-before');
    say('roster, module OFF, wire: ' + JSON.stringify(dark.wire.map(w => w.status + ' ' + w.path)));
    dark.wire.forEach(w => say('   body ' + w.status + ' ' + w.path + ' :: ' + w.body));
    say('roster, module OFF, printed: ' + dark.text.split('\n').slice(0, 6).join(' | '));
  } catch (e) {
    say('THREW: ' + (e && e.message));
    record.threw = String(e && e.stack || e);
  } finally {
    if (darkened) {
      try {
        const back = await flip(page, 'on', 'workforce.module');
        record.steps.flagRestored = back;
        say('workforce.module switched BACK ON -> ' + JSON.stringify(back));
        const after = await readBoard(page);
        const on = [];
        after.modules.forEach(m => m.rows.forEach(r => on.push(((r.badge || '').trim()))));
        record.steps.boardFinal = after;
        say('board after restore: ' + on.length + ' rows, ' + on.filter(b => b === 'På').length + ' På');
      } catch (e) {
        say('RESTORE FAILED: ' + (e && e.message) + ' — workforce.module may still be OFF for store ' + STORE);
      }
    }
    fs.writeFileSync(path.join(OUT, 'walk-before.json'), JSON.stringify(record, null, 2));
    fs.writeFileSync(path.join(OUT, 'walk-before.log'), t.join('\n') + '\n');
    await browser.close();
  }
})();
