// JOURNEY — a manager publishes a week, then asks the product to show that the people on it were
// told, and gets an answer that distinguishes who confirmed from what was merely sent.
//
// WHAT IT PROVES, beyond "the page renders":
//
//   * The two endpoints are REACHABLE BY A PERSON. `GetPublicationHistory` sat in the client with
//     zero callers and the recipients route had no client method at all, so before this lane the
//     only way to answer "who acknowledged the plan" was a bearer token and curl. The walk arrives
//     at the page by CLICKING THE SIDEBAR — the C3 wire under test is the navigation entry, and
//     reaching the page by URL would prove it exists while leaving it unreachable in the product.
//
//   * A week published seconds ago shows NOBODY confirmed. The publish toast reports a recipient
//     count and every transport accepted its command, and the roster still says nothing came back.
//     Those two facts being visible together is the point of the surface.
//
//   * The four attestations stay apart on screen. A worker confirming, a worker only opening, a
//     manager noting a hand delivery, and a transport accepting a message are four claims, and the
//     walk asserts four separate headings with their own counts and NO combined figure anywhere.
//
//   * A replaced publication says so, and its confirmations are not offered as current evidence.
//
//   * A roster shorter than the publication's own recipient count NAMES THE GAP rather than letting
//     the shorter list stand as the answer to "who was told".
//
// @fixture: the world is `test/e2e/fixture/workforce-publications.js`. The freshly published week is
// written by the journey's OWN publish through the real publish route; the two historical
// publications are seeded, for the same reason the delivery fixture seeds one historical dead letter
// — there is no acknowledgement WRITE on this surface (the worker's own page owns it) and no manual
// -delivery endpoint anywhere on the backend, so receipts that already happened are the only way the
// confirmed and hand-delivered groups are reachable at all.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

/** Type one shift into the row at `rowIndex`, the same authoring path the publish journeys use. */
async function addShift (page, rowIndex, label) {
  const row = page.locator('.wf-grid__row').nth(rowIndex);
  await row.locator('.wf-grid__add').first().click();

  const editor = page.locator('.wf-editor');
  await expect(editor).toBeVisible();
  await editor.locator('input[type="time"]').first().fill('08:00');
  await editor.locator('input[type="time"]').nth(1).fill('16:00');
  await editor.locator('input[type="number"]').fill('30');
  await editor.locator('input[type="text"]').fill(label);
  await editor.locator('select').nth(1).selectOption({ label: 'Barista' });
  await editor.getByRole('button', { name: 'Lagre vakt' }).click();
  await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn');
}

/** Open the publication whose row sits at `index` in the history list, and wait for its roster. */
async function openPublication (page, index) {
  const pick = page.locator('.wf-publist__pick').nth(index);
  await expect(pick).toBeVisible();
  await pick.click();
  await expect(page.locator('[data-testid="wf-pubrec-for"]')).toBeVisible({ timeout: 20000 });
}

test(
  'A manager publishes a week and can show who confirmed it, separately from what was merely sent',
  journeyDetails({
    journey: 'workforce-publication-receipts',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'workforce.schedule.publish',
      'workforce.publication.history',
      'workforce.publication.recipients'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the manager and open the schedule', async () => {
      await page.goto('/admin/workforce-schedule', { timeout: 90000 });
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-schedule' });
      return 'landed on /admin/workforce-schedule';
    });

    await journey.step('turn the schedule publication switch on for this store', async () => {
      // Deny-closed, and it gates the publish. Flipped through the operator's own page rather than a
      // fixture backdoor.
      await page.goto('/admin/feature-flags', { timeout: 90000 });
      await page.locator('[data-flag-on="workforce.publication"]').click();
      await expect(page.locator('.ff-page__toast')).toContainText('workforce.publication', { timeout: 15000 });
      await page.goto('/admin/workforce-schedule', { timeout: 90000 });
      return 'workforce.publication on';
    });

    await journey.step('create the draft week', async () => {
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan');
      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet');
      return 'draft open';
    });

    let staffedCount = 0;
    await journey.step('staff every person on the roster', async () => {
      const rows = await page.locator('.wf-grid__row').count();
      const labels = ['Åpningsvakt', 'Mellomvakt', 'Kveldsvakt', 'Nattevakt'];

      for (let i = 0; i < rows && staffedCount < labels.length; i += 1) {
        const row = page.locator('.wf-grid__row').nth(i);
        if (await row.locator('.wf-grid__add').count() === 0) { continue; }
        await addShift(page, i, labels[staffedCount]);
        staffedCount += 1;
      }

      expect(staffedCount).toBeGreaterThanOrEqual(3);
      return staffedCount + ' people staffed across ' + rows + ' grid rows';
    });

    let publishToast = '';
    await journey.step('validate and publish the week', async () => {
      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__validation')).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Publiser', exact: true }).click();
      const toast = page.locator('.wf-page__toast');
      await expect(toast).toContainText('Publisert til', { timeout: 15000 });
      publishToast = (await toast.textContent()).trim();
      // Recorded, never trusted as receipt. The next steps exist because this number is an ENQUEUE
      // count and a venue asked to prove it told somebody cannot hand over a queue depth.
      return 'publish toast said: "' + publishToast + '"';
    });

    await journey.step('reach the receipts page by CLICKING THE SIDEBAR, never by URL', async () => {
      // The navigation entry is the part of C3 under test. A page reachable only by typing its path
      // is not a capability, and this lane exists because two endpoints were in exactly that state.
      const link = page.locator('.admin-nav__link', { hasText: 'Publiseringskvitteringer' }).first();
      if (!(await link.isVisible().catch(() => false))) {
        // Narrow viewports keep the sidebar behind a drawer toggle; open it rather than navigating.
        await page.locator('.admin-nav__toggle, .admin-header__menu, [data-testid="admin-nav-toggle"]')
          .first().click({ timeout: 10000 });
      }
      await expect(link).toBeVisible({ timeout: 15000 });
      await link.click();
      await page.waitForURL(/\/admin\/workforce-publications/, { timeout: 30000 });
      await expect(page.locator('[data-testid="wf-publist"]')).toBeVisible({ timeout: 20000 });
      return 'arrived at ' + new URL(page.url()).pathname + ' by clicking the sidebar entry';
    });

    await journey.step('the history is neither unreadable nor empty, and names who published', async () => {
      // Both refused explicitly. An answered-and-empty history and a history that failed to load are
      // opposite facts, and neither is what this store is in.
      await expect(page.locator('[data-testid="wf-publist-unknown"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="wf-publist-empty"]')).toHaveCount(0);

      const rows = page.locator('.wf-publist__pick');
      const count = await rows.count();
      // The week just published, plus the two seeded ones.
      expect(count).toBeGreaterThanOrEqual(3);

      // C4: the publish froze an actor and the row names it rather than saying "system".
      const first = rows.first();
      await expect(first).toContainText('Gjeldende');
      const firstText = (await first.textContent()).replace(/\s+/g, ' ').trim();
      expect(firstText).toMatch(/skrevet til \d+/);
      return count + ' publications listed; newest row reads: "' + firstText + '"';
    });

    await journey.shot('the publication history, newest first');

    await journey.step('THE WEEK JUST PUBLISHED: every transport accepted it and nobody has confirmed', async () => {
      await openPublication(page, 0);

      // The whole claim of the surface. Seconds after a successful publish, with a toast reporting a
      // recipient count, the honest answer to "who was told" is still nobody.
      await expect(page.locator('[data-testid="wf-pubrec-confirmed"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="wf-pubrec-opened"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="wf-pubrec-byhand"]')).toHaveCount(0);

      const none = page.locator('[data-testid="wf-pubrec-none"]');
      await expect(none).toBeVisible();
      const noneCount = Number(await page.locator('[data-testid="wf-pubrec-none-count"]').textContent());

      // THE SAME NUMBER THE TOAST CELEBRATED IS THE NUMBER WITH NO RECEIPT. Asserted against the
      // toast rather than against the shifts typed: `staffedCount` counts SHIFTS and this world has
      // three people, so a fourth shift lands on somebody who already has one. Publishing dedupes to
      // distinct recipients, and asserting the typed count instead would have made this step fail
      // for a reason that has nothing to do with receipts — the same trap the delivery journey hit
      // from the other side when it staffed by index and published two recipients for three shifts.
      const enqueued = Number((publishToast.match(/\d+/) || [])[0]);
      expect(enqueued).toBeGreaterThanOrEqual(3);
      expect(noneCount).toBe(enqueued);

      // The roster is COMPLETE — every person the publish addressed is named — so the count above is
      // the whole story and not a short list standing in for one.
      await expect(page.locator('[data-testid="wf-pubrec-short"]')).toHaveCount(0);

      // Not the empty roster and not the unreadable one: people WERE addressed.
      await expect(page.locator('[data-testid="wf-pubrec-empty"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="wf-pubrec-unknown"]')).toHaveCount(0);
      return 'toast said "' + publishToast + '" (' + enqueued + ' enqueued from ' + staffedCount +
        ' shifts) and the roster reports the same ' + noneCount + ' people with no receipt';
    });

    await journey.shot('published seconds ago, and nobody has confirmed');

    await journey.step('A HISTORICAL WEEK: the four attestations are four separate groups', async () => {
      await openPublication(page, 1);

      const confirmed = page.locator('[data-testid="wf-pubrec-confirmed"]');
      const byHand = page.locator('[data-testid="wf-pubrec-byhand"]');
      const none = page.locator('[data-testid="wf-pubrec-none"]');

      await expect(confirmed).toBeVisible();
      await expect(byHand).toBeVisible();
      await expect(none).toBeVisible();

      // Only the worker's own confirmation is in the confirmed group, and the manager's hand-delivery
      // note is NOT in it. Merging them is the one lie this surface must never tell.
      await expect(confirmed).toContainText('Ola Ansatt');
      await expect(confirmed).not.toContainText('Kari Hansen');
      await expect(byHand).toContainText('Kari Hansen');
      await expect(none).toContainText('Nina Nyansatt');

      // The person with no login is flagged as unable to confirm, so her empty row does not read as
      // somebody who ignored the plan.
      await expect(page.locator('[data-testid="wf-pubrec-none-unclaimed"]').first()).toBeVisible();

      const counts = await page.locator('[class*="wf-recgroup__count"]').allTextContents();
      return 'groups on screen with counts ' + JSON.stringify(counts);
    });

    await journey.step('NO COMBINED FIGURE anywhere on the roster', async () => {
      // The absence is the assertion. Any single number here would be read as "N of M were told",
      // and no number on this screen can honestly say that.
      const panel = await page.locator('[data-testid="wf-pubrec"]').textContent();
      const flat = panel.replace(/\s+/g, ' ');
      // "N av M" — the fraction itself, in any wording. The first draft of this guard also allowed a
      // slash as the separator and matched the rendered DATE RANGE (`7/28/2026 Bekreftet …`), which
      // would have made the step red for a reason unrelated to what it forbids. Digits either side
      // of the word are what a combined figure actually looks like.
      expect(flat).not.toMatch(/\d+\s*av\s*\d+/i);
      expect(flat).not.toMatch(/totalt/i);
      // The four bucket counts are each rendered inside their own group and never added up: the
      // panel carries exactly as many counts as it has groups on screen.
      const groups = await page.locator('[data-testid="wf-pubrec"] .wf-recgroup').count();
      const counts = await page.locator('[data-testid="wf-pubrec"] .wf-recgroup__count').count();
      expect(counts).toBe(groups);
      return 'no "N of M" phrasing; ' + counts + ' counts for ' + groups + ' groups, none combined';
    });

    await journey.shot('the four attestations, kept apart');

    await journey.step('A REPLACED WEEK says so, and names the recipients it cannot show', async () => {
      await openPublication(page, 2);

      // Superseded is stated on the row AND above the roster, because reading the confirmations
      // first and the caveat afterwards is how last week's evidence gets produced as this week's.
      await expect(page.locator('[data-testid="wf-publist-superseded"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="wf-pubrec-superseded"]')).toBeVisible();

      // The publication was written for three people and only two can be named — the third's staff
      // member is gone and the recipients read inner-joins it away. The count is the only witness,
      // and the panel says so rather than letting the short list stand as the answer.
      const short = page.locator('[data-testid="wf-pubrec-short"]');
      await expect(short).toBeVisible();
      const text = (await short.textContent()).replace(/\s+/g, ' ').trim();
      expect(text).toMatch(/3/);
      expect(text).toMatch(/2/);

      // Opened is not confirmed: this week was only ever opened.
      await expect(page.locator('[data-testid="wf-pubrec-opened"]')).toBeVisible();
      await expect(page.locator('[data-testid="wf-pubrec-confirmed"]')).toHaveCount(0);
      return 'replaced week flagged; short-roster note reads: "' + text + '"';
    });

    await journey.shot('a replaced week, and the recipients it cannot name');

    await journey.step('the page links onward to the delivery report, and back to the schedule', async () => {
      const delivery = page.locator('[data-testid="wfp-delivery-link"]');
      await expect(delivery).toBeVisible();
      await delivery.click();
      await page.waitForURL(/\/admin\/workforce-delivery/, { timeout: 30000 });
      await expect(page.locator('[data-testid="wf-delivery"]')).toBeVisible({ timeout: 20000 });
      return 'the two halves of "what did it reach" are linked to each other';
    });
  }
);
