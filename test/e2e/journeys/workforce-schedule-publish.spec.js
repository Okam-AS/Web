// JOURNEY — a manager builds a week and publishes it.
//
// This is the admin shape: authentication, a store context resolved from a capability read, a
// multi-step form, and a state transition that the server owns (no plan -> Draft -> Validated ->
// Published). Everything it touches was `built-unverified` because the only evidence it had was
// component tests.
//
// WHAT IT ACTUALLY PROVES, beyond "the page renders":
//
//   • The login modal signs a real session in and the bearer token reaches the workforce client —
//     the fixture 401s anything without it, so every read below would fail if the token were dropped
//     between the Vuex store and `_coreInitializer.bearerToken`.
//   • `Opprett utkast` is offered ONLY when the range read says there is no plan, and the shift
//     editor's affordances appear ONLY once a revision and an `If-Match` token are in hand
//     (`canAuthorHere`). Those are computed states, and this is the first thing to ever observe them
//     on screen.
//   • The batch edit really sends the checksum the read answered with: the fixture refuses a
//     mismatched `If-Match` with a typed `stale-revision` 409, and it refuses a mutation with no
//     `Idempotency-Key` with a 400. A green run means neither refusal happened.
//   • Publish is gated on Validated and flips the view. The recipient count in the toast is the
//     SERVER's number.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

test(
  'A manager creates a draft week, staffs a shift, validates it and publishes it',
  journeyDetails({
    journey: 'workforce-schedule-publish',
    surface: 'admin',
    capabilities: [
      'workforce.schedule.read',
      'workforce.schedule.draft',
      'workforce.schedule.author',
      'workforce.schedule.validate',
      'workforce.schedule.publish'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('open the schedule page as an anonymous visitor', async () => {
      await page.goto('/admin/workforce-schedule');
      // The shell bounces an anonymous visitor to /admin carrying where they were going.
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-schedule' });
      return 'landed back on /admin/workforce-schedule';
    });

    await journey.step('the week reads as having no plan, and offers to create one', async () => {
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan');
      // `wf_state_none` — the range read answered and resolved no revision. This is the state that is
      // NOT the same as an empty week, and the page has to be in it before a draft can be created.
      const badge = page.locator('.wf-page__badge');
      await expect(badge).toBeVisible();
      const label = (await badge.textContent()).trim();
      await expect(page.getByRole('button', { name: 'Opprett utkast' })).toBeVisible();
      return 'state badge: "' + label + '"';
    });

    await journey.shot('no plan for this week');

    await journey.step('create the draft', async () => {
      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet');
      await expect(page.locator('.wf-page__badge')).toHaveText('Utkast');
      // The revision number only renders once a revision resolved, so its presence is the read
      // confirming what the mutation claimed.
      await expect(page.locator('.wf-page__meta').first()).toContainText('Revisjon');
      return (await page.locator('.wf-page__meta').first().textContent()).trim();
    });

    await journey.step('add a shift for a named employee', async () => {
      // The `+` affordance exists only when `canAuthorHere` is true, which requires a revision, an
      // `If-Match` token, the WorkforceScheduler capability and a draft view. Finding it is the
      // assertion; clicking it is the step.
      const addButtons = page.locator('.wf-grid__row:not(.wf-grid__row--open) .wf-grid__add');
      await expect(addButtons.first()).toBeVisible();
      await addButtons.first().click();

      const editor = page.locator('.wf-editor');
      await expect(editor).toBeVisible();
      await expect(editor.locator('.wf-page__section-title')).toHaveText('Ny vakt');

      await editor.locator('input[type="time"]').first().fill('08:00');
      await editor.locator('input[type="time"]').nth(1).fill('16:00');
      await editor.locator('input[type="number"]').fill('30');
      await editor.locator('input[type="text"]').fill('Åpningsvakt');

      // The role select is populated by an on-demand `GET /roles`; picking a real role proves that
      // read landed rather than leaving the list unknown.
      const roleSelect = editor.locator('select').nth(1);
      await roleSelect.selectOption({ label: 'Barista' });

      await editor.getByRole('button', { name: 'Lagre vakt' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn');
      return 'saved 08:00–16:00, Barista, 30 min unpaid break';
    });

    await journey.step('the saved shift is on the grid, with the wage the backend priced', async () => {
      const shift = page.locator('.wf-grid__shift').first();
      await expect(shift).toBeVisible();
      const time = (await shift.locator('.wf-grid__shift-time').textContent()).trim();
      const role = (await shift.locator('.wf-grid__shift-role').textContent()).trim();
      // The cost chip is the server's figure. Asserting it EXISTS and carries a currency; the value
      // itself is the fixture's, so asserting the number would be asserting our own arithmetic.
      const cost = await shift.locator('.wf-grid__shift-cost').textContent();
      expect(time).toBe('08:00–16:00');
      expect(role).toBe('Barista');
      expect(cost).toMatch(/kr|NOK|\d/);
      return time + ' · ' + role + ' · ' + cost.trim();
    });

    await journey.shot('draft with one shift');

    // ---- what the browser showed that no unit test could ----------------------------------------
    //
    // RECORDED, NOT ASSERTED AGAINST. The publish flow works, so failing here would say the
    // capability does not, which is false. But two things are on screen that should not be, and both
    // are invisible to a component test that mounts one branch at a time — they are properties of
    // the TEMPLATE's `v-if` chains, which only exist in an assembled page.
    await journey.step('the three pivots render each other\'s grids', async () => {
      const notes = [];

      // Defect 1. The template is:
      //     <WorkforceWeekGrid  v-if="isEmployees" />        <- chain A, on its own
      //     <p                  v-if="isRoles && canAuthorHere" />
      //     <WorkforceRoleGrid  v-else-if="isRoles" />       <- chain B
      //     <WorkforceMonthGrid v-else />                    <- still chain B
      // `v-else` binds to the nearest preceding chain, which is B — not to the week grid. So on the
      // EMPLOYEES pivot chain B falls through to its else and the MONTH grid renders underneath the
      // week grid, fetching nothing, and prints "5 uker ble ikke hentet" about weeks nobody asked
      // for. The correct chain is one `v-if / v-else-if / v-else` across all three.
      const monthOnEmployees = await page.locator('.wf-month').count();
      if (monthOnEmployees > 0) {
        notes.push('the month grid renders on the employees pivot (pages/admin/workforce-schedule.vue:135-153 — ' +
          '`WorkforceMonthGrid v-else` binds to the roles chain, not to the week grid)');
      }

      // Defect 2, the same chain from the other side. On the ROLES pivot, when the manager may
      // author, the `<p>` notice takes the `v-if` and the role grid is its `v-else-if` — so the
      // notice REPLACES the grid instead of sitting above it. A scheduler switching to the role
      // pivot on an editable week sees the sentence "author on the employee pivot" and no schedule
      // at all. Checked here, while the revision is still a Draft, because `canAuthorHere` is false
      // once it is published and the branch then hides itself.
      await page.getByRole('button', { name: 'Funksjoner' }).click();
      await expect(page.locator('.wf-page__notice'))
        .toContainText('medarbeidervisningen', { timeout: 15000 });
      const roleGridShown = await page.locator('.wf-roles').count();
      if (roleGridShown === 0) {
        notes.push('the roles pivot shows no grid at all while the week is editable ' +
          '(same chain: the authoring notice is the `v-if`, the role grid its `v-else-if`)');
      }

      // Back to the pivot the rest of the journey is about.
      await page.getByRole('button', { name: 'Medarbeidere' }).click();
      await expect(page.locator('.wf-grid__shift')).toHaveCount(1, { timeout: 15000 });

      for (const note of notes) {
        journey.finding('defect', 'workforce schedule pivot rendering', note);
      }
      return notes.length ? notes.length + ' rendering defects recorded' : 'nothing';
    });

    await journey.step('validate the draft', async () => {
      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__validation')).toBeVisible();
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert');
      const results = page.locator('.wf-page__result');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
      return count + ' rule results, state Validert';
    });

    await journey.step('publish it', async () => {
      // `exact` matters: the view switcher's "Publisert" tab is also a button, and a substring match
      // on "Publiser" resolves to both.
      const publish = page.getByRole('button', { name: 'Publiser', exact: true });
      await expect(publish).toBeVisible();
      await publish.click();
      // The toast carries the SERVER's recipient count.
      await expect(page.locator('.wf-page__toast')).toContainText('Publisert til');
      const toast = (await page.locator('.wf-page__toast').textContent()).trim();
      // Publishing switches the view, and the published view resolves a publication rather than a
      // draft — which is the whole difference the two views exist to make visible.
      // Scoped past the PIVOT switcher, which reuses the same class. Both switchers have an active
      // button; only the draft/published one is the claim here.
      await expect(page.locator('.wf-page__views:not(.wf-page__views--pivot) .wf-page__view.is-active'))
        .toHaveText('Publisert');
      await expect(page.locator('.wf-page__badge')).toHaveText('Publisert');
      return toast;
    });

    await journey.step('the published week is no longer authorable', async () => {
      // A published revision is terminal server-side. The page must not offer an edit that is certain
      // to be refused, so the `+` affordance is gone.
      await expect(page.locator('.wf-grid__add')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Publiser', exact: true })).toHaveCount(0);
      // ...and the shift is still on screen. "Cannot edit" is not "nothing here".
      await expect(page.locator('.wf-grid__shift')).toHaveCount(1);
      return 'no add buttons, no publish button, 1 shift still shown';
    });

    await journey.shot('published week');

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED, and the distinction is deliberate. The flow above completed, so
      // failing here would say the capability does not work, which is false. A browser error during a
      // working flow is a finding: somebody has to decide whether it matters, and they cannot decide
      // about something nobody wrote down.
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the schedule journey', error);
      }
      return errors.length ? errors.length + ' recorded as findings' : 'nothing';
    });
  }
);
