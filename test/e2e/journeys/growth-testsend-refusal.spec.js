// JOURNEY — an administrator is refused a newsletter test-send to an address that IS on their own
// account, because that address has not been confirmed.
//
// ---- THE ONE STATE NOTHING HAD EVER WALKED -----------------------------------------------------
//
// `F-GR-UNCONFIRMED-EMAIL` is an open blocker whose `clears_when` reads: *the test-send binding
// requires a confirmed profile email, and a pin proves an unconfirmed one is refused.* The flag's own
// 2026-08-03 note says step one has delivered (`L-CONFIRM-FAMILY-MERGE`) and **step two is owed** —
// prove the green is real rather than vacuous, the way the callback lane did by mutating its suite
// both ways. This walk is step two at the browser level, and the mutation is recorded beside it.
//
// It is NOT `account-email-confirm` a second time, and the difference is the whole point. That
// journey provokes its refusal while the account holds NO address at all — `email: null`, the state a
// phone signup leaves behind. Four separate causes collapse into that one static 403 (no account, no
// address, an unconfirmed address, an address that is not the typed one), so a refusal met at
// `email: null` is consistent with a guard that never looks at the confirmation flag at all. Delete
// the confirmation clause and that journey stays green from end to end.
//
// This one stands in the ONLY state that distinguishes them: the account holds the address, the
// address typed into the test-send box is character-for-character the address the account screen
// prints, and it is still refused — because nobody has proved anybody reads that mailbox. That is the
// § 15 control, and the address the guard binds to is otherwise a self-asserted field any
// authenticated user can set to any address in one request.
//
// ---- THE OPPOSITE OUTCOME IS IN THE SAME WORLD -------------------------------------------------
//
// A refusal walk that only ever sees a refusal has pinned the one answer its world can produce. So
// the same person, on the same screen, with the same address, is ALLOWED the test-send once the
// confirmation lands — nothing else changes between the two attempts. Both are asserted by value on
// the rendered toast, never on a status code: a 401 challenge and a module refusal are
// indistinguishable by status, and the sentence is what the operator actually meets.
//
// ---- WHAT THIS JOURNEY MAY NOT BE READ AS SAYING -----------------------------------------------
//
// Not that § 15 is closed. The confirmation is six digits with no attempt counter, no lockout on that
// path and no rate limit (`F-CONFIRM-BRUTEFORCE`), and the send-confirmation-code route persists the
// new address BEFORE any code is entered — which this walk drives through and depends on. What is
// shown here is that the confirmation flag is load-bearing on the send path. How hard that flag is to
// obtain is a different lane's subject.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip, flagRow } = require('../support/flags');
const world = require('../fixture/world');

const MODULE_FLAG = 'growth.module';
const FIXTURE_API = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

/**
 * The address Kari Telefon claims. She signed up by phone, so her account holds none when this
 * starts — which is why the address on the account at the moment of the refusal is one this walk
 * caused rather than one the fixture seeded.
 */
const CLAIMED_ADDRESS = 'kari.testsend@fixturekafe.test';

/**
 * The six digits she would have read in her inbox.
 *
 * From NODE, never through the browser: a confirmation code is a credential, and a response the page
 * received would be counted in `backendServed`, could surface in `backendSample`, and would land in a
 * file people paste into reviews (C7). Never returned to a caller that could put it in a step detail.
 */
async function codeFromMailbox (address) {
  const response = await fetch(FIXTURE_API + '/__fixture/confirmation-code?address=' + encodeURIComponent(address));
  const body = await response.json();
  if (!body.code) {
    throw new Error('no confirmation code was ordered for that address — the send never reached the API');
  }
  return body.code;
}

/**
 * One of the newsletter screen's panels, addressed by its OWN heading.
 *
 * Not `filter({ hasText })`: that is a case-insensitive substring match over the whole subtree and
 * «Godkjenning» matches the draft panel too, so two panels resolve and an assertion scoped to one is
 * quietly reading the other's.
 */
function panel (page, heading) {
  return page.locator('.growth-page__panel')
    .filter({ has: page.locator('h2.growth-page__panel-title', { hasText: heading }) });
}

/** Gets the newsletter screen back to the state where the test-send panel is on it. */
async function reopenNewsletter (page) {
  await page.goto('/admin/growth-newsletter');
  await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
  await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });
  await page.locator('.growth-page__select').selectOption({ index: 1 });
}

test(
  'An administrator is refused a test-send to the address on her own account, because it is unconfirmed',
  journeyDetails({
    journey: 'growth-testsend-refusal',
    surface: 'admin',
    capabilities: [
      'platform.feature-flags.write',
      'growth.newsletter.author',
      'growth.newsletter.test-send',
      'growth.newsletter.test-send.requires-confirmed-address',
      'account.email.confirm'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the administrator who signed up by phone', async () => {
      // A full store admin of this venue — she may draft, approve and dispatch. The refusal below is
      // not about authority, and signing in as somebody who lacked it would prove the wrong thing.
      await page.goto('/admin/growth-newsletter');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '90000002', code: '123123', expectPath: '/admin/growth-newsletter' });
      await expect(page.locator('.growth-page__title')).toHaveText('Nyhetsbrev');
      return 'signed in as the phone-signup admin of store ' + world.STORE_ID;
    });

    await journey.step('turn the newsletter module on, so the test route answers at all', async () => {
      // `growth.module` is deny-closed and guards the test route as well as dispatch, so without this
      // the refusal below would be an opaque 404 about the MODULE and would say nothing about the
      // address. Through the switchboard, which is the only caller of that write in the frontend.
      await page.goto('/admin/feature-flags');
      await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });
      // It starts DOWN, and that is asserted rather than assumed: a venue where somebody had already
      // flipped it would make the flip below a no-op and the closing step's «it closes again» would
      // be reversing something this walk never opened.
      await expect(flagRow(page, MODULE_FLAG).locator('.ff-row__badge')).toHaveText('Av');
      await turnOn(page, MODULE_FLAG);
      return MODULE_FLAG + ' on for store ' + world.STORE_ID + ', from «Av»';
    });

    await journey.step('get far enough to have something to test-send', async () => {
      await page.goto('/admin/growth-newsletter');
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });

      const draft = panel(page, 'Nyhetsbrevet');
      await draft.locator('input[type="text"]').fill('Vintermenyen');
      await draft.locator('textarea').first().fill('Ny meny fra desember. Velkommen innom.');
      await draft.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.growth-page__toast--success')).toContainText('Lagret', { timeout: 15000 });

      // The module is on, so the panel is live rather than hinting at a switch. Asserting the hint's
      // ABSENCE here is what rules the flag out as an explanation for everything below.
      const testPanel = panel(page, 'Send deg selv en test');
      await expect(testPanel.locator('.growth-page__hint')).toHaveCount(0);
      await expect(testPanel.locator('input[type="email"]')).toBeEnabled();
      return 'draft saved; the test-send panel is live and not hinting at a switch';
    });

    // ---- PUT AN UNCONFIRMED ADDRESS ON THE ACCOUNT ----------------------------------------------
    await journey.step('reach the account screen through the sidebar, not by typing a URL', async () => {
      // Through the nav (C3). A `page.goto` here would pass identically against a build with no link
      // at all, and the link is what makes the account screen reachable from the room the refusal
      // happens in.
      await page.getByRole('link', { name: 'E-postadressen min' }).click();
      await page.waitForURL(url => url.pathname === '/admin/account-email', { timeout: 30000 });
      await expect(page.locator('.ae-page__title')).toHaveText('E-postadressen din');
      await expect(page.locator('.ae-page__badge')).toHaveText('Ingen adresse registrert');
      return 'on /admin/account-email; the account holds no address at all';
    });

    await journey.step('THE STATE THIS WALK EXISTS FOR: the address is on the account, unconfirmed', async () => {
      // The send-confirmation-code route persists the new address BEFORE any code is entered, which
      // is precisely the property that makes the column self-asserted and precisely the state a guard
      // that checked only equality would wave through.
      await page.locator('.ae-page__field input[type="email"]').fill(CLAIMED_ADDRESS);
      await page.getByRole('button', { name: 'Send bekreftelseskode' }).click();
      await expect(page.locator('.ae-page__panel--code')).toBeVisible({ timeout: 15000 });

      // THE ACCOUNT'S OWN ANSWER, read off the screen rather than assumed: the badge is re-derived
      // from `GET /user`, so this is the row and not the page remembering that it asked.
      await expect(page.locator('.ae-page__badge')).toHaveText('Ikke bekreftet');
      await expect(page.locator('.ae-page__address')).toHaveText(CLAIMED_ADDRESS);

      // AND THE WAY ON IS WITHHELD WHILE IT WOULD LEAD TO ANOTHER REFUSAL. `ae-page__next` is bound
      // to `status === 'confirmed'`, so an administrator standing in exactly this state is not
      // offered a link back to the screen that is about to refuse her. Asserting its absence now is
      // what stops the assertion after the confirmation from being vacuous — and it is the reason
      // the step below walks back through the sidebar instead.
      await expect(page.locator('.ae-page__next')).toHaveCount(0);
      return 'account address set to the claimed one and NOT confirmed; no onward link offered yet';
    });

    await journey.shot('the address on the account, unconfirmed');

    // ---- THE REFUSAL ----------------------------------------------------------------------------
    await journey.step('THE WALL: the test-send is refused to the account\'s OWN address', async () => {
      // BACK THROUGH THE SIDEBAR, because the screen's own onward link is withheld until the address
      // is confirmed — which is the very state this step is about. This is the route an
      // administrator in this position actually has.
      // Substring rather than exact: the sidebar's `isNew` badge is inside the anchor, so this link's
      // accessible name is «Nyhetsbrev Nyhet» and an exact query finds nothing.
      await page.getByRole('link', { name: 'Nyhetsbrev' }).click();
      await page.waitForURL(url => url.pathname === '/admin/growth-newsletter', { timeout: 30000 });
      await reopenNewsletter(page);

      const testPanel = panel(page, 'Send deg selv en test');
      // Still no switch hint. The module is up; the only thing this refusal can be about is the
      // address, and the address is the account's.
      await expect(testPanel.locator('.growth-page__hint')).toHaveCount(0);
      await testPanel.locator('input[type="email"]').fill(CLAIMED_ADDRESS);
      await testPanel.getByRole('button', { name: 'Send test' }).click();

      // BY VALUE, ON THE RENDERED PAGE. Not a status code — a 401 challenge and a module refusal are
      // indistinguishable by status, and the sentence is what the operator meets.
      const toast = page.locator('.growth-page__toast--error');
      await expect(toast).toContainText(
        'En testsending kan bare gå til e-postadressen på din egen konto', { timeout: 15000 });
      // AND IT NAMES THE WAY OUT. A deny-closed refusal that does not is a wall; this clause is what
      // makes it a door, and it names the screen this walk just came from.
      await expect(toast).toContainText('E-postadressen min');
      // NOT A SUCCESS UNDER ANOTHER NAME. The success toast is a different element and it must not
      // exist — a page that rendered both would let a reader take either as the outcome.
      await expect(page.locator('.growth-page__toast--success')).toHaveCount(0);

      // C7, asserted rather than assumed: the refusal renders no address at all. The server's message
      // is static for the same reason, and a client that "helpfully" interpolated the typed value
      // back would undo it.
      const shown = (await toast.textContent()) || '';
      expect(shown).not.toContain(CLAIMED_ADDRESS);
      expect(shown).not.toContain('@');
      return 'refused — the address IS the account\'s, and the confirmation is the only thing missing';
    });

    await journey.shot('the test-send, refused on an unconfirmed address');

    // ---- THE OPPOSITE OUTCOME, IN THE SAME WORLD ------------------------------------------------
    await journey.step('confirm the address, and change nothing else', async () => {
      await page.getByRole('link', { name: 'E-postadressen min' }).click();
      await page.waitForURL(url => url.pathname === '/admin/account-email', { timeout: 30000 });
      await page.locator('.ae-page__field--code input').fill(await codeFromMailbox(CLAIMED_ADDRESS));
      await page.getByRole('button', { name: 'Bekreft adressen' }).click();

      await expect(page.locator('.ae-page__badge')).toHaveText('Bekreftet', { timeout: 15000 });
      await expect(page.locator('.ae-page__address')).toHaveText(CLAIMED_ADDRESS);
      // AND NOW THE WAY ON APPEARS. Withheld four steps ago, offered here — the screen opens the door
      // at the moment there is something on the other side of it.
      await expect(page.locator('.ae-page__next')).toBeVisible();
      // NEITHER THE CODE NOR THE ADDRESS IS LEFT ON SCREEN afterwards, and a screenshot is a file
      // people paste. Returned without either.
      const toastText = (await page.locator('.ae-page__toast--success').textContent()) || '';
      expect(toastText).not.toContain(CLAIMED_ADDRESS);
      return 'the same address, now confirmed; nothing else about this world moved';
    });

    await journey.step('THE SAME SEND, THE SAME PERSON, THE SAME ADDRESS — now allowed', async () => {
      await page.getByRole('link', { name: 'Send deg selv en test av nyhetsbrevet' }).click();
      await page.waitForURL(url => url.pathname === '/admin/growth-newsletter', { timeout: 30000 });
      await reopenNewsletter(page);

      const testPanel = panel(page, 'Send deg selv en test');
      await testPanel.locator('input[type="email"]').fill(CLAIMED_ADDRESS);
      await testPanel.getByRole('button', { name: 'Send test' }).click();

      const toast = page.locator('.growth-page__toast--success');
      // A SUBMISSION STATUS, AND THE SENTENCE SAYS SO. The provider answering "Sent" means it took
      // the handoff; nothing here knows whether anything arrived, and a screen that shortened this to
      // "sent" would be claiming a delivery on the strength of an acknowledgement.
      await expect(toast).toContainText('Leverandøren svarte: Sent', { timeout: 15000 });
      await expect(toast).toContainText('Det er en innsendingsstatus, ikke en leveringsbekreftelse');
      // And the refusal is gone rather than sitting beside it.
      await expect(page.locator('.growth-page__toast--error')).toHaveCount(0);
      return 'accepted for the address that was refused four steps ago; the confirmation is the difference';
    });

    await journey.shot('the same test-send, now allowed');

    // ---- THE FLAG IS LOAD-BEARING TOO, AND THE LEVER GOES BACK DOWN -----------------------------
    await journey.step('put the module switch back down, and the test route closes again', async () => {
      // A second thing this screen must not stop reading. Everything above would be equally green
      // against a panel that had stopped consulting `growth.module`, and the operator whose venue is
      // switched off must be told so in advance rather than left to meet an opaque 404 — a test to
      // your own address is a cheap thing to have refused before you press it.
      //
      // It also leaves the world with no switch lit for whatever runs next.
      await page.goto('/admin/feature-flags');
      await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });
      await flip(page, 'off', MODULE_FLAG);
      await expect(flagRow(page, MODULE_FLAG).locator('.ff-row__badge')).toHaveText('Av');

      await reopenNewsletter(page);
      const testPanel = panel(page, 'Send deg selv en test');
      await expect(testPanel.locator('.growth-page__hint')).toHaveText(
        'Nyhetsbrevmodulen er slått av for denne butikken (growth.module), så testruten svarer ikke. ' +
        'En plattformansvarlig må slå den på.');
      // WITHHELD, not left live to fail. The field and the button are both disabled.
      await expect(testPanel.locator('input[type="email"]')).toBeDisabled();
      await expect(testPanel.getByRole('button', { name: 'Send test' })).toBeDisabled();
      return MODULE_FLAG + ' back to «Av»; the test panel is disabled and says why; no lever left lit';
    });

    await journey.shot('the test route, closed by the module switch');

    await journey.step('what this walk does NOT show, recorded rather than glossed', () => {
      journey.finding('note',
        'the confirmation this walk leans on is six digits a guesser can attack for free',
        'No attempt counter, no lockout on the confirm path, no rate limit, and ' +
        '`UserService.ConfirmEmailAsync` clears the code only on SUCCESS — so a wrong guess costs a ' +
        'guesser nothing and the code survives to be guessed at again until it expires ' +
        '(`F-CONFIRM-BRUTEFORCE`, driven and recorded by `account-email-confirm`). This journey shows ' +
        'the confirmation flag is load-bearing on the send path; it says nothing about how hard that ' +
        'flag is to obtain, and nothing here may be read as saying markedsforingsloven section 15 is ' +
        'closed.');
      journey.finding('note',
        'the refusal proven here is the FIXTURE\'s clause, which stands in for RequireOwnAccountAddressAsync',
        'Every journey in this suite runs against the throwaway Node fixture, so what is shown is ' +
        'that the SCREEN meets a refusal caused by the confirmation flag and renders it as such. The ' +
        'mutation recorded in lanes/L-JOURNEY-GROWTH/ removes exactly that clause from ' +
        '`test/e2e/fixture/growth-newsletter.js` and this walk goes red at the refusal step, which is ' +
        'what makes the assertion falsifiable rather than merely true. Whether the deployed ' +
        '`GrowthNewsletterService` still carries the clause is a backend fact this lane cannot ' +
        'observe; `npm run test:e2e:fixture-divergence` against an OkamAPI checkout is the instrument ' +
        'that answers it.');
      return '2 notes: the confirmation is weak, and this walk proves the fixture clause';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does not
      // work, which is false. The 403 is the refusal this journey provoked on purpose and asserted on
      // screen; the 404 is the module-dark test route at the end; the router's «Navigation cancelled»
      // pair is the admin shell's login redirect racing the storeId append and appears identically in
      // every signed-in journey in this suite.
      const noise = /favicon|Download the Vue Devtools|status of 403|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in account-email-confirm, ' +
          'growth-privacy-queue and the workforce journeys. It is AdminPage\'s login redirect being ' +
          'superseded by the storeId append, not anything on these pages.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the test-send refusal journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' these pages\''
        : 'nothing';
    });
  }
);
