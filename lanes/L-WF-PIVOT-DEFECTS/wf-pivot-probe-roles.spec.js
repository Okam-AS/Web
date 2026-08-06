// PROBE, ROLES ARM — the second defect, unmasked.
//
// The two defects share ONE root cause (the authoring notice sitting inside the grid chain), so a
// single mutation reintroduces both at once. The full probe then reds on the FIRST of them — the
// month grid on the employees pivot — and never reaches the roles pivot, which would leave the
// second defect asserted by nothing.
//
// This arm skips the employees assertions and goes straight to the roles pivot of an EDITABLE week,
// which is the only state in which the second defect exists: with the notice heading the chain, a
// true `isRoles && canAuthorHere` renders the sentence and takes the role grid's `v-else-if` with
// it, so the scheduler is told where to author instead of being shown the schedule.

const { test, expect } = require('@playwright/test');
const { signIn } = require('../support/admin');

const WEEKS_AHEAD = 6;

test('the roles pivot of an editable week shows the role grid, not just the notice', async ({ page }) => {
  await page.goto('/admin/workforce-schedule');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED', expectPath: '/admin/workforce-schedule' });

  const forward = page.locator('.wf-page__weeknav .wf-page__step').nth(1);
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    await forward.click();
    await expect(forward).toBeEnabled({ timeout: 15000 });
  }

  const create = page.getByRole('button', { name: 'Opprett utkast' });
  if (await create.count()) {
    await create.click();
  }
  // Editable is the precondition, not an incidental: `canAuthorHere` false makes the notice branch
  // false, and the defect hides itself.
  await expect(page.locator('.wf-page__badge')).toContainText('Utkast', { timeout: 20000 });

  await page.getByRole('button', { name: 'Funksjoner' }).click();

  // The notice is expected — it is correct and it stays. What must ALSO be true is that the grid it
  // talks about is on screen beside it.
  await expect(page.locator('.wf-page__notice')).toContainText('medarbeidervisningen', { timeout: 15000 });
  await expect(page.locator('.wf-roles')).toBeVisible({ timeout: 15000 });
});
