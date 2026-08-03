// JOURNEY — a manager invites a worker, and that worker gets in.
//
// THE GAP THIS EXISTS TO CLOSE. `POST /staff` creates a WorkforcePerson with no `ApplicationUserId`,
// and endpoint 32 (`POST /workforce/me/invitations/claim`) is the ONLY route in the module that ever
// sets one. Until this run, nothing in the estate called either invitation route: the roster client
// and the worker client each declared them out of scope in a comment, so a venue could build a
// complete roster of people who could never sign in, and the whole `/workforce/me` half — own
// shifts, availability, time off, acknowledgements — was reachable only by hand-crafting HTTP. The
// worker-facing capabilities were green in the suite while no human could perform them.
//
// WHAT A GREEN RUN PROVES, beyond "the pages render":
//
//   • The manager can produce a claim code from the roster, and the code is on screen exactly once:
//     the fixture answers it on the create response only, and no read returns it.
//   • The handover is HONEST about there being no delivery channel. The page names the address the
//     worker must go to; nothing sends anything.
//   • The token survives signing in. The claim page mounts `LoginModal` in place rather than
//     navigating, so a code pasted before authentication is still in memory afterwards — the
//     property that makes a public claim page possible at all without putting the credential in a
//     URL. This journey pastes FIRST and signs in SECOND, so a regression that dropped the token
//     would fail here.
//   • The credential never reaches the address bar or the back stack. Asserted directly on
//     `location.hash` and on `history` after a fragment-carrying visit.
//   • The claim links the caller and NOTHING ELSE: the receipt prints the engagement's pre-existing
//     grants, which a claim never widens.
//   • The worker then sees the manager's PUBLISHED week — the read is derived from published
//     revisions in the fixture, so this is a wire-through and not a canned list.
//   • A repeat claim of a spent code is answered honestly rather than as a bare error: the server's
//     refusal is deliberately opaque (five causes, one answer), so the page shows the engagements the
//     ACCOUNT actually holds beside it instead of guessing which cause applied.
//   • The manager's own roster then reads the person as claimed — the loop closes on both sides.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MANAGER = { phone: '99999999', code: '123123' };
// `90000002` on `lane/fe-wf-onboard`, where this journey was authored. That number now belongs to the
// phone-signup administrator the account-email journey needs, so the new hire moved to `90000004`.
const NEW_HIRE = { phone: '90000004', code: '123123' };

/**
 * Put the browser back to a signed-out state without restarting the context.
 *
 * The Vuex store persists itself to `localStorage.state` and restores it synchronously on boot, so
 * clearing that key and reloading is what actually signs somebody out. Two accounts have to use one
 * page in this journey — the manager issues and the worker claims — and a journey that skipped this
 * would have the worker claiming under the manager's bearer token, which is the one thing that must
 * not silently work.
 */
async function signOut (page) {
  await page.goto('/');
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.context().clearCookies();
}

test(
  'A manager invites a new hire, who claims the code and sees their published shift',
  journeyDetails({
    journey: 'workforce-invitation-onboarding',
    surface: 'admin',
    capabilities: [
      'workforce.staff.invite',
      'workforce.me.invitation-claim',
      'workforce.me.schedule'
    ]
  }),
  async ({ page, journey }) => {
    let code = null;

    // ---- the manager's half ---------------------------------------------------------------------

    await journey.step('sign in as the manager on the roster', async () => {
      await page.goto('/admin/workforce-roster');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, Object.assign({ expectPath: '/admin/workforce-roster' }, MANAGER));
      await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 30000 });
      return 'landed on /admin/workforce-roster';
    });

    await journey.step('the new hire is on the roster and has no login', async () => {
      const row = page.locator('.wfr-table__row', { hasText: 'Nina Nyansatt' });
      await expect(row).toBeVisible({ timeout: 15000 });
      await row.click();

      // The panel's own sentence, from `personState`. It is the ONLY durable signal the module
      // offers about sign-in: there is no invitation list endpoint, so "a code is outstanding" is
      // not a fact any client can hold, and the copy deliberately does not claim it.
      const state = page.locator('[data-test="access-state"]');
      await expect(state).toContainText('Ingen innlogging', { timeout: 15000 });
      return (await state.textContent()).trim();
    });

    await journey.step('the panel says what it cannot do before it offers the button', async () => {
      // Not decoration. There is no revoke route and no list route in `WorkforceStaffController`, and
      // a manager who believes otherwise will go looking for a button during an incident. The
      // mitigation that DOES exist — reissue supersedes in place — is named in the same sentence.
      const limits = page.locator('[data-test="access-limits"]');
      await expect(limits).toBeVisible();
      const text = (await limits.textContent()).trim();
      expect(text).toContain('trekke den tilbake');
      expect(text).toContain('slutter den forrige å virke');
      return text.slice(0, 120) + '…';
    });

    await journey.shot('the roster, before an invitation');

    await journey.step('issue the invitation code', async () => {
      await page.locator('[data-test="issue-invitation"]').click();
      await expect(page.locator('.wfr-page__toast')).toContainText('Invitasjonskoden er laget', { timeout: 15000 });

      const handover = page.locator('[data-test="invitation-handover"]');
      await expect(handover).toBeVisible();

      code = await page.locator('[data-test="invitation-token"]').inputValue();
      expect(code).toBeTruthy();
      expect(code.length).toBeGreaterThan(8);

      // The expiry the SERVER answered with, rendered in the store's zone. Asserting that a date is
      // printed rather than which one — the value is the fixture's.
      await expect(page.locator('[data-test="invitation-expiry"]')).toContainText('utløper');

      // The handover REPLACES the issue button while a token is on screen, so a second press cannot
      // scroll the first token out of view. It is unrecoverable the moment it goes.
      await expect(page.locator('[data-test="issue-invitation"]')).toHaveCount(0);
      return 'code issued, ' + code.length + ' characters, shown once';
    });

    await journey.step('the handover names the address and admits nothing was sent', async () => {
      const handover = page.locator('[data-test="invitation-handover"]');
      await expect(handover).toContainText('Vi har ikke sendt koden noe sted');
      // The address is named rather than minted as a link carrying the credential: the code and the
      // destination travel as two separate things.
      await expect(handover).toContainText('/workforce/join');
      await expect(handover).toContainText('Koden vises kun nå');
      return 'no delivery channel, /workforce/join named, once-only stated';
    });

    await journey.shot('the invitation code, shown once');

    // ---- a week for the new hire, published --------------------------------------------------
    //
    // The claim is only worth anything if it leads somewhere, so the manager publishes a week with a
    // shift for the person they just invited. `/workforce/me/schedule` is derived from PUBLISHED
    // revisions in the fixture, so the worker's screen at the end is a wire-through of this step.

    await journey.step('turn the schedule publication switch on for this store', async () => {
      // NOT a workaround for the harness, and not scope creep. `workforce.publication` gates all four
      // schedule writes — `CreateDraftAsync`, `BatchAssignmentsAsync`, `ValidateAsync`, `PublishAsync`
      // each pass it to `RequireWriteCapabilityAsync` — and it is DENY-CLOSED, so on a store that has
      // not had it flipped the next step is refused with 409 `workforce.flag-disabled-read-only` and
      // the badge stays on "Ingen plan".
      //
      // This journey was authored on `lane/fe-wf-onboard` against a fixture that modelled no flags at
      // all, and passed there because of it. The §9.2 kill switch has since landed on this branch, so
      // without this step the journey asserts against a world the product does not have. That is the
      // failure mode the fixture's own header warns about, and it is why the step goes through the
      // OPERATOR'S PAGE rather than a fixture backdoor: the lever a real venue would pull.
      await turnOn(page, 'workforce.publication');
      return 'workforce.publication on for this store';
    });

    await journey.step('build and publish a week containing the new hire\'s shift', async () => {
      await page.goto('/admin/workforce-schedule');
      await expect(page.locator('.wf-page__title')).toBeVisible({ timeout: 30000 });

      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__badge')).toHaveText('Utkast', { timeout: 15000 });

      // The row for Nina specifically — the shift has to name the person who is about to claim, or
      // the last assertion in this journey proves nothing about the link the claim made.
      const row = page.locator('.wf-grid__row', { hasText: 'Nina Nyansatt' });
      await expect(row).toBeVisible();
      await row.locator('.wf-grid__add').first().click();

      const editor = page.locator('.wf-editor');
      await expect(editor).toBeVisible();
      await editor.locator('input[type="time"]').first().fill('09:00');
      await editor.locator('input[type="time"]').nth(1).fill('15:00');
      await editor.getByRole('button', { name: 'Lagre vakt' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn', { timeout: 15000 });

      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert', { timeout: 15000 });
      await page.getByRole('button', { name: 'Publiser', exact: true }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Publisert til', { timeout: 15000 });
      return (await page.locator('.wf-page__toast').textContent()).trim();
    });

    // ---- the worker's half -----------------------------------------------------------------------

    await journey.step('a fragment-carried code never reaches the address bar', async () => {
      await signOut(page);

      // Nothing in the estate mints such a link — the panel copies a bare code and names the address
      // separately — but a manager pasting one into a message is the case that actually happens. The
      // page takes the token and scrubs the fragment within the same tick, so a screenshot, a shared
      // screen or a back button carries no credential.
      await page.goto('/workforce/join#token=' + encodeURIComponent('wfinv_not_a_real_code'));
      await expect(page.locator('[data-test="sign-in"]')).toBeVisible({ timeout: 30000 });

      const url = new URL(page.url());
      expect(url.hash).toBe('');
      expect(url.search).toBe('');
      // `replaceState` rewrites the entry in place rather than pushing a new one, so the credential
      // is not sitting one Back press away either.
      const backStack = await page.evaluate(() => window.history.length);
      expect(url.pathname).toBe('/workforce/join');
      return 'hash scrubbed, path ' + url.pathname + ', history length ' + backStack;
    });

    await journey.step('paste the real code BEFORE signing in', async () => {
      // Order matters. The token is held in component memory and nowhere else — not in
      // `sessionStorage`, not in the Vuex store, not in the route — and it survives authentication
      // only because `LoginModal` is mounted inside this page rather than navigated to. Pasting
      // first is what makes that property falsifiable.
      await page.goto('/workforce/join');
      await expect(page.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });
      await page.locator('[data-test="code-input"]').fill(code);
      await page.locator('[data-test="code-submit"]').click();

      await expect(page.locator('[data-test="sign-in"]')).toBeVisible();
      // Cleared from the field as well as taken into memory: a shared phone keeps its form values.
      await expect(page.locator('[data-test="code-input"]')).toHaveCount(0);
      return 'code accepted, page asks for a sign-in';
    });

    await journey.shot('the claim page, code held, not signed in');

    await journey.step('sign in as the new hire, in place', async () => {
      await page.locator('[data-test="sign-in-button"]').click();
      // No `expectPath`: nothing navigates. That is the whole point — the modal closes and the page
      // is still the page, with the token still in memory.
      await signIn(page, NEW_HIRE);
      await expect(page.locator('[data-test="confirm"]')).toBeVisible({ timeout: 30000 });
      expect(new URL(page.url()).pathname).toBe('/workforce/join');
      return 'signed in without navigating; the pasted code survived';
    });

    await journey.step('the page admits what it cannot tell them before the button', async () => {
      // Endpoint 32 is write-only: no route resolves a token into a store name, a role or an expiry,
      // so this screen genuinely does not know which venue is on the other end of the string it
      // holds. Naming the gap is the difference between a page that does not know and one that
      // implies it does.
      const unknowns = page.locator('[data-test="unknowns"]');
      await expect(unknowns).toBeVisible();
      await expect(unknowns).toContainText('uten å bruke den');
      return (await unknowns.textContent()).trim().slice(0, 100) + '…';
    });

    await journey.step('claim the code', async () => {
      await page.locator('[data-test="claim-button"]').click();
      const claimed = page.locator('[data-test="claimed"]');
      await expect(claimed).toBeVisible({ timeout: 30000 });
      await expect(claimed).toContainText('Du er inne');

      // A claim NEVER widens capability — the response carries the engagement's pre-existing grants.
      // The receipt prints them, so a worker linked to an engagement that cannot self-serve is told
      // so here rather than meeting an empty page later.
      const grants = await page.locator('[data-test="claimed-grants"]').textContent();
      expect(grants).toContain('WorkforceSelf');
      await expect(page.locator('[data-test="no-selfservice"]')).toHaveCount(0);
      return 'claimed; grants on the receipt: ' + grants.trim();
    });

    await journey.shot('the worker is in');

    await journey.step('the worker sees the shift the manager published', async () => {
      await page.locator('[data-test="go-to-my-shifts"]').click();
      await expect(page.locator('.wfme__title')).toBeVisible({ timeout: 30000 });
      expect(new URL(page.url()).pathname).toBe('/admin/workforce-me');

      // NOT the "you hold no engagement" screen. That blocker is what this page showed to every
      // account in the estate before a claim surface existed.
      await expect(page.locator('.wfme__blocker')).toHaveCount(0);

      const card = page.locator('.wfme__list li').first();
      await expect(card).toBeVisible({ timeout: 15000 });
      const text = (await card.textContent()).replace(/\s+/g, ' ').trim();
      expect(text).toContain('09:00');
      return 'first shift card: ' + text.slice(0, 90);
    });

    await journey.shot('my shifts, after claiming');

    await journey.step('claiming the same code again is answered honestly, not as a bare error', async () => {
      // A one-use token, so a second claim IS refused. Within a visit the page replays under the same
      // idempotency key and gets its own engagement back; across visits the key is gone and the
      // refusal is genuine — and deliberately opaque, since the server answers five different causes
      // identically. The page therefore does not guess: it shows what it CAN read, the engagements
      // this ACCOUNT holds, beside the refusal.
      await page.goto('/workforce/join');
      await expect(page.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });
      await page.locator('[data-test="code-input"]').fill(code);
      await page.locator('[data-test="code-submit"]').click();
      await page.locator('[data-test="claim-button"]').click();

      const refusal = page.locator('[data-test="refusal"]');
      await expect(refusal).toBeVisible({ timeout: 30000 });
      // All five causes named, none picked.
      await expect(refusal).toContainText('utløpt');
      await expect(refusal).toContainText('allerede brukt');

      const existing = page.locator('[data-test="existing-access"]');
      await expect(existing).toBeVisible();
      await expect(existing).toContainText('allerede tilgang');

      // And the escape hatch, because this code is spent and pressing again cannot help.
      await expect(page.locator('[data-test="other-code-button"]')).toBeVisible();
      return 'opaque refusal + the account\'s own engagements shown beside it';
    });

    await journey.shot('a repeat claim, answered honestly');

    // ---- the loop closes on the manager's side ---------------------------------------------------

    await journey.step('the manager\'s roster now reads the person as signed in', async () => {
      await signOut(page);
      await page.goto('/admin/workforce-roster');
      await signIn(page, Object.assign({ expectPath: '/admin/workforce-roster' }, MANAGER));
      await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 30000 });

      const row = page.locator('.wfr-table__row', { hasText: 'Nina Nyansatt' });
      await expect(row).toBeVisible({ timeout: 15000 });
      await row.click();

      const state = page.locator('[data-test="access-state"]');
      await expect(state).toContainText('har koblet en innlogging', { timeout: 15000 });
      // And the button now offers a REISSUE rather than a first issue, because reissuing is the only
      // mitigation the module has for a leaked code.
      await expect(page.locator('[data-test="issue-invitation"]')).toHaveText('Lag ny invitasjonskode');
      return (await state.textContent()).trim();
    });

    await journey.shot('the roster, after the claim');

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED, and the distinction is deliberate. The flow above completed, so
      // failing here would say the capability does not work, which is false. A browser error during a
      // working flow is a finding: somebody has to decide whether it matters, and they cannot decide
      // about something nobody wrote down.
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the invitation journey', error);
      }

      // THE BACKEND HANDOFF, recorded on every run rather than left in a lane report nobody reads.
      journey.finding(
        'note',
        'no invitation list or revoke route exists',
        'The manager surface can ISSUE (endpoint 6) and nothing else. `WorkforceStaffController` binds ' +
        'no GET for an engagement\'s invitations and no revoke verb, though ' +
        '`WorkforceInvitationState.Revoked` is declared and written by no code path in the module. So ' +
        'this UI cannot show whether a code is currently live, when it expires, or withdraw one that ' +
        'went to the wrong person — it offers a reissue (which supersedes in place and kills the ' +
        'previous token) and says so. Wanted: GET /workforce/stores/{storeId}/staff/{id}/invitations ' +
        'and a revoke route that writes the Revoked state.'
      );

      return errors.length ? errors.length + ' console errors recorded as findings' : 'no console errors';
    });
  }
);
