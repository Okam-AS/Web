// JOURNEY — a manager defines the stations a newly opened venue runs, and can then plan a week.
//
// THE DEFECT THIS WALKS, AND WHY IT NEEDED A BROWSER TO SEE. `PUT /workforce/stores/{id}/roles` (#9)
// has been live on the wire since W1 and had NO CALLER IN ANY BROWSER: `utils/workforce/roster-client.js`
// recorded the omission in a comment ("creating and retiring the store's job-role catalogue is a
// screen of its own") and the screen was never built. Every backend suite was green, because the
// endpoint works — what did not exist was any way for a person to reach it.
//
// The cost is not abstract, and it is the whole subject of this file: a role is the axis every
// planning surface pivots on, so a store whose catalogue nobody had seeded OUT OF BAND could not be
// scheduled at all. Steps 4 and 6 below assert that dead end on screen before step 7 fixes it. A test
// that only asserted the happy end would pass just as well against a world where somebody had curled
// the roles in, which is precisely the evidence this journey exists not to produce.
//
// WHY A SECOND STORE. `world.STORE_ID` is a venue in mid-life whose role catalogue is seeded in
// `fixture/world.js` — Barista and Kjøkken — because other journeys need roles to pick. Proving a
// SETUP capability there would prove only that a list renders. `world.VIRGIN_STORE_ID` (44) is the
// other case and the one every real venue starts in: opened last week, two people hired, and not one
// role defined. Its catalogue is an EMPTY ARRAY in `seededRoleCatalogue()` — not an absent key, so
// "this store has no roles" stays a positive answer distinct from "the read failed" — and step 4
// reads that emptiness off the screen rather than trusting the seed. Step 9 closes the loop from the
// other side by asserting the NETWORK LOG: no write to any `/roles` route happened before the click
// in step 7. Between them, the role that ends up in the select in step 8 can only have come from the
// browser.
//
// NOT `@fixture`-only in spirit but tagged so: it names `Nyåpnet Filial`, a store that exists in this
// fixture's world and not on a live backend, so it must not be selected in live mode.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

// The station this manager decides the new venue runs. Deliberately NOT 'Barista' or 'Kjøkken':
// those are the two roles seeded on the OTHER store, and a name that collided with them would leave
// a green run ambiguous between "the browser created this" and "the wrong store answered".
const ROLE_NAME = 'Barvakt';
const ROLE_STATION = 'Bar';

// The one option a role select carries before any role exists — `wf_role_none`. Its presence is what
// makes "the select is empty" checkable: the control renders, it simply has nothing to offer.
const NO_ROLE_OPTION = 'Uten funksjon';

test(
  'A manager creates a role on a store that has none, and it reaches the schedule editor',
  journeyDetails({
    journey: 'workforce-role-catalogue',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'workforce.roles.read',
      'workforce.roles.author',
      'workforce.schedule.author'
    ]
  }),
  async ({ page, journey }) => {
    // Every request the browser makes to a role route, in order. Read in step 9; collected from the
    // first navigation so there is no window in which a write could go unrecorded.
    const roleRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (/\/roles$/.test(url.pathname)) {
        roleRequests.push(request.method() + ' ' + url.pathname);
      }
    });

    await journey.step('open the role catalogue as an anonymous visitor', async () => {
      await page.goto('/admin/workforce-roles');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-roles' });
      return 'landed back on /admin/workforce-roles';
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

    await journey.step('THE DEFECT (1/2): this store has no roles at all', async () => {
      await expect(page.locator('.wfrl-page__title')).toHaveText('Funksjoner');
      // The EMPTY answer, not the unknown one. `.wfrl-page__unknown` would mean the read failed, and
      // a failed read must never be mistaken for a store with no roles — so the assertion names the
      // element that only renders for a positive, empty list.
      await expect(page.locator('[data-wfrl-empty]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.wfrl-page__unknown')).toHaveCount(0);
      await expect(page.locator('.wfrl-table__row')).toHaveCount(0);
      return 'role list renders the positive empty state; zero rows';
    });

    await journey.shot('a virgin store: no roles defined');

    await journey.step('turn the schedule publication switch on for this store', async () => {
      // Not scope creep: all four schedule writes are gated on `workforce.publication`, which is
      // deny-closed, so step 6 could not create a draft without it. It is flipped through the
      // operator's page like every other journey does it. NOTE it is per-store — flipping it on the
      // other venue would not help this one, which is itself part of what "a virgin store" means.
      await turnOn(page, 'workforce.publication');
      return 'workforce.publication on for Nyåpnet Filial';
    });

    await journey.step('THE DEFECT (2/2): the shift editor offers a role select with nothing in it', async () => {
      await page.goto('/admin/workforce-schedule');
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan');

      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet');

      const addButtons = page.locator('.wf-grid__row:not(.wf-grid__row--open) .wf-grid__add');
      await expect(addButtons.first()).toBeVisible();
      await addButtons.first().click();

      const editor = page.locator('.wf-editor');
      await expect(editor).toBeVisible();

      // THE ASSERTION THIS JOURNEY WAS WRITTEN FOR. The control is present and functional; it simply
      // has nothing to offer, which is what makes the week unplannable rather than the page broken.
      const roleSelect = editor.locator('select').nth(1);
      const options = await roleSelect.locator('option').allTextContents();
      expect(options.map(o => o.trim())).toEqual([NO_ROLE_OPTION]);

      await editor.locator('.wf-editor__close').click();
      await expect(editor).toHaveCount(0);
      return 'role select offers exactly one option: "' + NO_ROLE_OPTION + '"';
    });

    await journey.shot('the empty role axis, in the shift editor');

    await journey.step('reach the role catalogue from the sidebar and create a role', async () => {
      // CLICKED, not `goto`. A page reachable only by typing its URL is the exact defect the estate
      // has shipped four times, and `goto` cannot tell the difference. This is the navigation half of
      // C3 being walked rather than asserted in a unit test.
      //
      // Located by the LABEL a manager reads rather than by href — a link present under the wrong
      // name is not a link anybody finds, and the converse walk in `admin-nav-access.test.js` can
      // only see the path. (`getByRole` cannot be used here: the item carries an "isNew" badge, so
      // the link's accessible name is "Funksjoner Ny" rather than the label on its own.)
      const navLink = page.locator('a.admin-nav__link', {
        has: page.locator('.admin-nav__label', { hasText: 'Funksjoner' })
      });
      await expect(navLink).toHaveCount(1);
      await expect(navLink).toHaveAttribute('href', /\/admin\/workforce-roles/);
      await navLink.click();
      await page.waitForURL(/\/admin\/workforce-roles/, { timeout: 30000 });
      await expect(page.locator('.wfrl-page__title')).toHaveText('Funksjoner');

      await page.locator('[data-wfrl-name]').fill(ROLE_NAME);
      await page.locator('[data-wfrl-station]').fill(ROLE_STATION);
      await page.locator('[data-wfrl-submit]').click();

      await expect(page.locator('.wfrl-page__toast')).toContainText('Funksjonen er lagt til', { timeout: 15000 });
      // Read back off the LIST, which the page rebuilds from the write's response body — so this is
      // the server's catalogue, not the form's optimism.
      await expect(page.locator('[data-wfrl-role="' + ROLE_NAME + '"]')).toBeVisible();
      await expect(page.locator('[data-wfrl-empty]')).toHaveCount(0);
      return 'created "' + ROLE_NAME + '" (' + ROLE_STATION + ') by clicking';
    });

    await journey.shot('the role catalogue, authored in the browser');

    await journey.step('THE EXIT: the new role is in the schedule editor\'s role select', async () => {
      await page.goto('/admin/workforce-schedule');
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan');

      const addButtons = page.locator('.wf-grid__row:not(.wf-grid__row--open) .wf-grid__add');
      await expect(addButtons.first()).toBeVisible();
      await addButtons.first().click();

      const editor = page.locator('.wf-editor');
      await expect(editor).toBeVisible();
      const roleSelect = editor.locator('select').nth(1);
      const options = (await roleSelect.locator('option').allTextContents()).map(o => o.trim());
      expect(options).toEqual([NO_ROLE_OPTION, ROLE_NAME]);

      // Picking it and saving is what makes the claim "the week can now be planned" rather than "a
      // string appeared in a dropdown": the id behind the option has to be one the assignment write
      // accepts, and the grid has to be able to draw it back.
      await roleSelect.selectOption({ label: ROLE_NAME });
      await editor.locator('input[type="time"]').first().fill('08:00');
      await editor.locator('input[type="time"]').nth(1).fill('16:00');
      await editor.getByRole('button', { name: 'Lagre vakt' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn');

      const shift = page.locator('.wf-grid__shift').first();
      await expect(shift).toBeVisible();
      const role = (await shift.locator('.wf-grid__shift-role').textContent()).trim();
      expect(role).toBe(ROLE_NAME);
      return 'shift saved on the grid carrying role "' + role + '"';
    });

    await journey.shot('a week that can now be planned');

    // Not `async`: this step reads a log the page listener already filled, and awaits nothing. An
    // `async` wrapper here would be a promise that never yields, which `require-await` rightly calls
    // out — and on a step whose whole job is to inspect what already happened, it would also be a lie
    // about the step doing any waiting.
    await journey.step('and nothing wrote a role before the manager clicked', () => {
      // The virginity claim, from the other side. If some earlier step — or a fixture backdoor, or a
      // helper being "helpful" — had seeded the catalogue, there would be a write here before the
      // create in step 7. There is exactly ONE write in the whole run, and everything before it is a
      // read.
      const writes = roleRequests.filter(r => !r.startsWith('GET '));
      expect(writes).toEqual(['PUT /workforce/stores/44/roles']);

      const firstWriteAt = roleRequests.findIndex(r => !r.startsWith('GET '));
      const before = roleRequests.slice(0, firstWriteAt);
      expect(before.every(r => r.startsWith('GET '))).toBe(true);
      return before.length + ' role reads, then exactly one write: ' + writes[0];
    });

    await journey.step('the create button is clickable at a laptop width', async () => {
      // A sibling lane found a control unclickable at 1280 because a table escaped its grid track and
      // the next column painted over it. Measured at the button's own centre rather than asserted
      // from CSS, because `toBeVisible` is satisfied by an element something else is covering.
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/admin/workforce-roles');
      const submit = page.locator('[data-wfrl-submit]');
      await expect(submit).toBeVisible();

      const covering = await page.evaluate(() => {
        const el = document.querySelector('[data-wfrl-submit]');
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit === el || el.contains(hit) ? 'clear' : (hit ? hit.className || hit.tagName : 'nothing');
      });
      expect(covering).toBe('clear');

      // The table beside it must scroll inside its own track rather than widening the page.
      const overflows = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflows).toBe(false);
      return 'clear at 1280x720, no horizontal page overflow';
    });
  }
);
