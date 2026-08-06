// EVIDENCE ARM — literally nothing listening. Not committed; this file exists to be run in a
// disposable worktree and to have its output read.
//
// Run with E2E_API_BASE_URL pointed at a port where NOTHING is bound, so no fixture is started
// (playwright.config.js starts only the web server in live mode) and every API call the application
// makes is refused by the operating system. Nothing is intercepted, stubbed, mocked or routed: the
// modal's own request goes out and finds nobody home, which is exactly the condition under which
// the defect was found.
//
// It deliberately does NOT use test/e2e/support/journey.js: that recorder POSTs /__fixture/reset
// before the browser opens, and its live preflight refuses an origin that does not answer — both of
// which are correct, and both of which make it unusable for the one world this arm needs.

const { test, expect } = require('@playwright/test');

test('with nothing listening, what does the login modal do after asking for a code?', async ({ page }) => {
  const modal = page.locator('.login-modal');
  const phoneField = modal.locator('.input-wrapper input[type="tel"]');
  const boxes = modal.locator('.otp-input input');
  const alert = modal.locator('.alert--error');

  const apiCalls = [];
  page.on('requestfailed', (r) => {
    if (r.url().includes('/user/')) {
      apiCalls.push('FAILED ' + r.url() + ' :: ' + (r.failure() || {}).errorText);
    }
  });
  page.on('response', (r) => {
    if (r.url().includes('/user/')) { apiCalls.push('ANSWERED ' + r.status() + ' ' + r.url()); }
  });

  // `/admin` rather than `/admin/lang`: twelve admin pages mount their OWN <LoginModal> on top of
  // the one `AdminPage` already renders, so `/admin/lang` genuinely has TWO and a bare
  // `.login-modal` locator is ambiguous there (observed: strict mode violation, 2 elements). The
  // index page mounts none of its own, and `initAuth` does not redirect when the path is already
  // `/admin`, so this is one modal with no navigation race. The count is asserted, not assumed.
  await page.goto('/admin');
  await expect(modal).toHaveCount(1, { timeout: 60000 });
  await expect(modal).toBeVisible();
  await expect(phoneField).toBeVisible();

  await phoneField.fill('99999999');
  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();

  // Let the modal settle on whatever it decides, then REPORT it before asserting, so the run is
  // readable whether it passes or fails.
  await expect
    .poll(async () => (await boxes.count()) + (await alert.count()), { timeout: 30000 })
    .toBeGreaterThan(0);

  // Let any leave/enter transition finish before reading the DOM. `mode="out-in"` keeps the
  // outgoing step mounted for the length of its animation, so a read taken the instant the poll
  // settles can catch the modal mid-swap and report the step that is on its way out.
  await page.waitForTimeout(1200);

  const otpCount = await boxes.count();
  const alertText = (await alert.count()) ? (await alert.first().innerText()).trim() : '(no error shown)';
  // Counted, measured and NOT swallowed: a `.catch(() => false)` here would turn a strict-mode
  // violation into a quiet "no", which is the same class of lie this whole lane is about.
  const phoneCount = await phoneField.count();
  const phoneVisible = phoneCount === 1 ? await phoneField.isVisible() : null;
  const phoneBox = phoneCount === 1 ? await phoneField.boundingBox() : null;
  const formHtml = (await modal.locator('.login-modal__form').count())
    ? (await modal.locator('.login-modal__form').first().innerHTML()).replace(/\s+/g, ' ').slice(0, 240)
    : '(no .login-modal__form)';

  console.log('---- NOTHING-LISTENING OBSERVATION ----');
  console.log('api traffic     : ' + (apiCalls.length ? apiCalls.join(' | ') : '(none reached the network log)'));
  console.log('otp boxes shown : ' + otpCount);
  console.log('phone inputs    : ' + phoneCount + '  visible=' + phoneVisible + '  box=' + JSON.stringify(phoneBox));
  console.log('form html       : ' + formHtml);
  console.log('modal says      : ' + alertText);
  console.log('---------------------------------------');

  const phoneStillThere = phoneCount === 1 && phoneVisible === true;

  // THE CLAIM: a code that was never sent is never asked for.
  expect(otpCount).toBe(0);
  expect(phoneStillThere).toBe(true);
  expect(alertText).toContain('kunne ikke sende koden');
});
