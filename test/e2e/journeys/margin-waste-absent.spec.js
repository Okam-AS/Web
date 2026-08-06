// JOURNEY — what a venue is told about waste by a server that does not serve waste.
//
// THE ONLY PROOF THAT COUNTS HERE IS A RENDERED SENTENCE. The defect this walk exists for is not a
// wrong value or a broken request: it is a screen that made a confident claim about a capability that
// is not there. `utils/margin/waste-client.js` names four routes — GET/POST/PUT/DELETE
// `/margin/waste` — and no backend this estate deploys answers any of them. A component test can
// assert a prop; only a page can show that a venue reconciling a week is shown an alarm about a failed
// read, under the week's food-cost figures, for a feature that never existed.
//
// THE FIXTURE IS NOT ARRANGED TO PRODUCE THIS. `test/e2e/fixture/` contains the string "waste" ZERO
// times: the fixture serves no waste route because the real backend serves none, so the 404 this walk
// reads is the fixture's default answer for a path nobody wrote — exactly the router 404 a live API
// gives. Verified against the API running on this laptop while the walk was written: `/margin/coverage`
// and `/margin/status` answer 401 (they exist and want a bearer), `/margin/waste` answers 404, the same
// status as `/margin/definitely-not-a-route`.
//
// WHY THIS IS REACHABLE AT ALL, which is the part that makes it a blocker rather than a rough edge:
// `GET /margin/status` answers `statements: true`, and that is the single thing that puts the waste
// panel on screen. So the panel is drawn for every venue on the statements stage, and the 404 lands on
// every week any of them opens.
//
// WHAT IT PINS:
//
//   • THE WASTE PANEL SAYS THE FEATURE IS ABSENT, not that a read failed. Two different sentences that
//     invite opposite behaviour — an absence invites a question, a failed read invites a retry, then a
//     support call, then doubt about the reconciled figures printed directly above it.
//   • IT OFFERS NO FORM. Asserted as an ABSENCE of every input and of the record button, because a
//     form here would take a loss the kitchen had counted and post it into a route that does not
//     exist. A disabled form would be no better: it still says "this is where you record waste".
//   • THE COVERAGE PANEL STOPS SAYING "NOTHING HAS BEEN RECORDED AS WASTE". That sentence is the
//     sharper half of the defect — it is a measurement claimed where none was made, printed under the
//     week's reconciled food cost, on the one surface that might have exposed the gap.
//
// The last step is the falsification: the walk re-reads the network log and REFUSES to pass if the
// browser never actually asked for `/margin/waste`. A panel that renders an absent state because no
// request was ever sent has proved nothing at all, and that is the exact shape of instrument failure
// this estate keeps paying for.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MONDAY = '2026-07-20';

const MODULE_FLAG = 'Margin.Module';
const STATEMENTS_FLAG = 'Margin.Statements';

// Every hook the recording form and the entry table own. Checked as a set rather than one by one, so a
// later edit that adds a seventh control cannot slip past a list somebody forgot to extend.
const RECORDING_CONTROLS = [
  'waste-record', 'waste-date', 'waste-reason', 'waste-value',
  'waste-description', 'waste-quantity', 'waste-ingredient', 'waste-remove'
];

test(
  'a venue on a server with no waste routes is told the feature is absent, and is offered nothing to type into',
  journeyDetails({
    journey: 'margin-waste-absent',
    surface: 'admin',
    capabilities: [
      'margin.waste.absent-state',
      'margin.coverage.waste-absent-state'
    ]
  }),
  async ({ page, journey }) => {
    // Every response the browser actually received, so the last step can prove the request happened
    // rather than trusting that it must have.
    const wasteResponses = [];
    page.on('response', (response) => {
      if (response.url().includes('/margin/waste')) {
        wasteResponses.push({ url: response.url(), status: response.status() });
      }
    });

    await journey.step('sign in and open the weekly settlement surface', async () => {
      await page.goto('/admin/margin-statements');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-statements' });
      // BOTH flags, through the switchboard rather than a fetch — and this is the precondition that
      // makes the defect reachable rather than scene-setting. With either flag down there is no waste
      // panel at all, so the only world in which a venue can be shown a waste 404 is the one where the
      // server has just said the statements surface is ON.
      await turnOn(page, MODULE_FLAG);
      await turnOn(page, STATEMENTS_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);
      return 'both flags on, statements surface open';
    });

    await journey.step('open a week, which is what draws the waste panel', async () => {
      await page.locator('[data-test="week-start"]').fill(MONDAY);
      const create = page.locator('[data-test="create-statement"]');
      await expect(create).toBeVisible();
      await create.click();
      await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });
      return 'week of ' + MONDAY + ' opened';
    });

    await journey.shot('the week, with the waste panel on it');

    await journey.step('THE WASTE PANEL SAYS THE FEATURE IS NOT HERE, not that a read failed', async () => {
      const absent = page.locator('[data-test="waste-absent"]');
      await expect(absent).toBeVisible();
      // The sentence a venue used to be shown. It is a claim about a broken request, for a capability
      // that was never there, and it is the whole reason this walk exists.
      await expect(page.locator('[data-test="waste-unknown"]')).toHaveCount(0);
      // …and never the empty-week sentence either, which would be the opposite lie: a claim that this
      // kitchen threw nothing away.
      await expect(page.locator('[data-test="waste-empty"]')).toHaveCount(0);
      return (await absent.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.step('AND IT OFFERS NOTHING TO TYPE INTO A ROUTE THAT DOES NOT EXIST', async () => {
      for (const hook of RECORDING_CONTROLS) {
        await expect(page.locator('[data-test="' + hook + '"]')).toHaveCount(0);
      }
      // The section is still identifiable — the absence is STATED, not silently hidden. A panel that
      // vanished would leave a venue who had been told this module records waste with nothing on
      // screen saying that it does not.
      await expect(page.locator('[data-test="waste-absent"]')).toBeVisible();
      return RECORDING_CONTROLS.length + ' recording controls absent, the heading and the sentence kept';
    });

    await journey.step('THE COVERAGE PANEL STOPS CLAIMING A MEASUREMENT NOBODY MADE', async () => {
      // The sharper half. `MarginCoverageResponse` carries no waste field at all, and this panel used
      // to render that silence as "Nothing has been recorded as waste in this window" — an absence
      // reported as a counted zero, printed under the week's reconciled food-cost figures.
      const covAbsent = page.locator('[data-test="coverage-waste-absent"]');
      await expect(covAbsent).toBeVisible();
      await expect(page.locator('[data-test="waste-none"]')).toHaveCount(0);
      await expect(page.locator('[data-test="coverage-waste-unknown"]')).toHaveCount(0);
      return (await covAbsent.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('what the two panels say about a capability the server does not have');

    // Not `async`: everything here is a synchronous read of the response log the listener filled while
    // the steps above ran. Nothing is awaited because nothing is fetched — that is the point.
    await journey.step('THE FALSIFICATION: the browser really did ask, and really was refused', () => {
      // Without this the walk would pass just as well against a page that renders the absent state
      // because no read was ever attempted — which is the same class of defect it is here to remove.
      expect(wasteResponses.length).toBeGreaterThan(0);
      const statuses = [...new Set(wasteResponses.map(r => r.status))];
      expect(statuses).toEqual([404]);
      journey.finding('note', 'the waste routes answer 404 on the fixture because they answer 404 everywhere',
        'test/e2e/fixture/ contains the string "waste" zero times, so this is the default answer for a ' +
        'path nobody wrote — the same router 404 a live API gives. Probed on the API running on this ' +
        'laptop while the walk was written: /margin/coverage and /margin/status answered 401, ' +
        '/margin/waste answered 404, identical to /margin/definitely-not-a-route.');
      return wasteResponses.length + ' request(s) to /margin/waste, all 404';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED, exactly as the sibling margin walks do it. The 404 on /margin/waste is
      // the subject of this journey and is asserted on screen above, so filing its console echo as a
      // defect would be filing the finding twice.
      const noise = /favicon|Download the Vue Devtools|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the margin waste-absent journey', error);
      }
      return errors.length ? errors.length + ' console error(s) recorded' : 'nothing';
    });
  }
);
