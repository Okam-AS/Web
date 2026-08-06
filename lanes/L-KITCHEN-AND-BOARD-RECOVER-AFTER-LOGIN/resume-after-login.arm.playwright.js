// BROWSER ARM — is the page's own sign-in handler a code path a person can actually be on?
//
// The jsdom suite (`test/kitchen-and-board-resume-after-login.test.js`) proves what the handler does
// once it runs. It cannot prove that anything runs it, and that is the question this lane was told
// to settle before deciding a shape: a sibling lane found other per-page modals on this estate
// genuinely unreachable, and fixing dead code would be worse than leaving it.
//
// The reachable URL is `/admin/ongoing?redirect=…`. `AdminPage.initAuth` bounces a signed-out
// visitor off every admin path EXCEPT when a `redirect` query is already present (AdminPage.vue:99)
// — and that is the URL the sign-in flow itself leaves in the address bar, so it is bookmarkable and
// reloadable.
//
// WHAT IS ASSERTED: an order that is placed AFTER the sign-in appears on the board without anybody
// reloading. That is the promise of the screen. It is a PRESENCE assertion — a journey asserting
// "the page loaded" or "no error was raised" would pass against the defect every time, which is the
// failure shape this estate has shipped nineteen of.
//
// The order is injected at the WIRE with `page.route`, not seeded into `test/e2e/fixture/world.js`.
// The shared world is read by 31 journeys and one of them (`modal-estate-scroll-lock.spec.js`)
// asserts a scroll offset to within two pixels, so adding a card there would pay for this lane's
// proof with another lane's evidence.
const { test, expect } = require('@playwright/test');

const OTP_LENGTH = 6;
const BOARD_URL = '/admin/ongoing?redirect=' + encodeURIComponent('/admin/ongoing');

// The order that does not exist until after the sign-in.
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

test('an order placed after an in-page sign-in reaches the board', async ({ page }) => {
  // The world this board is served: empty until `placed` is flipped.
  let placed = false;

  await page.route('**/orders/ongoing*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(placed ? [LATE_ORDER] : [])
    });
  });

  await page.goto(BOARD_URL);

  // Signing in the way a person does — never by seeding `localStorage`, which would replace the door
  // with an assumption. Written inline rather than through `test/e2e/support/admin.js`: that helper
  // resolves `.login-modal` strictly and throws when two are present, and it is shared by 31
  // journeys, so it is read here and not modified.
  async function signInThrough (modal) {
    const phoneField = modal.locator('.input-wrapper input[type="tel"]');
    await expect(phoneField).toBeVisible();
    await phoneField.fill('99999999');
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();

    const boxes = modal.locator('.otp-input input');
    await expect(boxes).toHaveCount(OTP_LENGTH);
    // Box by box, never pasted: `OtpInput.onValueChange` is what advances focus and emits
    // `complete`, and it only runs on a per-input `input` event.
    const digits = '123123'.split('');
    for (let i = 0; i < OTP_LENGTH; i++) {
      await boxes.nth(i).fill(digits[i]);
    }
  }

  const modals = page.locator('.login-modal');
  await expect(modals.last()).toBeVisible({ timeout: 60000 });
  console.log('[arm] .login-modal elements on ' + BOARD_URL + ': ' + (await modals.count()));
  console.log('[arm] url before sign-in: ' + page.url());

  // TWO overlays stack on this URL: the shell mounts one, and the page mounts one of its own inside
  // the shell's slot. Neither carries a close button (`:hide-close-btn="true"`), and `LoginModal`
  // emits `close(true)` ONLY from its own successful `Login()` call — so each one is dismissed by
  // completing the OTP flow in it, and the visitor does the whole thing twice. That duplication is a
  // separate lane's finding (`lane/loginmodal-mounted-once`) and is not fixed here; it is reproduced
  // rather than stepped around, because it is what the visitor on this URL actually faces and it
  // decides which close handler runs.
  await signInThrough(modals.last());
  await expect(modals).toHaveCount(1, { timeout: 30000 });
  console.log('[arm] after the FIRST sign-in: url ' + page.url() + ', modals still up: ' + (await modals.count()));

  // The page's own modal is now the one in front, and closing it is what runs the page's own
  // sign-in handler — the handler this lane changed.
  await signInThrough(modals.first());
  await expect(modals).toHaveCount(0, { timeout: 30000 });
  console.log('[arm] after the SECOND sign-in: url ' + page.url() + ', modals: 0');

  // The board as it stood at the moment of sign-in. Nothing has been ordered yet.
  await expect(page.locator('.orders-column').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('9911')).toHaveCount(0);

  // A guest orders. The board polls every 7s; three polls is a generous window and still far short
  // of "somebody reloaded the page".
  placed = true;
  console.log('[arm] order 9911 now exists at the wire; waiting for the board to pick it up');

  await expect(page.getByText('9911')).toHaveCount(1, { timeout: 25000 });
  console.log('[arm] the board drew the late order without a reload');
});
