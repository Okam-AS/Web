// JOURNEY — the payroll batch, opened, frozen and downloaded by a manager in a browser.
//
// Workforce's W5 surface (endpoints #27, #28, #29 plus the two reads beside them) was
// backend-complete and had ZERO frontend callers. The export provider seam, the neutral CSV and the
// finalize-then-refuse chain were all real and all unreachable by the person they are for: there
// were seven Workforce screens and none of them was a timesheet screen. The lane that built the
// batch said so itself rather than claiming the capability existed.
//
// So this walk is about REACHABILITY first, and it is deliberately paranoid about it in the one way
// that matters: it arrives at the page by CLICKING THE SIDEBAR LINK. Not `page.goto`, not a handler
// call. A test that calls the handler passes with the button unbound, the route absent, or the link
// never rendered — the exact shape found repeatedly on this branch. The click is the assertion;
// everything after it is what the click reached.
//
// ---- THE REFUSAL IS HALF THE PRODUCT, AND IT IS PROVOKED BY CLICKING ---------------------------
//
// A walk that only succeeds proves an exit code. The chain here is FINALIZE-THEN-REFUSE, and both
// halves are driven from the browser:
//
//   approve once            the period freezes, and the server stamps WHO
//   approve again           409 `timesheet-period-already-approved` — an approved period is never
//                           reopened. This is a REAL second attempt, not a simulated one: the client
//                           mints a fresh `Idempotency-Key` per click, and a same-key repeat would
//                           have REPLAYED the stored 200 instead. That asymmetry is the whole reason
//                           the refusal is reachable by pressing a button twice, and it is asserted
//                           below rather than assumed.
//   export once             a batch is written and the bytes exist
//   export again            409 `timesheet-nothing-to-reconcile` — a sent period is never re-sent
//                           whole.
//
// ---- WHAT THE FILE IS CHECKED FOR ---------------------------------------------------------------
//
// The download is a REAL browser download (Playwright's `download` event), and the bytes are read
// off disk. The one cell that matters most is the MISSING PUNCH row: its `minutes` is EMPTY, never
// `0`. "Worked no time" and "we do not know what this person worked" are different facts about
// somebody's pay, and a CSV that rendered the second as the first would be wrong in the direction
// that costs a person money. The header's `basis=hours-only` and `wageMath=none` are checked for the
// same reason: this file is hours, and a payroll system that read it as money would be reading a
// claim nothing here makes.
//
// ---- C4: WHO TURNED HOURS INTO MONEY ------------------------------------------------------------
//
// The approving actor is printed on screen and checked against the ledger the fixture holds. It is
// the caller's own staff-member reference, resolved from the bearer token by the server — the real
// service does `caller.StaffMemberId.ToString()` after `RequireWriteCapabilityAsync` and REFUSES
// rather than defaulting when it cannot resolve one. Nothing in this journey names an actor, and
// nothing may: a test that constructed one would be proving its own constant.

const fs = require('fs');
const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');
const world = require('../fixture/world');
const timesheets = require('../fixture/workforce-timesheets');

/** The §9.1 stage-6 gate on the two WRITES. The three reads are never gated on it. */
const EXPORT_FLAG = world.TIMESHEET_WRITE_FLAG;

/** The sidebar label, last in the Workforce module group under the eight other Workforce links. */
const NAV_LABEL = 'Timelister';

/** The seeded fortnight — fourteen closed venue days ending yesterday. */
const RANGE = timesheets.seededRange(new Date());

test(
  'A manager freezes a fortnight of hours, sends it to payroll, and downloads the file that left',
  journeyDetails({
    journey: 'workforce-timesheet-export',
    surface: 'admin',
    capabilities: [
      'workforce.timesheet.reachable-from-navigation',
      'workforce.timesheet.period.read',
      'workforce.timesheet.read-stays-open-while-the-stage-flag-is-off',
      'workforce.timesheet.approve.freezes-the-period',
      'workforce.timesheet.approve.records-the-approving-actor',
      'workforce.timesheet.approve.refuses-a-second-approval',
      'workforce.timesheet.export.creates-a-batch',
      'workforce.timesheet.export.refuses-a-second-whole-send',
      'workforce.timesheet.export.download-serves-the-recorded-bytes',
      'workforce.timesheet.export.unknown-hours-are-empty-never-zero'
    ]
  }),
  async ({ page, journey }) => {
    let periodId = null;
    let approvedBy = null;
    /** The second manager's tab — opened before the freeze, so its Approve button stays live. */
    let stale = null;

    await journey.step('sign in as the manager', async () => {
      await page.goto('/admin/workforce-rates');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-rates' });
      return 'signed in at store ' + world.STORE_ID;
    });

    // ---- REACHABILITY. The whole point: arrive by CLICKING, never by goto. --------------------
    await journey.step('reach the timesheet screen by clicking the sidebar link', async () => {
      const link = page.locator('.admin-nav__link', { hasText: NAV_LABEL });
      await expect(link).toBeVisible({ timeout: 30000 });
      await link.click();
      await page.waitForURL(/\/admin\/workforce-timesheets/, { timeout: 60000 });
      await expect(page.locator('.wft-page__title')).toHaveText('Timelister');
      return 'clicked "' + NAV_LABEL + '" and landed on /admin/workforce-timesheets';
    });

    // ---- THE READ IS UNGATED, AND THAT IS A PROPERTY, NOT AN OMISSION ------------------------
    //
    // The flag is still OFF here. §9.2 says a disabled stage goes READ-ONLY rather than dark, so the
    // period must be READABLE and only the two writes withheld. A page that darkened itself would
    // hide an accountant's own record behind a switch somebody else pulled.
    await journey.step('the period reads while the export stage is still off', async () => {
      await page.locator('[data-testid="wft-from"]').fill(RANGE.from);
      await page.locator('[data-testid="wft-to"]').fill(RANGE.to);
      await page.locator('[data-testid="wft-load"]').click();

      await expect(page.locator('[data-testid="wft-status"]')).toHaveText('Åpen', { timeout: 30000 });
      await expect(page.locator('[data-testid="wft-line-count"]')).toHaveText('8');
      // The read answered in full — hours and all — with the write flag down.
      await expect(page.locator('[data-testid="wft-paid-hours"]')).toContainText('t');
      await expect(page.locator('[data-testid="wft-flag-off"]')).toBeVisible();

      // And the two acts are WITHHELD WITH A REASON rather than silently missing.
      await expect(page.locator('[data-testid="wft-approve"]')).toBeDisabled();
      await expect(page.locator('[data-testid="wft-approve-why"]'))
        .toHaveText('Eksport er slått av for denne butikken.');
      return 'period readable, both writes withheld, reason named on screen';
    });

    await journey.shot('the period reads while the export switch is down');

    await journey.step('pull the export lever the way an operator does', async () => {
      await turnOn(page, EXPORT_FLAG);
      return EXPORT_FLAG + ' on for store ' + world.STORE_ID;
    });

    await journey.step('return to the timesheet and load the fortnight', async () => {
      await page.locator('.admin-nav__link', { hasText: NAV_LABEL }).click();
      await page.waitForURL(/\/admin\/workforce-timesheets/, { timeout: 60000 });
      await page.locator('[data-testid="wft-from"]').fill(RANGE.from);
      await page.locator('[data-testid="wft-to"]').fill(RANGE.to);
      await page.locator('[data-testid="wft-load"]').click();
      await expect(page.locator('[data-testid="wft-status"]')).toHaveText('Åpen', { timeout: 30000 });
      await expect(page.locator('[data-testid="wft-approve"]')).toBeEnabled();

      periodId = timesheets.periodIdFor(world.STORE_ID, RANGE.from, RANGE.to);
      return 'period ' + periodId + ' open over ' + RANGE.from + '…' + RANGE.to;
    });

    // A SECOND MANAGER OPENS THE SAME FORTNIGHT, BEFORE ANYBODY HAS FROZEN IT. Opened here rather
    // than after the freeze on purpose: a tab loaded afterwards would render the period as already
    // approved and correctly withhold its button, and there would be no live control left to click.
    // The refusal this journey has to provoke is only reachable from a control somebody could
    // genuinely still press — which is what a stale tab is.
    await journey.step('a second manager opens the same fortnight before it is frozen', async () => {
      stale = await page.context().newPage();
      await stale.goto('/admin/workforce-timesheets');
      await expect(stale.locator('.wft-page__title')).toHaveText('Timelister', { timeout: 60000 });
      await stale.locator('[data-testid="wft-from"]').fill(RANGE.from);
      await stale.locator('[data-testid="wft-to"]').fill(RANGE.to);
      await stale.locator('[data-testid="wft-load"]').click();
      await expect(stale.locator('[data-testid="wft-status"]')).toHaveText('Åpen', { timeout: 30000 });
      await expect(stale.locator('[data-testid="wft-approve"]')).toBeEnabled();
      return 'second tab holds the period as Åpen with a live Approve button';
    });

    // ---- THE UNKNOWN-HOURS DECISION IS THE MANAGER'S, AND IT IS EXPLICIT ----------------------
    //
    // One seeded row is a MISSING PUNCH whose minutes nobody can state. The server refuses a freeze
    // that would swallow it silently; the page offers the decision, and pressing Approve without it
    // must be REFUSED rather than quietly succeed.
    await journey.step('approving without deciding about the unknown hours is refused', async () => {
      await expect(page.locator('[data-testid="wft-incomplete-count"]')).toHaveText('1');
      await expect(page.locator('[data-testid="wft-allow-incomplete"]')).not.toBeChecked();

      await page.locator('[data-testid="wft-approve"]').click();
      await expect(page.locator('[data-testid="wft-refusal-code"]'))
        .toHaveText('workforce.timesheet-period-incomplete', { timeout: 30000 });
      // Still open — the refusal did not half-freeze anything.
      await expect(page.locator('[data-testid="wft-status"]')).toHaveText('Åpen');
      return 'refused workforce.timesheet-period-incomplete; period still Åpen';
    });

    await journey.shot('the freeze is refused while an hour is unaccounted for');

    // ---- THE FREEZE --------------------------------------------------------------------------
    await journey.step('decide about the unknown hours and freeze the period', async () => {
      await page.locator('[data-testid="wft-allow-incomplete"]').check();
      await page.locator('[data-testid="wft-approve"]').click();

      await expect(page.locator('[data-testid="wft-status"]')).toHaveText('Godkjent', { timeout: 30000 });
      await expect(page.locator('[data-testid="wft-notice"]')).toBeVisible();

      approvedBy = await page.locator('[data-testid="wft-approved-by"]').textContent();
      const digest = await page.locator('[data-testid="wft-snapshot-sha"]').textContent();
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      return 'frozen; approvedBy=' + approvedBy + ' snapshot=' + digest.slice(0, 16) + '…';
    });

    // ---- C4. WHO. -----------------------------------------------------------------------------
    //
    // Checked against the fixture's own record rather than against a constant this file chose: the
    // value on screen must be the value the server stamped, and it must be the SIGNED-IN manager's
    // staff member — not a system actor, not a blank, not the id of anyone else on the roster.
    // Synchronous on purpose: this step asserts about a value ALREADY read off the screen in the
    // step above, so it drives no browser. Making it await something would be inventing work to
    // satisfy a lint rule.
    await journey.step('the freeze names the manager who caused it', () => {
      expect(approvedBy).toBeTruthy();
      expect(approvedBy.trim()).toBe(timesheets.MANAGER_STAFF_MEMBER_ID);
      // It is NOT one of the three workers whose hours are in the file — the actor is the approver,
      // never a subject of the record.
      for (const staff of world.STAFF) {
        expect(approvedBy.trim()).not.toBe(staff.staffMemberId);
      }
      return 'approvedByActorReference = the signed-in manager\'s staff member, resolved server-side';
    });

    await journey.shot('the frozen period and the manager who froze it');

    // ---- REFUSAL ONE, BY CLICKING A CONTROL THAT IS REALLY THERE ------------------------------
    //
    // On THIS tab the button is now correctly withheld, with its reason — offering an act that can
    // only be refused is the defect this programme keeps removing.
    await journey.step('this tab withholds the act it can no longer offer', async () => {
      await expect(page.locator('[data-testid="wft-approve"]')).toBeDisabled();
      await expect(page.locator('[data-testid="wft-approve-why"]'))
        .toHaveText('Perioden er allerede godkjent og låst.');
      return 'Approve withheld here, reason named';
    });

    // …which is exactly why the second approval has to be driven from the SECOND TAB opened above,
    // whose rendered Approve button predates the freeze and is still live. That is not a
    // contrivance: it is two managers closing the same payroll fortnight, which is the race an
    // immutable period exists to settle. The click below is a real pointer click on a really
    // rendered, really enabled control, and the server's refusal arrives ON SCREEN.
    await journey.step('the second manager clicks Approve and is refused, not replayed', async () => {
      await expect(stale.locator('[data-testid="wft-approve"]')).toBeEnabled();

      // Ticking the unknown-hours box is deliberate: with `allowIncomplete` true the incomplete
      // refusal cannot apply, so whatever order the server evaluates its checks in, the only
      // refusal this click can earn is `already-approved`. That keeps the step's meaning
      // independent of an ordering nothing pins.
      await stale.locator('[data-testid="wft-allow-incomplete"]').check();
      await stale.locator('[data-testid="wft-approve"]').click();

      await expect(stale.locator('[data-testid="wft-refusal-code"]'))
        .toHaveText('workforce.timesheet-period-already-approved', { timeout: 30000 });
      await expect(stale.locator('[data-testid="wft-refusal-text"]'))
        .toContainText('åpnes aldri på nytt');

      // The refused click did not overwrite the freeze: the approver on this tab is still the
      // manager who actually performed it, and the period is still the one that was frozen.
      await expect(stale.locator('[data-testid="wft-approved-by"]'))
        .toHaveText(timesheets.MANAGER_STAFF_MEMBER_ID);

      await stale.close();
      return '409 workforce.timesheet-period-already-approved, provoked by clicking a live button ' +
        'in a tab that predates the freeze';
    });

    // ---- THE SEND ----------------------------------------------------------------------------
    let fileName = null;
    await journey.step('send the frozen period to payroll', async () => {
      await expect(page.locator('[data-testid="wft-export"]')).toBeEnabled();
      await page.locator('[data-testid="wft-export"]').click();

      await expect(page.locator('[data-testid="wft-status"]')).toHaveText('Sendt', { timeout: 30000 });
      await expect(page.locator('[data-testid="wft-batch-outcome"]')).toHaveText('Sendt');

      fileName = (await page.locator('[data-testid="wft-batch-filename"]').textContent()).trim();
      const actor = (await page.locator('[data-testid="wft-batch-actor"]').textContent()).trim();
      // The SENDER is named too, by the same rule as the approver.
      expect(actor).toBe(timesheets.MANAGER_STAFF_MEMBER_ID);
      return 'batch ' + fileName + ' sent by ' + actor;
    });

    await journey.shot('the batch that left, and who sent it');

    // ---- REFUSAL TWO, BY CLICKING ------------------------------------------------------------
    await journey.step('sending the same period again is refused', async () => {
      // The control is deliberately still OFFERED — a second export is how an adjustment is raised
      // — so this refusal really is provoked by pressing the button.
      await expect(page.locator('[data-testid="wft-export"]')).toBeEnabled();
      await page.locator('[data-testid="wft-export"]').click();

      await expect(page.locator('[data-testid="wft-refusal-code"]'))
        .toHaveText('workforce.timesheet-nothing-to-reconcile', { timeout: 30000 });
      // And nothing was written: still exactly one batch.
      await expect(page.locator('[data-testid="wft-download"]')).toHaveCount(1);
      return 'refused workforce.timesheet-nothing-to-reconcile; still one batch';
    });

    await journey.shot('an exported period is never re-sent whole');

    // ---- THE DOWNLOAD, AS A REAL BROWSER DOWNLOAD --------------------------------------------
    await journey.step('download the file that was sent, and read its bytes', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.locator('[data-testid="wft-download"]').click()
      ]);

      expect(download.suggestedFilename()).toBe(fileName);
      const path = await download.path();
      const csv = fs.readFileSync(path, 'utf8');

      // It is the neutral hours file, and it says so.
      expect(csv).toContain('# okam-workforce-timesheet');
      expect(csv).toContain('# basis=hours-only');
      // No wage math travelled with it. A payroll system reading money out of this file would be
      // reading a claim it does not make.
      expect(csv).toContain('# wageMath=none');
      expect(csv).toContain('# approvedByActorReference=' + timesheets.MANAGER_STAFF_MEMBER_ID);

      // THE CELL THAT MATTERS MOST. The missing-punch row's minutes must be EMPTY, never `0`.
      const missing = csv.split('\n').find(l => l.includes('MISSING_PUNCH'));
      expect(missing).toBeTruthy();
      const cells = missing.split(',');
      // …,payCode,paid,minutes,plannedMinutes,status,…  — minutes is the 7th column.
      expect(cells[6]).toBe('');
      expect(cells[6]).not.toBe('0');

      // The unpaid break travelled with its own pay code and `paid=false`.
      expect(csv).toContain('UNPAID_BREAK,false');

      return 'downloaded ' + download.suggestedFilename() + ' (' + csv.length +
        ' bytes); unknown minutes render EMPTY, not 0';
    });

    await journey.shot('the period, the batch and the file a manager can now fetch');

    // ---- WHAT THE DOWNLOAD COULD NOT PROVE, SAID OUT LOUD ------------------------------------
    await journey.step('note what the browser cannot verify about the file', async () => {
      // The digest on screen comes from the batch MODEL. The download's own
      // `X-Okam-Content-Sha256` header is NOT readable cross-origin — the API does not list it in
      // `Access-Control-Expose-Headers` and neither does the fixture. So the page shows the digest
      // the SERVER recorded, and the browser cannot independently confirm the bytes it received hash
      // to it. That is a real limit and it is recorded rather than papered over.
      const shown = (await page.locator('[data-testid="wft-batch-sha"]').textContent()).trim();
      expect(shown).toMatch(/^[0-9a-f]{64}$/);

      journey.finding('info',
        'The batch digest on screen is the one the server RECORDED, not one the browser recomputed.',
        'The download answers X-Okam-Content-Sha256, but neither the real API nor this fixture ' +
        'lists it in Access-Control-Expose-Headers, and the admin app is cross-origin to both — so ' +
        'fetch reads null for it. The page therefore takes payloadSha256 off the batch model, which ' +
        'is honest but is a server-attested integrity claim rather than a client-verified one. The ' +
        'estate\'s BrowserReadableHeaders helper would close this; it is on an unmerged lane.');
      return 'digest shown is server-attested; header not readable cross-origin (finding recorded)';
    });
  }
);
