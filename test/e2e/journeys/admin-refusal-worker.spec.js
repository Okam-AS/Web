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
//
// ---- THE CREDENTIAL, AND WHY THIS JOURNEY IS THE FIXTURE-ONLY ONE -----------------------------
//
// Recorded here rather than rediscovered, because it costs an hour every time. Read out of OkamAPI
// `feature/restaurant-modules` @ 5df07afa; every file:line below was checked, not remembered.
//
// `POST /User/login` (Controllers/UserController.cs:174-180) accepts a caller three ways:
//
//     verifiedDemoUser  || verifiedPowerUser || await VerifyTokenAsync(user, token)
//
// The third is a real Identity phone token — generated, sent by SMS and never knowable to a test —
// and `GetOrCreateAsync` (Services/UserService.cs:540) additionally puts any number that is neither
// of the first two through a Twilio number lookup before the account exists at all. So a journey can
// only ever type one of the first two. THERE ARE EXACTLY TWO NO-SMS SIGN-INS, and both are product
// settings rather than fixture inventions (Services/UserService.cs:631-635):
//
//   the manager   AppSettings:DemoPhoneNumber / AppSettings:DemoVerificationCode. Committed, and it
//                 is what every other journey types. USELESS HERE: `test/e2e/scripts/live-world.sh`
//                 registers the store through `POST /Stores/register` under this account's own
//                 bearer, which creates its `StoreAdmins` row — so in every world that script builds
//                 the demo manager IS a store admin, which is the opposite of this journey's subject.
//
//   the PowerUser AppSettings:AdminUserPhoneNumber / AppSettings:PowerUserVerificationCode. The code
//                 has a committed value; the NUMBER does not — appsettings.json ships the string
//                 "Set in Azure. For development, set in User Secrets", and Identity's account-name
//                 charset is narrowed to `+0123456789` (Helpers/ServiceCollectionExtensions.cs:182),
//                 so that placeholder can never name an account and the bypass is INERT out of the
//                 box (Services/PowerUserRoleSeed.cs:67-80 logs exactly that, at Critical). An
//                 operator has to choose a number and hand it to the API process —
//                 `AppSettings__AdminUserPhoneNumber=+47…` — which is the environment variable this
//                 journey's live credential comes down to. No value for it is written down anywhere,
//                 here or in the estate, and none should be.
//
// SO THE LIVE SUBJECT IS NOT A WORKER, and an artifact from a live run must not be read as if it
// were. `adminIn` is computed purely from `StoreAdmins` rows (Services/StoreService.cs:177) and
// never consults the role, so the bypass account does resolve to `worker` in the shell and every
// refusal below is genuinely observed. But signing in on that number GRANTS PowerUserRole
// (Services/UserService.cs:601 -> PowerUserRoleSeed.EnsureConfiguredAdminHoldsRoleAsync), and
// `StoreAdminAuthorizationHandler:17` succeeds on that role alone. Live, therefore, this journey
// shows the BROWSER SHELL refusing an account the API itself would admit — a sharper fact than the
// fixture's, and a different one. It is the shell's rule that is under test either way; that is what
// the three capabilities on this test claim, and all three survive the substitution.
//
// The pair below is therefore overridable, and the `@fixture` tag comes off only when it has been
// overridden — because `@fixture` means "depends on state only the fixture has", and the fixture-only
// state this journey depends on is precisely the worker's phone number. `playwright.config.js`
// excludes `@fixture` in live mode, so leaving the variables unset keeps today's behaviour exactly.
//
//   E2E_WORKER_PHONE   national part only, as typed into the modal (it prefixes +47 itself). Must be
//                      the number the API was started with in AppSettings__AdminUserPhoneNumber.
//   E2E_WORKER_CODE    AppSettings:PowerUserVerificationCode, from the API's own configuration.
//
// The number is NOT written into the artifact when it came from the environment — it is an operator's
// personal phone number and a journey record gets pasted into reviews. The SOURCE is written instead.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const WORKER = {
  phone: process.env.E2E_WORKER_PHONE || '90000001',
  code: process.env.E2E_WORKER_CODE || '123123'
};
// Named by where it came from, which is what the artifact is allowed to say.
const WORKER_SOURCE = process.env.E2E_WORKER_PHONE
  ? 'env:E2E_WORKER_PHONE'
  : 'fixture:+47' + WORKER.phone;

test(
  'A worker is refused the store-admin schedule and is given their own page instead',
  journeyDetails({
    journey: 'admin-refusal-worker',
    surface: 'admin',
    // See THE CREDENTIAL above: `@fixture` is a claim about the phone number, so it comes off
    // exactly when a live one has been supplied and not a moment earlier.
    tag: process.env.E2E_WORKER_PHONE ? ['@live'] : ['@fixture'],
    capabilities: [
      'admin.shell.store-admin-guard',
      'admin.nav.worker-scoping',
      'workforce.me.reachable-without-membership'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as somebody who administers no store', async () => {
      await page.goto('/admin');
      await signIn(page, { phone: WORKER.phone, code: WORKER.code });
      await expect(page).toHaveURL(/\/admin$/);

      // THE PREMISE, OBSERVED RATHER THAN NARRATED. Every refusal below is the shell acting on an
      // EMPTY `adminIn`, and until now this step only asserted that in prose — so a world in which
      // the account turned out to administer something would have produced three refusals that were
      // about a different rule, and a detail line claiming otherwise. Read the way `nav-access.js`
      // reads it: off the Vuex state the app persists, not off a literal this file chose.
      const membership = await page.evaluate(() => {
        try {
          const parsed = JSON.parse(window.localStorage.getItem('state') || '{}');
          const user = parsed.currentUser || {};
          return { id: user.id || null, adminIn: Array.isArray(user.adminIn) ? user.adminIn.length : null };
        } catch (e) { return { id: null, adminIn: null }; }
      });
      expect(membership.id).toBeTruthy();
      // `null` here means `adminIn` was absent, which `nav-access.js` calls `unknown` and does NOT
      // refuse on — so it must not be allowed to pass as a zero.
      expect(membership.adminIn).toBe(0);
      return 'signed in (' + WORKER_SOURCE + '), adminIn read back as an empty list';
    });

    await journey.step('the sidebar offers no store-admin group', async () => {
      // `.admin-nav` is a zero-size wrapper; the drawn sidebar is the fixed-position child.
      const nav = page.locator('.admin-nav__sidebar');
      await expect(nav).toBeVisible();
      const text = await nav.textContent();

      // "Vaktplan" is the store-admin schedule link and it lives in the Workforce module group (it
      // was in the single Moduler group until that was split into six, one per module). Its absence
      // is the refusal; the store selector's absence is the same fact from the other side.
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
