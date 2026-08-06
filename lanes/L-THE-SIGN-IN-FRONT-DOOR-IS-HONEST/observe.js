// OBSERVATION ONLY. Nothing here is fixed; this records what the front door actually does.
//
// Two questions, asked against whichever web origin is handed in (default: the live world on :3971):
//
//   A. From the guarded deep link /admin/overview, where does the browser END UP after sign-in, and
//      what sequence of URLs did it pass through to get there? The guard writes
//      ?redirect=%2Fadmin%2Foverview; the walk record says the app lands on /admin?storeId=1.
//
//   B. If «Send kode» is clicked THE INSTANT it is visible — no networkidle, no settle — does a
//      request leave? Do the six OTP boxes appear? Does the modal say anything?
//
// Usage: node observe.js [WEB_ORIGIN] [OUT_TAG]
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = process.argv[2] || 'http://127.0.0.1:3971';
const TAG = process.argv[3] || 'live';
const OUT = __dirname;
const PHONE = '99681931';
const CODE = '849666';

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const urls = [];
  const sendCalls = [];
  const consoleErrors = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) { urls.push({ t: Date.now(), url: f.url() }); } });
  page.on('request', r => {
    if (/verification|token|login|user/i.test(r.url())) { sendCalls.push({ t: Date.now(), method: r.method(), url: r.url().slice(0, 160) }); }
  });
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push(m.text().slice(0, 240)); } });

  const out = { web: WEB, tag: TAG, at: new Date().toISOString() };

  // ---- B: the earliest possible click ---------------------------------------------------------
  const t0 = Date.now();
  await page.goto(WEB + (process.argv[4] || '/admin/overview'), { waitUntil: 'commit' });
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 90000 });
  out.msToModalVisible = Date.now() - t0;

  // What is on screen at the instant the modal first exists.
  out.atModalVisible = await page.evaluate(() => {
    const m = document.querySelector('.login-modal');
    const btn = m && m.querySelector('button.btn--primary');
    return {
      modalText: (m ? m.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 200),
      hasPhoneInput: !!(m && m.querySelector('input[type="tel"]')),
      hasSendButton: !!btn,
      sendButtonText: btn ? btn.textContent.replace(/\s+/g, ' ').trim() : null,
      sendButtonDisabled: btn ? btn.disabled : null,
      sendButtonAriaDisabled: btn ? btn.getAttribute('aria-disabled') : null,
      otpBoxes: document.querySelectorAll('.login-modal .otp-input input').length,
      // Nuxt's own hydration marker, and whether the root Vue instance exists yet.
      nuxtReady: !!(window.$nuxt),
      loadState: document.readyState
    };
  });

  const sendBefore = sendCalls.length;
  const tel = modal.locator('.input-wrapper input[type="tel"]');
  let earlyClick = { attempted: false };
  try {
    await tel.fill(PHONE, { timeout: 5000 });
    earlyClick.filled = true;
  } catch (e) { earlyClick.filled = false; earlyClick.fillError = String(e).slice(0, 200); }
  try {
    // force:false — a real person's click. If the control refuses the click, that is the answer.
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click({ timeout: 4000 });
    earlyClick.attempted = true;
    earlyClick.clicked = true;
  } catch (e) {
    earlyClick.attempted = true;
    earlyClick.clicked = false;
    earlyClick.clickError = String(e).replace(/\s+/g, ' ').slice(0, 300);
  }
  await page.waitForTimeout(3500);
  earlyClick.requestsAfter = sendCalls.length - sendBefore;
  earlyClick.dom = await page.evaluate(() => {
    const m = document.querySelector('.login-modal');
    const btn = m && m.querySelector('button.btn--primary');
    const alert = m && m.querySelector('.alert--error');
    return {
      otpBoxes: document.querySelectorAll('.login-modal .otp-input input').length,
      says: alert ? alert.textContent.replace(/\s+/g, ' ').trim() : null,
      sendButtonStillThere: !!btn,
      sendButtonDisabled: btn ? btn.disabled : null,
      nuxtReady: !!(window.$nuxt)
    };
  });
  out.earlyClick = earlyClick;
  await page.screenshot({ path: path.join(OUT, TAG + '-01-after-early-click.png'), fullPage: true });
  log('EARLY CLICK:', JSON.stringify(earlyClick));

  // ---- carry on and actually sign in, to answer A ---------------------------------------------
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const boxes = modal.locator('.otp-input input');
  let clicks = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (await boxes.count() > 0) { break; }
    await tel.fill(PHONE).catch(() => {});
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click().catch(() => {});
    clicks++;
    try { await boxes.first().waitFor({ state: 'visible', timeout: 15000 }); break; } catch (e) { /* retry */ }
  }
  out.clicksNeededAfterSettle = clicks;
  out.urlAtOtpStep = page.url();

  const digits = CODE.split('');
  for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i]); }
  await modal.waitFor({ state: 'detached', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  out.finalUrl = page.url();
  out.urlTrail = urls.map(u => u.url);
  out.signedInUserId = await page.evaluate(() => {
    try { return JSON.parse(window.localStorage.getItem('state')).currentUser.id; } catch (e) { return null; }
  });
  out.finalHeadings = await page.locator('h1, h2').allInnerTexts().catch(() => []);
  await page.screenshot({ path: path.join(OUT, TAG + '-02-after-sign-in.png'), fullPage: true });
  out.consoleErrors = consoleErrors;

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'observe-' + TAG + '.json'), JSON.stringify(out, null, 2));
  log('\nFINAL URL:', out.finalUrl);
  log('TRAIL:', JSON.stringify(out.urlTrail, null, 1));
}

main().catch(e => { log('FATAL', String(e)); process.exit(1); });
