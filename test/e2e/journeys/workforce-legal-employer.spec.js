// JOURNEY — a newly opened venue registers the company that employs its staff, and can then hire.
//
// THE DEFECT THIS WALKS. `WorkforceLegalEmployer` had NO WRITER ANYWHERE IN PRODUCTION CODE.
// `POST /workforce/stores/{id}/staff` (#3) requires a `legalEmployerId`, nothing minted one, and the
// demo world only had an employer because `Scripts/demo/seed-workforce-demo.sh` inserts one in raw
// SQL — which its own comment admits a real customer cannot do. The admin web compounded it exactly
// the way the roles page used to: `legalEmployerOptions` mined employer ids OUT OF THE STAFF LIST,
// so the only employers it could offer were ones somebody was already employed under, rendered as
// bare GUIDs because no route returned a name.
//
// The consequence is the subject of steps 4 and 5: a store that needs a legal employer it does not
// already employ people under cannot get one, so it cannot hire — and a manager who registered one
// out of band and reloaded would be shown nothing and register the company a SECOND time, which
// silently defeats the one-active-engagement-per-legal-employer rule, since that rule keys on the id.
//
// WHY THE SECOND STORE. `world.STORE_ID` is a venue in mid-life whose employer is seeded in
// `fixture/world.js`, so proving a SETUP capability there would prove only that a list renders.
// `world.VIRGIN_STORE_ID` (44) is the case every real venue starts in, and `seededLegalEmployers()`
// gives it an EMPTY ARRAY — not an absent key, so "this store has registered no employer" stays a
// positive answer distinct from "the read failed", which is the distinction the whole form turns on.
// Step 9 closes the loop from the other side by reading the NETWORK LOG: no write to any
// `/legal-employers` route happened before the click in step 6.
//
// WHERE IT STOPS, AND WHY. The journey ends when the registered company is offered by the hiring
// form's own picker, not when somebody is hired: `POST /staff` (#3) has no fixture handler, and
// writing one is a second lane's worth of surface. `workforce-role-catalogue.spec.js` stops at the
// same place for the same reason. That the hire itself succeeds against a registered employer is
// proved in the backend suite (`WorkforceLegalEmployerTests`, which runs the real controller).
//
// Tagged `@fixture`: it names `Nyåpnet Filial`, a store that exists in this fixture's world and not
// on a live backend, so it must not be selected in live mode.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

// The company this manager registers. Deliberately NOT `Okam Pilot Servering AS` / `923456789`:
// that is the employer seeded on the OTHER store, and a name that collided with it would leave a
// green run ambiguous between "the browser registered this" and "the wrong store answered".
const COMPANY_NAME = 'Nyåpnet Filial AS';

// Typed WITH the spaces a Norwegian organization number is written with on a letterhead. The server
// strips them, which is what makes the spaced and unspaced forms one company rather than two — so
// the value asserted on screen afterwards is deliberately the unspaced one.
const ORG_NUMBER_TYPED = '998 877 665';
const ORG_NUMBER_STORED = '998877665';

test(
  'A manager registers a legal employer on a store that has none, and it reaches the hiring form',
  journeyDetails({
    journey: 'workforce-legal-employer',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'workforce.legal-employer.read',
      'workforce.legal-employer.register',
      'workforce.staff.author'
    ]
  }),
  async ({ page, journey }) => {
    // Every request the browser makes to a legal-employer route, in order. Read in step 9; collected
    // from the first navigation so there is no window in which a write could go unrecorded.
    const employerRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (/\/legal-employers$/.test(url.pathname)) {
        employerRequests.push(request.method() + ' ' + url.pathname);
      }
    });

    await journey.step('open the roster as an anonymous visitor', async () => {
      await page.goto('/admin/workforce-roster');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-roster' });
      return 'landed back on /admin/workforce-roster';
    });

    await journey.step('switch to the newly opened venue', async () => {
      // Through the header's own picker, not by seeding `selectedAdminStore`: the store a manager is
      // looking at is a thing they choose, and a journey that wrote it to localStorage would prove
      // the pages read a variable rather than that the venue is reachable.
      await page.locator('.store-dropdown').click();
      await page.locator('.store-dropdown-item', { hasText: 'Nyåpnet Filial' }).click();
      await expect(page.locator('.store-dropdown .store-name')).toHaveText('Nyåpnet Filial');
      return 'now administering Nyåpnet Filial';
    });

    await journey.step('THE DEFECT: the hiring form cannot name an employer, so nobody can be hired', async () => {
      await expect(page.locator('.wfr-page__title')).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: 'Legg til person' }).click();

      // The EMPTY answer, not the unknown one. `[data-wfr-add-employer-unknown]` would mean the read
      // failed, and a failed read must never be mistaken for a store with no employer — offering to
      // register one there is exactly how a duplicate company gets created.
      await expect(page.locator('[data-wfr-add-no-employer]')).toBeVisible();
      await expect(page.locator('[data-wfr-add-employer-unknown]')).toHaveCount(0);
      await expect(page.locator('[data-wfr-add-employer]')).toHaveCount(0);

      // The form is present and functional; it simply has nothing to hire under, which is what makes
      // the store unstaffable rather than the page broken.
      const submit = page.getByRole('button', { name: 'Legg til', exact: true });
      await expect(submit).toBeDisabled();
      return 'the add form blocks: no legal employer, and the submit is disabled';
    });

    await journey.shot('a virgin store: no legal employer, nobody can be hired');

    await journey.step('the form offers the way out rather than a dead end', async () => {
      // The old copy said an engagement "cannot be created here" and stopped. There was nowhere to go
      // — which was true then and is the thing this lane changed.
      await page.locator('[data-wfr-add-register-employer]').click();
      await expect(page.locator('[data-wfr-emp-name]')).toBeVisible();
      // The registration form shows what is already registered, and this store's answer is the
      // positive empty one.
      await expect(page.locator('[data-wfr-emp-none]')).toBeVisible();
      await expect(page.locator('[data-wfr-emp-unknown]')).toHaveCount(0);
      return 'the registration form opened from the hiring form\'s blocker';
    });

    await journey.step('register the company, typing the organization number the way it is written', async () => {
      await page.locator('[data-wfr-emp-name]').fill(COMPANY_NAME);
      await page.locator('[data-wfr-emp-orgnr]').fill(ORG_NUMBER_TYPED);
      await page.locator('[data-wfr-emp-submit]').click();

      await expect(page.locator('.wfr-page__toast')).toContainText('juridiske arbeidsgiveren er registrert', { timeout: 15000 });
      return 'registered "' + COMPANY_NAME + '" (' + ORG_NUMBER_TYPED + ')';
    });

    await journey.shot('the legal employer, registered in the browser');

    await journey.step('THE EXIT: the hiring form now names the company and will accept a hire', async () => {
      // The page reopens the add form itself after a successful registration — registering is never
      // the goal, it is the thing in the way of the goal.
      const picker = page.locator('[data-wfr-add-employer]');
      await expect(picker).toBeVisible({ timeout: 15000 });

      // The COMPANY, not a GUID. Naming it is the whole reason the read endpoint exists, and the
      // spaces are gone because the server stripped them — so "998 877 665" and "998877665" are one
      // company rather than two rows the D1 rule could be walked around with.
      await expect(picker).toContainText(COMPANY_NAME);
      await expect(picker).toContainText(ORG_NUMBER_STORED);
      await expect(page.locator('[data-wfr-add-no-employer]')).toHaveCount(0);

      // And the form is now submittable — the blocker in step 4 is gone, not merely re-worded.
      await page.locator('.wfr-add__input[type="text"]').first().fill('Sara Ny');
      const submit = page.getByRole('button', { name: 'Legg til', exact: true });
      await expect(submit).toBeEnabled();
      return 'the picker offers "' + COMPANY_NAME + ' · ' + ORG_NUMBER_STORED + '" and the hire is submittable';
    });

    await journey.shot('a store that can now hire its first person');

    await journey.step('registering the same company twice is refused, and the refusal names the row', async () => {
      // Two rows for one company would let a person hold two active engagements with the same
      // employer — the exact thing the one-active-engagement index prevents, defeated through the
      // data instead of the code. Asserted from the SCREEN, because a manager who is not told this
      // reads it as a bug and registers a third.
      await page.locator('[data-wfr-open-employer]').click();
      await page.locator('[data-wfr-emp-name]').fill(COMPANY_NAME);
      await page.locator('[data-wfr-emp-orgnr]').fill(ORG_NUMBER_STORED);
      await page.locator('[data-wfr-emp-submit]').click();

      const band = page.locator('.wfr-page__conflict');
      await expect(band).toBeVisible({ timeout: 15000 });
      await expect(band).toContainText('Allerede registrert');
      return 'the second registration is refused on screen';
    });

    // Not `async`: this step reads a log the page listener already filled, and awaits nothing.
    await journey.step('and nothing registered an employer before the manager clicked', () => {
      // The virginity claim, from the other side. If some earlier step — or a fixture backdoor — had
      // seeded the employer, there would be a write here before the registration in step 6.
      const writes = employerRequests.filter(r => !r.startsWith('GET '));
      expect(writes).toEqual([
        'POST /workforce/stores/44/legal-employers',
        'POST /workforce/stores/44/legal-employers'
      ]);

      const firstWriteAt = employerRequests.findIndex(r => !r.startsWith('GET '));
      const before = employerRequests.slice(0, firstWriteAt);
      expect(before.every(r => r.startsWith('GET '))).toBe(true);
      return before.length + ' employer reads, then the registration and the refused duplicate';
    });

    await journey.step('the register button is clickable at a laptop width', async () => {
      // A sibling lane found a control unclickable at 1280 because a panel escaped its grid track and
      // the next column painted over it. Measured at the button's own centre rather than asserted
      // from CSS, because `toBeVisible` is satisfied by an element something else is covering.
      await page.setViewportSize({ width: 1280, height: 720 });
      const submit = page.locator('[data-wfr-emp-submit]');
      await expect(submit).toBeVisible();

      const covering = await page.evaluate(() => {
        const el = document.querySelector('[data-wfr-emp-submit]');
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit === el || el.contains(hit) ? 'clear' : (hit ? hit.className || hit.tagName : 'nothing');
      });
      expect(covering).toBe('clear');

      const overflows = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflows).toBe(false);
      return 'clear at 1280x720, no horizontal page overflow';
    });
  }
);
