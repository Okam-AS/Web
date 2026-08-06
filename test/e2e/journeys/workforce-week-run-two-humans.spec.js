// JOURNEY — a manager publishes a week and a DIFFERENT HUMAN acknowledges it, in one world.
//
// ---- WHY THIS ONE EXISTS ----------------------------------------------------------------------
//
// Every module whose value is two people talking has been unwalkable live, because a live world
// could only hold ONE person. `test/e2e/scripts/live-world.sh` signs its manager in through
// `AppSettings.DemoPhoneNumber` — one of exactly two no-SMS sign-ins this application has — and every
// live journey on this branch is therefore that one account doing everything. `workforce-schedule-publish`
// publishes to recipients nobody can be; `workforce-invitation-onboarding` has two identities and is
// `@fixture`, so its second human exists only inside `test/e2e/fixture/`.
//
// This journey is the first live capture in which the account that PUBLISHES and the account that
// ACKNOWLEDGES are different accounts, proven from the ids the app itself holds rather than from the
// credentials typed (see the `signedInUserId` assertion in step 8).
//
// ---- THE SECOND DOOR IS PRODUCTION'S OWN LEVER, NOT A HARNESS INVENTION -----------------------
//
// `Controllers/UserController.cs:178-179` has TWO no-SMS branches: the demo pair, and
// `AppSettings:AdminUserPhoneNumber` / `AppSettings:PowerUserVerificationCode`. The second one ships
// with a PLACEHOLDER phone (`appsettings.json:13` is the sentence "Set in Azure"), which
// `AddIdentityConfiguration`'s `AllowedUserNameCharacters = "+0123456789"` cannot store as an account
// name — so the door exists and its key is simply held outside the repository. Setting that key at API
// launch is what an Azure deployment does; `live-world.sh:346-349` launches `dotnet run` from the
// caller's environment, so an exported `AppSettings__AdminUserPhoneNumber` reaches
// `AddEnvironmentVariables()` with no edit to any script.
//
// `POST /User/sendverificationtoken` (`:209`) skips the SMS send for the power-user number exactly as
// it does for the demo number, so the BROWSER's own two-step sign-in works through both doors.
//
// THE POWER-USER DOOR GOES ON THE MANAGER AND THE DEMO DOOR ON THE WORKER, and the allocation is
// load-bearing rather than arbitrary. `PowerUserRoleSeed.EnsureConfiguredAdminHoldsRoleAsync` grants
// `PowerUserRole` when that account is issued its first token, and
// `Authorization/StoreAdminAuthorizationHandler.cs:17` succeeds `StoreAdminRequirement` for ANY store
// on that role. On a WORKER that would silently make "a worker cannot reach the manager's pages"
// false. On the manager it only over-determines an authorisation the seed already granted by
// membership. The worker's own screen is unaffected either way: `StoreService.GetUserRoles` builds
// `adminIn` from `StoreAdmins` rows alone, so the demo account still resolves as a plain worker and
// `/admin/workforce-me` is reached through `allow-non-admin` rather than through any admin right.
//
// NEITHER HALF OF THAT PAIR IS IN THIS FILE, IN THE ARTIFACT, OR IN A SCREENSHOT (C7). Both are
// generated at run time by the operator standing the world up and handed to this journey through
// `E2E_MANAGER_PHONE` / `E2E_MANAGER_CODE`. The committed power-user code is a live credential under
// rotation (`F-POWERUSER-CODE-IS-COMMITTED`) and is deliberately NOT the value this journey uses.
//
// ---- THE THIRD IDENTITY THAT IS NOT MANUFACTURED ----------------------------------------------
//
// The worker does not get an account made for them out of band. `POST /staff` creates a
// `WorkforcePerson` with NO `ApplicationUserId` (state `Invited`), and endpoint 32
// (`POST /workforce/me/invitations/claim`) is the only route in the module that ever sets one. So the
// manager ISSUES a claim code from the roster (endpoint 6 — the raw token rides the create response
// exactly once and is never persisted, `WorkforceInvitationService.cs:163`) and the worker CLAIMS it
// after signing in through the demo door. That is the product's own onboarding path, walked live.
//
// A phone-change token was explicitly NOT used to mint a third identity. It is Identity TOTP keyed on
// `AspNetUsers.SecurityStamp`, which a seed holding SQL access can read — which would make any user's
// code computable offline and install a general-purpose become-any-user primitive into the walk
// tooling. Production has no such path and neither does this journey.
//
// ---- WHAT MAKES IT RED, WHICH IS THE HALF THAT MATTERS ----------------------------------------
//
// Two deny-closed flags stand between this world and this walk, and BOTH are flipped on screen as
// steps rather than seeded, so the run cannot be green while either is off:
//
//   workforce.publication   gates all four schedule writes (`CreateDraftAsync`, `BatchAssignmentsAsync`,
//                           `ValidateAsync`, `PublishAsync` each pass it to `RequireWriteCapabilityAsync`).
//   workforce.selfservice   gates the acknowledgement (`WorkforceSelfService.cs:326`). The READS are
//                           deliberately ungated — §9.2 forbids gating a read — so the worker can see
//                           the shift and the notice while being unable to confirm.
//
// `WorkforceFeatureFlags.DefaultOn` holds `workforce.setup` ALONE, so on a fresh store both read "Av".
// Steps 3 and 9 do not merely rely on that: each one PRESSES THE CONTROL WHILE THE FLAG IS DOWN and
// asserts the product's own refusal — the schedule's typed `flag-disabled-read-only` banner naming the
// flag key, and the worker's `Kunne ikke bekrefte mottak.` toast. Switch either flag off and the run
// fails on the step after its probe; delete either probe and the flip that follows it is unmotivated.
//
// ---- ONE DEFECT THIS WALK ROUTES AROUND, ON PURPOSE -------------------------------------------
//
// `F-WF-ACKNOWLEDGE-SHOWS-NOTHING`: when the worker presses `Bekreft mottatt` they are shown NOTHING.
// The write lands; `acknowledge()` stores the receipt and then reloads the inbox, acknowledging implies
// seen, the item leaves the unread list, and `WorkforcePublicationNotice`'s `v-if` takes the whole
// section away — receipt included. The receipt renderer needs an item that is both unread and
// acknowledged and no such item can exist.
//
// So the proof of the acknowledgement is taken from the MANAGER'S publications page (step 15), not
// from the button's own feedback. Step 13 asserts the defect AS IT STANDS ON THIS BRANCH.
//
// AND IT IS ALREADY FIXED SOMEWHERE ELSE, which a reader of this file must know before believing its
// step 13. `L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE` (8539b3f) and `L-ACK-RECEIPT-SURVIVES-A-RELOAD-FIX`
// (ce6892a) carry the fix — an `acknowledgedAtUtc` on the inbox projection and a notice that keeps a
// row the server reports acknowledged — on `lane/wf-acknowledge-receipt-visible` and
// `lane/ack-receipt-survives-reload`. NEITHER is an ancestor of this tree, so the defect is live here
// and step 13 is a true observation of THIS branch, not a stale one. The moment either lands, INVERT
// step 13 — assert the receipt line and the "Allerede bekreftet" re-read — rather than deleting it.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn, signedInUserId } = require('../support/admin');
const { turnOn, flagRow } = require('../support/flags');

// This journey needs a world with TWO no-SMS sign-in doors, which is a property of a live API's
// configuration and not something the throwaway fixture models. Declared as a skip rather than left to
// fail in fixture mode: `playwright.config.js` inverts its tag filter only in LIVE mode, so an
// `@live` journey is also selected by a plain `npm run test:e2e`, and a red there would be a red about
// the harness rather than about the product.
const LIVE = !!process.env.E2E_API_BASE_URL;

// The manager's half of the pair, generated by whoever stood the world up. Never defaulted to the demo
// pair: that is the WORKER's credential here, and a silent fallback would collapse the two identities
// into one and produce exactly the artifact this journey exists to stop being possible.
const MANAGER = {
  phone: process.env.E2E_MANAGER_PHONE || '',
  code: process.env.E2E_MANAGER_CODE || ''
};

// `AppSettings.DemoPhoneNumber` / `DemoVerificationCode` — the door `live-world.sh` spends on its
// manager and which this journey spends on the WORKER instead.
const WORKER = { phone: '99999999', code: '123123' };

// The seeded colleague this walk hires, rosters and publishes to. `live-world.sh` creates her through
// `POST /staff`, so she is `Invited`: on the roster, with no login, which is exactly the person an
// invitation code is for.
const WORKER_NAME = 'Astrid Vik';

/**
 * Put the browser back to a signed-out state without restarting the context.
 *
 * The Vuex store persists itself to `localStorage.state` and restores it synchronously on boot, so
 * clearing that key and reloading is what actually signs somebody out. FOUR sign-ins share this one
 * page, and a journey that skipped this would have the worker acknowledging under the manager's bearer
 * — the one thing that must not silently work, and the thing this journey's whole claim rests on.
 */
async function signOut (page) {
  await page.goto('/');
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.context().clearCookies();
}

test.describe('workforce week-run', () => {
  test.skip(!LIVE, 'needs a LIVE world with two no-SMS sign-in doors: stand one up with ' +
    'test/e2e/scripts/live-world.sh, exporting AppSettings__AdminUserPhoneNumber and ' +
    'AppSettings__PowerUserVerificationCode, and pass the manager half as E2E_MANAGER_PHONE / ' +
    'E2E_MANAGER_CODE. The fixture models one identity per world and cannot stand in for this.');

  test(
    'A manager publishes a week and a second human acknowledges it, in one live world',
    journeyDetails({
      // NOT `workforce-week-run`. That id and the file path `test/e2e/journeys/workforce-week-run.spec.js`
      // are already taken by `L-JOURNEY-WORKFORCE` (4ef0d00, on `lane/journey-workforce` and
      // `candidate/fe-compose-2026-08-05`) for the FIXTURE walk of this same shape, and
      // `L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE` (8539b3f) rewrites it again on top of the acknowledge fix.
      // None of that is on this branch. Sharing the id would put a live record asserting the DEFECT
      // into the canonical slot of a journey whose other record asserts the FIX — two different
      // frontends under one name, which the store keys by backend and cannot separate — and would then
      // outrank and block the sibling's own run. A distinct id costs nothing and destroys nothing.
      journey: 'workforce-week-run-two-humans',
      surface: 'admin',
      tag: ['@live'],
      capabilities: [
        'workforce.staff.invite',
        'workforce.me.invitation-claim',
        'workforce.schedule.draft',
        'workforce.schedule.author',
        'workforce.schedule.validate',
        'workforce.schedule.publish',
        'workforce.me.schedule',
        'workforce.me.publication-acknowledge',
        'workforce.publication.history',
        'workforce.publication.recipients'
      ]
    }),
    async ({ page, journey }) => {
      // Four sign-ins, two flag flips, a week authored and published, a claim and an acknowledgement.
      // The 120s default is a per-journey budget written for a single-identity walk.
      test.setTimeout(15 * 60 * 1000);

      if (!MANAGER.phone || !MANAGER.code) {
        throw new Error(
          'E2E_MANAGER_PHONE and E2E_MANAGER_CODE are not set, so this journey has only ONE identity.\n' +
          'They are the national part and the code of the power-user door the world was launched with ' +
          '(AppSettings__AdminUserPhoneNumber / AppSettings__PowerUserVerificationCode). Without them the ' +
          'manager and the worker would be the same account and the run would prove nothing it claims.');
      }
      // The two credentials are DIFFERENT credentials. Asserted before anything signs in, because the
      // failure it guards against — a world configured with the demo pair in both roles — produces a
      // perfectly green run whose entire subject is false. (The stronger, id-level form of this claim
      // is in step 8; this one just fails earlier and cheaper.)
      expect(MANAGER.phone).not.toBe(WORKER.phone);

      // Recorded from what the APP holds, never from what was typed. See step 8.
      let managerUserId = null;
      let workerUserId = null;
      // The raw claim token. Held in a local only: it is a live one-time credential, so it never
      // becomes a step detail, never a finding, and no screenshot is taken while it is on screen (C7).
      let claimToken = null;
      let publishToast = '';

      // ---- the manager's half --------------------------------------------------------------------

      await journey.step('sign in as the manager through the platform-admin door', async () => {
        await page.goto('/admin/feature-flags');
        await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
        await signIn(page, { phone: MANAGER.phone, code: MANAGER.code, expectPath: '/admin/feature-flags' });
        await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });
        managerUserId = await signedInUserId(page);
        expect(managerUserId).toBeTruthy();
        // The id, not the number: the credential does not go in the artifact and the id is what the
        // acknowledgement is later proven to have NOT come from.
        return 'signed in on /admin/feature-flags as applicationUserId ' + managerUserId;
      });

      await journey.step('both flags this week-run depends on are deny-closed', async () => {
        // Not a restatement of `WorkforceFeatureFlags.DefaultOn` — this is the store's own board
        // answering. A world that had been seeded with either override would be answering the two
        // probes below for them.
        await expect(flagRow(page, 'workforce.publication').locator('.ff-row__badge')).toHaveText('Av');
        await expect(flagRow(page, 'workforce.selfservice').locator('.ff-row__badge')).toHaveText('Av');
        return 'workforce.publication = Av, workforce.selfservice = Av';
      });

      await journey.shot('both flags down, before the week-run');

      await journey.step('PROBE: with workforce.publication down, the week cannot even be drafted', async () => {
        // The falsifiable half of "this journey depends on the flag". Pressing the control while the
        // flag is down must produce the product's TYPED refusal — `flag-disabled-read-only`, which
        // `pages/admin/workforce-schedule.vue:556` renders as a banner NAMING THE FLAG KEY and linking
        // to the board. A generic error would not distinguish a gated store from a broken one.
        await page.goto('/admin/workforce-schedule');
        await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan', { timeout: 30000 });
        await expect(page.locator('.wf-page__badge')).toHaveText('Ingen plan');

        await page.getByRole('button', { name: 'Opprett utkast' }).click();

        const conflict = page.locator('.wf-page__conflict');
        await expect(conflict).toBeVisible({ timeout: 20000 });
        await expect(conflict).toContainText('workforce.publication');
        await expect(page.locator('.wf-page__conflict-link')).toBeVisible();
        // ...and no draft was created. The refusal is the server's, not a disabled button.
        await expect(page.locator('.wf-page__badge')).toHaveText('Ingen plan');
        return (await conflict.textContent()).replace(/\s+/g, ' ').trim().slice(0, 140);
      });

      await journey.shot('the draft refused, and the banner names the lever');

      await journey.step('the manager turns schedule publication on', async () => {
        await turnOn(page, 'workforce.publication');
        return 'workforce.publication = På, flipped on /admin/feature-flags';
      });

      await journey.step('the seeded colleague is on the roster with no login', async () => {
        await page.goto('/admin/workforce-roster');
        await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 30000 });
        const row = page.locator('.wfr-table__row', { hasText: WORKER_NAME });
        await expect(row).toBeVisible({ timeout: 20000 });
        await row.click();
        // `personState` is the module's only durable signal about sign-in — there is no invitation
        // list route, so "a code is outstanding" is not a fact any client can hold.
        await expect(page.locator('[data-test="access-state"]')).toContainText('Ingen innlogging', { timeout: 20000 });
        return WORKER_NAME + ': ' + (await page.locator('[data-test="access-state"]').textContent()).trim();
      });

      await journey.step('issue the claim code, which is shown exactly once', async () => {
        await page.locator('[data-test="issue-invitation"]').click();
        await expect(page.locator('.wfr-page__toast')).toContainText('Invitasjonskoden er laget', { timeout: 20000 });

        const handover = page.locator('[data-test="invitation-handover"]');
        await expect(handover).toBeVisible();
        claimToken = await page.locator('[data-test="invitation-token"]').inputValue();
        expect(claimToken).toBeTruthy();
        expect(claimToken.length).toBeGreaterThan(8);

        // The handover REPLACES the issue button while a token is on screen, so a second press cannot
        // scroll the first token out of view. It is unrecoverable the moment it goes.
        await expect(page.locator('[data-test="issue-invitation"]')).toHaveCount(0);
        // Nothing was sent anywhere, and the page says so rather than implying a delivery.
        await expect(handover).toContainText('Vi har ikke sendt koden noe sted');

        // OFF SCREEN BEFORE ANY PICTURE IS TAKEN. Against a live backend this is a real one-time
        // credential, and an artifact PNG is a file that gets copied into reviews. The fixture-world
        // journey photographs its token; this one must not, so the panel is dismissed here and the
        // length is the only thing that reaches the record.
        await page.locator('[data-test="dismiss-token"]').click();
        await expect(page.locator('[data-test="invitation-handover"]')).toHaveCount(0);
        return 'a ' + claimToken.length + '-character claim code was issued and withheld from this record';
      });

      await journey.shot('the roster, code issued and taken off screen');

      await journey.step('build the week: draft, one shift for the colleague, validated', async () => {
        await page.goto('/admin/workforce-schedule');
        await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan', { timeout: 30000 });

        // The SAME control that was refused in the probe. Nothing else changed in between.
        await page.getByRole('button', { name: 'Opprett utkast' }).click();
        await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet', { timeout: 20000 });
        await expect(page.locator('.wf-page__badge')).toHaveText('Utkast');

        // The shift must name the person about to claim, or the acknowledgement at the end proves
        // nothing about the link the claim made.
        const row = page.locator('.wf-grid__row', { hasText: WORKER_NAME });
        await expect(row).toBeVisible();
        await row.locator('.wf-grid__add').first().click();

        const editor = page.locator('.wf-editor');
        await expect(editor).toBeVisible();
        await editor.locator('input[type="time"]').first().fill('08:00');
        await editor.locator('input[type="time"]').nth(1).fill('16:00');
        await editor.locator('input[type="number"]').fill('30');
        await editor.locator('input[type="text"]').fill('Åpningsvakt');
        await editor.locator('select').nth(1).selectOption({ label: 'Barista' });
        await editor.getByRole('button', { name: 'Lagre vakt' }).click();
        await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn', { timeout: 20000 });

        await page.getByRole('button', { name: 'Valider' }).click();
        await expect(page.locator('.wf-page__badge')).toHaveText('Validert', { timeout: 20000 });
        return '08:00–16:00 Barista for ' + WORKER_NAME + ', week validated';
      });

      await journey.step('publish it', async () => {
        // `exact`: the view switcher's "Publisert" tab is also a button.
        await page.getByRole('button', { name: 'Publiser', exact: true }).click();
        const toast = page.locator('.wf-page__toast');
        await expect(toast).toContainText('Publisert til', { timeout: 20000 });
        publishToast = (await toast.textContent()).trim();
        await expect(page.locator('.wf-page__badge')).toHaveText('Publisert');
        // Recorded, never trusted as receipt: this is an ENQUEUE count, and the whole point of the
        // second half of this journey is that a queue depth is not somebody having been told.
        return publishToast;
      });

      await journey.shot('the published week, by the manager');

      // ---- the second human ----------------------------------------------------------------------

      await journey.step('a DIFFERENT person signs in and claims the code', async () => {
        await signOut(page);
        await page.goto('/workforce/join');
        await expect(page.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });

        // Pasted BEFORE authentication, which is the property that makes a public claim page possible
        // without putting the credential in a URL: the token lives in component memory and survives
        // sign-in only because `LoginModal` is mounted in place rather than navigated to.
        await page.locator('[data-test="code-input"]').fill(claimToken);
        await page.locator('[data-test="code-submit"]').click();
        await expect(page.locator('[data-test="sign-in"]')).toBeVisible();
        await expect(page.locator('[data-test="code-input"]')).toHaveCount(0);

        await page.locator('[data-test="sign-in-button"]').click();
        // No `expectPath`: nothing navigates, which is the point.
        await signIn(page, { phone: WORKER.phone, code: WORKER.code });
        await expect(page.locator('[data-test="confirm"]')).toBeVisible({ timeout: 30000 });

        workerUserId = await signedInUserId(page);
        expect(workerUserId).toBeTruthy();

        // ---- THE CLAIM THIS WHOLE JOURNEY EXISTS TO MAKE -----------------------------------------
        //
        // TWO ACCOUNTS, READ OFF THE APP RATHER THAN OFF THE CREDENTIALS TYPED. `signedInUserId` reads
        // `state.currentUser.id`, which is the id the API resolved from the bearer
        // (`UserService.GenerateJwtTokenAsync` mints `unique_name` from `user.Id`) — so this is the
        // account the SERVER will attribute the acknowledgement to, not the number this file typed.
        // Every live journey before this one had a single value here.
        expect(workerUserId).not.toBe(managerUserId);

        await page.locator('[data-test="claim-button"]').click();
        const claimed = page.locator('[data-test="claimed"]');
        await expect(claimed).toBeVisible({ timeout: 30000 });
        await expect(claimed).toContainText('Du er inne');
        // A claim NEVER widens capability: the receipt prints the engagement's pre-existing grants.
        await expect(page.locator('[data-test="claimed-grants"]')).toContainText('WorkforceSelf');
        await expect(page.locator('[data-test="no-selfservice"]')).toHaveCount(0);
        return 'claimed by applicationUserId ' + workerUserId + ', which is NOT the publisher ' + managerUserId;
      });

      await journey.shot('the second human is in');

      await journey.step('the worker sees the shift the manager published', async () => {
        await page.locator('[data-test="go-to-my-shifts"]').click();
        await expect(page.locator('.wfme__title')).toBeVisible({ timeout: 30000 });
        expect(new URL(page.url()).pathname).toBe('/admin/workforce-me');
        // NOT the "you hold no engagement" screen, which is what this page showed every account in the
        // estate before a claim surface existed.
        await expect(page.locator('.wfme__blocker')).toHaveCount(0);

        const card = page.locator('.wfme__list li').first();
        await expect(card).toBeVisible({ timeout: 20000 });
        const text = (await card.textContent()).replace(/\s+/g, ' ').trim();
        expect(text).toContain('08:00');
        return 'first shift card: ' + text.slice(0, 90);
      });

      await journey.step('PROBE: with workforce.selfservice down, the confirmation is refused', async () => {
        // The notice IS on screen, because the inbox READ is deliberately ungated (§9.2 forbids gating
        // a read). So this is the honest shape of the gap: the worker can see the plan and the button,
        // and only the WRITE is refused. `WorkforceSelfService.cs:326` is the enforcement point.
        const notice = page.locator('.wfme-pub');
        await expect(notice).toBeVisible({ timeout: 20000 });
        await notice.getByRole('button', { name: 'Bekreft mottatt' }).click();

        const toast = page.locator('.wfme__toast--error');
        await expect(toast).toBeVisible({ timeout: 20000 });
        await expect(toast).toContainText('Kunne ikke bekrefte mottak');
        // ...and the notice is still there, because nothing was acknowledged.
        await expect(notice).toBeVisible();
        return 'refused: "' + (await toast.textContent()).trim() + '" — the notice is still unread';
      });

      await journey.shot('the worker can see the week and cannot confirm it');

      await journey.step('the manager turns self-service on', async () => {
        await signOut(page);
        await page.goto('/admin/feature-flags');
        await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
        await signIn(page, { phone: MANAGER.phone, code: MANAGER.code, expectPath: '/admin/feature-flags' });
        // The same account as step 1, and still not the worker's.
        expect(await signedInUserId(page)).toBe(managerUserId);
        await turnOn(page, 'workforce.selfservice');
        return 'workforce.selfservice = På, flipped by ' + managerUserId;
      });

      await journey.step('the worker confirms, and is shown NOTHING (F-WF-ACKNOWLEDGE-SHOWS-NOTHING)', async () => {
        await signOut(page);
        await page.goto('/admin/workforce-me');
        await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
        await signIn(page, { phone: WORKER.phone, code: WORKER.code, expectPath: '/admin/workforce-me' });
        expect(await signedInUserId(page)).toBe(workerUserId);

        const notice = page.locator('.wfme-pub');
        await expect(notice).toBeVisible({ timeout: 30000 });
        await notice.getByRole('button', { name: 'Bekreft mottatt' }).click();

        // ---- THE DEFECT, ASSERTED RATHER THAN NARRATED -------------------------------------------
        //
        // `acknowledge()` stores the receipt and then reloads the inbox. Acknowledging implies SEEN, so
        // the item leaves the unread list and `WorkforcePublicationNotice`'s `v-if="items.length"`
        // takes the whole section away — taking the receipt element with it. The receipt renderer needs
        // an item that is both unread and acknowledged, and no such item can exist.
        //
        // No component test could see this: the receipt is stored, the inbox reloads, and the unread
        // filter is correct. The defect lives only in the sequence a person performs.
        //
        // WHEN IT IS FIXED, INVERT THIS STEP — do not delete it. The receipt line should appear and
        // this journey should assert it, which is what `clears_when` on the flag asks for. The fix
        // exists on `lane/wf-acknowledge-receipt-visible` (8539b3f) and is not on this branch; see the
        // header. Landing it must red exactly here, which is the point of asserting rather than
        // narrating.
        await expect(page.locator('.wfme-pub')).toHaveCount(0, { timeout: 20000 });
        await expect(page.locator('.wfme-pub__receipt')).toHaveCount(0);
        await expect(page.locator('.wfme__toast')).toHaveCount(0);

        journey.finding(
          'defect',
          'a worker who confirms a published week is shown no receipt at all',
          'F-WF-ACKNOWLEDGE-SHOWS-NOTHING. Pressing `Bekreft mottatt` succeeded — step 12 reads the ' +
          'receipt back off the manager\'s publication roster — but the worker\'s own screen showed ' +
          'neither the receipt nor a toast: `acknowledge()` reloads the inbox, the item stops being ' +
          'unread, and WorkforcePublicationNotice\'s v-if removes the section that renders the receipt. ' +
          'The whole feedback path is unreachable by construction.');
        return 'the notice vanished; no receipt line, no toast — nothing on screen said it worked';
      });

      await journey.shot('after confirming: the worker sees nothing');

      // ---- and the loop closes on the manager's side ---------------------------------------------

      await journey.step('the manager reaches the publication receipts BY CLICKING THE SIDEBAR', async () => {
        await signOut(page);
        await page.goto('/admin/workforce-publications');
        await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
        await signIn(page, { phone: MANAGER.phone, code: MANAGER.code, expectPath: '/admin/workforce-publications' });

        // Reached by URL for the sign-in redirect, then RE-reached by the navigation entry, because a
        // page reachable only by typing its path is not a capability (C3).
        await page.goto('/admin/workforce-schedule');
        await expect(page.locator('.wf-page__title')).toBeVisible({ timeout: 30000 });
        const link = page.locator('.admin-nav__link', { hasText: 'Publiseringskvitteringer' }).first();
        if (!(await link.isVisible().catch(() => false))) {
          await page.locator('.admin-nav__toggle, .admin-header__menu, [data-testid="admin-nav-toggle"]')
            .first().click({ timeout: 10000 });
        }
        await expect(link).toBeVisible({ timeout: 20000 });
        await link.click();
        await page.waitForURL(/\/admin\/workforce-publications/, { timeout: 30000 });
        await expect(page.locator('[data-testid="wf-publist"]')).toBeVisible({ timeout: 20000 });
        return 'arrived at ' + new URL(page.url()).pathname + ' by clicking the sidebar entry';
      });

      await journey.step('THE PROOF: the roster names the OTHER account as having confirmed', async () => {
        // Neither unreadable nor empty — those are opposite facts and this store is in neither.
        await expect(page.locator('[data-testid="wf-publist-unknown"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="wf-publist-empty"]')).toHaveCount(0);

        const pick = page.locator('.wf-publist__pick').first();
        await expect(pick).toBeVisible();
        await pick.click();
        await expect(page.locator('[data-testid="wf-pubrec-for"]')).toBeVisible({ timeout: 20000 });

        // The one group that can only be written by the WORKER's own act. `AcknowledgePublicationAsync`
        // requires the caller to be a recipient of the publication AND to own that engagement, so a row
        // here is the second human's write and nobody else's — a manager cannot put a name in this
        // group, which is exactly why the surface keeps hand-delivery in a separate one.
        const confirmed = page.locator('[data-testid="wf-pubrec-confirmed"]');
        await expect(confirmed).toBeVisible({ timeout: 20000 });
        await expect(confirmed).toContainText(WORKER_NAME);
        const confirmedCount = (await page.locator('[data-testid="wf-pubrec-confirmed-count"]').textContent()).trim();

        // ...and the hand-delivery group is NOT what this landed in. Merging the two is the one lie
        // this surface must never tell, and asserting the confirmed group alone would not catch it.
        await expect(page.locator('[data-testid="wf-pubrec-byhand"]')).toHaveCount(0);
        // Nobody is left unheard from: the single recipient confirmed.
        await expect(page.locator('[data-testid="wf-pubrec-none"]')).toHaveCount(0);
        // The roster is COMPLETE, so the count above is the whole story rather than a short list
        // standing in for one.
        await expect(page.locator('[data-testid="wf-pubrec-short"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="wf-pubrec-empty"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="wf-pubrec-unknown"]')).toHaveCount(0);

        return 'publish said "' + publishToast + '"; the confirmed group holds ' + confirmedCount +
          ' — ' + WORKER_NAME + ', acknowledged by ' + workerUserId + ', a different account from the ' +
          'publisher ' + managerUserId;
      });

      await journey.shot('the manager can show that the other human confirmed');

      await journey.step('what the browser said while this ran', () => {
        // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does not
        // work, which is false. A browser error during a working flow is a finding somebody has to
        // decide about, and they cannot decide about something nobody wrote down.
        const noise = /favicon|Download the Vue Devtools/i;
        const errors = journey.consoleErrors.filter(text => !noise.test(text));
        for (const error of errors) {
          journey.finding('defect', 'browser error during the week-run', error);
        }
        return errors.length ? errors.length + ' console errors recorded as findings' : 'no console errors';
      });
    }
  );
});
