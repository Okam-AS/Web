// JOURNEY — a manager publishes a week, then finds out what it actually reached.
//
// The publish button answers "Publisert til N mottakere". That N is how many outbox commands were
// ENQUEUED. Until this surface existed, the difference between that number and the number of workers
// who were actually told was readable only with a bearer token and curl — so a week that reached
// nobody and a week that reached everybody produced the same green toast.
//
// WHAT IT PROVES, beyond "the page renders":
//
//   • The route from the publish flow to the report EXISTS AND IS CLICKED. The link on the schedule
//     page is followed by the browser; nothing here navigates by URL to reach the report. A page
//     nothing links to is the exact failure this lane was opened for.
//   • The failure is PROVOKED, not seeded into the view: the shifts are typed in, the week is
//     validated and published, and the rows the report shows are the ones that publish enqueued and
//     the transports then could not deliver.
//   • THE DISTINCTION SURVIVES THE SCREEN. `Withheld` and `DeadLettered` are rendered in separate
//     groups, under different headings, with separate counts — and the withheld group says in words
//     that nothing has failed. This is the assertion the lane exists for: a surface that merged them
//     would still pass every component test ever written for it.
//   • The reason is shown for every row, and a code this build cannot explain is shown VERBATIM and
//     labelled as unexplained rather than guessed at.
//
// `@fixture`: the world it needs is a store with no push credential, a mailbox that bounces and a
// gateway that rejects — see `test/e2e/fixture/workforce-delivery.js`. Against a live backend those
// are environment facts nobody can arrange from a browser.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

/**
 * Type one shift into the row at `rowIndex`. The editor's affordances only exist when `canAuthorHere`
 * is true, so finding the `+` is itself the assertion that a revision and an If-Match token are in hand.
 */
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

test(
  'A manager publishes a week and sees which recipients it did not reach, and why',
  journeyDetails({
    journey: 'workforce-delivery-failures',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'workforce.schedule.publish',
      'workforce.delivery.read'
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
      // Deny-closed, and it gates all four schedule writes. Flipped through the operator's own page
      // rather than a fixture backdoor, exactly as the sibling publish journey does.
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
      await expect(page.locator('.wf-page__badge')).toHaveText('Utkast');
      return 'draft open';
    });

    await journey.step('staff EVERY person on the roster, who are reachable three different ways', async () => {
      // Every row rather than the first three by index. The channel plan gives each person a
      // DIFFERENT external tier — the claimed worker gets push, the invited one with an address gets
      // e-mail, the one with only a number gets SMS — so covering the whole roster is what makes one
      // publish exercise all three transports.
      //
      // The first version of this step added three shifts by row index and the publish toast then
      // reported TWO recipients: two of them had landed on the same person, and the SMS tier was
      // never reached. The count is asserted here now, so that cannot recur silently.
      const rows = await page.locator('.wf-grid__row').count();
      const labels = ['Åpningsvakt', 'Mellomvakt', 'Kveldsvakt', 'Nattevakt'];
      let staffed = 0;

      for (let i = 0; i < rows && staffed < labels.length; i += 1) {
        const row = page.locator('.wf-grid__row').nth(i);
        // Not every row in the grid is necessarily an authorable person; one with no `+` is skipped
        // rather than assumed away.
        if (await row.locator('.wf-grid__add').count() === 0) { continue; }
        await addShift(page, i, labels[staffed]);
        staffed += 1;
      }

      const shifts = await page.locator('.wf-grid__shift').count();
      expect(staffed).toBeGreaterThanOrEqual(3);
      expect(shifts).toBeGreaterThanOrEqual(3);
      return staffed + ' people staffed across ' + rows + ' grid rows, ' + shifts + ' shifts on the grid';
    });

    await journey.step('validate and publish the week', async () => {
      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__validation')).toBeVisible({ timeout: 15000 });
      // `exact`, because the view pivot beside it is labelled "Publisert" and a substring match
      // resolves to both.
      await page.getByRole('button', { name: 'Publiser', exact: true }).click();
      const toast = page.locator('.wf-page__toast');
      await expect(toast).toContainText('Publisert til', { timeout: 15000 });
      const text = (await toast.textContent()).trim();
      // Recorded, never trusted as delivery. This is the enqueue count, and the next steps are the
      // whole reason it must not be read as an arrival count.
      return 'publish toast said: "' + text + '"';
    });

    await journey.shot('published, with the enqueue count in the toast');

    await journey.step('follow the link from the publish flow to the delivery report', async () => {
      // CLICKED, not navigated. The wire from the surface an operator is already on to the surface
      // that answers "did it arrive" is the thing under test; reaching the report by URL would prove
      // the page exists while leaving it unreachable in the product.
      const link = page.locator('[data-testid="wf-delivery-link"]');
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL(/\/admin\/workforce-delivery/, { timeout: 30000 });
      await expect(page.locator('[data-testid="wf-delivery"]')).toBeVisible({ timeout: 20000 });
      return 'arrived at ' + new URL(page.url()).pathname + ' by clicking';
    });

    await journey.step('the report is not the empty state and not the unknown state', async () => {
      // Both are honest answers this page can give, and neither is the answer here. Asserting their
      // ABSENCE is what stops a later regression from turning a store with three undelivered
      // notifications into a store that reads as having nothing wrong.
      await expect(page.locator('[data-testid="wf-delivery-clean"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="wf-delivery-unknown"]')).toHaveCount(0);
      const rows = await page.locator('[data-testid="wf-delivery-row"]').count();
      expect(rows).toBeGreaterThan(0);
      return rows + ' undelivered notifications listed';
    });

    // ---- THE ASSERTION THIS LANE EXISTS FOR ------------------------------------------------------
    await journey.step('WAITING is named, counted and worded as its own thing — not as a failure', async () => {
      const waiting = page.locator('[data-testid="wf-delivery-waiting"]');
      await expect(waiting).toBeVisible();

      // The heading names the store-level precondition rather than calling it a failure.
      await expect(waiting).toContainText('Venter');
      // And it says so in words. If the surface ever stops distinguishing the tiers, this sentence
      // is the first thing that goes — so it is asserted rather than left to the heading alone.
      await expect(waiting).toContainText('Ingenting har feilet her');
      // The reason, from the backend's own redacted code.
      await expect(waiting).toContainText('push-nøkkel');

      const count = (await waiting.locator('[data-testid="wf-delivery-waiting-count"]').textContent()).trim();
      expect(Number(count)).toBeGreaterThan(0);
      return 'waiting group present, ' + count + ' row(s), worded as not-a-failure';
    });

    await journey.step('GAVE UP is a separate group with its own count, and says a person must act', async () => {
      const gaveUp = page.locator('[data-testid="wf-delivery-gaveup"]');
      await expect(gaveUp).toBeVisible();
      await expect(gaveUp).toContainText('Kom aldri fram');
      await expect(gaveUp).toContainText('må leveres manuelt');

      const count = (await gaveUp.locator('[data-testid="wf-delivery-gaveup-count"]').textContent()).trim();
      expect(Number(count)).toBeGreaterThan(0);

      // THE TIERS ARE NOT MERGED. Two groups, two counts, and the withheld rows are not inside this
      // one. A single list labelled "failed" would satisfy every assertion above except this.
      const waitingCount = (await page.locator('[data-testid="wf-delivery-waiting-count"]').textContent()).trim();
      expect(page.locator('[data-testid="wf-delivery-gaveup"] [data-testid="wf-delivery-row"]')).not.toBe(null);
      const gaveUpRows = await page.locator('[data-testid="wf-delivery-gaveup"] [data-testid="wf-delivery-row"]').count();
      const waitingRows = await page.locator('[data-testid="wf-delivery-waiting"] [data-testid="wf-delivery-row"]').count();
      expect(gaveUpRows).toBe(Number(count));
      expect(waitingRows).toBe(Number(waitingCount));
      return 'gave-up ' + count + ' and waiting ' + waitingCount + ' are counted separately';
    });

    await journey.step('RETRYING is a third group again — three tiers, three headings', async () => {
      // The SMS tier. It matters that this is neither of the other two: an attempt HAS been spent
      // (unlike waiting) and the budget is NOT gone (unlike gave-up), so the operator is told to
      // watch it rather than to act or to relax. Three states the backend distinguishes, three
      // states on screen.
      const retrying = page.locator('[data-testid="wf-delivery-retrying"]');
      await expect(retrying).toBeVisible();
      await expect(retrying).toContainText('Forsøkes på nytt');
      await expect(retrying).toContainText('Forsøk 1 av 5');

      const groups = await page.locator('[data-testid^="wf-delivery-"][data-testid$="-count"]').count();
      expect(groups).toBeGreaterThanOrEqual(3);
      return 'three tiers rendered as ' + groups + ' separately-counted groups';
    });

    await journey.step('every row says WHO and WHY, and an unexplained code is shown as one', async () => {
      // The roster put names on the rows: the report is about people, not outbox ids.
      await expect(page.locator('[data-testid="wf-delivery-row-name"]').first()).not.toHaveText('');
      const names = await page.locator('[data-testid="wf-delivery-row-name"]').allTextContents();

      // Every row carries a reason. A row that could not say why is the silence this surface ends.
      const whys = await page.locator('[data-testid="wf-delivery-row-why"]').allTextContents();
      expect(whys.length).toBe(names.length);
      whys.forEach(w => expect(w.trim().length).toBeGreaterThan(0));

      // The mail failure comes back as an exception TYPE, which is not one of the codes this build
      // can explain. It must appear verbatim, under a sentence that admits it is unexplained —
      // never dropped, and never guessed at.
      const body = await page.locator('[data-testid="wf-delivery"]').textContent();
      expect(body).toContain('SmtpException');
      expect(body).toContain('Årsakskode fra serveren');

      // And no address ever reaches the screen. The backend sends a presence label; if a real
      // address ever started arriving, this is what would catch it.
      expect(body).not.toContain('kari@example.test');
      expect(body).not.toContain('+4790000009');
      return 'named: ' + names.join(', ') + ' — all with reasons, no addresses on screen';
    });

    await journey.shot('the delivery report, tiers apart');

    await journey.step('the refresh control is reachable on a laptop screen', async () => {
      // A sibling surface was found today with a control that could not be clicked at 1280 because a
      // neighbouring element won the hit test. Cheap to check while the page is open, so it is
      // checked rather than assumed.
      await page.setViewportSize({ width: 1280, height: 800 });
      const refresh = page.locator('[data-testid="wf-delivery-refresh"]');
      await expect(refresh).toBeVisible();

      const box = await refresh.boundingBox();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThanOrEqual(44);

      // The real proof is that the click LANDS on this element rather than on something above it.
      const hit = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return !!(el && el.closest('[data-testid="wf-delivery-refresh"]'));
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      expect(hit).toBe(true);

      // And it reports its own outcome: the report is still there afterwards, not a blank panel.
      await refresh.click();
      await expect(page.locator('[data-testid="wf-delivery-waiting"]')).toBeVisible({ timeout: 20000 });
      return 'clickable at 1280×800 (' + Math.round(box.width) + '×' + Math.round(box.height) + '), and the refresh re-rendered the report';
    });

    await journey.shot('after refresh at 1280');
  }
);
