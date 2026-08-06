// BROWSER DIAGNOSTIC — what a person on `/admin/ongoing?redirect=…` actually gets.
//
// The jsdom suite proves what the page's sign-in handler DOES once it runs. This asks the separate
// question the lane brief put first: can a person in a real browser get that handler to run at all,
// or is it dead code? A sibling lane found other per-page modals on this estate genuinely
// unreachable, and fixing dead code would be worse than leaving it alone.
//
// It REPORTS rather than asserts, up to the last step. Every observation is printed with an `[obs]`
// prefix so the answer is legible in the run log whichever way it comes out — a diagnostic that
// failed early would tell us only that it failed early.
const { test, expect } = require('@playwright/test');

const OTP_LENGTH = 6;
const BOARD_URL = '/admin/ongoing?redirect=' + encodeURIComponent('/admin/ongoing');

const LATE_ORDER = {
  id: 'order-placed-after-signin',
  friendlyOrderId: '9911',
  storeId: 1,
  status: 'Accepted',
  deliveryType: 'SelfPickup',
  platform: 'Web',
  created: '2026-08-06T12:00:00.000Z',
  requestedCompletion: null,
  userFullName: 'Gjest etter innlogging',
  userId: 'user-guest-late',
  userIsMember: false,
  user: { id: 'user-guest-late', phoneNumber: '+4790009911' },
  totalAmount: 199,
  currencyCode: 'NOK',
  items: [{ id: 'line-late', name: 'Dagens rett', amount: 1, price: 199, comment: '' }]
};

test('what a person gets on /admin/ongoing?redirect=…', async ({ page }) => {
  let placed = false;
  let ongoingCalls = 0;

  // The board's feed, controlled from here. Counting the calls is the whole point: a board that is
  // polling asks again, and a frozen one never does.
  await page.route('**/orders/ongoing*', async (route) => {
    ongoingCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(placed ? [LATE_ORDER] : [])
    });
  });

  page.on('console', (message) => {
    if (message.type() === 'error') { console.log('[page-error] ' + message.text()); }
  });

  await page.goto(BOARD_URL);

  const modals = page.locator('.login-modal');
  await expect(modals.last()).toBeVisible({ timeout: 60000 });
  console.log('[obs] modals on arrival: ' + (await modals.count()) + '  (the shell mounts one, the page mounts its own)');
  console.log('[obs] url on arrival:    ' + page.url());

  async function signInThrough (modal, label) {
    const phoneField = modal.locator('.input-wrapper input[type="tel"]');
    await expect(phoneField).toBeVisible();
    await phoneField.fill('99999999');
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();

    const boxes = modal.locator('.otp-input input');
    try {
      await expect(boxes).toHaveCount(OTP_LENGTH, { timeout: 15000 });
    } catch (error) {
      // The interesting failure. `LoginModal.getCode()` swallows a failed send into an on-screen
      // message and leaves the phone step up, so the reason is in the DOM rather than in an
      // exception.
      const text = (await modal.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
      console.log('[obs] ' + label + ': the OTP step never appeared. modal text: "' + text + '"');
      return false;
    }
    const digits = '123123'.split('');
    for (let i = 0; i < OTP_LENGTH; i++) {
      await boxes.nth(i).fill(digits[i]);
    }
    return true;
  }

  // ---- the sign-in a person performs: the modal on top, which is the shell's ----
  const first = await signInThrough(modals.last(), 'FIRST sign-in (shell modal)');
  console.log('[obs] FIRST sign-in completed: ' + first);
  await page.waitForTimeout(4000);
  console.log('[obs] url after first sign-in:    ' + page.url());
  console.log('[obs] modals after first sign-in: ' + (await modals.count()));

  // THE PRODUCT QUESTION. The visitor has signed in. Is the board they asked for working?
  const callsBefore = ongoingCalls;
  placed = true;
  await page.waitForTimeout(16000); // more than two 7s poll intervals
  const drewLateOrder = await page.getByText('9911').count();
  console.log('[obs] --- after ONE sign-in, the sign-in a person actually performs ---');
  console.log('[obs] /orders/ongoing calls so far:       ' + ongoingCalls + ' (before the wait: ' + callsBefore + ')');
  console.log('[obs] board polled during the 16s wait:   ' + (ongoingCalls > callsBefore));
  console.log('[obs] late order 9911 drawn on the board: ' + (drewLateOrder > 0));
  console.log('[obs] a sign-in modal still covering it:  ' + (await modals.count()));

  // ---- if a modal is still up, this is the page's own, and closing it runs the handler ----
  if (await modals.count() > 0) {
    const second = await signInThrough(modals.first(), 'SECOND sign-in (the page\'s own modal)');
    console.log('[obs] SECOND sign-in completed: ' + second);
    await page.waitForTimeout(4000);
    console.log('[obs] modals after second sign-in: ' + (await modals.count()));
  }

  const callsBeforeSecondWait = ongoingCalls;
  await page.waitForTimeout(16000);
  const drewAfterSecond = await page.getByText('9911').count();
  console.log('[obs] --- after the page\'s own modal was cleared ---');
  console.log('[obs] /orders/ongoing calls:              ' + ongoingCalls + ' (before this wait: ' + callsBeforeSecondWait + ')');
  console.log('[obs] board polled during the 16s wait:   ' + (ongoingCalls > callsBeforeSecondWait));
  console.log('[obs] late order 9911 drawn on the board: ' + (drewAfterSecond > 0));

  // THE ASSERTION, and the only one: once no sign-in modal is left, an order placed after the
  // sign-in is on the board without anybody reloading. Presence, never the absence of an error.
  await expect(modals).toHaveCount(0);
  await expect(page.getByText('9911')).toHaveCount(1, { timeout: 20000 });
});
