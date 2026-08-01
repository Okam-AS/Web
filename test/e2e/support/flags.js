// Turning a module's switch on the way an operator does it.
//
// WHY A JOURNEY MUST DO THIS AND NOT SEED IT. Every per-store flag on this branch is deny-closed, so
// a journey that walks a gated surface without flipping anything is walking a surface a real store
// would refuse. That is not a hypothetical: `workforce-schedule-publish` was green for a week while
// every one of its four writes would have answered 409 on a real venue, and both run-sheet journeys
// were green while every read they make would have answered 404. In each case the fixture was the
// only reason — it modelled a world with no flags in it, and a world that cannot produce the refusal
// cannot be evidence that the refusal does not happen.
//
// AND WHY THROUGH THE PAGE. `PUT /stores/{id}/feature-flags` could be poked from the journey with a
// `fetch`, and that would be the same defect one level up: it would prove the fixture can hold a row,
// not that an operator can pull the lever. `/admin/feature-flags` is the only caller of that route in
// the product, so pressing its button is what makes the switch a capability rather than a curl.
//
// NOT EVERY GATE HAS A LEVER, and a journey must not pretend otherwise. The switchboard is scoped to
// the CATALOG, so a flag its own module withheld (`meals.ordering`, `training.onboarding`, the five
// others) has no control here and `PUT` would refuse the key. Neither does a deployment-wide config
// switch — `Events:Enabled`, `Growth:Enabled`, `Features:Meals` — which no per-store route can see or
// move. A surface behind one of those is gated with no lever at all, and the honest thing for a
// journey is to say so rather than to flip the nearest flag that happens to be togglable.

const { expect } = require('@playwright/test');

/**
 * Presses one of the switchboard's three controls for a named flag and waits for the toast that says
 * the write came back.
 *
 * The toast is asserted on the FLAG KEY rather than on a success word: the page adopts the write
 * response whole, so a toast naming the key is the server having answered about that key. A toast
 * matched on "lagret" would be satisfied by any row's write.
 *
 * @param page     Playwright page, already on `/admin/feature-flags` and signed in
 * @param action   'on' | 'off' | 'clear'
 * @param flagKey  the catalog key, e.g. `Events.Core`
 */
async function flip (page, action, flagKey) {
  await page.locator('[data-flag-' + action + '="' + flagKey + '"]').click();
  await expect(page.locator('.ff-page__toast')).toContainText(flagKey, { timeout: 15000 });
}

/** The row on the switchboard for one flag, located by the key it prints rather than by position. */
function flagRow (page, flagKey) {
  return page.locator('.ff-row', { has: page.locator('code', { hasText: flagKey }) });
}

/**
 * Goes to the switchboard, turns one flag on, and leaves the caller there.
 *
 * The badge is re-read after the flip rather than the toast being taken as proof: the page re-derives
 * the row from the write RESPONSE, so a badge that says "På" is the server's answer and not the click.
 */
async function turnOn (page, flagKey) {
  await page.goto('/admin/feature-flags');
  await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });
  await flip(page, 'on', flagKey);
  await expect(flagRow(page, flagKey).locator('.ff-row__badge')).toHaveText('På');
}

module.exports = { flip, flagRow, turnOn };
