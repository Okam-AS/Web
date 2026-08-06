// JOURNEY — the login modal does not ask for a code it never sent.
//
// WHAT WAS WRONG. `LoginModal.getCode` set `smsSent = true` inside a `.then()` that never read the
// value it was handed. That is not a rare edge: `RequestService.PostRequest` RESOLVES a rejected
// request to the axios error object instead of rejecting it, so `UserService.SendVerificationToken`
// returns `false` and its promise still FULFILS. The modal's `.catch()` arm — the one that said
// «Feil telefonnummer» — was therefore unreachable for anything the server did or failed to do.
// With nothing listening on the API at all, the modal opened six boxes for a code nobody had sent,
// and the person typed into them until the sign-in wait timed out thirty seconds later.
//
// WHY THE ASSERTION IS "NO BOXES" AND NOT "AN ERROR APPEARS". An error message that appeared BESIDE
// six code boxes would satisfy a test that only looked for the message, and would still be the
// defect: the modal would still be asking. The claim under test is that the code step is not
// reached, so the count of code inputs is the measurement, and the message is the second half.
//
// WHY THE COUNT IS TAKEN ACROSS EVERY MODAL ON THE PAGE. This app really can have more than one
// `.login-modal` mounted at once — twelve admin pages mount their own on top of the one `AdminPage`
// already renders, and on `/admin` in fixture mode a second one was observed appearing after the
// first data load (lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND/runs/A3-pin-fixed.txt). Scoping the
// measurement to one of them would let a duplicate quietly hold the six boxes this test exists to
// forbid, so the rule asserted is the strict one: NO login modal anywhere on the page shows a code
// input. The interaction still drives a single, named modal.
//
// WHAT THE FAULT IS, AND WHY IT IS NOT A 500. The send's ANSWER is dropped, so the browser sees a
// request that went out and produced nothing usable — the axios REJECTION path, which is the one
// `PostRequest` swallows and therefore the whole bug. A 500 would not do: a 500 is a response, and
// a response is a thing `TryParseResponse` can be handed. Nothing in the application is stubbed —
// the real RequestService, the real UserService and the real modal all run. See the route handler
// for why the request is still allowed to reach the fixture.
//
// WHY THIS ARRANGES THE FAULT AT ALL, when the defect was found with nothing listening. The
// recorder in test/e2e/support/journey.js POSTs `/__fixture/reset` before the browser opens and
// throws if it fails, and its live-mode preflight refuses an origin that does not answer. So a spec
// carrying the artifact contract CANNOT have a dead API underneath it. That arm is recorded
// separately, outside the recorder, in lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND/ — against a port
// with nothing bound, the stock modal showed 6 code boxes and the fixed one showed 0. THAT is the
// proof the branch is reached; this spec is what keeps it reached.

const { test, journeyDetails, expect } = require('../support/journey');

const SEND_ENDPOINT = '**/user/sendverificationtoken';

// `mode="out-in"` keeps an outgoing step mounted for the length of its animation, so a DOM read
// taken the instant the modal decides can catch it mid-swap and report the step on its way out.
const TRANSITION_SETTLE_MS = 1200;

test(
  'a verification send that fails leaves the modal on the phone step, saying so',
  journeyDetails({
    journey: 'login-modal-failed-send',
    surface: 'admin',
    capabilities: ['ui.login.failed-send-is-reported'],
    underTest: 'components/molecules/LoginModal.vue#getCode'
  }),
  async ({ page, journey }) => {
    let sendAttempts = 0;
    let reachedTheFixture = 0;
    await page.route(SEND_ENDPOINT, async (route) => {
      sendAttempts += 1;
      // The request is LET THROUGH to the fixture first, and only its ANSWER is dropped.
      //
      // Aborting outright also reproduces the defect, but it makes the run indistinguishable from
      // one whose app was never talking to this fixture at all — and the recorder's wrong-world
      // guard rightly fails a journey the fixture served nothing for, because `reuseExistingServer`
      // can silently adopt somebody else's dev server pointed at a real API. Letting the request
      // land keeps that guard meaningful and honest: this app really is talking to this world. What
      // the browser then experiences — a request that went out and produced no usable answer — is
      // the same axios rejection a dead API produces, which is the path `PostRequest` swallows.
      try {
        await route.fetch();
        reachedTheFixture += 1;
      } catch (e) { /* the fixture's answer is discarded either way */ }
      return route.abort('connectionrefused');
    });

    // The modal driven by this test...
    const modal = page.locator('.login-modal').first();
    const phoneField = modal.locator('.input-wrapper input[type="tel"]');
    // ...and the measurements, taken across EVERY login modal on the page. See the header.
    const anyCodeBox = page.locator('.login-modal .otp-input input');
    const anyError = page.locator('.login-modal .alert--error');

    await journey.step('ask for an admin page while signed out', async () => {
      // `/admin` rather than a deeper admin URL: `initAuth` does not redirect when the path is
      // already `/admin`, so there is no navigation race to lose here.
      await page.goto('/admin');
      await expect(modal).toBeVisible({ timeout: 30000 });
      await expect(phoneField).toBeVisible();
      return 'the login modal is open on the phone step';
    });

    await journey.step('ask for a code, and nothing can carry the request', async () => {
      await phoneField.fill('99999999');
      await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();

      // Wait for the modal to DECIDE something rather than for one particular outcome, so this
      // reads the product's answer instead of presuming it. Before the fix the decision was six
      // boxes; after it, an error. Either settles the poll, and the assertions below say which is
      // correct — a test that waited only for the error would hang for its whole timeout on the
      // broken build and then report the wrong cause.
      await expect
        .poll(async () => (await anyCodeBox.count()) + (await anyError.count()), { timeout: 20000 })
        .toBeGreaterThan(0);
      await page.waitForTimeout(TRANSITION_SETTLE_MS);

      expect(sendAttempts).toBe(1);
      expect(reachedTheFixture).toBe(1);
      return 'the send was attempted once, reached the fixture, and produced no usable answer';
    });

    await journey.step('THE CODE STEP IS NOT REACHED', async () => {
      // The measurement. Six here is the defect, restated: boxes for a code that was never sent.
      await expect(anyCodeBox).toHaveCount(0);
      await expect(phoneField).toBeVisible();
      const modals = await page.locator('.login-modal').count();
      return 'no code input exists in any of the ' + modals + ' login modal(s); the phone field is still on screen';
    });

    await journey.step('and the modal says the code was not sent', async () => {
      await expect(anyError.first()).toBeVisible();
      await expect(anyError.first()).toContainText('kunne ikke sende koden');
      return 'the modal reports the failed send: ' + (await anyError.first().innerText()).trim();
    });
  }
);
