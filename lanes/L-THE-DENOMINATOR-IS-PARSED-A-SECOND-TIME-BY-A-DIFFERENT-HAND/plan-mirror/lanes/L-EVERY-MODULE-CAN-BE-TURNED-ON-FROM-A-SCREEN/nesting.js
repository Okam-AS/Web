// Does the BOARD tell the truth about a stage flag whose master is down?
//
// The brief's trap: only Workforce and Margin register an IStoreFeatureFlagEffectiveResolver, so for
// everything else StoreFeatureFlagsController.EffectiveAsync falls through to `row ?? default` — the
// board echoes the stored row instead of asking the module's gate.
//
// Margin is the case where the answer is observable WITHOUT restarting anything: MarginModuleGate
// ANDs both stage flags under the per-store master (IsPriceImportEnabled => IsModuleEnabled(store)
// && ...), and Margin HAS a resolver. So taking Margin.Module down from the screen must make the
// PriceImport and Statements rows read "Faktisk: av" while their own rows stay on — and raise the
// page's overruled warning. If it does not, the board is lying about a flag whose module is dark.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const WEB = 'http://localhost:3971';
const OUT = __dirname;
const t = [];
const say = (l) => { t.push(String(l)); console.log(String(l)); };

async function signIn (page) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 45000 });
  await modal.locator('.input-wrapper input[type="tel"]').fill('99681931');
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.first().waitFor({ timeout: 30000 });
  const d = '849666'.split('');
  for (let i = 0; i < 6; i++) { try { await boxes.nth(i).fill(d[i], { timeout: 8000 }); } catch (e) { break; } }
  await page.waitForURL(u => u.pathname === '/admin/feature-flags', { timeout: 45000 });
  await modal.waitFor({ state: 'detached', timeout: 20000 });
}

const rows = (page) => page.evaluate(() => [...document.querySelectorAll('.ff-row')].map(r => ({
  key: r.querySelector('.ff-row__key').textContent.trim(),
  badge: r.querySelector('.ff-row__badge').textContent.trim(),
  facts: [...r.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim()),
  warn: [...r.querySelectorAll('.ff-row__warn')].map(f => f.textContent.trim())
})));

async function flip (page, action, key) {
  await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
  await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
  await page.locator('[data-flag-' + action + '="' + key + '"]').click();
  await page.locator('.ff-page__toast').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
}

const WATCH = ['Margin.Module', 'Margin.PriceImport', 'Margin.Statements', 'Events.Core', 'Events.Deposits', 'Events.Settlement', 'training.setup', 'training.assignments'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1400 } })).newPage();
  page.setDefaultTimeout(45000);
  const rec = {};
  try {
    await signIn(page);
    const before = (await rows(page)).filter(r => WATCH.includes(r.key));
    rec.before = before;
    before.forEach(r => say('BEFORE ' + r.key + ' ' + r.badge + ' ' + JSON.stringify(r.facts) + (r.warn.length ? ' WARN=' + JSON.stringify(r.warn) : '')));

    await flip(page, 'off', 'Margin.Module');
    await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
    await page.waitForTimeout(3000);
    const during = (await rows(page)).filter(r => WATCH.includes(r.key));
    rec.masterDown = during;
    await page.screenshot({ path: path.join(OUT, 'shots', 'nesting-margin-master-down.png'), fullPage: true });
    during.forEach(r => say('MASTER-DOWN ' + r.key + ' ' + r.badge + ' ' + JSON.stringify(r.facts) + (r.warn.length ? ' WARN=' + JSON.stringify(r.warn) : '')));

    await flip(page, 'on', 'Margin.Module');
    await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    await page.locator('.ff-page__title').waitFor({ timeout: 45000 });
    await page.waitForTimeout(3000);
    const after = (await rows(page)).filter(r => WATCH.includes(r.key));
    rec.after = after;
    after.forEach(r => say('RESTORED ' + r.key + ' ' + r.badge + ' ' + JSON.stringify(r.facts)));
  } catch (e) {
    say('ERROR ' + e.message);
    rec.error = e.message;
  } finally {
    fs.writeFileSync(path.join(OUT, 'nesting.json'), JSON.stringify(rec, null, 2));
    fs.writeFileSync(path.join(OUT, 'nesting.log'), t.join('\n') + '\n');
    await browser.close();
  }
})();
