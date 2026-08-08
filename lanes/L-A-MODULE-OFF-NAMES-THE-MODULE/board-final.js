// A read-only close-out: the flag board as the operator sees it after this lane finished. Nothing is
// clicked, nothing is written. It exists so "the world was left as found" is a measurement.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const WEB = 'http://localhost:3971';
const PHONE = '99681931';
const OTP = '849666';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  try {
    await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    const modal = page.locator('.login-modal');
    await modal.waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(3000);
    await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
    const boxes = modal.locator('.otp-input input');
    await boxes.first().waitFor({ timeout: 40000 });
    for (let i = 0; i < 6; i++) {
      try { await boxes.nth(i).fill(OTP[i], { timeout: 8000 }); } catch (e) { break; }
    }
    await modal.waitFor({ state: 'detached', timeout: 60000 });

    await page.goto(WEB + '/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    await page.locator('.ff-page__title').waitFor({ timeout: 60000 });
    await page.waitForTimeout(3000);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.ff-row')].map(r => ({
      key: r.querySelector('.ff-row__key').textContent.trim(),
      badge: r.querySelector('.ff-row__badge').textContent.trim(),
      facts: [...r.querySelectorAll('.ff-row__fact')].map(f => f.textContent.trim())
    })));
    const on = rows.filter(r => r.badge === 'På').length;
    const line = rows.length + ' rows, ' + on + ' På, ' + (rows.length - on) + ' not';
    console.log(line);
    console.log('offers workforce.personnel-list: ' + rows.some(r => r.key === 'workforce.personnel-list'));
    rows.filter(r => /^workforce\./.test(r.key)).forEach(r => console.log('  ' + r.key + ' ' + r.badge + ' ' + JSON.stringify(r.facts)));
    fs.writeFileSync(path.join(__dirname, 'board-final.json'), JSON.stringify({ summary: line, rows }, null, 2));
    await page.screenshot({ path: path.join(__dirname, 'board-final.png') });
  } finally {
    await browser.close();
  }
})();
