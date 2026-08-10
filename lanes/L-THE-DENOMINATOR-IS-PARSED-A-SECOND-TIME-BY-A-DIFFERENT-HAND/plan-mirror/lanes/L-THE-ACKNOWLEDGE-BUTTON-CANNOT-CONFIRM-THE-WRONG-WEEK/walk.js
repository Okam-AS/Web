// The live walk behind L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK.
//
// THE WORLD THIS NEEDS, WHICH IS WHY NO EARLIER WALK COULD SEE THE DEFECT. Both arms run against a
// world in which ONE worker holds TWO UNREAD publications — a manager published two different weeks
// to the same person. The after-arm world of L-A-WORKER-SEES-WHAT-SHE-CONFIRMED held one, and the
// week-run journey publishes one, so the second press had never been walked with the fix applied.
// `build-world.py` in this directory publishes the pair through the manager's own four calls
// (draft -> assignments -> validate -> publish), which is what a manager rostering two weeks does.
//
//   node walk.js before <pubNewest> <pubOlder>   the notice as trunk 6b98839 feeds it
//   node walk.js after  <pubNewest> <pubOlder>   the same presses with this lane's change applied
//
// WHAT IT PRESSES. "The acknowledge control" is the one at the TOP of the notice — the position a
// finger returns to. It is pressed twice, with the screen allowed to settle in between, exactly as a
// worker who believes the first press did not register would press it.
//
// WHAT IT PROVES, AND HOW. Not that a handler fired: after both presses it reads
// `GET /workforce/stores/{storeId}/schedules/publications/{id}/recipients` — the manager's own read
// of the recipient rows — and records `acknowledgedAtUtc` for THIS worker on EACH of the two
// publications. That is the state a payroll or a labour inspector would be shown. The POST urls the
// browser actually sent are recorded alongside, because the url names the publication and so tells us
// which week each press addressed.
//
// It never binds :3971 or :5971, never starts or restarts a server, and never touches a container.
// No credential is written to stdout, to the artifact, or to a screenshot (C7): the tokens are read
// from files the caller created outside this repository.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3971';
const API = 'http://localhost:5971';
const STORE_ID = 1;
const OUT = __dirname;
const TOKEN_DIR = process.env.ACK_TOKEN_DIR;

const ARM = process.argv[2];
const PUB_NEWEST = process.argv[3];
const PUB_OLDER = process.argv[4];

// The worker. Her staff member is what the recipients read is keyed on; the account itself signs in
// through the product's own demo door, whose code is supplied by the environment and never printed.
const WORKER_PHONE = process.env.ACK_WORKER_PHONE;
const WORKER_CODE = process.env.ACK_WORKER_CODE;
const WORKER_STAFF_ID = process.env.ACK_WORKER_STAFF_ID;

const results = [];
function record (name, value) {
  results.push({ name, value });
  console.log('  ' + name + ' = ' + JSON.stringify(value));
}

function apiGet (pathname, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(API + pathname, { headers: { Authorization: 'Bearer ' + token } }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: body ? JSON.parse(body) : null }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
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

// The notice as a person reads it, top row first: what each row says it was published, whether it
// still carries the unread dot, whether it carries a receipt, and what its acknowledge button SAYS.
// The button label is part of the state under test: two rows offering the identical word is what
// makes "the acknowledge control" ambiguous in the first place.
async function readRows (page) {
  return page.evaluate(() => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return Array.prototype.map.call(document.querySelectorAll('.wfme-pub__item'), (li) => ({
      when: text(li.querySelector('.wfme-pub__when')),
      dot: !!li.querySelector('.wfme-pub__dot'),
      receipt: text(li.querySelector('.wfme-pub__receipt')),
      ackButton: text(li.querySelector('.wfme-pub__btn:not(.wfme-pub__btn--ghost)'))
    }));
  });
}

async function pressTopAcknowledge (page, label) {
  const top = page.locator('.wfme-pub__item').first();
  const button = top.locator('.wfme-pub__btn:not(.wfme-pub__btn--ghost)').first();
  record(label + '.buttonText', (await button.textContent()).replace(/\s+/g, ' ').trim());
  const [response] = await Promise.all([
    page.waitForResponse(r =>
      /\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
      r.request().method() === 'POST', { timeout: 60000 }),
    button.click()
  ]);
  const url = response.url();
  const id = (url.match(/publications\/([^/]+)\/acknowledgements/) || [])[1] || null;
  record(label + '.status', response.status());
  record(label + '.publicationId', id);
  const body = await response.json().catch(() => null);
  record(label + '.alreadyAcknowledged', body ? body.alreadyAcknowledged : null);
  // Wait for the page's own inbox re-read, so what is measured next is the settled screen.
  await page.waitForResponse(r => /\/workforce\/me\/inbox$/.test(r.url()), { timeout: 60000 })
    .catch(() => null);
  await page.waitForTimeout(1500);
  return id;
}

(async () => {
  if (ARM !== 'before' && ARM !== 'after') { throw new Error('usage: node walk.js before|after <pubNewest> <pubOlder>'); }
  if (!PUB_NEWEST || !PUB_OLDER) { throw new Error('the two publication ids of this arm are required'); }
  if (!WORKER_PHONE || !WORKER_CODE || !WORKER_STAFF_ID || !TOKEN_DIR) {
    throw new Error('ACK_WORKER_PHONE / ACK_WORKER_CODE / ACK_WORKER_STAFF_ID / ACK_TOKEN_DIR must be set');
  }
  const managerToken = fs.readFileSync(path.join(TOKEN_DIR, 'mgr.token'), 'utf8').trim();

  record('arm', ARM);
  record('publications', { newest: PUB_NEWEST, older: PUB_OLDER });

  // ---- THE WORLD, BEFORE ANYTHING IS PRESSED. Read from the recipient rows, not from the screen.
  const stateBefore = {};
  for (const id of [PUB_NEWEST, PUB_OLDER]) {
    const r = await apiGet('/workforce/stores/' + STORE_ID + '/schedules/publications/' + id + '/recipients', managerToken);
    const mine = (r.json || []).find(x => x.staffMemberId === WORKER_STAFF_ID);
    stateBefore[id] = mine ? mine.acknowledgedAtUtc : 'not-a-recipient';
  }
  record('state.beforeAnyPress.acknowledgedAtUtc', stateBefore);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 430, height: 950 } });
  const page = await context.newPage();

  const posts = [];
  page.on('response', (r) => {
    if (/\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
        r.request().method() === 'POST') {
      posts.push((r.url().match(/publications\/([^/]+)\/acknowledgements/) || [])[1]);
    }
  });

  await page.goto(BASE + '/admin/workforce-me', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 60000 });
  await signIn(page, WORKER_PHONE, WORKER_CODE);
  await page.locator('.wfme__title').waitFor({ state: 'visible', timeout: 60000 });

  const notice = page.locator('.wfme-pub');
  await notice.first().waitFor({ state: 'visible', timeout: 60000 });

  record('open.title', (await notice.locator('.wfme-pub__title').first().textContent()).trim());
  record('open.itemCount', await page.locator('.wfme-pub__item').count());
  record('open.rows', await readRows(page));
  await page.screenshot({ path: path.join(OUT, ARM + '-1-two-unread.png'), fullPage: true });

  // ---- PRESS ONE, at the top of the notice.
  const first = await pressTopAcknowledge(page, 'press1');
  record('afterPress1.title', await page.locator('.wfme-pub__title').count()
    ? (await page.locator('.wfme-pub__title').first().textContent()).trim() : null);
  record('afterPress1.itemCount', await page.locator('.wfme-pub__item').count());
  record('afterPress1.rows', await readRows(page));
  await page.screenshot({ path: path.join(OUT, ARM + '-2-after-first-press.png'), fullPage: true });

  // ---- PRESS TWO, at the SAME place. The whole question is what this one confirms.
  const second = await pressTopAcknowledge(page, 'press2');
  record('afterPress2.itemCount', await page.locator('.wfme-pub__item').count());
  record('afterPress2.rows', await readRows(page));
  record('afterPress2.errorToastCount', await page.locator('.wfme__toast--error').count());
  await page.screenshot({ path: path.join(OUT, ARM + '-3-after-second-press.png'), fullPage: true });

  record('pressedTheSamePublicationTwice', first !== null && first === second);
  record('acknowledgementPostsMade', posts.length);

  await browser.close();

  // ---- THE PROOF, BY STATE. Which publication carries an acknowledgement for THIS worker now.
  const stateAfter = {};
  for (const id of [PUB_NEWEST, PUB_OLDER]) {
    const r = await apiGet('/workforce/stores/' + STORE_ID + '/schedules/publications/' + id + '/recipients', managerToken);
    const mine = (r.json || []).find(x => x.staffMemberId === WORKER_STAFF_ID);
    stateAfter[id] = mine ? mine.acknowledgedAtUtc : 'not-a-recipient';
  }
  record('state.afterBothPresses.acknowledgedAtUtc', stateAfter);
  const newlyAcknowledged = Object.keys(stateAfter).filter(id => !stateBefore[id] && stateAfter[id]);
  record('state.publicationsThisWalkAcknowledged', newlyAcknowledged);
  record('state.theWeekTheWorkerNeverLookedAtIsUnconfirmed', newlyAcknowledged.length === 1);

  fs.writeFileSync(
    path.join(OUT, ARM + '-walk.json'),
    JSON.stringify({ arm: ARM, base: BASE, at: new Date().toISOString(), results }, null, 2)
  );
  console.log('WALK ' + ARM + ' COMPLETE');
})().catch((e) => { console.error('WALK FAILED: ' + e.message); process.exit(1); });
