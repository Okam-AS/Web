// JOURNEY — a real venue switches Workforce on for itself, and the door then shuts behind it.
//
// THE DEADLOCK THIS WALKS. Workforce capability is resolved ONLY from an active engagement
// (`WorkforceAuthorizationService`, whose own class doc records that it has no access to
// `StoreAdmin`/`PowerUser` and takes no role argument, so capability can never be inferred from
// platform administration). Creating staff requires `WorkforceManager`; `WorkforceManager` comes
// from being staff; and `WorkforceStaffMember.LegalEmployerId` is non-nullable while registering a
// legal employer is itself gated on `WorkforceManager`. A store with zero Workforce staff therefore
// had NO caller in the world who could pass any Workforce gate, and was locked out of both halves of
// its own first run. Every world that exists today was bootstrapped by hand in SQL —
// `Scripts/demo/seed-workforce-demo.sh` says so in its own header.
//
// WHY THIS HAS TO BE A LIVE RUN. The claim is not "a form renders": it is that a store administrator
// who holds no Workforce capability is refused by the roster, may nevertheless mint the first
// engagement ONCE, and is then refused again — decided by a real database (`PK_WorkforceFirstRuns`)
// against a real API. A fixture that answered those four responses would be asserting its own script.
// So the journey is tagged `@live` and runs against a real backend with a real SQL Server catalog.
//
// WHAT IT NEEDS OF THE WORLD, and it is deliberately little: a store the signed-in manager
// administers that has ZERO rows in `WorkforceStaffMembers`. `E2E_FIRST_RUN_STORE` names it. The
// journey refuses to run without it rather than falling back to the seeded venue, because the seeded
// venue HAS staff and the walk would then prove the opposite of what it claims — a shut door looks
// exactly like a working one if you never see it open.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

// The venue with no Workforce staff. Named rather than discovered: a journey that went looking for
// "a store that looks empty" could pick one whose roster it was merely refused, which is the exact
// confusion the seam itself is careful about.
const STORE_NAME = process.env.E2E_FIRST_RUN_STORE || 'Solsiden Kro';

// The company the owner registers, and the name they will appear under. Deliberately NOT the seeded
// world's `Bryggen Bistro AS` / `912345678`: a value that collided with the other store's employer
// would leave a green run ambiguous between "the browser registered this" and "the wrong store
// answered".
const COMPANY_NAME = 'Solsiden Kro AS';
const ORG_NUMBER_TYPED = '998 877 665';
const OWNER_NAME = 'Ingrid Moen';

test(
  'A store administrator sets an empty venue up on Workforce, once, and the door shuts',
  journeyDetails({
    journey: 'workforce-first-run',
    surface: 'admin',
    tag: ['@live'],
    capabilities: [
      'workforce.first-run.read',
      'workforce.first-run.bootstrap',
      'workforce.staff.read'
    ]
  }),
  async ({ page, journey }) => {
    // Every first-run request the browser makes, in order. Read in the last step: the claim that the
    // door shut is a claim about what the SERVER answered a second POST, and a page that had merely
    // hidden its own form would satisfy every visual assertion below.
    const firstRunCalls = [];
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (/\/first-run$/.test(url.pathname)) {
        firstRunCalls.push(response.request().method() + ' ' + url.pathname + ' -> ' + response.status());
      }
    });

    await journey.step('open the roster as an anonymous visitor', async () => {
      await page.goto('/admin/workforce-roster');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 60000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the venue owner (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-roster' });
      return 'landed back on /admin/workforce-roster';
    });

    await journey.step('switch to the venue that has never used Workforce', async () => {
      // Through the header's own picker rather than by seeding `selectedAdminStore`: the store a
      // manager is looking at is a thing they choose, and a journey that wrote it to localStorage
      // would prove the page reads a variable rather than that the venue is reachable.
      await page.locator('.store-dropdown').click();
      await page.locator('.store-dropdown-item', { hasText: STORE_NAME }).click();
      await expect(page.locator('.store-dropdown .store-name')).toHaveText(STORE_NAME);
      return 'now administering ' + STORE_NAME;
    });

    await journey.step('THE DEADLOCK: the owner is offered the bootstrap, not a permission message', async () => {
      // The form appearing at all is the server's answer, not the page's guess: the page renders it
      // only after `GET /context` refused it AND `GET /first-run` answered `isOpen: true`.
      await expect(page.locator('[data-wfr-first-run]')).toBeVisible({ timeout: 60000 });
      // The ordinary "you hold no workforce capability" blocker is NOT what an owner of an unset-up
      // store is shown — that message is true and useless, since nobody in the world can grant the
      // capability it names.
      await expect(page.locator('.wfr-page__blocker')).toHaveCount(0);
      return 'the first-run form is on screen for a caller with no Workforce capability';
    });

    await journey.step('the consequence is stated before it happens', async () => {
      // Creating the first engagement switches `workforce.module` ON for this store whatever the
      // operator ticks — the gate grandfathers any store with an engagement. So the honest design is
      // not to hide the activation but to refuse to perform it unconfirmed, and the submit stays
      // disabled until the box is ticked even with every field filled.
      await page.locator('[data-wfr-first-employer]').fill(COMPANY_NAME);
      await page.locator('[data-wfr-first-orgnr]').fill(ORG_NUMBER_TYPED);
      await page.locator('[data-wfr-first-name]').fill(OWNER_NAME);

      await expect(page.locator('[data-wfr-first-consent]')).toBeVisible();
      await expect(page.locator('[data-wfr-first-submit]')).toBeDisabled();
      return 'the module activation is named, and the submit is disabled until it is acknowledged';
    });

    await journey.shot('an empty venue is offered its first run, with the activation spelled out');

    await journey.step('the owner acknowledges, and mints the store\'s first engagement', async () => {
      await page.locator('[data-wfr-first-confirm]').check();
      await expect(page.locator('[data-wfr-first-submit]')).toBeEnabled();
      await page.locator('[data-wfr-first-submit]').click();

      // The page reloads as somebody who now HOLDS a capability: the roster renders, which it could
      // not do a moment ago. `init()` rather than a roster reload is what makes that true — the
      // caller's capabilities had to be re-read, not just their staff list.
      await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('[data-wfr-first-run]')).toHaveCount(0);
      return 'the roster rendered for the login that was refused it two steps ago';
    });

    await journey.step('the owner is on their own roster, and may now hire', async () => {
      await expect(page.getByText(OWNER_NAME)).toBeVisible();
      // The write gate too, not only the read gate: `WorkforceManager` is what puts this button on
      // screen, and without it the bootstrap would have moved the deadlock one step later rather
      // than breaking it.
      await expect(page.getByRole('button', { name: 'Legg til person' })).toBeVisible();
      return 'the first engagement is on the roster and the hiring control is available';
    });

    await journey.shot('a venue that can now run its own roster');

    await journey.step('THE DOOR IS SHUT: the bootstrap cannot be run a second time', async () => {
      // Asked of the SERVER, not of the page. The form is gone from the screen, but a screen is not a
      // guard — the claim is that the endpoint itself now refuses, and the only way to ask it is to
      // ask it.
      const refusal = await page.evaluate(async ({ base, store }) => {
        const state = JSON.parse(window.localStorage.getItem('state') || '{}');
        const token = state.currentUser && state.currentUser.token;
        const response = await fetch(base + '/workforce/stores/' + store + '/first-run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
            'Idempotency-Key': 'journey-second-attempt-' + Date.now()
          },
          body: JSON.stringify({
            confirmModuleActivation: true,
            organizationNumber: '111222333',
            legalEmployerName: 'Second Attempt AS',
            displayName: 'Second Attempt'
          })
        });
        return { status: response.status, body: await response.text() };
      }, {
        base: process.env.E2E_API_BASE_URL,
        store: await page.evaluate(() => JSON.parse(window.localStorage.getItem('state') || '{}').selectedAdminStore)
      });

      expect(refusal.status).toBe(409);
      expect(refusal.body).toContain('workforce.first-run-complete');
      // And it says what to do instead, rather than refusing opaquely.
      expect(refusal.body).toContain('WorkforceManager');
      return 'the second bootstrap is 409 workforce.first-run-complete';
    });

    await journey.step('the walk really went through the first-run routes', async () => {
      // The non-vacuity check. Every assertion above would also hold on a page that talked to nothing
      // at all, so the recorded traffic is what makes this a walk rather than a rendering.
      const posts = firstRunCalls.filter(c => c.startsWith('POST'));
      expect(firstRunCalls.some(c => c.startsWith('GET') && c.endsWith('200'))).toBe(true);
      expect(posts.filter(c => c.endsWith('200'))).toHaveLength(1);
      expect(posts.filter(c => c.endsWith('409'))).toHaveLength(1);
      return firstRunCalls.join(' | ');
    });
  }
);
