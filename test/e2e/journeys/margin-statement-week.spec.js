// JOURNEY — a week's food cost, reconciled and then frozen.
//
// The module's headline capability, and the only one whose proof is an ABSENCE: a finalized statement
// must render no edit control at all. Not a disabled one — a disabled field still says "this is where
// you would change it", and there is no path on the server that would accept the change. That claim
// is unreachable from a component test, which mounts the panel in one state at a time; it needs a
// page that was editable a moment ago and is not any more.
//
// WHAT IT PROVES:
//
//   • THE MONEY AND THE FOUR RATIOS ARE THE SERVER'S. kr 40 000,00 of net food sales against
//     kr 12 000,00 of theoretical ingredient cost is 30,00 %, and the kr 14 000,00 of purchase spend
//     the journey types in is 35,00 % — so the gap is 5,00 points. The page computes none of it
//     (`covered + uncovered == net` and `gap == actual − theoretical` are reconciliations the BACKEND
//     pins), and the journey asserts the rendered strings, which is what makes that credible.
//   • AN UNCALCULATED STATEMENT WITHHOLDS. The three money columns are non-nullable and a statement
//     that was never calculated carries their schema defaults — three zeros that are not answers.
//     `calculationTimestampUtc` is the only field that says whether a calculation ever ran, and the
//     page shows the notice instead of the zeros.
//   • THREE REFUSALS, all pre-empted by the page rather than met as a server error — which matters
//     here more than anywhere, because the statement surface's business failures carry NO problem
//     code at all: "finalized and immutable", "must start on a Monday" and "an open statement already
//     exists" are one indistinguishable shape on the wire. A page that let a venue meet them would
//     have nothing to say. So: a non-Monday is refused with the Monday offered, a week that already
//     has an open statement offers the way to it instead of a create button, and a finalized
//     statement draws no mutating control.
//
// The correction path is the last thing asserted, because it is the only action a frozen week has:
// forward-only, revision N+1, with the finalized one preserved as its predecessor.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip } = require('../support/flags');

const MONDAY = '2026-07-20';
const MIDWEEK = '2026-07-22';

const MODULE_FLAG = 'Margin.Module';
const STATEMENTS_FLAG = 'Margin.Statements';

test(
  'A venue opens a week, enters its purchase spend, finalises it, and finds it frozen',
  journeyDetails({
    journey: 'margin-statement-week',
    surface: 'admin',
    capabilities: [
      'margin.statements.gate',
      'margin.statement.open',
      'margin.statement.inputs.replace-set',
      'margin.statement.recalculate',
      'margin.statement.finalize',
      'margin.statement.correction',
      'margin.coverage.read'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in, and be stopped by the module master', async () => {
      await page.goto('/admin/margin-statements');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-statements' });
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør');
      // TWO flags, both deny-closed, and the page can only tell them apart through
      // `GET /margin/status`: the module master being off hides everything, the `Margin.Statements`
      // stage flag being off hides only this surface. Every other route answers the same opaque 404
      // in both cases, which is why the two sentences below are asserted WHOLE rather than by
      // keyword — a blocker matched on "Margin" would pass on either, and on `mrgs_status_unknown`
      // too, which is what this same element says when the status read merely failed.
      await expect(page.locator('[data-test="blocker"]'))
        .toHaveText('Margin-modulen er ikke slått på for denne butikken.');
      await expect(page.locator('[data-test="periods-empty"]')).toHaveCount(0);
      return 'stopped by ' + MODULE_FLAG;
    });

    await journey.step('the stage flag under it is a SECOND, separate stop', async () => {
      // Turning the module on does not open the weekly settlement, and a walk that started from a
      // world with both flags already up could not have shown that. Through the switchboard rather
      // than through a `fetch`: `/admin/feature-flags` is the only caller of
      // `PUT /stores/{id}/feature-flags` in the product, so pressing its button is what makes the
      // switch a capability rather than a curl.
      await turnOn(page, MODULE_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('[data-test="blocker"]')).toHaveText(
        'Margin-modulen er på for denne butikken, men ukesoppgjør er ikke slått på ennå. ' +
        'Oppskrifter og tallerkenkost virker fortsatt.');
      return MODULE_FLAG + ' on, still stopped by ' + STATEMENTS_FLAG;
    });

    await journey.step('open the settlement surface with the stage flag', async () => {
      await turnOn(page, STATEMENTS_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør');
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);
      await expect(page.locator('[data-test="periods-empty"]')).toBeVisible();
      return 'gate open, no statements yet';
    });

    await journey.step('a picked date that is not a Monday is not snapped silently', async () => {
      // Snapping would produce a statement for a week nobody chose. The Monday is offered as a
      // one-click suggestion and the venue confirms it — and while the date is wrong there is no
      // create button at all, because the only outcome of pressing one would be a refusal the
      // server cannot even name (its business failures carry no code).
      await page.locator('[data-test="week-start"]').fill(MIDWEEK);
      await expect(page.locator('[data-test="not-monday"]')).toBeVisible();
      await expect(page.locator('[data-test="create-statement"]')).toHaveCount(0);
      const suggestion = page.locator('[data-test="use-monday"]');
      await expect(suggestion).toHaveText('Bruk ' + MONDAY);
      await suggestion.click();
      await expect(page.locator('[data-test="not-monday"]')).toHaveCount(0);
      return 'refused ' + MIDWEEK + ', accepted the offered ' + MONDAY;
    });

    await journey.step('open the week', async () => {
      const create = page.locator('[data-test="create-statement"]');
      await expect(create).toHaveText('Åpne oppgjøret');
      await create.click();
      // NOT "Åpent" yet. A statement that has never been calculated is its own state — the money
      // columns hold their schema defaults and the badge says so, rather than presenting an empty
      // week as an open one with nothing in it.
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });
      await expect(page.locator('[data-test="period"]')).toContainText(MONDAY);
      return (await page.locator('[data-test="revision"]').textContent()).trim();
    });

    await journey.step('it has no figures yet, and says so rather than showing three zeros', async () => {
      // The money columns are non-nullable `long`s holding schema defaults. Rendering them would tell
      // a venue this week sold nothing.
      await expect(page.locator('[data-test="uncalculated"]')).toBeVisible();
      await expect(page.locator('[data-test="net"]')).toHaveText('—');
      await expect(page.locator('[data-test="theoretical"]')).toHaveText('—');
      await expect(page.locator('[data-test="actual-percent"]')).toHaveText('—');
      return 'net, theoretical and every ratio withheld until a calculation has run';
    });

    await journey.shot('an open, uncalculated week');

    await journey.step('opening the same week again is not offered — the way to it is', async () => {
      // A week holds at most one Open statement and the server refuses a second. The page pre-empts
      // that: the create button is replaced by a control that navigates to the one that exists.
      await expect(page.locator('[data-test="open-conflict"]')).toBeVisible();
      await expect(page.locator('[data-test="create-statement"]')).toHaveCount(0);
      await expect(page.locator('[data-test="open-existing"]')).toBeVisible();
      return (await page.locator('[data-test="open-conflict"]').textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.step('enter the week\'s purchase spend', async () => {
      await page.locator('[data-test="spend-add"]').click();
      await page.locator('[data-test="spend-date"]').first().fill('2026-07-21');
      await page.locator('[data-test="spend-supplier"]').first().selectOption({ label: 'Bergen Storkjøkken AS' });
      await page.locator('[data-test="spend-note"]').first().fill('Ukesleveranse');
      await page.locator('[data-test="spend-amount"]').first().fill('14 000,00');

      // The echo of what the row will send. It is fed from the PARSED minor units rather than from
      // the text, so it is the check on `Number('14000,00') * 100` quietly losing øre: a
      // mis-parse shows up here as a different amount before anything is saved.
      //
      // RECORDED, NOT ASSERTED AGAINST: the template calls this "the integer minor units this row is
      // about to send", and `echo()` runs them back through the money formatter — so what a venue
      // sees is `kr 14 000,00`, not `1400000`. The claim in the comment and the behaviour disagree.
      // Harmless (the formatted value is derived from the parse and is one-to-one with it) but it is
      // not what the comment promises, and the next person to trust that comment while debugging a
      // parse will be looking for a number that is not there.
      const echo = page.locator('[data-test="spend-echo"]').first();
      await expect(echo).toHaveText('kr 14 000,00');
      journey.finding('note', 'the spend echo is documented as raw minor units and renders formatted money',
        'components/admin/margin/MarginSpendPanel.vue — the template comment above `spend-echo` says ' +
        '"the integer minor units this row is about to send, echoed back … the amount is never ' +
        're-formatted", but `echo(row)` returns `this.amount(parsed.minor, …)`. Observed on screen: ' +
        '"kr 14 000,00" for a typed "14 000,00". The value is one-to-one with the wire figure, so ' +
        'nothing is wrong — the comment is.');

      await page.locator('[data-test="spend-save"]').click();
      await expect(page.locator('[data-test="spend-error"]')).toHaveCount(0);
      return 'kr 14 000,00 → 1400000 øre, attributed to Bergen Storkjøkken AS';
    });

    await journey.step('recalculate, and read the week off the server', async () => {
      await page.locator('[data-test="recalculate"]').click();
      await expect(page.locator('[data-test="uncalculated"]')).toHaveCount(0, { timeout: 15000 });

      await expect(page.locator('[data-test="net"]')).toHaveText('kr 40 000,00');
      await expect(page.locator('[data-test="theoretical"]')).toHaveText('kr 12 000,00');
      await expect(page.locator('[data-test="actual"]')).toHaveText('kr 14 000,00');

      // The coverage split, beside the headline figures because it is the reason a theoretical cost
      // can be honest and still not describe the week: it only ever explains the covered part.
      await expect(page.locator('[data-test="covered"]')).toHaveText('kr 36 000,00');
      await expect(page.locator('[data-test="uncovered"]')).toHaveText('kr 4 000,00');

      // The four ratios. Each is null whenever net food sales is zero — undefined, not favourable —
      // and the gap arrives as its own field rather than being subtracted in a browser.
      await expect(page.locator('[data-test="theoretical-percent"]')).toHaveText('30,00 %');
      await expect(page.locator('[data-test="actual-percent"]')).toHaveText('35,00 %');
      await expect(page.locator('[data-test="gap"]')).toContainText('5,00');
      // UNSCOPED, and it can be now. This hook and the coverage panel's were both `coverage-percent`
      // until this journey hit the ambiguity; they are named apart because they are different
      // figures — this one is the statement's own, frozen at its last calculation.
      await expect(page.locator('[data-test="statement-coverage-percent"]')).toHaveText('90,00 %');

      // Provenance: a food-cost percentage with no date on it is a number, not evidence.
      await expect(page.locator('[data-test="calculated-at"]')).not.toHaveText('—');
      await expect(page.locator('[data-test="watermark"]')).toHaveText('918273');
      return 'net kr 40 000,00 · theoretical 30,00 % · actual 35,00 % · gap 5,00 · coverage 90,00 %';
    });

    await journey.step('the coverage panel explains the percentage rather than repeating it', async () => {
      // A statement already carries `coveragePercent`; this read is what says WHICH sales are the
      // other 10 %. The open-price bucket is first-class and never filtered out — it is frequently
      // the single largest reason a week's coverage is short.
      await expect(page.locator('[data-test="coverage-window"]')).toContainText(MONDAY);
      const uncovered = page.locator('[data-test="uncovered-row"]');
      await expect(uncovered).toHaveCount(2);

      // TWO FIGURES, TWO HOOKS, AND THE SEPARATION IS ASSERTED. They were both `coverage-percent`
      // until this journey hit the strict-mode violation, which means a probe resolving "the first
      // one" would have silently read whichever the DOM ordered first — on the module whose entire
      // point is that its figures agree. They are not interchangeable: the statement's is frozen at
      // its last calculation (and frozen for good once finalized), this one is recomputed for the
      // window at read time, so on a finalized week they can legitimately differ.
      await expect(page.locator('[data-test="coverage-window-percent"]')).toHaveText('90,00 %');
      expect(await page.locator('[data-test="coverage-percent"]').count()).toBe(0);
      expect(await page.locator('[data-test="statement-coverage-percent"]').count()).toBe(1);
      expect(await page.locator('[data-test="coverage-window-percent"]').count()).toBe(1);

      return (await uncovered.count()) + ' uncovered buckets incl. the open-price one; the two ' +
        'coverage percentages now answer to distinct hooks';
    });

    await journey.shot('the reconciled week');

    await journey.step('finalise it', async () => {
      await page.locator('[data-test="finalize"]').click();
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Låst', { timeout: 15000 });
      await expect(page.locator('[data-test="finalized-at"]')).not.toHaveText('—');
      return 'Open → Finalized';
    });

    await journey.step('A FINALIZED WEEK RENDERS NO EDIT CONTROL AT ALL', async () => {
      // The claim this journey exists for. Every one of these is checked as ABSENT rather than as
      // disabled: the server refuses each of them, and a control whose only outcome is a refusal is
      // not a control. A page that greyed them out would still be telling a venue that this is where
      // a finalized week gets changed, which is false.
      await expect(page.locator('[data-test="spend-frozen"]')).toBeVisible();
      await expect(page.locator('[data-test="immutable"]')).toBeVisible();

      await expect(page.locator('[data-test="recalculate"]')).toHaveCount(0);
      await expect(page.locator('[data-test="finalize"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-add"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-save"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-amount"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-date"]')).toHaveCount(0);
      await expect(page.locator('[data-test="spend-supplier"]')).toHaveCount(0);
      await expect(page.locator('[data-test="opening-stock"]')).toHaveCount(0);
      await expect(page.locator('[data-test="closing-stock"]')).toHaveCount(0);

      // …and the frozen lines are STILL SHOWN. "Cannot be edited" is not "is not there": the record
      // is the point of freezing it.
      await expect(page.locator('[data-test="spend-readonly-row"]')).toHaveCount(1);
      await expect(page.locator('[data-test="net"]')).toHaveText('kr 40 000,00');
      return 'zero mutating controls, 1 frozen spend line, figures intact';
    });

    await journey.shot('frozen');

    await journey.step('the one action a frozen week HAS is the forward-only correction', async () => {
      // Offered only on the LATEST revision of its week and only once that revision is finalized,
      // because those are exactly the conditions under which the server opens the next one. There is
      // no un-finalize and no route back.
      const correct = page.locator('[data-test="create-correction"]');
      await expect(correct).toHaveText('Åpne en retting');
      await correct.click();
      // Revision 2 opens UNCALCULATED, and that is right rather than a rough edge: a correction is a
      // fresh statement, so it carries no figures until somebody recalculates it. A page that copied
      // the finalized week's numbers forward would be presenting frozen figures as the new week's.
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });
      await expect(page.locator('[data-test="uncalculated"]')).toBeVisible();
      await expect(page.locator('[data-test="revision"]')).toContainText('2');
      // The predecessor is named on the new revision rather than replaced by it.
      await expect(page.locator('[data-test="corrects"]')).toBeVisible();
      await expect(page.locator('[data-test="period-row"]')).toHaveCount(2);
      return 'revision 2 opened, revision 1 preserved as its predecessor';
    });

    await journey.step('the projection repair is NOT drawn for the venue that owns this week', async () => {
      // ASSERTED AS AN ABSENCE, and it is the right assertion rather than a concession. A rebuild
      // rescans the store's whole journal, so a store admin meets a 403 from the framework's role
      // filter before the module gate ever runs — a page that drew the button for her would be
      // offering a control whose only outcome is a refusal, which is what `v-if="isPowerUser"`
      // exists to prevent.
      //
      // This session is the venue's own manager, which is who reconciles a week: `isPowerUser` is
      // false for every store identity in this world. An earlier draft of this walk ran against a
      // fixture whose manager WAS a PowerUser and asserted the control's presence here — it passed,
      // and it described a venue that does not exist. The state a real venue is in is this one.
      await expect(page.locator('[data-test="projection-lag"]')).toHaveCount(0);
      await expect(page.locator('[data-test="rebuild-projection"]')).toHaveCount(0);
      journey.finding('note', 'a venue cannot see, or repair, the projection its own settlement is computed from',
        'pages/admin/margin-statements.vue renders the projection panel under `v-if="isPowerUser"`, ' +
        'so the store admin who opens, reconciles and freezes the week is never shown the lag figure ' +
        'the figures depend on. A week can be finalized while the projector is behind and nothing on ' +
        'this page would say so — `F-MRG-FINALIZE-LAG` holds that open. Recorded here because this ' +
        'walk is the first thing to observe it from the venue\'s own session.');
      return 'no lag figure and no rebuild control for a store admin — the 403 is pre-empted';
    });

    await journey.step('and the stage switch closes the FINALIZED week too', async () => {
      // THE MUTATION, RUN BY THE JOURNEY ITSELF, and it asks something the recipe walk's version of
      // this step does not: that gate covers the per-statement routes and not merely the list. There
      // is a finalized revision 1 and an open revision 2 on screen when the switch goes down, and
      // both have to disappear — a fixture that gated only `GET /margin/statements` would leave the
      // detail rendered and this assertion is what would catch it.
      await page.goto('/admin/feature-flags');
      await flip(page, 'off', STATEMENTS_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('[data-test="blocker"]')).toBeVisible();
      await expect(page.locator('[data-test="period-row"]')).toHaveCount(0);
      await expect(page.locator('[data-test="state-badge"]')).toHaveCount(0);
      return 'switch down, both revisions gone — the gate reaches the detail, not just the list';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does not
      // work, which is false. A browser error during a working flow is a finding somebody has to
      // decide about, and they cannot decide about something nobody wrote down.
      //
      // The 404s are the three module gates this walk opened and closed on purpose, all asserted on
      // screen above; the shell's «Navigation cancelled» pair is `AdminPage`'s login redirect racing
      // the storeId append and appears identically in every signed-in journey in this suite, so
      // filing it here would send somebody to read this page looking for it.
      const noise = /favicon|Download the Vue Devtools|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in margin-recipe-to-margin, ' +
          'growth-privacy-queue and workforce-schedule-publish. It is AdminPage\'s login redirect ' +
          'being superseded by the storeId append, not anything on this page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the margin statement journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);
