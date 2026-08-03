// JOURNEY — an operator takes a module's kill switch down and puts it back up.
//
// THE DEFECT THIS EXISTS TO CLOSE. Six modules gate their write surfaces on per-store feature flags,
// every one of them deny-closed, and the routes that move them
// (`GET /feature-flags/catalog`, `GET/PUT/DELETE /stores/{id}/feature-flags`) had exactly one caller
// in the whole frontend: a READ, in the Growth send gate. Nothing anywhere wrote the PUT. So every
// stage flag on the branch was curl-only, and no operator could take a module down during an
// incident or bring one up for a pilot. `/admin/feature-flags` is that lever.
//
// WHAT IT PROVES THAT NO UNIT TEST CAN:
//
//   • The switchboard page reaches BOTH routes with a real bearer through the real client. The
//     fixture 401s anything without a token and 403s a store the caller does not administer.
//   • Flipping `workforce.publication` off in the browser really turns the schedule page's publish
//     into its typed refusal — the 409 `workforce.flag-disabled-read-only` the backend emits, with
//     the flag key on `flag` — rendered as a banner that NAMES the flag and links back here.
//   • And back on restores it: the same button then publishes. The refusal was the switch, not a
//     broken page.
//   • The refusal is READ-ONLY, not dark. With the switch down the week, its shift and its state
//     badge are all still on screen — §9.2's actual rule, and the difference between a module that
//     is off and a module that has lost your data.
//
// WHY THE ORDER IS on -> build -> off -> on. `workforce.publication` gates all FOUR schedule writes,
// so with it down there is no way to reach a Validated revision at all. The week has to be built
// while the switch is up; the switch then comes down on a week that is ready to publish, which is
// exactly the shape of the incident this lever exists for.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn, signedInUserId } = require('../support/admin');
const { assertStampedActor } = require('../support/journey-assertions');

const PUBLICATION = 'workforce.publication';

/** Presses one of the switchboard's controls for a named flag and waits for its toast. */
async function flip (page, action, flagKey, expected) {
  await page.locator('[data-flag-' + action + '="' + flagKey + '"]').click();
  await expect(page.locator('.ff-page__toast')).toContainText(expected, { timeout: 15000 });
}

test(
  'an operator turns the schedule publication switch off and the publish becomes its typed refusal',
  journeyDetails({
    journey: 'workforce-flag-lever',
    surface: 'admin',
    // NOT `@fixture`. Nothing in this file names a fixture id: the catalog it pins is the eighteen
    // keys `Program.cs` composes, the flag it flips is a real per-store override written by the
    // browser, and the store comes from whatever `adminIn` the signed-in manager has. What it DID
    // need was a world with a roster — the grid draws one row per engagement and this journey
    // authors into the first of them — and `test/e2e/scripts/live-world.sh` now seeds one.
    //
    // It does NOT need its own live world; it needs a RESET before it —
    // `test/e2e/scripts/live-world-reset.sh restore`, about nine seconds against forty-two for a
    // rebuild from empty. What it cannot inherit is a `workforce.publication` OVERRIDE: the second
    // step below asserts that flag reads "Av", which is the module default, and
    // `workforce-schedule-publish` turns it on and never clears it. Run after that journey with no
    // reset, this one reds on exactly that badge ("Expected: Av / Received: På"); run after a
    // restore, it is green. Both were reproduced — see lanes/L-LIVE-WORLD-RESTORE/.
    //
    // This journey leaves the world tidier than it found it on the flag (its last step clears its own
    // override) but not on the week, which it publishes.
    tag: ['@live'],
    capabilities: [
      'platform.feature-flags.read',
      'platform.feature-flags.write',
      'workforce.schedule.publish'
    ]
  }),
  async ({ page, journey }) => {
    // Who this run is, according to the app — captured at the door and compared against the audit
    // stamp the server writes three steps down. Held here rather than re-read there so the value
    // asserted against is the one the sign-in produced, not one a later navigation could have
    // replaced.
    let managerId = null;

    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      managerId = await signedInUserId(page);
      expect(managerId, 'the app knows which account it signed in as').toBeTruthy();
      return 'landed on /admin/feature-flags as ' + managerId;
    });

    await journey.step('the switchboard lists every module\'s flags, deny-closed', async () => {
      await expect(page.locator('.ff-page__title')).toHaveText('Modulbrytere');
      const rows = page.locator('.ff-row');
      await expect(rows.first()).toBeVisible();
      // Six modules, one page. The whole point of scoping this to the catalog rather than to
      // Workforce: the other five gain the same lever from the same screen.
      const modules = (await page.locator('.ff-module__title').allTextContents()).map(text => text.trim());
      expect(modules).toEqual(['Events', 'Growth', 'Margin', 'Meals', 'Training', 'Workforce']);

      // ...AND EVERY FLAG, NOT ONE PER MODULE. Those six titles were, until now, the only thing this
      // step compared to anything: `const count = await rows.count()` was read and then spent in the
      // returned prose, never asserted. A catalog that shrank to one flag per module — six rows, six
      // titles, twelve levers silently gone — stayed green, which is the same class of defect the
      // page itself exists to remove one level down. The whole set is pinned, in render order.
      //
      // TRANSCRIBED, NOT DERIVED. This list is written out rather than read from
      // `world.FEATURE_FLAG_CATALOG`, deliberately: an expectation computed from the same fixture the
      // API serves agrees with it by construction, so deleting a flag would delete it from both sides
      // in one edit and prove nothing. Written down, a shrunk or renamed catalog reds here.
      //
      // Order is the board's own: module name, then flag key, both `localeCompare` — see `buildBoard`.
      const CATALOG_KEYS = [
        'Events.Core', 'Events.Deposits', 'Events.Settlement',
        'growth.dispatch', 'growth.module',
        'Margin.Module', 'Margin.PriceImport', 'Margin.Statements',
        'meals.module',
        'training.assignments', 'training.setup',
        'workforce.clock', 'workforce.dispatch', 'workforce.exchange', 'workforce.module',
        'workforce.publication', 'workforce.selfservice', 'workforce.setup'
      ];
      await expect(rows).toHaveCount(CATALOG_KEYS.length);
      const keys = (await page.locator('.ff-row__key').allTextContents()).map(text => text.trim());
      expect(keys).toEqual(CATALOG_KEYS);

      // The publication switch starts OFF, because the module ships it off and nobody has flipped it.
      const publication = page.locator('.ff-row', { has: page.locator('code', { hasText: PUBLICATION }) });
      await expect(publication.locator('.ff-row__badge')).toHaveText('Av');
      return CATALOG_KEYS.length + ' flags across ' + modules.length + ' modules; ' + PUBLICATION + ' reads "Av"';
    });

    await journey.shot('the switchboard, everything deny-closed');

    await journey.step('turn schedule publication ON', async () => {
      await flip(page, 'on', PUBLICATION, PUBLICATION);
      const publication = page.locator('.ff-row', { has: page.locator('code', { hasText: PUBLICATION }) });
      await expect(publication.locator('.ff-row__badge')).toHaveText('På');
      // THE FLIP IS ATTRIBUTED TO THE PERSON WHO FLIPPED IT.
      //
      // This step used to assert only that the row said "Sist endret av" and did not say "ukjent" —
      // which passes for ANY named actor, the wrong one included, and a kill switch attributed to
      // somebody who did not touch it is a worse audit trail than one attributed to nobody. The
      // reasoning behind the weak form was sound and its conclusion was not: the actor is a user id
      // against a live backend and the string `user-manager` against the fixture, so pinning either
      // literal would make this journey true in exactly one world.
      //
      // It does not have to be pinned. The strong form holds in BOTH worlds, because both sides of
      // it move together and neither is derived from the other: the stamp is `updatedByReference`,
      // which the API resolves from the BEARER (`ActorClaims.ResolveUserId`) and never from anything
      // the client sent, and `managerId` is what `GET /user` answered at the door. Live they are both
      // the user id (`unique_name` is minted from `user.Id`); against the fixture they are both
      // `user-manager`. An actor column that named anybody else now reds here.
      const stamp = publication.locator('.ff-row__meta');
      await expect(stamp).toHaveCount(1);
      await expect(stamp).toContainText('Sist endret av');
      const attributed = assertStampedActor({
        stampText: await stamp.textContent(),
        userId: managerId
      });
      return 'override written, attributed to the signed-in manager (' + attributed.userId + '): ' +
        attributed.stamp;
    });

    await journey.step('build a week and validate it', async () => {
      await page.goto('/admin/workforce-schedule');
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan');

      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet');

      const addButtons = page.locator('.wf-grid__row:not(.wf-grid__row--open) .wf-grid__add');
      await expect(addButtons.first()).toBeVisible();
      await addButtons.first().click();
      const editor = page.locator('.wf-editor');
      await editor.locator('input[type="time"]').first().fill('08:00');
      await editor.locator('input[type="time"]').nth(1).fill('16:00');
      await editor.getByRole('button', { name: 'Lagre vakt' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn');

      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert');
      return 'one shift, revision Validert — publish is offered';
    });

    await journey.step('turn the switch back OFF while the week waits to be published', async () => {
      // Reached by CLICKING THE SIDEBAR rather than by typing the URL, and only here. C3 says a
      // capability exists when it is reachable, and every `page.goto` in this file is a way of
      // reaching the page that no operator has. This is the one that proves the nav entry is real:
      // the estate has already shipped two module pages linked from nothing at all.
      await page.getByRole('link', { name: 'Modulbrytere' }).click();
      await page.waitForURL(url => url.pathname === '/admin/feature-flags', { timeout: 30000 });
      await expect(page.locator('.ff-page__title')).toHaveText('Modulbrytere');
      await flip(page, 'off', PUBLICATION, PUBLICATION);
      const publication = page.locator('.ff-row', { has: page.locator('code', { hasText: PUBLICATION }) });
      await expect(publication.locator('.ff-row__badge')).toHaveText('Av');
      // The store is whichever one the signed-in manager administers, and this detail lands in an
      // artifact somebody reads later — so it names no id rather than naming the fixture's.
      return PUBLICATION + ' is off for this store';
    });

    // ---- THE EXIT CRITERION ----------------------------------------------------------------------
    await journey.step('the publish now answers its typed refusal, naming the flag', async () => {
      await page.goto('/admin/workforce-schedule');
      // Still Validated, so the button is still offered — the refusal has to come from the SERVER,
      // not from a page that guessed and hid the control.
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert');
      const publish = page.getByRole('button', { name: 'Publiser', exact: true });
      await expect(publish).toBeVisible();
      await publish.click();

      const banner = page.locator('.wf-page__conflict');
      await expect(banner).toBeVisible({ timeout: 15000 });
      await expect(banner).toContainText('skrivebeskyttet');
      // The flag key is IN the sentence. A refusal that named no lever is one nobody can act on.
      await expect(banner).toContainText(PUBLICATION);
      // ...and the way to the lever is a link, in the same banner.
      await expect(banner.locator('a')).toHaveAttribute('href', '/admin/feature-flags');
      return (await banner.textContent()).trim().slice(0, 160);
    });

    await journey.shot('publish refused, the flag named');

    await journey.step('READ-ONLY, not dark: the week is all still there', async () => {
      // §9.2's rule is that a downed stage flag makes the surface read-only — reads and exports of
      // what is already captured keep working. A page that blanked instead would look, to a manager
      // in an incident, exactly like data loss.
      await expect(page.locator('.wf-grid__shift')).toHaveCount(1);
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert');
      await expect(page.locator('.wf-page__meta').first()).toContainText('Revisjon');
      return 'one shift, revision and state band all still rendered';
    });

    await journey.step('turn it back ON and publish', async () => {
      await page.goto('/admin/feature-flags');
      await flip(page, 'on', PUBLICATION, PUBLICATION);

      await page.goto('/admin/workforce-schedule');
      const publish = page.getByRole('button', { name: 'Publiser', exact: true });
      await expect(publish).toBeVisible();
      await publish.click();
      await expect(page.locator('.wf-page__toast')).toContainText('Publisert til');
      await expect(page.locator('.wf-page__badge')).toHaveText('Publisert');
      // The refusal is gone rather than lingering beside a successful publish.
      await expect(page.locator('.wf-page__conflict')).toHaveCount(0);
      return (await page.locator('.wf-page__toast').textContent()).trim();
    });

    await journey.shot('published, with the switch back up');

    await journey.step('removing the override reverts the flag to the module default', async () => {
      await page.goto('/admin/feature-flags');
      const publication = page.locator('.ff-row', { has: page.locator('code', { hasText: PUBLICATION }) });
      await expect(publication.locator('.ff-row__badge')).toHaveText('På');
      await flip(page, 'clear', PUBLICATION, PUBLICATION);
      // Back to the module's own answer, which for this flag is off. The page re-read to find that
      // out rather than assuming it — the DELETE answers only `{ flagKey, cleared }`.
      await expect(publication.locator('.ff-row__badge')).toHaveText('Av');
      await expect(publication.locator('.ff-row__meta')).toHaveCount(0);
      return 'override removed; the flag reads the module default again';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does
      // not work, which is false. A browser error during a working flow is a finding somebody has to
      // decide about, and they cannot decide about something nobody wrote down.
      // The 409 is excluded BY THIS JOURNEY ONLY, and only because this journey is the one that
      // asks for it: the refused publish above is the subject, and the browser logs every non-2xx
      // response as a console error. Filing "the server answered 409" as a defect here would put a
      // finding in the artifact for the thing that working correctly looks like. Any OTHER status —
      // and every 409 in every other journey — is still recorded.
      const noise = /favicon|Download the Vue Devtools|status of 409 \(Conflict\)/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the flag-lever journey', error);
      }
      return errors.length ? errors.length + ' recorded as findings' : 'nothing';
    });
  }
);
