// JOURNEY — a venue reads the month's bill, line by line, and takes away the file it sends.
//
// ---- WHAT THIS WALK COVERS, AND WHAT IT DOES NOT ----------------------------------------------
//
// The statement family is five endpoints and it is bound by TWO surfaces, on purpose:
//
//   #19 draft, #20 finalize   `components/admin/meals/MealsMonthClose.vue` on /admin/meals-agreements
//   #21 list, #22 get, #23 export   `pages/admin/meals-statements.vue`, the page this walk drives
//
// A FINALIZE IS IRREVERSIBLE, so there is exactly one control for it in the product and it is not on
// the page under test here — it belongs beside the reconciliation queue that unblocks it, because the
// blocking refusal carries a count and no identity. THIS WALK THEREFORE DRIVES TWO OF THE THREE
// STAGES THROUGH A BROWSER CONTROL AND ONE THROUGH THE API. That is stated in every step name and in
// the artifact's own step detail rather than being left for a reader to infer:
//
//   draft     API   `request.post` — no control on this page, by design
//   finalize  API   the same, and for the same reason
//   get       UI    the operator opens the run and reads its lines
//   export    UI    the operator fetches the CSV, reads it on screen, and saves it
//
// A journey that pretended a button existed for the first two would be the exact defect this estate
// keeps paying for, so it does not.
//
// ---- THE ASSERTION THIS JOURNEY EXISTS FOR ----------------------------------------------------
//
// A finalized line must show the reference that was PERSISTED onto it, not one the page reassembled.
// The proof rests on three things and each is checked here rather than assumed:
//
//   1. THE VALUES DIFFER FROM EVERYTHING ELSE ON THE PAYLOAD. Line A's reference is `ANS-2287`, a
//      company payroll code that equals no id, no allocation, no order and no receipt number in this
//      world. Line B's is the bare membership GUID, which is what the bill really says when the
//      invitation carried no employee reference. Both are asserted BY VALUE — never "is not empty",
//      which a prefix-plus-an-id would satisfy however wrong it was.
//   2. THE REFERENCE IS RESOLVED AT DRAFT AND SURVIVES THE FREEZE. The walk reads the DRAFT's lines,
//      then finalizes, then re-reads: same two strings, and the run now says Finalized.
//   3. THE EXPORT CARRIES THE SAME STRINGS. Column five of the CSV, checked per row against the same
//      constants, so a page that rendered correctly over a file that did not would still fail.
//
// Line A's membership is seeded REVOKED. The bill still names `ANS-2287`, which is the property the
// module claims: the reference is a snapshot, not a join, and revoking somebody does not rewrite what
// they already cost.
//
// Selectors are `data-test` attributes. This is the first component under `components/admin/meals/`
// to carry any — `meals-admin-setup.spec.js` records the absence as a finding and rides on Norwegian
// label text because it has to.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');
const meals = require('../fixture/meals');

const MANAGER = world.MANAGER_PHONE.replace(/^\+47/, '');
const PERIOD = String(meals.STATEMENT_PERIOD_YEAR) + '-0' + String(meals.STATEMENT_PERIOD_MONTH);

// The two strings the whole walk turns on, taken from the fixture rather than retyped.
const REF_A = meals.STATEMENT_EMPLOYEE_REF;
const REF_B = meals.STATEMENT_MEMBER_BARE;

test(
  'A venue reads the month statement, sees the reference each line was written with, and exports it',
  journeyDetails({
    journey: 'meals-statement-month',
    surface: 'admin',
    capabilities: [
      'meals.statement.get',
      'meals.statement.list.refused',
      'meals.statement.export',
      'meals.statement.member-reference.persisted'
    ]
  }),
  async ({ page, journey, request }) => {
    // 4010 is the DEFAULT fixture port, not the only one. `E2E_FIXTURE_PORT` is what
    // `playwright.config.js` starts the fixture on and what `test/e2e/support/journey.js` records as
    // this run's `apiBaseUrl`, so a base that ignores it sends these calls to whatever else happens
    // to be on 4010 — which, when journeys are walked side by side, is another lane's fixture. The
    // walk then reads and WRITES a world it did not build, and reports on it. Same expression as
    // `account-email-confirm`, `growth-guest-lifecycle` and `growth-testsend-refusal`.
    const api = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));
    let runId = null;

    await journey.step('sign in as the venue manager', async () => {
      await page.goto('/admin/meals-statements');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: MANAGER, code: world.OTP, expectPath: '/admin/meals-statements' });
      await expect(page.locator('[data-test="meals-statements-owner"]')).toBeVisible();
      return 'on /admin/meals-statements as ' + world.MANAGER_PHONE + ' (store admin)';
    });

    await journey.step('the page says out loud that it does not close the month', async () => {
      // The most important sentence on the screen. An operator who came here looking for the freeze
      // is sent to the one control that exists, instead of finding a second one that cannot tell
      // them what is blocking it.
      const owner = page.locator('[data-test="meals-statements-owner"]');
      await expect(owner).toContainText('Bedriftsavtaler');
      return (await owner.textContent()).replace(/\s+/g, ' ').trim().slice(0, 110) + '…';
    });

    await journey.step('the company statement LIST is refused, and the page says whose it is', async () => {
      // #21 is `RequireCompanyAdminAsync`. This venue's manager is a store admin, so the refusal is
      // the authority boundary working — asserted as a SENTENCE rather than as an empty panel, which
      // a venue would read as "no statements have ever been produced here".
      const refused = page.locator('[data-test="meals-statements-history-forbidden"]');
      await expect(refused).toBeVisible({ timeout: 20000 });
      await expect(page.locator('[data-test="meals-statements-history-none"]')).toHaveCount(0);
      return (await refused.textContent()).replace(/\s+/g, ' ').trim().slice(0, 110) + '…';
    });

    await journey.shot('the statement page before a run is opened');

    const token = await page.evaluate(() => {
      const raw = window.localStorage.getItem('state');
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && parsed.currentUser && parsed.currentUser.token) || null;
    });

    await journey.step('#19 DRAFT — performed through the API, because this page has no such control', async () => {
      // The month close is `MealsMonthClose.vue` on /admin/meals-agreements. Driving it here would
      // mean this journey had opened a second control for an irreversible act; driving it through
      // the API is the honest alternative and is labelled as such in the artifact.
      const response = await request.post(api + '/v1/stores/' + world.STORE_ID + '/meals/statements/drafts', {
        headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': 'journey-draft-1' },
        data: {
          companyId: world.MEALS_COMPANY_ID,
          currency: world.CURRENCY,
          periodYear: meals.STATEMENT_PERIOD_YEAR,
          periodMonth: meals.STATEMENT_PERIOD_MONTH
        }
      });
      expect(response.status()).toBe(200);
      const detail = await response.json();
      runId = detail.summary.statementRunId;
      expect(detail.summary.status).toBe('Draft');
      // The snapshot happened HERE, in this call, and the two values are already different.
      expect(detail.lines.map(l => l.memberDisplayRef).sort()).toEqual([REF_A, REF_B].sort());
      return 'drafted ' + runId + ' for ' + PERIOD + ', 2 lines, status Draft';
    });

    await journey.step('the DRAFT is opened in the browser and its lines carry those references', async () => {
      await page.locator('[data-test="meals-statements-run-input"]').fill(runId);
      await page.locator('[data-test="meals-statements-open"]').click();

      const refs = page.locator('[data-test="meals-statement-member-ref"]');
      await expect(refs).toHaveCount(2, { timeout: 20000 });
      const rendered = (await refs.allTextContents()).map(t => t.trim());
      // BY VALUE. `ANS-2287` appears nowhere else in this world — not as an id, an allocation, an
      // order or a receipt number — so rendering it is only possible by reading the stored column.
      expect(rendered).toContain(REF_A);
      expect(rendered).toContain(REF_B);
      await expect(page.locator('[data-test="meals-statement-status"]')).toHaveText('Utkast');
      await expect(page.locator('[data-test="meals-statements-still-draft"]')).toBeVisible();
      return 'draft renders ' + rendered.join(' + ');
    });

    await journey.step('#20 FINALIZE — through the API, for the same reason', async () => {
      const before = await request.get(api + '/v1/meals/statements/' + runId,
        { headers: { Authorization: 'Bearer ' + token } });
      const read = await before.json();
      const response = await request.post(api + '/v1/meals/statements/' + runId + '/finalize', {
        headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': 'journey-finalize-1' },
        data: { expectedVersion: read.summary.revision, expectedContentHash: read.summary.contentHash }
      });
      expect(response.status()).toBe(200);
      const detail = await response.json();
      expect(detail.summary.status).toBe('Finalized');
      return 'finalized at ' + detail.summary.finalizedAtUtc + ', content hash ' +
        String(detail.summary.contentHash).slice(0, 12) + '…';
    });

    await journey.step('THE EXIT: the FINALIZED line shows the persisted reference', async () => {
      await page.locator('[data-test="meals-statements-reread"]').click();
      await expect(page.locator('[data-test="meals-statement-status"]')).toHaveText('Ferdigstilt', { timeout: 20000 });
      await expect(page.locator('[data-test="meals-statements-frozen"]')).toBeVisible();

      const refs = page.locator('[data-test="meals-statement-member-ref"]');
      await expect(refs).toHaveCount(2);
      const rendered = (await refs.allTextContents()).map(t => t.trim());
      expect(rendered).toContain(REF_A);
      expect(rendered).toContain(REF_B);

      // …and the reference is not any of the other identifiers the same rows carry. Written as an
      // explicit inequality rather than left implicit, because "it rendered something" is what a
      // prefix-plus-an-id assertion would have accepted.
      const lines = page.locator('[data-test="meals-statement-line"]');
      const rowText = (await lines.allTextContents()).join(' ');
      expect(rowText).toContain('K-2026-000117');
      expect(REF_A).not.toBe('K-2026-000117');
      expect(REF_A).not.toBe(runId);
      return 'finalized lines still read ' + rendered.join(' + ');
    });

    await journey.shot('the finalized statement and its member references');

    await journey.step('#23 EXPORT — the venue fetches the file the buyer receives', async () => {
      await page.locator('[data-test="meals-statements-export"]').click();
      const result = page.locator('[data-test="meals-statements-export-result"]');
      await expect(result).toBeVisible({ timeout: 20000 });

      const csv = (await page.locator('[data-test="meals-statements-export-text"]').textContent()).trim();
      const rows = csv.split('\n');
      const header = rows.find(r => r.startsWith('allocationId,'));
      expect(header.split(',')[4]).toBe('memberDisplayRef');

      // Column five of every data row, by value. A screen that rendered correctly over a file that
      // did not would still fail here, which is the point of checking the FILE and not the page.
      const dataRows = rows.filter(r => r.startsWith('alc-'));
      expect(dataRows).toHaveLength(2);
      const fromFile = dataRows.map(r => r.split(',')[4]).sort();
      expect(fromFile).toEqual([REF_A, REF_B].sort());

      // The preamble names the period and the status, so the file is self-describing to whoever opens
      // it a year later without this screen.
      expect(csv).toContain('# period=' + PERIOD);
      expect(csv).toContain('# status=Finalized');
      return 'CSV column 5 = ' + fromFile.join(' + ') + ', ' + rows.length + ' lines';
    });

    await journey.step('the file the server signed is named and signed by the server', async () => {
      // The hash on screen is the one the response HEADER carried, never one this client computed —
      // a hash derived here would prove nothing about the document the server signed.
      const hash = page.locator('[data-test="meals-statements-export-hash"]');
      await expect(hash).toBeVisible();
      // `Content-Disposition` IS exposed by this API's CORS policy, so the page must not be claiming
      // it named the file itself.
      await expect(page.locator('[data-test="meals-statements-export-named-here"]')).toHaveCount(0);
      return (await hash.textContent()).replace(/\s+/g, ' ').trim().slice(0, 90) + '…';
    });

    await journey.step('and it is saved', async () => {
      const download = page.waitForEvent('download', { timeout: 20000 });
      await page.locator('[data-test="meals-statements-download"]').click();
      const saved = await download;
      const name = saved.suggestedFilename();
      expect(name).toContain('meals-statement-' + PERIOD);
      expect(name.endsWith('.csv')).toBe(true);
      return 'downloaded ' + name;
    });

    await journey.shot('the exported file');

    await journey.step('what this walk did NOT prove, recorded rather than implied', () => {
      journey.finding('note', 'draft and finalize were driven through the API, not through a browser control',
        'This page binds #21/#22/#23 only. #19 and #20 belong to MealsMonthClose.vue on ' +
        '/admin/meals-agreements, which is on an unmerged lane branch and is not in this checkout, so ' +
        'no browser control for them exists here to drive. The two stages above are labelled API in ' +
        'their step names. A walk of the full draft-finalize-export sequence through browser controls ' +
        'needs the two surfaces merged and one link added from the close to this page.');
      journey.finding('note', 'this run is a FIXTURE proxy for the persistence claim, not a live one',
        'The backend really does snapshot memberDisplayRef at draft and freeze it with ' +
        'TR_MealsStatementLines_FinalizedImmutable — L-MEALS-EMPREF proved that on a SQL tier. What ' +
        'THIS run shows is the client half: that the page prints the value the wire carried and ' +
        'reconstructs nothing. A live run would additionally show that the value came out of a real ' +
        'MealsStatementLines row, that the trigger refuses an UPDATE to it, and that both survive a ' +
        'restart; it needs Features:Meals:Module and Features:Meals:Statements on, a corridor, and ' +
        'funded-order allocations no shipped client can create.');
      journey.finding('note', 'the gate on this surface has NO operator lever',
        'meals.statements is in MealsFeatureFlags\' Withheld dictionary and is host configuration ' +
        'read through IOptionsMonitor, so unlike margin-recipe-to-margin or the workforce walks this ' +
        'journey cannot flip its own gate in either direction. The fixture therefore models no gate ' +
        'here, which is stated in fixture/meals.js rather than left to be discovered.');
      return 'recorded';
    });

    await journey.step('what the browser said while this ran', () => {
      const noise = /favicon|Download the Vue Devtools|status of 403/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in every other signed-in journey in ' +
          'this suite. It is AdminPage\'s login redirect being superseded by the storeId append, not ' +
          'anything on this page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the meals statement journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);
