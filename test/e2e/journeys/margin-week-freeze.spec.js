// JOURNEY — the frozen week is ASKED to accept an edit, and refuses.
//
// `margin-statement-week` already walks a week from open to finalized and asserts that the frozen one
// draws no mutating control. That is a necessary claim and it is not this one. An absence assertion
// is only worth what the world behind it can produce: a page that had lost the spend editor
// ALTOGETHER — for every statement, open or not — would satisfy every one of those `toHaveCount(0)`
// lines, and so would a fixture that never wrote a spend line in the first place. The estate has
// catalogued at least twenty-two shapes of assertion that cannot fail; "no control here" in a world
// that was never shown producing one is among them.
//
// So this walk does the other half, and it is the half an accountant actually relies on: it PRESSES
// the control, on the same page, against the same endpoint, with exactly one thing different between
// the two attempts.
//
//   ARM 1  the week is Open.       Press "Lagre".  The server accepts, and its own actual-spend
//                                                  figure moves from kr 0,00 to kr 14 000,00.
//   ARM 2  the same week, frozen.  Press "Lagre".  The server refuses, in its own words, and the
//                                                  figure has not moved when the page is re-read.
//   ARM 3  the correction, Open.   Press "Lagre".  Accepted again — so ARM 2 was the freeze and not
//                                                  a save that had simply stopped working.
//
// ---- HOW A BROWSER REACHES A CONTROL THAT IS SUPPOSED TO BE GONE ------------------------------
//
// It does not have to cheat, and it must not: a `fetch` fired from this file would prove the fixture
// holds a rule, not that the product enforces one. The page draws the spend editor from its OWN model
// (`statement.canMutate`), and that model is a snapshot of the last read. So the state a real venue
// gets into is: the manager has the week open in a tab, the bookkeeper finalises it from somewhere
// else, and the manager — looking at a page that still shows the editor, because nothing pushed —
// types the invoice she was in the middle of and presses Lagre.
//
// That is a second page in the same browser context, and it is why this journey opens one. Everything
// ARM 2 asserts is what the venue in that tab sees.
//
// ---- ONE THING THIS WALK'S RED WOULD MEAN THAT IS NOT A REGRESSION ----------------------------
//
// Finalising BUMPS the statement's rowversion, so the stale tab is holding a revision that is stale as
// well as a statement that is frozen. Two rules are therefore in reach of the same request, and which
// one answers is an ORDERING the server chooses. The fixture checks immutability first and answers the
// uncoded business refusal; if a live backend checked `If-Match` first it would answer
// `margin.stale-revision`, the page would render `mrgs_err_stale` instead, and this walk would red on
// the quoted sentence. That red would be correct and would mean the ordering differs — not that the
// week can be edited. The assertion is deliberately on the WHOLE rendered sentence for that reason: a
// match on "avviste" would pass on either and would tell a reader nothing.
//
// ---- THE MUTATION THAT PROVES THE RED ---------------------------------------------------------
//
// Delete the `state === 'Finalized'` guard from `test/e2e/fixture/margin.js` — three lines, the exact
// change that would make a frozen week editable — and this walk reds at ARM 2: the save is accepted,
// no refusal is rendered, and the second spend line lands on a statement the badge calls `Låst`.
// Run and recorded in `lanes/L-JOURNEY-MARGIN/`.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MONDAY = '2026-07-20';

const MODULE_FLAG = 'Margin.Module';
const STATEMENTS_FLAG = 'Margin.Statements';

// The one sentence the statement surface has for this. It carries NO problem code on the wire —
// `MarginStatementsController` renders business failures through `ModuleProblem`, which emits a
// `detail` and a `traceId` and nothing else — so the page quotes the server verbatim inside its own
// frame rather than paraphrasing a rule it cannot identify.
const REFUSAL =
  'Serveren avviste dette, og ingenting ble lagret. ' +
  'Begrunnelsen fra serveren: This statement is finalized and immutable.';

test(
  'A frozen week is asked to take an edit, refuses it, and takes the same edit on its correction',
  journeyDetails({
    journey: 'margin-week-freeze',
    surface: 'admin',
    capabilities: [
      'margin.statements.gate',
      'margin.statement.open',
      'margin.statement.inputs.replace-set',
      'margin.statement.recalculate',
      'margin.statement.finalize',
      'margin.statement.immutability',
      'margin.statement.correction'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in and open the weekly settlement', async () => {
      await page.goto('/admin/margin-statements');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-statements' });

      // TWO deny-closed switches, and both are pulled through the operator switchboard rather than
      // seeded — `/admin/feature-flags` is the only caller of `PUT /stores/{id}/feature-flags` in the
      // product, so pressing its button is what makes the switch a capability rather than a curl.
      await expect(page.locator('[data-test="blocker"]')).toBeVisible();
      await turnOn(page, MODULE_FLAG);
      await turnOn(page, STATEMENTS_FLAG);

      await page.goto('/admin/margin-statements');
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør');
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);
      return 'both ' + MODULE_FLAG + ' and ' + STATEMENTS_FLAG + ' on, surface open';
    });

    await journey.step('open the week and calculate it once, so the figures exist to move', async () => {
      await page.locator('[data-test="week-start"]').fill(MONDAY);
      await page.locator('[data-test="create-statement"]').click();
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });

      // Recalculating BEFORE any spend is entered is what makes ARM 1 falsifiable. The inputs write
      // only re-derives a statement that has been calculated at least once, so without this the
      // accepted save of ARM 1 would leave every figure withheld and there would be nothing on
      // screen to show it had landed — the arm would then be asserting an HTTP 200, which is the
      // weaker claim this journey exists to avoid making.
      await page.locator('[data-test="recalculate"]').click();
      await expect(page.locator('[data-test="uncalculated"]')).toHaveCount(0, { timeout: 15000 });
      await expect(page.locator('[data-test="actual"]')).toHaveText('kr 0,00');
      await expect(page.locator('[data-test="net"]')).toHaveText('kr 40 000,00');
      return 'revision 1 open and calculated, actual purchase spend kr 0,00';
    });

    await journey.step('ARM 1 — the OPEN week takes the edit, and the server\'s own figure moves', async () => {
      await page.locator('[data-test="spend-add"]').click();
      await page.locator('[data-test="spend-date"]').first().fill('2026-07-21');
      await page.locator('[data-test="spend-supplier"]').first().selectOption({ label: 'Bergen Storkjøkken AS' });
      await page.locator('[data-test="spend-note"]').first().fill('Ukesleveranse');
      await page.locator('[data-test="spend-amount"]').first().fill('14 000,00');

      await page.locator('[data-test="spend-save"]').click();

      // NOT "the button was pressed". `actual` is the SERVER's re-derived figure, arriving on the
      // response to the write itself, and kr 0,00 -> kr 14 000,00 is a change no client-side render
      // could have produced: the page performs no arithmetic on money at all.
      await expect(page.locator('[data-test="actual"]')).toHaveText('kr 14 000,00', { timeout: 15000 });
      await expect(page.locator('[data-test="actual-percent"]')).toHaveText('35,00 %');
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-error"]')).toHaveCount(0);
      return 'accepted while Open: actual kr 0,00 -> kr 14 000,00, ratio 35,00 %';
    });

    await journey.shot('the open week accepts the edit');

    const frozenAt = await journey.step('the bookkeeper finalises the week from somewhere else', async () => {
      // A SECOND PAGE in the same browser context — same session, same store, a different tab. This
      // is what leaves the first tab holding a model that says the week is still open, which is the
      // only honest way a browser reaches a control the product intends to have removed.
      const other = await page.context().newPage();
      try {
        await other.goto('/admin/margin-statements');
        await expect(other.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør', { timeout: 60000 });
        await other.locator('[data-test="period-row"]').first().click();
        await expect(other.locator('[data-test="finalize"]')).toBeVisible({ timeout: 15000 });
        await other.locator('[data-test="finalize"]').click();
        await expect(other.locator('[data-test="state-badge"]')).toHaveText('Låst', { timeout: 15000 });
        const stamp = (await other.locator('[data-test="finalized-at"]').textContent()).trim();
        expect(stamp).not.toBe('—');
        return stamp;
      } finally {
        await other.close();
      }
    });

    await journey.step('the first tab still draws the editor — nothing told it', async () => {
      // Stated as a fact about the product, not asserted as desirable. There is no push channel on
      // this surface, so the tab that was open when the week froze keeps offering every control the
      // finalized statement is not supposed to have. That is precisely the state ARM 2 needs, and it
      // is also the reason the SERVER's refusal is the load-bearing guard rather than the page's.
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Åpent');
      await expect(page.locator('[data-test="spend-save"]')).toBeVisible();
      await expect(page.locator('[data-test="spend-add"]')).toBeVisible();
      journey.finding('note', 'a stale tab keeps offering the edit controls of a week that has since been frozen',
        'pages/admin/margin-statements.vue derives every mutating control from `statement.canMutate`, ' +
        'which is a snapshot of the last read; the surface has no push channel and does not re-read on ' +
        'focus. A manager with the week open when the bookkeeper finalises it is shown the spend ' +
        'editor, the recalculate button and the finalize button on a statement that will refuse all ' +
        'three. Nothing is lost — the server refuses and the page quotes it, which this walk proves at ' +
        'ARM 2 — but the venue meets a refusal where the design intends it to meet an absence. ' +
        'Frozen at ' + frozenAt + '.');
      return 'tab still says Apent and still offers Lagre; the week is frozen behind it';
    });

    await journey.step('ARM 2 — the SAME control, the SAME call, refused by the server', async () => {
      const refusalsBefore = journey.failedRequests
        .filter(r => r.status === 400 && /\/inputs(\?|$)/.test(r.url)).length;

      await page.locator('[data-test="spend-add"]').click();
      const rows = page.locator('[data-test="spend-amount"]');
      await expect(rows).toHaveCount(2);
      await page.locator('[data-test="spend-date"]').nth(1).fill('2026-07-23');
      await rows.nth(1).fill('9 000,00');

      await page.locator('[data-test="spend-save"]').click();

      // THE WHOLE SENTENCE. The statement surface's business failures carry no code, so "finalized
      // and immutable", "must start on a Monday" and "an open statement already exists" are one
      // indistinguishable shape on the wire and the page can only quote. A match on a keyword would
      // pass on any of the three — and on `mrgs_err_stale`, which is the OTHER rule this request is
      // in reach of (see the header).
      const failure = page.locator('[data-test="failure"]');
      await expect(failure).toHaveText(REFUSAL, { timeout: 15000 });

      // AND THE REQUEST LEFT THE BROWSER. Without this the arm would also pass against a page that
      // had grown a client-side guard and rendered the same sentence locally — which would be a
      // different and much weaker claim, because a client-side guard is not what protects a ledger.
      const refusalsAfter = journey.failedRequests
        .filter(r => r.status === 400 && /\/inputs(\?|$)/.test(r.url)).length;
      expect(refusalsAfter).toBe(refusalsBefore + 1);
      return 'PUT .../inputs -> 400 uncoded, quoted verbatim: "This statement is finalized and immutable."';
    });

    await journey.shot('the frozen week refuses the edit');

    await journey.step('and NOTHING was written — the week reads as it did before the attempt', async () => {
      // The refusal is only worth what the state behind it is. A server that answered 400 and wrote
      // anyway would satisfy the arm above; this is what makes it a freeze rather than an error
      // message. Re-read from the server, not from the tab that was refused.
      await page.reload();
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør', { timeout: 60000 });
      await page.locator('[data-test="period-row"]').first().click();
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Låst', { timeout: 15000 });

      await expect(page.locator('[data-test="spend-readonly-row"]')).toHaveCount(1);
      await expect(page.locator('[data-test="actual"]')).toHaveText('kr 14 000,00');
      await expect(page.locator('[data-test="actual-percent"]')).toHaveText('35,00 %');

      // NOW the absence means something: the same page that was shown pressing this control a moment
      // ago draws none of it, and the server has been observed refusing the call it would have made.
      await expect(page.locator('[data-test="spend-frozen"]')).toBeVisible();
      await expect(page.locator('[data-test="immutable"]')).toBeVisible();
      await expect(page.locator('[data-test="spend-save"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-add"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-amount"]')).toHaveCount(0);
      await expect(page.locator('[data-test="recalculate"]')).toHaveCount(0);
      await expect(page.locator('[data-test="finalize"]')).toHaveCount(0);
      return 'still 1 spend line and kr 14 000,00; the refused kr 9 000,00 is nowhere, and no control remains';
    });

    await journey.step('ARM 3 — the correction takes the very edit the frozen week refused', async () => {
      // The control arm, and the reason ARM 2 is attributable to the freeze at all. Same page, same
      // button, same amount, same endpoint; the one thing that changed is that this revision is Open.
      // Without it, a save that had simply stopped working would look identical to immutability.
      await page.locator('[data-test="create-correction"]').click();
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });
      await expect(page.locator('[data-test="revision"]')).toContainText('2');
      await expect(page.locator('[data-test="corrects"]')).toBeVisible();

      await page.locator('[data-test="recalculate"]').click();
      await expect(page.locator('[data-test="uncalculated"]')).toHaveCount(0, { timeout: 15000 });

      await page.locator('[data-test="spend-add"]').click();
      await page.locator('[data-test="spend-date"]').first().fill('2026-07-23');
      await page.locator('[data-test="spend-amount"]').first().fill('9 000,00');
      await page.locator('[data-test="spend-save"]').click();

      await expect(page.locator('[data-test="actual"]')).toHaveText('kr 9 000,00', { timeout: 15000 });
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0);

      // The frozen predecessor is untouched by any of it: forward-only, and both revisions stay.
      await expect(page.locator('[data-test="period-row"]')).toHaveCount(2);
      return 'revision 2 accepted the same kr 9 000,00 on the same button; revision 1 still frozen at kr 14 000,00';
    });

    await journey.shot('the correction accepts what the frozen week would not');

    await journey.step('what the browser said while this ran', () => {
      // ONE THING IS ASSERTED HERE AND THE REST IS RECORDED. The 400 this walk went looking for is
      // the point of it, so the assertion is that it is the ONLY one: a second refused write would
      // mean some other rule fired during the walk and the arm above attributed the wrong one. That
      // is a real check. Everything else is a fact somebody has to decide about, and failing on it
      // would say the capability does not work, which the eight steps above have just disproved.
      const refusals = journey.failedRequests
        .filter(r => r.status === 400)
        .map(r => r.method + ' ' + r.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''));
      expect(refusals).toHaveLength(1);
      expect(refusals[0]).toMatch(/^PUT \/margin\/statements\/[^/]+\/inputs$/);

      // THE WASTE PANEL HAS NO BACKEND. `GET /margin/waste` 404s here because the fixture routes
      // nothing under it — but the fixture is not the interesting half. Neither OkamAPI checkout on
      // this machine that carries the Margin module declares ANY `margin/waste` route, while
      // `utils/margin/waste-client.js` calls four of them and `MarginWastePanel` is composed into
      // `/admin/margin-statements`. `loadWaste` catches the failure and the panel renders "unknown",
      // which is indistinguishable from a read that merely failed — so the surface looks live and is
      // not. Seen here because this is the walk that opened the page with the network watched.
      const waste = journey.failedRequests.filter(r => /\/margin\/waste/.test(r.url));
      if (waste.length) {
        journey.finding('defect', 'the statement waste panel calls routes no backend publishes',
          'GET /margin/waste answered 404 ' + waste.length + ' time(s) during this walk. ' +
          'test/e2e/fixture/margin.js routes nothing under /margin/waste, and neither does the ' +
          'product: `grep -r "margin/waste"` finds no controller in OkamAPI-modules ' +
          '(lane/meals-grace-pins) or OkamAPI-restaurant-control (feature/restaurant-control-stage0), ' +
          'both of which do carry MarginSuppliersController, MarginStatementsController and the rest ' +
          'of the module. utils/margin/waste-client.js declares GET/POST /margin/waste and PUT/DELETE ' +
          '/margin/waste/{id}. Because pages/admin/margin-statements.vue swallows the failure and the ' +
          'panel says the read did not answer, a venue sees an empty panel rather than an absent ' +
          'feature. Neither this walk nor margin-statement-week is evidence for anything on ' +
          'MarginWastePanel, and no journey could be until the route exists. NOT VERIFIED against the ' +
          'branch this frontend is actually deployed against — two checkouts, both missing it.');
      }

      // The shell's «Navigation cancelled» pair is `AdminPage`'s login redirect racing the storeId
      // append; it appears identically in every signed-in journey in this suite, so filing it as this
      // page's would send somebody to read this page looking for it.
      const noise = /favicon|Download the Vue Devtools|status of 40[04]/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text) && !shellRedirect.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the margin freeze journey', error);
      }
      return refusals.length + ' refused write: ' + refusals[0] + ', ' +
        waste.length + ' waste 404 (fixture gap), ' + errors.length + ' unexplained console error(s)';
    });
  }
);
