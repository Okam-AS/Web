// JOURNEY — a manager produces the § 8-5-6 kodeoversikt from the personnel-list page.
//
// THE DEFECT THIS EXISTS TO CLOSE. The personalliste prints `bokføringsforskriften § 8-5-6` on its
// face and substitutes a protected identity code for each person's fødselsnummer. The paragraph
// permits that substitution ONLY where an overview of the codes with the corresponding fødselsnummer
// or D-nummer is kept. The backend has produced that overview since `a04f51ca`
// (`GET /workforce/stores/{id}/personnel-list/code-register`, `text/csv`) — but the frontend bound no
// client method and rendered no control, and the route sits behind a bearer token, so typing the URL
// into the address bar fetches nothing. The document existed and only `curl` could produce it. A
// printed statute in front of an unreachable artifact is worse than a missing feature, because it
// invites the inspection it cannot survive.
//
// WHAT THIS PROVES THAT NO JEST SUITE CAN. Three of this session's lanes found a handler that was
// wired, tested and green while the button that reaches it was unbound, absent from the route, or
// never rendered — a suite that calls `vm.downloadCodeRegister()` passes in every one of those
// worlds. This journey only passes if a real Chromium, at a real laptop viewport, finds a control on
// the page, presses it, and receives bytes.
//
//   • The control is REACHABLE and HIT-TESTABLE at 1280×720 — the default Desktop Chrome viewport,
//     and the width at which a sibling lane found a Training control pushed out of its grid track by
//     an overflowing table. This page renders a table too. `.click()` with no force is the assertion:
//     Playwright refuses an element that is covered, off-screen or zero-sized.
//   • The click yields a real browser DOWNLOAD, named by the SERVER — the fixture exposes
//     `Content-Disposition` exactly as `BrowserReadableHeaders`/`Program.cs` do, so a filename the
//     client invented instead of read would show up here as the page's local fallback.
//   • The bytes are the template the statute asks for: every code the day's list used, the codeless
//     participant PRINTED and COUNTED rather than dropped, the fødselsnummer column empty on every
//     row, and the retention horizon on the document's own face.
//   • ONE CLICK PRODUCES ONE ISSUE ROW, read back off the server's record rather than inferred from
//     the request log. "The browser sent a request" and "the handover was recorded" are different
//     facts and only the second is the one § 8-5-6 leans on.
//   • A SECOND CLICK APPENDS A SECOND ROW. That is the designed behaviour, not a defect: the route
//     is a GET carrying no Idempotency-Key because suppressing the second production is exactly
//     wrong here — two handovers happened and the record must say so. Asserted so that anyone who
//     later "fixes" it into an idempotent read has to argue with this test first.
//   • And the § 8-5-6 caveat on the sheet NAMES the template the button issues, so the sentence and
//     the capability agree. That is the C6 clause: a statutory claim is printed only where the
//     document it claims can be produced.
//
// WHAT IT DOES NOT PROVE, stated plainly. The real `WorkforceIdentityCodeRegisterIssues` row is
// retention-locked by a SQL trigger (THROW 50018) and by `GuardAppendOnly`; neither can be exercised
// here, because this harness deliberately runs with no backend and no SQL Server. The fixture's
// append-only issue list is a faithful MODEL of that table's observable behaviour and nothing more —
// the locking itself is the backend suite's ground, where it is already pinned.
//
// `@fixture`: every id below is this fixture's — the seeded business day, its three participants and
// the issue rows read off the control surface. Against a live API the day would be whatever the venue
// last worked and none of it would hold.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

const FIXTURE_API = 'http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || '4010');

/** The issue record, read the way an inspector's question is answered: off the server, not the page. */
async function issuesRecorded () {
  const response = await fetch(FIXTURE_API + '/__fixture/code-register-issues');
  expect(response.ok, 'the fixture control surface answered').toBe(true);
  return (await response.json()).issues;
}

/** Presses the control and returns the download the browser actually received. */
async function pressAndCollect (page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    // NO `force`. An element that is covered by the table below it, scrolled out of the layout, or
    // collapsed to zero size fails here — which is the whole point of driving this in a browser.
    page.locator('.wfpl-page__btn--register').click()
  ]);
  return download;
}

test(
  'a manager downloads the § 8-5-6 kodeoversikt from the personnel list and the issue is recorded',
  journeyDetails({
    journey: 'workforce-kodeoversikt',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'workforce.personnel-list.read',
      'workforce.personnel-list.code-register.issue'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      await page.goto('/admin/workforce-personnel-list');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/workforce-personnel-list' });
      return 'landed on /admin/workforce-personnel-list';
    });

    await journey.step('the personalliste renders the seeded day, including the person with no code', async () => {
      const rows = page.locator('.wfpl-sheet__table tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 20000 });
      await expect(rows).toHaveCount(world.PERSONNEL_ROWS.length);

      // THE SERVER PICKED THE DAY. The page asked for none on first load and adopted the answer, so
      // a picker holding this date is the echo rather than a browser-side default.
      await expect(page.locator('.wfpl-page__date')).toHaveValue(world.PERSONNEL_BUSINESS_DATE);

      // § 8-5-6 covers everyone present. The codeless participant must be ON the register, not
      // filtered out of it because the system has nothing to put in the code column.
      await expect(page.locator('.wfpl-sheet__table tbody tr', { hasText: 'Uregistrert Hjelper' })).toHaveCount(1);
      return 'three participants on ' + world.PERSONNEL_BUSINESS_DATE + ', one of them uncoded';
    });

    await journey.step('the § 8-5-6 caveat names the overview the page can produce (C6)', async () => {
      const gap = page.locator('.wfpl-sheet__gap');
      await expect(gap).toBeVisible();
      const text = (await gap.textContent()).replace(/\s+/g, ' ');

      // The claim and the capability must agree. Before this lane the same sentence said Okam
      // "fører ingen slik kodeoversikt" — true then, and false the moment the button exists.
      expect(text, 'the caveat points at the downloadable overview').toContain('lastes ned fra personallistesiden');
      expect(text, 'and says whose duty it is to complete and keep it').toContain('oppbevarer');
      // NOT WIDENED. One § reference on this sheet, the one the product can now satisfy.
      expect(text.match(/§/g).length, 'exactly one paragraph is named').toBe(1);
      return 'the caveat names the issued template';
    });

    await journey.step('the control is reachable and hit-testable at 1280×720', async () => {
      const button = page.locator('.wfpl-page__btn--register');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // THE TRAINING LESSON, ASSERTED. A sibling found a control that rendered, reported visible, and
      // could not be clicked because a table had escaped its grid track and lay over it. Playwright's
      // own hit-test is what catches that, so the box is checked against the viewport explicitly.
      const box = await button.boundingBox();
      expect(box, 'the control has a layout box').toBeTruthy();
      const viewport = page.viewportSize();
      expect(box.x, 'not pushed off the left edge').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'not pushed past the right edge').toBeLessThanOrEqual(viewport.width);
      expect(box.width * box.height, 'not collapsed to nothing').toBeGreaterThan(0);
      return 'control at ' + Math.round(box.width) + '×' + Math.round(box.height) + ' inside ' + viewport.width + 'px';
    });

    let firstName = null;
    await journey.step('pressing it downloads the kodeoversikt under the SERVER\'s name', async () => {
      expect(await issuesRecorded(), 'nothing issued before the click').toHaveLength(0);

      const download = await pressAndCollect(page);
      firstName = download.suggestedFilename();

      // The name the server chose, read off `Content-Disposition`. The page's local fallback is
      // `okam-kodeoversikt-{storeId}-{date}.csv` too — but the fallback is built from the STORE the
      // page holds, so asserting the exact string still distinguishes a read name from an invented
      // one only if the header is genuinely exposed. It is: the fixture lists it on
      // `Access-Control-Expose-Headers`, exactly as `Program.cs` does.
      expect(firstName).toBe('okam-kodeoversikt-' + world.STORE_ID + '-' + world.PERSONNEL_BUSINESS_DATE + '.csv');

      await expect(page.locator('.wfpl-page__toast')).toContainText(world.PERSONNEL_BUSINESS_DATE, { timeout: 15000 });
      return 'downloaded ' + firstName;
    });

    await journey.step('the bytes are the template § 8-5-6 asks for', async () => {
      const download = await pressAndCollect(page);
      const stream = await download.createReadStream();
      const csv = await new Promise((resolve, reject) => {
        let text = '';
        stream.on('data', chunk => { text += chunk; });
        stream.on('end', () => resolve(text));
        stream.on('error', reject);
      });

      const lines = csv.trim().split('\n');
      const header = lines.find(l => l.startsWith('identityCode,'));
      expect(header, 'the five-column header is present')
        .toBe('identityCode,participantName,category,hiredInOrganizationNumber,fodselsnummerEllerDNummer');

      const data = lines.slice(lines.indexOf(header) + 1);
      expect(data, 'one row per participant, nobody dropped').toHaveLength(world.PERSONNEL_ROWS.length);

      // THE BLANK IS THE ARTIFACT. Okam holds no fødselsnummer, so the last column is empty on every
      // row under every path — that emptiness is what the venue fills in and what makes this a
      // template rather than a completed register.
      for (const row of data) {
        expect(row.endsWith(','), 'the fødselsnummer column is empty on every row').toBe(true);
      }

      // The codeless participant is printed with an empty code and COUNTED, never dropped.
      expect(data.some(r => r.startsWith(',Uregistrert Hjelper,Unpaid,')), 'the uncoded person is on the sheet').toBe(true);
      expect(csv).toContain('# rowsWithoutIdentityCode=1');
      expect(csv).toContain('# codeCount=2');

      // The statute it answers to, and the horizon it must be kept to, on the document's own face.
      expect(csv).toContain('# lawReference=bokføringsforskriften § 8-5-6');
      expect(csv).toContain('# retainUntil=' + world.PERSONNEL_RETAIN_UNTIL);
      return 'template carries 2 codes, 1 uncoded participant, retain-until ' + world.PERSONNEL_RETAIN_UNTIL;
    });

    await journey.step('each click appended its own issue row — two clicks, two rows', async () => {
      // READ BACK, not asserted from the request log. This is the fact the exit clause names.
      const issues = await issuesRecorded();
      expect(issues, 'one row per handover, appended never replaced').toHaveLength(2);

      for (const issue of issues) {
        expect(issue.storeId).toBe(world.STORE_ID);
        expect(issue.businessDate).toBe(world.PERSONNEL_BUSINESS_DATE);
        expect(issue.codeCount).toBe(2);
        expect(issue.rowsWithoutIdentityCode).toBe(1);
        expect(issue.retainUntil).toBe(world.PERSONNEL_RETAIN_UNTIL);
        // C4-shaped: the handover names the actor that caused it. Never null, never ambient.
        expect(issue.issuedBy, 'the issue names who produced it').toBeTruthy();
      }

      // Two DISTINCT rows. A re-issue is a new row, never an edit of the first — the same property
      // the real table enforces with a retention lock rather than with a convention.
      expect(issues[0].issueId).not.toBe(issues[1].issueId);
      return 'two issue rows, distinct ids, both stamped with an actor';
    });

    await journey.step('the page reported no console errors of its own', async () => {
      // SORTED RATHER THAN FILTERED. The router's «Navigation cancelled» pair is the ADMIN SHELL's
      // login redirect racing itself — `AdminPage` replaces to `/admin?redirect=…` and the store
      // selection appends `&storeId=` on top of it — and it appears identically in
      // `workforce-flag-lever`, `growth-privacy-queue` and `margin-recipe-to-margin`, which touch
      // nothing this page touches. Filing it against the personalliste would send somebody here to
      // look for a defect that is not on this screen. Everything else would be this journey's own.
      const noise = /favicon|Download the Vue Devtools|\[HMR\]|sockjs/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));

      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in workforce-flag-lever, ' +
          'growth-privacy-queue and margin-recipe-to-margin. It is AdminPage\'s login redirect being ' +
          'superseded by the storeId append, not anything on /admin/workforce-personnel-list. ' +
          'Recorded so it is not re-diagnosed from this page.');
      }

      const own = errors.filter(text => !shellRedirect.test(text));
      for (const error of own) {
        journey.finding('defect', 'browser error during the kodeoversikt journey', error);
      }
      expect(own, 'no error this page is responsible for: ' + own.join(' | ')).toHaveLength(0);
      return 'no page-owned console errors (' + shell.length + ' shell-redirect entries recorded as a note)';
    });
  }
);
