// THE WALK. A guarded deep link, a click on «Send kode» at the earliest instant the control exists,
// and wherever the browser ends up. Run against a live API either way, so the two arms differ only
// in the frontend build serving them.
//
//   arm "stock" : http://127.0.0.1:3971  — the owner's world, frontend 6f74f87, untouched
//   arm "fixed" : http://127.0.0.1:3975  — this lane's worktree, same live API on :5971
//
// The click is issued from INSIDE the page on a requestAnimationFrame loop rather than through
// Playwright, because Playwright waits for actionability and that wait is exactly the window under
// test. The loop presses the button on the first frame it exists, which is the earliest a person
// with a fast hand could.
//
// Usage: node walk-frontdoor.js <WEB_ORIGIN> <DEEP_LINK> <ARM_TAG>
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = process.argv[2];
const DEEP = process.argv[3];
const TAG = process.argv[4];
const PHONE = '99681931';
const CODE = '849666';

if (!WEB || !DEEP || !TAG) { throw new Error('usage: walk-frontdoor.js <WEB_ORIGIN> <DEEP_LINK> <ARM_TAG>'); }

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    const t0 = Date.now();
    window.__walk = { samples: [], firstControl: null, click: null, nextId: 1 };
    const tick = () => {
      const modal = document.querySelector('.login-modal');
      if (modal && !modal.dataset.walkId) { modal.dataset.walkId = String(window.__walk.nextId++); }
      const btn = modal && modal.querySelector('button.btn--primary');
      const boxes = document.querySelectorAll('.login-modal .otp-input input').length;
      const here = location.pathname + location.search;
      const s = { ms: Date.now() - t0, p: here, modalId: modal ? modal.dataset.walkId : null, sendControl: !!btn, boxes: boxes };
      const last = window.__walk.samples[window.__walk.samples.length - 1];
      if (!last || last.p !== s.p || last.modalId !== s.modalId || last.sendControl !== s.sendControl || last.boxes !== s.boxes) {
        window.__walk.samples.push(s);
      }
      if (btn && !window.__walk.firstControl) {
        // WHERE the first pressable send control appeared. This is the whole of defect two: on
        // stock it appears on the route the shell is about to leave, so what it sends is destroyed.
        window.__walk.firstControl = { ms: s.ms, path: here, modalId: modal.dataset.walkId };
        const tel = modal.querySelector('input[type="tel"]');
        if (tel) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(tel, window.__walkPhone);
          tel.dispatchEvent(new Event('input', { bubbles: true }));
        }
        window.__walk.click = { ms: s.ms, path: here, modalId: modal.dataset.walkId };
        btn.click();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const page = await context.newPage();
  await page.addInitScript(`window.__walkPhone = ${JSON.stringify(PHONE)};`);

  const sends = [];
  const failed = [];
  const consoleErrors = [];
  page.on('request', r => { if (/sendverificationtoken/i.test(r.url())) { sends.push({ at: Date.now(), url: r.url() }); } });
  page.on('response', r => { if (r.status() >= 400) { failed.push({ url: r.url().slice(0, 140), status: r.status() }); } });
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push(m.text().slice(0, 240)); } });

  const out = { arm: TAG, web: WEB, api: 'http://127.0.0.1:5971', deepLink: DEEP, at: new Date().toISOString() };

  await page.goto(WEB + DEEP, { waitUntil: 'commit' });

  // The six boxes, wherever they end up. Waiting on the BOXES rather than on a settle is the point:
  // if the earliest click really sent, they arrive on the modal that will keep them.
  const boxes = page.locator('.login-modal .otp-input input');
  let reachedOtp = true;
  try {
    await boxes.first().waitFor({ state: 'visible', timeout: 40000 });
  } catch (e) {
    reachedOtp = false;
  }
  out.reachedOtpFromTheEarliestClick = reachedOtp;

  // If the earliest click did not get there, do what a person does: press it again on whatever
  // modal is now on screen. Recorded either way — a second press is itself a finding.
  out.extraPresses = 0;
  if (!reachedOtp) {
    for (let attempt = 1; attempt <= 3 && !reachedOtp; attempt++) {
      await page.locator('.login-modal input[type="tel"]').fill(PHONE).catch(() => {});
      await page.locator('.login-modal button.btn--primary').click({ timeout: 10000 }).catch(() => {});
      out.extraPresses++;
      try { await boxes.first().waitFor({ state: 'visible', timeout: 20000 }); reachedOtp = true; } catch (e) { /* again */ }
    }
  }
  out.otpReached = reachedOtp;

  // Typing the code can fail even after the boxes were SEEN: on the stock build a second
  // navigation destroys the modal between the two, so the six boxes are gone from under the
  // person's fingers mid-code. Recorded as a finding rather than allowed to abort the walk —
  // a crash here would throw away everything the run had already established.
  out.otpVanishedWhileTyping = false;
  if (reachedOtp) {
    const digits = CODE.split('');
    try {
      for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i], { timeout: 15000 }); }
    } catch (e) {
      out.otpVanishedWhileTyping = true;
      out.otpTypingError = String(e).replace(/\s+/g, ' ').slice(0, 200);
    }
    await page.locator('.login-modal').waitFor({ state: 'detached', timeout: 60000 }).catch(() => {});
  }
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const walk = await page.evaluate(() => window.__walk);
  out.firstSendControlAppearedAt = walk.firstControl;
  out.earliestClick = walk.click;
  out.samples = walk.samples;
  out.smsSendRequests = sends.length;
  out.finalUrl = page.url();
  out.finalPath = new URL(page.url()).pathname;
  out.landedOnThePageAsked = new URL(page.url()).pathname === DEEP.split('?')[0];
  out.headings = await page.locator('h1, h2').allInnerTexts().catch(() => []);
  out.whoAmI = await page.evaluate(() => {
    try {
      const u = JSON.parse(window.localStorage.getItem('state')).currentUser;
      return { id: u.id, isPowerUser: !!u.isPowerUser, isKeyAccountManager: !!u.isKeyAccountManager, adminIn: (u.adminIn || []).length };
    } catch (e) { return null; }
  });
  out.failedResponses = failed;
  out.consoleErrors = consoleErrors;

  await page.screenshot({ path: path.join(__dirname, 'walk-' + TAG + '.png'), fullPage: true });
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'walk-' + TAG + '.json'), JSON.stringify(out, null, 2));

  log('ARM                       :', TAG, WEB, DEEP);
  log('first send control on     :', JSON.stringify(walk.firstControl));
  log('OTP from earliest click   :', out.reachedOtpFromTheEarliestClick, '| extra presses:', out.extraPresses);
  log('SMS send requests         :', out.smsSendRequests);
  log('final URL                 :', out.finalUrl);
  log('landed on the page asked  :', out.landedOnThePageAsked);
  log('who                       :', JSON.stringify(out.whoAmI));
  log('samples:');
  for (const s of walk.samples) { log('  ' + JSON.stringify(s)); }
}

main().catch(e => { log('FATAL', String(e)); process.exit(1); });
