// JOURNEY — an administrator who signed up by PHONE is refused a newsletter test-send, confirms an
// address from an admin screen, and is then allowed the test-send.
//
// ---- WHAT THIS EXISTS TO SETTLE ----------------------------------------------------------------
//
// `GrowthNewsletterService.RequireOwnAccountAddressAsync` binds a test-send to the acting
// administrator's own account address AND requires that address to be CONFIRMED. That closed a
// markedsføringsloven § 15 hole — a test-send was the one Growth path that put marketing content in
// front of a mailbox with no consent record behind it and no recipient it could name.
//
// The refusal is deny-closed: an administrator with no confirmed address cannot test-send at all.
// That was ruled defensible BECAUSE confirming is a live product path. It is — `POST
// /user/send-email-confirmation-code` then `POST /user/confirm-email`, both real, both exposed in
// the shared client. But the only UI CALL SITE for either in the whole estate was the consumer app
// (`ConsumerApp/src/components/molecules/EmailSetting.vue`). Neither admin surface called them, so a
// phone-signup administrator's way out of an admin refusal was to install the consumer app or to
// curl the API. `/admin/account-email` is the missing call site, and this journey is the evidence
// that the door now opens from the room the refusal happens in.
//
// ---- WHY KARI AND NOT MARIT --------------------------------------------------------------------
//
// The fixture manager's address is confirmed, and `growth-newsletter-send-gate` test-sends to it. A
// journey that flipped her would have proved this one at the cost of that one. Kari Telefon is a
// third identity: a full store admin of the same store, with `email: null` — which is what signing
// up with a phone number leaves behind, and the state the guard refuses first.
//
// ---- THE ORDER IS THE ARGUMENT -----------------------------------------------------------------
//
// The refusal is provoked BEFORE the confirmation, on the same address, from the same screen, by the
// same person. Without that, "she can test-send" is a sentence about a fixture that might have
// allowed it all along — the assertion could not fail. With it, one thing changed between the two
// attempts, and it is the thing this lane built.
//
// ---- WHAT THIS JOURNEY MAY NOT BE READ AS SAYING -----------------------------------------------
//
// Not that § 15 is closed. The confirmation is six digits with no attempt counter, no lockout on
// that path and no rate limit, and `UserService.ConfirmEmailAsync` clears the code only on SUCCESS —
// so a wrong guess costs a guesser nothing and the code survives to be guessed at again. This
// journey makes the confirmation REACHABLE and asserts nothing about its strength; it drives the
// wrong-guess case precisely so the artifact records that the code survived it.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');
const world = require('../fixture/world');

const MODULE_FLAG = 'growth.module';
const FIXTURE_API = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

/** The address Kari is about to claim. Not on her account when this journey starts. */
const NEW_ADDRESS = 'kari.telefon@fixturekafe.test';

/**
 * The six digits Kari would have read in her inbox.
 *
 * Fetched from Node, never through the browser: the code is a credential, and a response the page
 * received would be counted in `backendServed` and could surface in `backendSample` — i.e. in the
 * artifact (C7). It is also never returned to a caller that would put it in a step `detail`.
 *
 * This is an INPUT, not an expectation. Nothing below asserts that the code is right; what is
 * asserted is what the product does when it is given, which is the only part the product decides.
 */
async function codeFromMailbox (address) {
  const response = await fetch(FIXTURE_API + '/__fixture/confirmation-code?address=' + encodeURIComponent(address));
  const body = await response.json();
  if (!body.code) {
    throw new Error('no confirmation code was ordered for that address — the send never reached the API');
  }
  return body;
}

function panel (page, heading) {
  return page.locator('.growth-page__panel')
    .filter({ has: page.locator('h2.growth-page__panel-title', { hasText: heading }) });
}

test(
  'A phone-signup administrator is refused a test-send, confirms her address from admin, and is then allowed it',
  journeyDetails({
    journey: 'account-email-confirm',
    surface: 'admin',
    capabilities: [
      'account.email.confirm',
      'account.email.reachable-from-admin',
      'growth.newsletter.test-send'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the administrator who signed up by phone', async () => {
      await page.goto('/admin/growth-newsletter');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '90000002', code: '123123', expectPath: '/admin/growth-newsletter' });
      await expect(page.locator('.growth-page__title')).toHaveText('Nyhetsbrev');
      return 'signed in as the phone-signup admin, on /admin/growth-newsletter';
    });

    await journey.step('turn the newsletter module on, so the test route answers at all', async () => {
      // Through the switchboard, not seeded. `growth.module` is deny-closed and gates the test-send
      // route as well as the dispatch route, so without this the refusal below would be an opaque
      // 404 about the MODULE and would say nothing about the address.
      await turnOn(page, MODULE_FLAG);
      return MODULE_FLAG + ' on for store ' + world.STORE_ID;
    });

    await journey.step('get far enough to have something to test-send', async () => {
      await page.goto('/admin/growth-newsletter');
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });

      const draft = panel(page, 'Nyhetsbrevet');
      await draft.locator('input[type="text"]').fill('Høstmenyen');
      await draft.locator('textarea').first().fill('Ny meny fra oktober. Velkommen innom.');
      await draft.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.growth-page__toast--success')).toContainText('Lagret', { timeout: 15000 });
      return 'draft saved; the test-send panel is on screen';
    });

    // ---- THE REFUSAL ----------------------------------------------------------------------------
    await journey.step('THE WALL: she is refused a test-send to the very address she is about to claim', async () => {
      const testPanel = panel(page, 'Send deg selv en test');
      // The module is on, so this refusal is about the ADDRESS and not about the switch. Asserting
      // the hint is absent first is what rules the other explanation out.
      await expect(testPanel.locator('.growth-page__hint')).toHaveCount(0);
      await testPanel.locator('input[type="email"]').fill(NEW_ADDRESS);
      await testPanel.getByRole('button', { name: 'Send test' }).click();

      const toast = page.locator('.growth-page__toast--error');
      await expect(toast).toContainText(
        'En testsending kan bare gå til e-postadressen på din egen konto', { timeout: 15000 });
      // AND THE SENTENCE NAMES THE WAY OUT. A deny-closed refusal that does not is a wall; this is
      // the clause that makes it a door, and it names the screen the rest of this journey walks.
      await expect(toast).toContainText('E-postadressen min');

      // C7, asserted rather than assumed: the refusal renders no address at all — not the typed one,
      // not any other. The backend's message is static for the same reason, and a client that
      // "helpfully" interpolated the value back would undo it.
      const shown = (await toast.textContent()) || '';
      expect(shown).not.toContain(NEW_ADDRESS);
      expect(shown).not.toContain('@');
      return 'refused: growth.test_address_not_own, and the sentence names the remedy';
    });

    await journey.shot('the test-send, refused');

    // ---- THE DOOR -------------------------------------------------------------------------------
    await journey.step('reach the remedy THROUGH THE SIDEBAR, not by typing a URL', async () => {
      // THE POINT OF THE WHOLE LANE (C3). A page reachable only by typing its path is the defect this
      // change exists to remedy, so the journey navigates the way a person does: it clicks the link
      // in the nav. A `page.goto` here would pass identically against a build with no link at all.
      await page.getByRole('link', { name: 'E-postadressen min' }).click();
      await page.waitForURL(url => url.pathname === '/admin/account-email', { timeout: 30000 });
      await expect(page.locator('.ae-page__title')).toHaveText('E-postadressen din');
      return 'navigated from the sidebar to /admin/account-email';
    });

    await journey.step('the screen states the account has no address, rather than an empty box', async () => {
      await expect(page.locator('.ae-page__badge')).toHaveText('Ingen adresse registrert');
      await expect(page.locator('.ae-page__status-body')).toHaveText(
        'Kontoen har ingen e-postadresse. Det er det vanlige når du har registrert deg med telefonnummer.');
      // No code step yet: a code box standing open on a screen nobody has requested a code from
      // invites guessing at one. Its absence now is what makes its arrival below an event.
      await expect(page.locator('.ae-page__panel--code')).toHaveCount(0);
      return 'status "Ingen adresse registrert"; no code step yet';
    });

    await journey.step('a malformed address is refused HERE rather than 500ing at the server', async () => {
      // The server parses with `MailboxAddress.Parse`, which throws a MimeKit `ParseException` that
      // `UserController` does not catch — so a typo used to come back as an unhandled 500. Refused
      // in the browser, this screen's user never provokes it.
      await page.locator('.ae-page__field input[type="email"]').fill('kari.telefon@');
      await page.getByRole('button', { name: 'Send bekreftelseskode' }).click();
      await expect(page.locator('.ae-page__error')).toHaveText(
        'Dette ser ikke ut som en e-postadresse. Ingenting ble sendt.');
      // NOTHING WAS SENT, and that is the half worth asserting: a refusal that still fired the
      // request would have set the address on the account on its way to the 500.
      const mailbox = await fetch(FIXTURE_API + '/__fixture/confirmation-code?address=' + encodeURIComponent('kari.telefon@'))
        .then(r => r.json());
      expect(mailbox.ordered).toBe(0);
      return 'refused client-side; no code was ordered';
    });

    await journey.step('ask for a code, and read what the screen is willing to claim', async () => {
      await page.locator('.ae-page__field input[type="email"]').fill(NEW_ADDRESS);
      await page.getByRole('button', { name: 'Send bekreftelseskode' }).click();
      await expect(page.locator('.ae-page__panel--code')).toBeVisible({ timeout: 15000 });

      // WHAT IT DOES NOT SAY. The service hands the mail to a task it does not await and answers
      // before the provider has been asked, so "we sent you a code" would be a delivery claim built
      // from a response containing no delivery. The screen says the code was ORDERED and says we do
      // not get to know whether it arrived.
      await expect(page.locator('.ae-page__notice')).toHaveText(
        'Koden er bestilt. Vi får ikke vite om e-posten kom fram, så kommer den ikke innen et par ' +
        'minutter: send en ny.');
      // And the account now holds the address, unconfirmed — setting an address un-confirms it.
      await expect(page.locator('.ae-page__badge')).toHaveText('Ikke bekreftet');
      return 'code ordered; account address set and NOT confirmed';
    });

    await journey.shot('the code step, with what the screen will and will not claim');

    await journey.step('a WRONG code is refused — and the artifact records what that costs a guesser', async () => {
      const mailbox = await codeFromMailbox(NEW_ADDRESS);
      // A wrong guess derived from the real one, so it cannot accidentally BE the real one.
      const wrong = String((Number(mailbox.code) + 1) % 1000000).padStart(6, '0');
      await page.locator('.ae-page__field--code input').fill(wrong);
      await page.getByRole('button', { name: 'Bekreft adressen' }).click();
      await expect(page.locator('.ae-page__error')).toHaveText(
        'Koden ble ikke godtatt. Sjekk sifrene, eller be om en ny kode.');
      await expect(page.locator('.ae-page__badge')).toHaveText('Ikke bekreftet');

      // THE CODE SURVIVED THE WRONG GUESS. Asserted against the mailbox rather than inferred, and
      // recorded as a finding rather than passed over: this is what makes the confirmation
      // brute-forceable, and this screen makes it REACHABLE without making it STRONG.
      const after = await codeFromMailbox(NEW_ADDRESS);
      expect(after.ordered).toBe(mailbox.ordered);
      journey.finding('defect',
        'a wrong confirmation code costs the guesser nothing',
        'Six digits, no attempt counter, no lockout on this path, no rate limit — and ' +
        '`UserService.ConfirmEmailAsync` clears `EmailConfirmationCode` only on SUCCESS, so the ' +
        'code is still live after a wrong guess and can be guessed at again until it expires ' +
        '(15 minutes). Driven and confirmed here against the fixture, which models that clause ' +
        'deliberately. This screen makes the confirmation reachable; it does not make it strong, ' +
        'and nothing in this lane may be read as saying markedsforingsloven section 15 is closed. ' +
        'The limits are a separate lane\'s subject.');
      return 'wrong code refused; the code is still outstanding afterwards';
    });

    await journey.step('confirm the address with the code from the mailbox', async () => {
      const mailbox = await codeFromMailbox(NEW_ADDRESS);
      await page.locator('.ae-page__field--code input').fill(mailbox.code);
      await page.getByRole('button', { name: 'Bekreft adressen' }).click();

      await expect(page.locator('.ae-page__toast--success')).toHaveText('Adressen er bekreftet.', { timeout: 15000 });
      // THE BADGE IS THE ACCOUNT ANSWERING, not the page remembering that it asked: `confirmCode`
      // re-reads `GET /user` rather than setting the flag locally, which is why this assertion is
      // about the server and not about optimism.
      await expect(page.locator('.ae-page__badge')).toHaveText('Bekreftet');
      await expect(page.locator('.ae-page__address')).toHaveText(NEW_ADDRESS);
      // The code step closes: there is nothing outstanding to confirm.
      await expect(page.locator('.ae-page__panel--code')).toHaveCount(0);
      // NEITHER THE CODE NOR ANYTHING LIKE IT IS ON SCREEN afterwards, and the toast carries no
      // address. A confirmation code is a credential and a screenshot is a file people paste.
      const toastText = (await page.locator('.ae-page__toast--success').textContent()) || '';
      expect(toastText).not.toContain(mailbox.code);
      expect(toastText).not.toContain(NEW_ADDRESS);
      // Returned WITHOUT the code — a step `detail` is written into the artifact.
      return 'confirmed; the badge is the account\'s answer, and no credential is rendered';
    });

    await journey.shot('the address, confirmed');

    // ---- THE EXIT -------------------------------------------------------------------------------
    await journey.step('the screen offers the way on, and it goes where it says', async () => {
      await page.getByRole('link', { name: 'Send deg selv en test av nyhetsbrevet' }).click();
      await page.waitForURL(url => url.pathname === '/admin/growth-newsletter', { timeout: 30000 });
      return 'followed the on-screen link back to the newsletter';
    });

    await journey.step('THE SAME test-send, by the SAME person, to the SAME address — now accepted', async () => {
      // Nothing else changed: same store, same module flag, same address, same administrator. The
      // only difference between this and the refusal at the top of the journey is that the account
      // now holds a CONFIRMED address, which is the whole capability this lane built.
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });
      await page.locator('.growth-page__select').selectOption({ index: 1 });

      const testPanel = panel(page, 'Send deg selv en test');
      await testPanel.locator('input[type="email"]').fill(NEW_ADDRESS);
      await testPanel.getByRole('button', { name: 'Send test' }).click();

      const toast = page.locator('.growth-page__toast--success');
      // A SUBMISSION STATUS AND THE SENTENCE SAYS SO — the same honesty the newsletter screen owes
      // everywhere else. Accepting the handoff is not delivering the mail.
      await expect(toast).toContainText('Leverandøren svarte: Sent', { timeout: 15000 });
      await expect(toast).toContainText('Det er en innsendingsstatus, ikke en leveringsbekreftelse');
      return 'test-send accepted for the address she just confirmed';
    });

    await journey.shot('the test-send, now allowed');

    await journey.step('what the browser said while this ran', () => {
      // The 403 is the refusal this journey provoked on purpose and asserted on screen; the router's
      // «Navigation cancelled» pair is the admin shell's login redirect racing the storeId append and
      // appears identically in every signed-in journey in this suite. Both are excluded by name so a
      // reader is not sent hunting through this page for either.
      const noise = /favicon|Download the Vue Devtools|status of 403/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the account-email confirmation journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });

    await journey.step('the half this lane did NOT close, recorded rather than glossed', () => {
      journey.finding('note',
        'the confirmation send is fire-and-forget, so a mail failure is invisible to everybody',
        '`UserService.SendEmailConfirmationCodeAsync` hands the send to `FireAndForgetTask.Run` and ' +
        'returns true without waiting, so a provider rejection is swallowed and the caller cannot ' +
        'tell an ordered code from a delivered one. Fixed only on the SCREEN here — the copy says ' +
        'the code was ordered and that we do not learn whether it arrived, and offers a resend — ' +
        'because the swallow itself is in OkamAPI, which this lane may not write to.');
      journey.finding('note',
        'a malformed address still throws unhandled at the server for any caller but this screen',
        '`MailboxAddress.Parse` raises a MimeKit `ParseException` inside ' +
        '`SendEmailConfirmationCodeAsync`, and `UserController.SendEmailConfirmationCode` catches ' +
        'only `AppException` — so it escapes as an unhandled 500 rather than a refusal. This ' +
        'screen validates the shape before calling, which closes it for its own user and for ' +
        'nobody else. The server-side refusal is still owed and belongs to a backend lane.');
      return '2 notes: both silent-failure halves that live in OkamAPI';
    });
  }
);
