// The lane's browser walk, driven against the OWNER'S LIVE WORLD (web :3971, API :5971).
//
// Not a journey under test/e2e: those spin their own fixture world on 3061/4061 and this lane's whole
// question is whether a person can turn a module on IN THE WORLD THE OWNER HAS OPEN. So it is a
// standalone Playwright driver that never starts a server and never seeds a row.
//
// Every flag write goes through a click on /admin/feature-flags. Nothing here PUTs the flag route.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const WEB = 'http://localhost:3971';
const PHONE = '99681931';
const OTP = '849666';
const OUT = __dirname;
const SHOTS = path.join(OUT, 'shots');

const t = [];
function say (line) { const s = String(line); t.push(s); console.log(s); }

async function shot (page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false });
}

async function signIn (page) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 45000 });
  await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.first().waitFor({ timeout: 30000 });
  const digits = OTP.split('');
  // The sixth box submits and the modal tears itself down, so the later fills race the detach.
  // A detached box is the success signal, not a failure.
  for (let i = 0; i < 6; i++) {
    try { await boxes.nth(i).fill(digits[i], { timeout: 8000 }); } catch (e) { break; }
  }
  await page.waitForURL(u => u.pathname === '/admin/feature-flags', { timeout: 45000 });
  await modal.waitFor({ state: 'detached', timeout: 20000 });
}

// The board as the OPERATOR reads it: one entry per drawn row, with the badge, the three facts, and
// whether a control exists at all.
async function readBoard (page) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
  await page.waitForTimeout(2500);
  return await page.evaluate(() => {
    const blocker = document.querySelector('.ff-page__blocker');
    if (blocker) { return { blocker: blocker.textContent.trim(), modules: [] }; }
    const mods = [...document.querySelectorAll('.ff-module')].map(m => ({
      module: m.querySelector('.ff-module__title').textContent.trim(),
      rows: [...m.querySelectorAll('.ff-row')].map(r => ({
        key: (r.querySelector('.ff-row__key') || {}).textContent,
        title: (r.querySelector('.ff-row__title') || {}).textContent,
        badge: (r.querySelector('.ff-row__badge') || {}).textContent,
        facts: [...r.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim()),
        warn: [...r.querySelectorAll('.ff-row__warn')].map(f => f.textContent.trim()),
        hasOn: !!r.querySelector('[data-flag-on]')
      }))
    }));
    const notices = [...document.querySelectorAll('.ff-page__notice')].map(n => n.textContent.trim());
    return { blocker: null, notices, modules: mods };
  });
}

async function flip (page, action, key) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
  const btn = page.locator('[data-flag-' + action + '="' + key + '"]');
  await btn.waitFor({ timeout: 30000 });
  await btn.click();
  const toast = page.locator('.ff-page__toast');
  await toast.waitFor({ timeout: 20000 });
  const msg = (await toast.textContent()).trim();
  await page.waitForTimeout(800);
  const badge = await page.evaluate(k => {
    const row = [...document.querySelectorAll('.ff-row')].find(r => {
      const c = r.querySelector('.ff-row__key');
      return c && c.textContent.trim() === k;
    });
    if (!row) { return null; }
    return {
      badge: row.querySelector('.ff-row__badge').textContent.trim(),
      facts: [...row.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim()),
      warn: [...row.querySelectorAll('.ff-row__warn')].map(f => f.textContent.trim())
    };
  }, key);
  return { toast: msg, row: badge };
}

// The MODULE'S OWN SURFACE, read the way a person reads it: what the page actually says, plus every
// module-scoped API response the page provoked. The status codes are the part that cannot be
// argued with — a gate that refuses answers 404/409, and no amount of rendered chrome hides that.
async function readSurface (page, url, opts) {
  const o = opts || {};
  const calls = [];
  const onResp = async (res) => {
    const u = res.url();
    if (!/:5971/.test(u)) { return; }
    calls.push({ status: res.status(), url: u.replace(/^https?:\/\/[^/]+/, '') });
  };
  page.on('response', onResp);
  await page.goto(WEB + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(o.wait || 9000);
  const text = await page.evaluate((sel) => {
    const main = (sel && document.querySelector(sel)) || document.querySelector('.admin__content') || document.body;
    if (sel && !document.querySelector(sel)) { return '[[selector absent: ' + sel + ']] ' + (document.querySelector('.admin__content') || document.body).innerText.replace(/\n{2,}/g, '\n').trim().slice(0, 900); }
    return main.innerText.replace(/\n{2,}/g, '\n').trim().slice(0, 1800);
  }, o.focus || null);
  page.off('response', onResp);
  return { url, calls, text };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  const record = { startedAt: new Date().toISOString(), steps: [] };
  const step = (name, data) => { record.steps.push({ name, ...data }); };

  try {
    await signIn(page);
    say('signed in');
    await shot(page, '00-board');
    const board = await readBoard(page);
    step('board:initial', { board });
    say('board modules: ' + board.modules.map(m => m.module + '(' + m.rows.length + ')').join(' '));
    for (const m of board.modules) {
      for (const r of m.rows) {
        say('  ROW ' + m.module + ' ' + r.key + ' badge=' + r.badge + ' facts=' + JSON.stringify(r.facts) + ' control=' + r.hasOn + (r.warn.length ? ' warn=' + JSON.stringify(r.warn) : ''));
      }
    }

    // EVERY flag on this store was already on when the lane arrived, so reading a lit surface
    // proves nothing about the switch. The walk therefore takes the module DOWN from the screen
    // first, reads its own surface refusing, then brings it back UP from the same screen and reads
    // it answering. The dark window is one module wide and closes before the next module opens —
    // the world is in use.
    const PLAN = JSON.parse(fs.readFileSync(path.join(OUT, 'plan.json'), 'utf8'));
    for (const item of PLAN) {
      say('=== ' + item.module + ' ===');

      for (const key of item.flags.slice().reverse()) {
        const f = await flip(page, 'off', key);
        step(item.module + ':off:' + key, f);
        say('  OFF  ' + key + ' toast="' + f.toast + '" row=' + JSON.stringify(f.row));
      }
      await shot(page, item.module + '-1-board-off');

      const dark = await readSurface(page, item.surface, item);
      step(item.module + ':surface-dark', dark);
      say('  DARK ' + item.surface + ' calls=' + JSON.stringify(dark.calls.slice(0, 14)));
      say('  DARK text: ' + dark.text.replace(/\n/g, ' | ').slice(0, 500));
      await shot(page, item.module + '-2-dark');

      for (const key of item.flags) {
        const f = await flip(page, 'on', key);
        step(item.module + ':on:' + key, f);
        say('  ON   ' + key + ' toast="' + f.toast + '" row=' + JSON.stringify(f.row));
      }
      await shot(page, item.module + '-3-board-on');

      const lit = await readSurface(page, item.surface, item);
      step(item.module + ':surface-lit', lit);
      say('  LIT  ' + item.surface + ' calls=' + JSON.stringify(lit.calls.slice(0, 14)));
      say('  LIT  text: ' + lit.text.replace(/\n/g, ' | ').slice(0, 500));
      await shot(page, item.module + '-4-lit');
    }

    const boardEnd = await readBoard(page);
    step('board:final', { board: boardEnd });
  } catch (e) {
    say('ERROR ' + e.message);
    record.error = e.message + '\n' + e.stack;
    try { await shot(page, 'zz-error'); } catch (x) { /* nothing to add */ }
  } finally {
    fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(record, null, 2));
    fs.writeFileSync(path.join(OUT, 'walk.log'), t.join('\n') + '\n');
    await browser.close();
  }
})();
