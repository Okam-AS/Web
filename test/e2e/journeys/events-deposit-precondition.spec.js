// JOURNEY — an operator about to arm the deposit money path is told what must already be true.
//
// THE FINDING THIS EXISTS TO CLOSE. `Events.Deposits` opens a money path, and its owner
// (`Services/Events/EventsFeatureFlags.cs`) states a precondition in the backend's own words: a store
// may be given the deposit money path only once its payment-provider configuration has already
// processed live orders — deposits reuse proven merchant config and configure nothing of their own —
// and arming it for a store that has never taken a live payment "is currently possible and is a
// procedural failure, not a technical one". NOTHING ENFORCES THAT. It was survivable while the only
// way to arm the flag was a curl against `PUT /stores/{id}/feature-flags`. `/admin/feature-flags`
// made it one click for any store admin, and the row said nothing at all.
//
// IT IS A DISCLOSURE, NOT A GATE, and this journey is written to prove exactly that and no more:
// there is no notion of "proven merchant configuration" anywhere in the code and no ruling that says
// arming should be refused without one, so the switch below still works and this journey watches it
// work. A version of this that asserted a refusal would be asserting a product decision nobody has
// made.
//
// WHAT IT PROVES THAT THE JEST SUITE CANNOT. The suite mounts the page in jsdom with `$i` returning
// the key, so it can prove the wiring and the copy separately but never that a real browser, against
// real catalog and store reads, puts a readable Norwegian sentence above the live switch. Here the
// page is compiled, hydrated and signed into, the two reads are real HTTP, and the text asserted is
// the text a person sees.
//
// STATE. The journey arms the flag and then REMOVES the override, so the fixture ends where it
// started — `Events.Deposits` at its module default, off. Two sibling Events journeys assert that
// deposits and settlement stay down while `Events.Core` is up; leaving an override behind would
// change the world underneath them.
//
// ---- WHY THIS IS THE ONE TAGGED `@live` -------------------------------------------------------
//
// It is the first journey in this repo that runs against a real API on a real database, and it was
// chosen because its live world is the cheapest honestly seedable one — not because it is the most
// important. Every OTHER journey here still carries `@fixture` and still means it. What made this
// one reachable, checked against a live backend rather than assumed:
//
//   • THE CREDENTIAL IS REAL. `99999999 / 123123` is not a fixture invention: it is
//     `AppSettings.DemoPhoneNumber` / `AppSettings.DemoVerificationCode`, one of exactly two no-SMS
//     sign-ins the application has. The literal every admin journey types already exists live.
//   • IT ASSERTS NO FIXTURE DATA. This spec imports nothing from `fixture/world.js`. The blocker for
//     the others is that they assert a hard-coded store id, proposal token or request id that exists
//     in no real database; this one asserts a flag key, a rendered Norwegian sentence and a geometric
//     relation between two boxes, all of which are properties of the product.
//   • THE CATALOG MATCHES. `Events.Deposits` is contributed by `EventsFeatureFlags.Describe()` and
//     composed unconditionally in `Program.cs` — no `Events:Enabled` needed, because
//     `StoreFeatureFlagsController` gates on StoreAdmin alone. Its advertised default is `false`, so
//     a store with no override row really does read "Av" on a freshly migrated database.
//   • THE WORLD IS TWO ROWS. `test/e2e/scripts/live-world.sh` seeds a `Stores` row and a
//     `StoreAdmins` row and stops. It seeds NO flag override, deliberately: the flag board is this
//     journey's subject, and a seeded flag state would be seeding the answer.
//
// The write this journey makes is a flag override, and it is made BY THE BROWSER under the manager's
// own bearer token — so the row the server writes carries a resolved actor rather than a seed's
// ambient one. The seed itself writes no money-path row at all.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const DEPOSITS = 'Events.Deposits';
const CORE = 'Events.Core';

/** The one `.ff-row` whose key cell reads `flagKey`. */
const rowFor = (page, flagKey) =>
  page.locator('.ff-row', { has: page.locator('code.ff-row__key', { hasText: flagKey }) });

test(
  'the operator reads the deposit precondition on the row before arming the money path',
  journeyDetails({
    journey: 'events-deposit-precondition',
    surface: 'admin',
    // NOT `@fixture`. The tag is the difference between evidence and a test that quietly asserted
    // against the wrong world, so it is claimed only with the header above paid for. In live mode
    // this is the only journey selected; in fixture mode it still runs alongside the rest.
    tag: ['@live'],
    capabilities: [
      'platform.feature-flags.read',
      'platform.feature-flags.write',
      'events.deposits.arming-precondition-disclosed'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      await expect(page.locator('.ff-page__title')).toHaveText('Modulbrytere');
      return 'landed on /admin/feature-flags';
    });

    // ---- THE EXIT CRITERION ----------------------------------------------------------------------
    await journey.step('the deposits row states the precondition, above its own switch', async () => {
      const row = rowFor(page, DEPOSITS);
      await expect(row).toHaveCount(1);
      await expect(row.locator('.ff-row__badge')).toHaveText('Av');

      const note = row.locator('[data-precondition="' + DEPOSITS + '"]');
      await expect(note).toBeVisible();
      // The three things the sentence owes an operator: what must already be true, that nothing here
      // checks it, and — the one that keeps this honest — that arming it anyway still goes through.
      await expect(note).toContainText('ekte bestillinger');
      await expect(note).toContainText('betalingsoppsett');
      await expect(note).toContainText('Ingenting her sjekker det');
      await expect(note).toContainText('går gjennom');

      // ABOVE the control. A disclosure an operator meets after clicking has told them nothing, and
      // `boundingBox` is the only way to assert that in a rendered page rather than in markup order.
      const noteBox = await note.boundingBox();
      const switchBox = await row.locator('[data-flag-on="' + DEPOSITS + '"]').boundingBox();
      expect(noteBox).not.toBeNull();
      expect(switchBox).not.toBeNull();
      expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(switchBox.y);
      return (await note.textContent()).trim().slice(0, 140);
    });

    await journey.shot('the deposit row, its precondition above the switch');

    // A sentence on every row is a sentence nobody reads — and on the seventeen flags whose owners
    // state no such precondition it would be a claim that is simply untrue.
    await journey.step('no other flag on the board claims a precondition', async () => {
      const notes = page.locator('[data-precondition]');
      await expect(notes).toHaveCount(1);
      await expect(rowFor(page, CORE).locator('[data-precondition]')).toHaveCount(0);
      await expect(rowFor(page, 'workforce.publication').locator('[data-precondition]')).toHaveCount(0);
      const rows = await page.locator('.ff-row').count();
      expect(rows).toBeGreaterThan(1);
      return '1 precondition across ' + rows + ' flag rows';
    });

    await journey.step('the switch it sits above is live: arming still goes through', async () => {
      const row = rowFor(page, DEPOSITS);
      await row.locator('[data-flag-on="' + DEPOSITS + '"]').click();
      await expect(page.locator('.ff-page__toast')).toContainText(DEPOSITS, { timeout: 15000 });
      await expect(row.locator('.ff-row__badge')).toHaveText('På');
      // The precondition does not disappear once the flag is on. It is a standing condition on the
      // flag, and an operator auditing an armed money path has to be able to read what was owed.
      await expect(row.locator('[data-precondition="' + DEPOSITS + '"]')).toBeVisible();
      return 'armed, nothing refused it — which is the unenforced precondition, not a defect';
    });

    await journey.step('put the world back: remove the override', async () => {
      const row = rowFor(page, DEPOSITS);
      await row.locator('[data-flag-clear="' + DEPOSITS + '"]').click();
      await expect(page.locator('.ff-page__toast')).toContainText(DEPOSITS, { timeout: 15000 });
      await expect(row.locator('.ff-row__badge')).toHaveText('Av');
      await expect(row.locator('.ff-row__meta')).toHaveCount(0);
      return DEPOSITS + ' back at its module default, off';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED — the flow completed, so failing here would claim the capability does
      // not work, which is false. A browser error during a working flow is a finding for a person to
      // decide about, and they cannot decide about something nobody wrote down.
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the deposit-precondition journey', error);
      }
      return errors.length ? errors.length + ' recorded as findings' : 'nothing';
    });
  }
);
