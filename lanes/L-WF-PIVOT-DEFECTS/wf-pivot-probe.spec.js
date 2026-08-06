// PROBE — the three-pivot render chain, on a live backend, repeatably.
//
// WHY THIS EXISTS AND IS NOT THE JOURNEY. `workforce-schedule-publish` proves the same property at
// its step 8, but it can only be run once per world: it needs THE CURRENT WEEK unplanned and ends
// having published it. That makes it useless as a mutation harness, where the same assertions have
// to run twice — once with the defect reintroduced and once without — against a world that cannot
// be reset without touching a container this lane did not create.
//
// The pivot chain is a property of the assembled TEMPLATE and is indifferent to which week is on
// screen, so this probe steps to a far-future week nobody's journey asserts, opens a draft there,
// and asks the same three questions. Same assertions, no current-week precondition, runnable N
// times.
//
// It is deliberately NOT wrapped in `journeyDetails`: it writes no artifact and makes no claim about
// a journey. The live evidence is the journey's own artifact; this is the instrument that shows the
// assertions red without the fix.

const { test, expect } = require('@playwright/test');
const { signIn } = require('../support/admin');

// Far enough out that neither live workforce journey (both of which act on the CURRENT week) can
// collide with it, and far enough that a rerun finds its own draft rather than somebody else's.
const WEEKS_AHEAD = 6;

const SHOT_DIR = process.env.WF_PIVOT_SHOT_DIR || null;
async function shot (page, name) {
  if (!SHOT_DIR) { return; }
  await page.screenshot({ path: SHOT_DIR + '/' + name + '.png', fullPage: true });
}

test('each pivot renders its own grid and only its own, on a live backend', async ({ page }) => {
  await page.goto('/admin/workforce-schedule');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED', expectPath: '/admin/workforce-schedule' });

  // Step to a week of our own. `stepWeek` reloads the range on every click, so each one is awaited
  // via the disabled state settling rather than a fixed pause.
  const forward = page.locator('.wf-page__weeknav .wf-page__step').nth(1);
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    await forward.click();
    await expect(forward).toBeEnabled({ timeout: 15000 });
  }

  // Open a draft if this week has none. `canAuthorHere` is what puts the authoring notice on the
  // roles pivot, and without a draft the notice branch is false — which would make the roles half
  // of this probe pass under the very defect it exists to catch.
  const create = page.getByRole('button', { name: 'Opprett utkast' });
  if (await create.count()) {
    await create.click();
  }
  await expect(page.locator('.wf-page__badge')).toContainText('Utkast', { timeout: 20000 });

  // EMPLOYEES — the week grid, and neither of the other two. The first defect was the month grid
  // rendering UNDERNEATH the week grid here, because `WorkforceMonthGrid`'s `v-else` bound to the
  // authoring notice's `v-if` instead of to the week grid's.
  await expect(page.locator('.wf-grid')).toBeVisible();
  await expect(page.locator('.wf-month')).toHaveCount(0);
  await expect(page.locator('.wf-roles')).toHaveCount(0);
  await shot(page, 'pivot-1-medarbeidere');

  // ROLES — the grid AND the notice. The second defect was the notice rendering INSTEAD OF the role
  // grid on an editable week, because the notice headed the chain and the grid was its `v-else-if`.
  await page.getByRole('button', { name: 'Funksjoner' }).click();
  await expect(page.locator('.wf-roles')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.wf-page__notice')).toContainText('medarbeidervisningen');
  await expect(page.locator('.wf-grid')).toHaveCount(0);
  await expect(page.locator('.wf-month')).toHaveCount(0);
  await shot(page, 'pivot-2-funksjoner');

  // MONTH — the month grid, and neither of the other two.
  await page.getByRole('button', { name: 'Måned' }).click();
  await expect(page.locator('.wf-month')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.wf-grid')).toHaveCount(0);
  await expect(page.locator('.wf-roles')).toHaveCount(0);
  await shot(page, 'pivot-3-maned');
});
