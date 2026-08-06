// JOURNEY — a manager sees which invitation codes are still live, and withdraws one.
//
// THE GAP THIS EXISTS TO CLOSE. `workforce-invitation-onboarding.spec.js` proves a manager can
// ISSUE a code and a worker can claim it. Until endpoints 6b and 6c landed that was the whole
// surface: no route listed what was outstanding and none withdrew anything, so a code relayed to the
// wrong person could only be answered by REISSUING — minting a replacement in order to kill the
// first, which is not what a manager wants when the correct outcome is "nobody should hold a code
// for this engagement". The panel said so, in three locales, and two tests pinned the sentence. Both
// pins are now inverted; this journey is the other half of the fix, and drives the routes through
// the page rather than through a client.
//
// WHAT A GREEN RUN PROVES, beyond "the list renders":
//
//   • A STORED `Pending` IS NOT A LIVE CODE, and the panel does not conflate them. The world seeds a
//     code that expired thirty days ago and is still `Pending` in its row, because
//     `WorkforceInvitationState.Expired` is written by no code path in the module — expiry is a
//     read-time comparison. A surface that rendered the stored state would tell a manager that dead
//     code is outstanding: the question this screen exists to answer, answered backwards while
//     looking entirely correct. The lapsed entry must read as unusable and must NOT read as live.
//   • The list is a WIRE-THROUGH and not a seed: a code issued in this run appears in it, and
//     disappears from it when withdrawn.
//   • A WITHDRAWN CODE IS INDISTINGUISHABLE FROM A FABRICATED ONE on the worker's side. The two
//     refusals are captured and compared character for character. The claim path keeps this
//     structurally — it has no revoked branch — and this asserts the property rather than the
//     implementation, so a later "more helpful error message" that leaked which code had once been
//     real would fail here.
//   • WITHDRAWING A CODE SOMEBODY ALREADY USED IS REFUSED, not quietly accepted. Driven as the race
//     it actually is: the manager reads the list, a worker claims in a second browser, and the
//     manager presses Withdraw against a list that is one moment stale. A 200 there would tell them
//     they are safe at the exact moment they are not, so the screen has to say what happened and
//     name the thing that DOES remove access.
//   • No token ever reaches this list. Asserted on the page HTML, with the run's own real code as
//     the needle — not a shape, the actual string the server minted.
//
// THE WORLD THIS RAN AGAINST: the throwaway fixture (`test/e2e/fixture/api-server.js`), whose #6b
// and #6c handlers were written against `lane/wf-invite-list-revoke @ 68f2472c` — the branch that
// carries the controller, and which is unpushed, so no other world has these routes yet. The
// fixture's `isLive` is deliberately the SAME expression its claim handler uses, so it cannot report
// a code as live that it would then refuse. Two tests rather than one because the fixture resets per
// test, and the claimed-code race needs a world where nothing has been withdrawn yet.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const MANAGER = { phone: '99999999', code: '123123' };
// The same account the onboarding journey uses. It holds no engagement until it claims one.
const NEW_HIRE = { phone: '90000004', code: '123123' };

/** Open the roster as the manager and land on it. */
async function managerOnRoster (page) {
  await page.goto('/admin/workforce-roster');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, Object.assign({ expectPath: '/admin/workforce-roster' }, MANAGER));
  await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 30000 });
}

/** Select one person's row and wait for their panel. */
async function openPanel (page, name) {
  const row = page.locator('.wfr-table__row', { hasText: name });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.click();
  await expect(page.locator('[data-test="section-access"]')).toBeVisible({ timeout: 15000 });
}

test(
  'A manager sees which codes are still live, withdraws one, and the withdrawn code dies silently',
  journeyDetails({
    journey: 'workforce-invitation-list-revoke',
    surface: 'admin',
    capabilities: [
      'workforce.staff.invitation-list',
      'workforce.staff.invitation-revoke'
    ]
  }),
  async ({ page, browser, journey }) => {
    let code = null;

    await journey.step('sign in as the manager on the roster', async () => {
      await managerOnRoster(page);
      return 'landed on /admin/workforce-roster';
    });

    // ---- THE PROPERTY MOST LIKELY TO BE GOT WRONG ------------------------------------------------

    await journey.step('a code that lapsed a month ago is NOT shown as live', async () => {
      // Kari's seeded invitation is `Pending` in the row and expired thirty days ago. The row's own
      // state says nothing about whether the code works; only the read-time comparison does.
      await openPanel(page, 'Kari Hansen');

      const lapsed = page.locator('[data-test="invitation-lapsed"]');
      await expect(lapsed).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="invitation-live"]')).toHaveCount(0);
      await expect(lapsed).toContainText('kan ikke brukes av noen lenger');

      // Neither of the two sentences that would be wrong here: the list DID answer, and it is not
      // empty.
      await expect(page.locator('[data-test="invitations-unknown"]')).toHaveCount(0);
      await expect(page.locator('[data-test="invitations-none"]')).toHaveCount(0);

      // The word `Pending` — the stored state — must not be on screen anywhere: it is the raw fact
      // that means the opposite of what a reader would take it for.
      const panel = await page.locator('.wfr-panel').textContent();
      expect(panel).not.toContain('Pending');
      return (await lapsed.textContent()).replace(/\s+/g, ' ').trim().slice(0, 110) + '…';
    });

    await journey.shot('a lapsed code, shown as lapsed');

    await journey.step('withdrawing a lapsed code is offered as housekeeping, not as a rescue', async () => {
      const button = page.locator('[data-test="revoke-invitation"]');
      await expect(button).toHaveText('Fjern den utløpte koden');
      // It says what it does and, just as importantly, what it does not: this code stopped working
      // when it lapsed, so nothing dangerous is being removed.
      await expect(page.locator('[data-test="invitation-lapsed"]'))
        .toContainText('fjerner den bare fra denne listen');

      await button.click();
      await expect(page.locator('.wfr-page__toast')).toContainText('Koden er trukket tilbake', { timeout: 15000 });
      // And it leaves the outstanding set, because the read returns Pending rows only.
      await expect(page.locator('[data-test="invitations-none"]')).toBeVisible({ timeout: 15000 });
      return 'lapsed code cleared; Kari now has nothing outstanding';
    });

    // ---- A CODE ISSUED IN THIS RUN, LISTED AND THEN WITHDRAWN ------------------------------------

    await journey.step('issue a code for the new hire and read it back off the list', async () => {
      await openPanel(page, 'Nina Nyansatt');
      // Nobody has invited her, and the panel says EMPTY rather than "we could not read this".
      await expect(page.locator('[data-test="invitations-none"]')).toBeVisible({ timeout: 15000 });

      await page.locator('[data-test="issue-invitation"]').click();
      await expect(page.locator('.wfr-page__toast')).toContainText('Invitasjonskoden er laget', { timeout: 15000 });

      code = await page.locator('[data-test="invitation-token"]').inputValue();
      expect(code).toBeTruthy();
      expect(code.length).toBeGreaterThan(8);

      // Dismissing the handover reveals the list underneath — the handover replaces it while a token
      // is on screen, so a second press cannot scroll an unrecoverable code out of view.
      await page.locator('[data-test="dismiss-token"]').click();

      const live = page.locator('[data-test="invitation-live"]');
      await expect(live).toBeVisible({ timeout: 15000 });
      await expect(live).toContainText('Gyldig til');
      return 'the code just minted is in the list, and reads as live';
    });

    // C7. Not a shape and not a regex: the actual credential this run produced, searched for in the
    // rendered page. The read carries no token by construction, and this is what would catch a
    // response that grew one.
    await journey.step('the list never shows the code itself', async () => {
      const html = await page.content();
      expect(html).not.toContain(code);
      // The list says WHO it went to instead, which is what a manager needs in order to decide.
      await expect(page.locator('[data-test="invitation-list"]')).toBeVisible();
      return 'the run\'s real code appears nowhere in the rendered list';
    });

    await journey.shot('a live code, outstanding');

    await journey.step('withdraw the live code', async () => {
      const button = page.locator('[data-test="revoke-invitation"]');
      await expect(button).toHaveText('Trekk tilbake koden');
      // The panel states the consequence before the press, and it is the consequence that matters:
      // the holder is told nothing.
      await expect(page.locator('[data-test="invitation-live"]'))
        .toContainText('ingenting røper at den ble trukket tilbake');

      await button.click();
      await expect(page.locator('.wfr-page__toast')).toContainText('Koden er trukket tilbake', { timeout: 15000 });
      await expect(page.locator('[data-test="invitations-none"]')).toBeVisible({ timeout: 15000 });
      return 'withdrawn; nothing is outstanding for this engagement';
    });

    await journey.shot('after the withdrawal');

    // ---- THE HOLDER'S SIDE -----------------------------------------------------------------------

    await journey.step('the withdrawn code is refused EXACTLY as a code that never existed', async () => {
      // A separate browser, because this is a different person. The manager's session must not be
      // the one submitting the code — a journey that reused it would be proving nothing about who
      // may claim.
      const workerContext = await browser.newContext();
      const worker = await workerContext.newPage();
      try {
        await worker.goto('/workforce/join');
        await expect(worker.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });
        await worker.locator('[data-test="code-input"]').fill(code);
        await worker.locator('[data-test="code-submit"]').click();

        await worker.locator('[data-test="sign-in-button"]').click();
        await signIn(worker, NEW_HIRE);
        await expect(worker.locator('[data-test="confirm"]')).toBeVisible({ timeout: 30000 });

        await worker.locator('[data-test="claim-button"]').click();
        const refusal = worker.locator('[data-test="refusal"]');
        await expect(refusal).toBeVisible({ timeout: 30000 });
        const withdrawn = (await refusal.textContent()).replace(/\s+/g, ' ').trim();

        // Now a string the server has never minted, submitted by the same account in the same visit.
        await worker.locator('[data-test="other-code-button"]').click();
        await expect(worker.locator('[data-test="code-input"]')).toBeVisible({ timeout: 15000 });
        await worker.locator('[data-test="code-input"]').fill('wfinv_this_was_never_a_code');
        await worker.locator('[data-test="code-submit"]').click();
        await worker.locator('[data-test="claim-button"]').click();
        await expect(refusal).toBeVisible({ timeout: 30000 });
        const fabricated = (await refusal.textContent()).replace(/\s+/g, ' ').trim();

        // THE ANTI-ORACLE, asserted as a property. If a withdrawn code ever answered differently
        // from a fabricated one, possession of a dead code would become a way to learn that it had
        // once been real — and, with it, that the engagement exists.
        expect(withdrawn).toBe(fabricated);
        expect(withdrawn.length).toBeGreaterThan(0);
        return 'both refusals identical, ' + withdrawn.length + ' characters';
      } finally {
        await workerContext.close();
      }
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow above completed, so failing here would say the capability
      // does not work, which is false. A browser error during a working flow is a finding somebody
      // has to decide about, and they cannot decide about something nobody wrote down.
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the invitation list/revoke journey', error);
      }
      return errors.length ? errors.length + ' console errors recorded as findings' : 'no console errors';
    });
  }
);

test(
  'Withdrawing a code somebody already used is refused rather than quietly accepted',
  journeyDetails({
    journey: 'workforce-invitation-revoke-claimed',
    surface: 'admin',
    capabilities: ['workforce.staff.invitation-revoke']
  }),
  async ({ page, browser, journey }) => {
    let code = null;

    await journey.step('the manager issues a code and reads it as live', async () => {
      await managerOnRoster(page);
      await openPanel(page, 'Nina Nyansatt');

      await page.locator('[data-test="issue-invitation"]').click();
      await expect(page.locator('.wfr-page__toast')).toContainText('Invitasjonskoden er laget', { timeout: 15000 });
      code = await page.locator('[data-test="invitation-token"]').inputValue();
      await page.locator('[data-test="dismiss-token"]').click();

      await expect(page.locator('[data-test="invitation-live"]')).toBeVisible({ timeout: 15000 });
      return 'a live code is outstanding for Nina';
    });

    // THE RACE, DRIVEN AS A RACE. The manager's list is a snapshot of a world that keeps moving, and
    // the dangerous case is precisely the one where it moved: they are withdrawing because they
    // believe the wrong person has the code, and that person has just used it. Nothing about the
    // manager's page is refreshed between these two steps, so the button they press is the button a
    // real manager would press.
    await journey.step('meanwhile, in another browser, the worker claims that code', async () => {
      const workerContext = await browser.newContext();
      const worker = await workerContext.newPage();
      try {
        await worker.goto('/workforce/join');
        await expect(worker.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });
        await worker.locator('[data-test="code-input"]').fill(code);
        await worker.locator('[data-test="code-submit"]').click();
        await worker.locator('[data-test="sign-in-button"]').click();
        await signIn(worker, NEW_HIRE);
        await worker.locator('[data-test="claim-button"]').click();
        await expect(worker.locator('[data-test="claimed"]')).toBeVisible({ timeout: 30000 });
        return 'the code has been redeemed by the account that received it';
      } finally {
        await workerContext.close();
      }
    });

    await journey.step('the manager presses Withdraw on a list one moment stale', async () => {
      // Still the same page, still showing the entry that was live when it was read.
      const button = page.locator('[data-test="revoke-invitation"]');
      await expect(button).toBeVisible();
      await button.click();

      // NOT A TOAST, AND NOT SILENCE. A 200 here would be the single most dangerous answer this
      // surface can give: it would confirm safety at the moment there is none.
      const conflict = page.locator('.wfr-page__conflict');
      await expect(conflict).toBeVisible({ timeout: 15000 });
      await expect(conflict).toContainText('Koden er allerede brukt');
      // And it names what actually removes access, because withdrawal cannot undo a link.
      await expect(conflict).toContainText('avslutte engasjementet');
      await expect(page.locator('.wfr-page__toast')).not.toContainText('Koden er trukket tilbake');

      // The stale entry is gone: the list is re-read on a refusal too, so the page does not sit
      // there contradicting its own explanation.
      await expect(page.locator('[data-test="revoke-invitation"]')).toHaveCount(0);

      // AND THE SENTENCE ABOVE IT CATCHES UP. This is the assertion the first run of this journey
      // did not make, and the screenshot showed the panel still saying "no login is attached to
      // this engagement yet" directly above a refusal explaining that somebody had just signed in
      // with the code — the page contradicting itself in the exact moment a manager is relying on
      // it to tell them whether the wrong person got in.
      await expect(page.locator('[data-test="access-state"]'))
        .toContainText('har koblet en innlogging', { timeout: 15000 });
      return (await conflict.textContent()).replace(/\s+/g, ' ').trim().slice(0, 130) + '…';
    });

    await journey.shot('the refusal a quiet success would have hidden');

    await journey.step('what the browser said while this ran', () => {
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the claimed-code revoke journey', error);
      }
      return errors.length ? errors.length + ' console errors recorded as findings' : 'no console errors';
    });
  }
);
