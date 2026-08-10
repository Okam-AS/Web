// The live walk behind L-A-WORKER-SEES-WHAT-SHE-CONFIRMED.
//
// Runs the assertions of the week-run journey's `Bekreft mottatt` step against the owner's live world
// (web :3971, API :5971), in two arms against the SAME publication and two DIFFERENT humans:
//
//   node walk.js before   — manager 99681931 (Ingrid Moen, a recipient of publication 0d8ef70d)
//                           presses Bekreft while web-livewalk still carries the UNFIXED code.
//                           This is the negative control: it must reproduce the defect.
//   node walk.js after    — worker 99999999 (Astrid Vik, the other recipient of the SAME publication)
//                           presses Bekreft after the fix is applied to web-livewalk via HMR.
//                           This must satisfy every assertion the inverted journey step makes.
//
// It never binds :3971 or :5971, never starts a server and never restarts one. It drives its own
// chromium against the owner's dev server, which is what a person with a browser would do.
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3971';
const OUT = __dirname;

const ARM = process.argv[2];
const PEOPLE = {
  before: { phone: '99681931', code: '849666', who: 'manager Ingrid Moen' },
  after: { phone: '99999999', code: '123123', who: 'worker Astrid Vik' }
};

const results = [];
function record (name, value) {
  results.push({ name, value });
  console.log('  ' + name + ' = ' + JSON.stringify(value));
}

async function signIn (page, phone, code) {
  const modal = page.locator('.login-modal');
  await modal.waitFor({ state: 'visible', timeout: 60000 });
  const phoneField = modal.locator('.input-wrapper input[type="tel"]');
  await phoneField.waitFor({ state: 'visible', timeout: 30000 });
  await phoneField.fill(phone);
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
  const boxes = modal.locator('.otp-input input');
  await boxes.nth(5).waitFor({ state: 'visible', timeout: 30000 });
  const digits = String(code).split('');
  for (let i = 0; i < 6; i += 1) { await boxes.nth(i).fill(digits[i]); }
  await page.waitForURL(url => url.pathname === '/admin/workforce-me', { timeout: 60000 });
  await modal.waitFor({ state: 'detached', timeout: 30000 });
}

(async () => {
  if (!PEOPLE[ARM]) { throw new Error('usage: node walk.js before|after'); }
  const person = PEOPLE[ARM];

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 430, height: 950 } });
  const page = await context.newPage();

  const acknowledgements = [];
  page.on('response', (r) => {
    if (/\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
        r.request().method() === 'POST') {
      acknowledgements.push(r);
    }
  });

  console.log('ARM ' + ARM + ' — ' + person.who);

  await page.goto(BASE + '/admin/workforce-me', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 60000 });
  await signIn(page, person.phone, person.code);
  await page.locator('.wfme__title').waitFor({ state: 'visible', timeout: 60000 });

  record('signedInUserId', await page.evaluate(() => {
    const raw = window.localStorage.getItem('state');
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed && parsed.currentUser && parsed.currentUser.id) || null;
  }));

  const notice = page.locator('.wfme-pub');
  await notice.first().waitFor({ state: 'visible', timeout: 60000 });

  // ---- BEFORE THE PRESS. The four post-press claims are only meaningful as a CHANGE.
  record('before.noticeVisible', await notice.first().isVisible());
  record('before.title', (await notice.locator('.wfme-pub__title').first().textContent()).trim());
  record('before.receiptCount', await page.locator('.wfme-pub__receipt').count());
  record('before.ledeCount', await notice.locator('.wfme-pub__lede').count());
  record('before.dotCount', await notice.locator('.wfme-pub__dot').count());
  record('before.itemCount', await notice.locator('.wfme-pub__item').count());
  await page.screenshot({ path: path.join(OUT, ARM + '-1-before-press.png'), fullPage: true });

  // ---- THE PRESS.
  const [response] = await Promise.all([
    page.waitForResponse(r =>
      /\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
      r.request().method() === 'POST', { timeout: 60000 }),
    notice.getByRole('button', { name: 'Bekreft mottatt' }).first().click()
  ]);
  record('press.status', response.status());
  const body = await response.json().catch(() => null);
  record('press.alreadyAcknowledged', body ? body.alreadyAcknowledged : null);
  record('press.occurredAtUtc', body ? body.occurredAtUtc : null);

  // The page re-reads the inbox after the write. Wait for that to have happened rather than for a
  // fixed time, so what is measured below is the settled screen and not a tick in the middle of it.
  await page.waitForResponse(r => /\/workforce\/me\/inbox$/.test(r.url()), { timeout: 60000 })
    .catch(() => null);
  await page.waitForTimeout(1500);

  // ---- AFTER THE PRESS. These are the assertions the inverted journey step makes.
  record('after.noticeCount', await page.locator('.wfme-pub').count());
  record('after.itemCount', await page.locator('.wfme-pub__item').count());
  record('after.receiptCount', await page.locator('.wfme-pub__receipt').count());
  record('after.receiptText', await page.locator('.wfme-pub__receipt').count()
    ? (await page.locator('.wfme-pub__receipt').first().textContent()).replace(/\s+/g, ' ').trim()
    : null);
  record('after.title', await page.locator('.wfme-pub__title').count()
    ? (await page.locator('.wfme-pub__title').first().textContent()).trim() : null);
  record('after.ledeCount', await page.locator('.wfme-pub__lede').count());
  record('after.dotCount', await page.locator('.wfme-pub__dot').count());
  record('after.disclaimerVisible', await page.locator('.wfme-pub__disclaimer').count()
    ? await page.locator('.wfme-pub__disclaimer').first().isVisible() : false);
  record('after.markReadButtonCount', await page.locator('.wfme-pub__btn--ghost').count());
  record('after.errorToastCount', await page.locator('.wfme__toast--error').count());
  record('after.anyToastCount', await page.locator('.wfme__toast').count());
  await page.screenshot({ path: path.join(OUT, ARM + '-2-after-press.png'), fullPage: true });

  // ---- THE REPLAY. Unreachable while the first press removed the button that calls it.
  const acknowledge = page.locator('.wfme-pub__item .wfme-pub__btn:not(.wfme-pub__btn--ghost)');
  record('replay.buttonCount', await acknowledge.count());
  if (await acknowledge.count()) {
    const [again] = await Promise.all([
      page.waitForResponse(r =>
        /\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
        r.request().method() === 'POST', { timeout: 60000 }),
      acknowledge.first().click()
    ]);
    record('replay.status', again.status());
    const replayBody = await again.json().catch(() => null);
    record('replay.alreadyAcknowledged', replayBody ? replayBody.alreadyAcknowledged : null);
    await page.waitForTimeout(1500);
    record('replay.receiptText', await page.locator('.wfme-pub__receipt').count()
      ? (await page.locator('.wfme-pub__receipt').first().textContent()).replace(/\s+/g, ' ').trim()
      : null);
    await page.screenshot({ path: path.join(OUT, ARM + '-3-after-replay.png'), fullPage: true });
  }

  record('acknowledgementPostsMade', acknowledgements.length);

  await browser.close();
  require('fs').writeFileSync(
    path.join(OUT, ARM + '-walk.json'),
    JSON.stringify({ arm: ARM, who: person.who, base: BASE, at: new Date().toISOString(), results }, null, 2)
  );
  console.log('WALK ' + ARM + ' COMPLETE');
})().catch((e) => { console.error('WALK FAILED: ' + e.message); process.exit(1); });
