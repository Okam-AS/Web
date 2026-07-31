// JOURNEY — a refusal, and its boundary.
//
// The first two journeys prove the instrument can see a thing happen. This one proves it can see a
// thing NOT happen, which is the harder half: a test that only ever asserts presence will pass
// against a page that shows everything to everyone.
//
// The subject is the worker — somebody with a real account and no store-admin membership anywhere
// (`adminIn: []`). Three refusals and one permission, and the fourth is what makes the other three
// mean something. A blanket "the worker sees nothing" would be satisfied by a broken build.
//
//   REFUSED  the store-admin nav groups are not rendered      (utils/admin/nav-access.js -> worker)
//   REFUSED  /admin/workforce-schedule bounces to /registrer  (AdminPage.initAuth)
//   REFUSED  ...and no schedule control is on screen after it
//   ALLOWED  /admin/workforce-me renders                      (AdminPage allow-non-admin)
//
// The asymmetry in `nav-access.js` is deliberate and worth stating: the nav hides on a POSITIVE
// `worker` answer and never on `unknown`, so that an admin whose profile has not come back yet is
// shown too much rather than shown nothing. This journey only exercises the positive branch — the
// `unknown` branch would need a `/user` read that stalls, which is a different journey.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

test(
  'A worker is refused the store-admin schedule and is given their own page instead',
  journeyDetails({
    journey: 'admin-refusal-worker',
    surface: 'admin',
    capabilities: [
      'admin.shell.store-admin-guard',
      'admin.nav.worker-scoping',
      'workforce.me.reachable-without-membership'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as a worker who administers no store', async () => {
      await page.goto('/admin');
      await signIn(page, { phone: '90000001', code: '123123' });
      await expect(page).toHaveURL(/\/admin$/);
      return 'signed in as +4790000001, adminIn: []';
    });

    await journey.step('the sidebar offers no store-admin group', async () => {
      // `.admin-nav` is a zero-size wrapper; the drawn sidebar is the fixed-position child.
      const nav = page.locator('.admin-nav__sidebar');
      await expect(nav).toBeVisible();
      const text = await nav.textContent();

      // "Vaktplan" is the store-admin schedule link and it lives in the Moduler group. Its absence is
      // the refusal; the store selector's absence is the same fact from the other side.
      expect(text).not.toContain('Vaktplan');
      await expect(page.locator('.store-selector-container')).toHaveCount(0);

      // The one group a worker DOES get.
      expect(text).toContain('Min side');
      return 'no "Vaktplan", no store selector, "Min side" present';
    });

    await journey.shot('the worker sidebar');

    await journey.step('typing the store-admin URL directly is refused', async () => {
      // The nav is a courtesy; the guard is the shell. A worker who knows the path must still be
      // turned away, and turned away to somewhere that explains itself rather than to a blank page.
      await page.goto('/admin/workforce-schedule');
      await page.waitForURL(/\/registrer/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).pathname;
    });

    await journey.step('and nothing of the schedule is on screen', async () => {
      // The redirect is the mechanism; this is the claim. A route change that left the previous page's
      // DOM mounted would satisfy the URL assertion and refuse nothing.
      await expect(page.locator('.wf-page')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Opprett utkast' })).toHaveCount(0);
      await expect(page.locator('.wf-grid')).toHaveCount(0);
      return 'no .wf-page, no grid, no draft control';
    });

    await journey.shot('refused, on registrer');

    await journey.step('the worker\'s own page is NOT refused', async () => {
      // The boundary. `/admin/workforce-me` sets `allow-non-admin` because every route it calls
      // resolves the caller from their own token and takes no store id — so the person the shell
      // bounces everywhere else is precisely this page's intended reader.
      await page.goto('/admin/workforce-me');
      await expect(page.locator('.wfme__title')).toBeVisible({ timeout: 30000 });
      // It did not bounce.
      expect(new URL(page.url()).pathname).toBe('/admin/workforce-me');
      return 'reached /admin/workforce-me with adminIn: []';
    });

    await journey.shot('the worker own page');

    await journey.step('what the browser said while this ran', () => {
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the refusal journey', error);
      }
      return errors.length ? errors.length + ' recorded as findings' : 'nothing';
    });
  }
);
