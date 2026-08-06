// Counts `.login-modal` elements in a real browser, on real admin routes, signed out.
//
// ---- WHY `?redirect=` IS ON EVERY URL ---------------------------------------------------------
//
// Because without it the count is a race and would go green on a slow machine for the wrong reason.
// `AdminPage.initAuth` fires `$router.replace('/admin?redirect=…')` for any admin path other than
// `/admin`, which unmounts the requested page — and, before this lane, its duplicate modal — a beat
// after both are on screen. That is the window
// `test/e2e/journeys/modal-estate-scroll-lock.spec.js` recorded its strict-mode violation in.
//
// The redirect is skipped when the URL ALREADY carries `redirect` (`!this.$route.query.redirect`),
// which is the real state a person is in the moment after they are bounced here from a deep link.
// So the requested page stays mounted, and the count is of a settled document rather than of a
// navigation in flight. Verified as a red before it was ever read as a green: with the duplicate
// put back on /admin/lang, this same file reports 2 (see kill-proof-browser.txt).
const { test, expect } = require('@playwright/test');

const ROUTES = [
  // The index page. It mounts none of its own and never did — this is the control.
  '/admin',
  '/admin/lang?redirect=%2Fadmin%2Flang',
  '/admin/ongoing?redirect=%2Fadmin%2Fongoing',
  '/admin/statistics?redirect=%2Fadmin%2Fstatistics',
  '/admin/payouts?redirect=%2Fadmin%2Fpayouts',
  // A route that never carried a duplicate, so a run in which everything reports 1 is not a run in
  // which the browser stopped looking.
  '/admin/products?redirect=%2Fadmin%2Fproducts'
];

for (const route of ROUTES) {
  test('signed out, ' + route + ' shows one sign-in modal', async ({ page }) => {
    await page.goto(route);

    const modals = page.locator('.login-modal');
    // Wait for at least one before counting, so this cannot pass on a page that never rendered.
    await expect(modals.first()).toBeVisible();

    const count = await modals.count();
    const phoneFields = await page.locator('.login-modal input[type="tel"]').count();
    console.log('[count] ' + route + '  .login-modal=' + count + '  phone inputs=' + phoneFields);

    await expect(modals).toHaveCount(1);
    // One modal with two phone fields would satisfy the count above and be the same defect wearing
    // a different shape, so the input a person actually types into is counted too.
    expect(phoneFields).toBe(1);
  });
}
