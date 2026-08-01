// TWO DOCUMENTS THAT OVERSTATED WHAT THEY CAN PRODUCE, opened in a browser and read.
//
// Both defects are of one shape: a document is complete in FORM and short in FACT, and nothing on it
// says so. A green suite cannot see either, because in both cases the code did exactly what it was
// written to do.
//
//   1. THE PERSONALLISTE. The «Tilknytning» column offers four statutory relationships to the
//      business and exactly one production site writes a participant —
//      `WorkforcePersonnelListProjection.ResolveOrCreateEmployeeParticipantAsync`, off an employee's
//      clock punch, always as `Employee`. A venue with a working owner, an unpaid helper or a
//      hired-in worker on site therefore hands an inspector a list that looks complete and is not.
//      The caveat is now on the sheet, and this journey PRINTS IT: the same page's print stylesheet
//      was inert in the running app until an hour before this was written, so a caveat verified on
//      screen would be a caveat verified nowhere.
//
//      AND THE PAPER NOW AGREES WITH IT. The first version of this journey seeded a working-owner
//      row and a hired-in row into the fixture world and asserted that they rendered — so the
//      committed PDF printed «Arbeidende eier eller leder» and «Innleid» two lines under a
//      paragraph saying such a person "står vedkommende ikke her". The rows were model-truth: no
//      production caller writes them, and neither does any caller write the manager correction the
//      third row carried. The world holds only producible shapes now, and the categories are pinned
//      row by row here and in `test/workforce-personnel-list-evidence-world.test.js`.
//
//   2. THE RUN SHEET. `EventsRunSheetService.Map` folds FOUR causes into one `isStale` boolean, and
//      the one sentence a kitchen sees names the third of them: "not generated from the operative
//      proposal version. Reissue before service." When the real cause is an allergy written down
//      after the paper was printed, that is the one explanation a cook can reasonably decide is
//      paperwork. Two enquiries are opened here — one stale for the version, one stale ONLY for the
//      dietary statement — because the fix is worth nothing unless the two read differently.
//
// WHAT THE EVIDENCE IS. A rendered PDF for the register (Chromium's own print path, not a screenshot
// with print styles emulated) and screenshots for the run sheet. `artifacts/` is otherwise run
// state; these files are force-added, because the exit criterion is a document a person opens.

const fs = require('fs');
const path = require('path');
const { test, expect, journeyDetails, ARTIFACT_DIR } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

const JOURNEY = 'statute-honesty';
const OUT = path.join(ARTIFACT_DIR, JOURNEY);

const PERSONNEL_PATH = '/admin/workforce-personnel-list';
const EVENTS_PATH = '/admin/events-pipeline';

/** A PDF from Chromium's print path, filed under this journey. Returns its size in bytes. */
async function printToPaper (page, name, options) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name + '.pdf');
  await page.pdf(Object.assign({ path: file, printBackground: true }, options));
  return fs.statSync(file).size;
}

/**
 * Whether an element is inside the printed page box, measured in the print medium.
 *
 * The defect this guards against did not hide the caveat — it pushed the sheet WIDER than the page
 * box, and the browser resolved that by clipping the right-hand edge. So "visible" is not the
 * question; "inside the paper" is.
 */
function boxWithin (page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) { return null; }
    const rect = el.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      docWidth: document.documentElement.clientWidth
    };
  }, selector);
}

test(
  'the personalliste prints what it cannot record, and the run sheet names the allergy as its own cause',
  journeyDetails({
    journey: JOURNEY,
    capabilities: ['workforce.personnel-list.coverage-caveat', 'events.run-sheet.stale-cause'],
    surface: 'admin'
  }),
  async ({ page, journey }) => {
    // ---- 1. the statutory register -------------------------------------------------------------
    await page.goto(PERSONNEL_PATH);
    await journey.step('sign in as the manager', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: PERSONNEL_PATH });
      return 'signed in as ' + world.USERS[world.MANAGER_PHONE].firstName;
    });

    await journey.step('the register answers for the venue\'s own day', async () => {
      const sheet = page.locator('.wfpl-sheet');
      // Beyond the 10s default: the first content assertion of the run waits on `nuxt dev`
      // compiling this route's chunk on demand as well as on the read.
      await expect(sheet).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.wfpl-sheet__table tbody tr')).toHaveCount(4, { timeout: 15000 });
      return 'businessDate ' + (await page.locator('.wfpl-sheet__fact dd').nth(2).textContent()).trim();
    });

    // THE SHEET AND ITS OWN CAVEAT HAVE TO AGREE. This step used to assert the opposite — that the
    // register renders «Innleid», a relationship no production caller can write — and the PDF that
    // came out of this journey printed that row two lines under a paragraph saying such a person
    // "står vedkommende ikke her". A document handed to an inspector that contradicts its own
    // disclaimer is worse evidence than none, so the world now holds only what the product writes
    // and the paper is pinned row by row: the frontend half of the pin the backend's kodeoversikt
    // already had.
    await journey.step('every row on the paper is a relationship the product can actually record', async () => {
      const cells = page.locator('.wfpl-sheet__table tbody tr td:nth-child(3)');
      const shown = (await cells.allTextContents()).map(c => c.trim());
      // Counted against the ROWS, not against a literal: a relationship column that stopped
      // rendering would satisfy "nothing excluded appears" perfectly.
      expect(shown).toHaveLength(await page.locator('.wfpl-sheet__table tbody tr').count());
      expect(shown).toEqual(shown.map(() => 'Ansatt'));
      // The note column carries neither of the two other things nothing in the product writes: a
      // hired-in organisation number and a correction naming who made it.
      await expect(page.locator('.wfpl-sheet__note-line')).toHaveCount(0);
      return 'rendered categories: ' + shown.join(', ');
    });

    await page.emulateMedia({ media: 'print' });

    await journey.step('the coverage caveat is on the paper, in its own words', async () => {
      const notice = page.locator('.wfpl-sheet__coverage');
      await expect(notice).toBeVisible();
      const text = (await notice.textContent()).replace(/\s+/g, ' ').trim();
      // The limit, and — as the identity notice does — what the venue must do instead.
      expect(text).toContain('bare føre ansatte');
      expect(text).toContain('Virksomheten må da føre disse personene selv');
      // It is a SECOND paragraph, not a rewrite of the first: the identity gap is still whole.
      await expect(page.locator('.wfpl-sheet__gap')).toBeVisible();
      return text.slice(0, 90) + '…';
    });

    // THE POINT OF PRINTING RATHER THAN SCREENSHOTTING. A caveat that renders on screen and falls
    // off the right edge of the paper is the defect `lane/print-host` closed, on this exact page.
    await journey.step('and it is inside the page box, not clipped off the right edge', async () => {
      const box = await boxWithin(page, '.wfpl-sheet__coverage');
      expect(box).not.toBeNull();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(box.docWidth);
      return 'caveat spans ' + box.left + '–' + box.right + 'px of a ' + box.docWidth + 'px page';
    });

    await page.emulateMedia({ media: null });

    await journey.step('print the register to A4', async () => {
      // `preferCSSPageSize` honours the page's own `@page wfpl-sheet` box (A4 portrait, 14 mm),
      // which is what a browser uses when a person presses the page's own "Skriv ut" button.
      const bytes = await printToPaper(page, '01-personalliste-with-coverage-caveat', { preferCSSPageSize: true });
      return 'A4 portrait, ' + bytes + ' B';
    });
    await journey.shot('the register on screen');

    // ---- 2. the run sheet ----------------------------------------------------------------------
    await page.goto(EVENTS_PATH);
    await journey.step('the pipeline lists the venue\'s enquiries', async () => {
      await expect(page.locator('.ev-pipeline__row')).toHaveCount(2, { timeout: 30000 });
      return 'two enquiries';
    });

    // The control: a sheet stale for the version reason, and nothing else. It gets the sentence it
    // always had — which is correct here — and NOT the dietary line.
    await journey.step('a version-stale sheet reads as a version-stale sheet', async () => {
      await page.locator('.ev-pipeline__row').first().click();
      await expect(page.locator('[data-test="runsheet-stale"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="runsheet-stale-dietary"]')).toHaveCount(0);
      await expect(page.locator('[data-test="runsheet-stale-note"]')).toHaveCount(0);
      return (await page.locator('[data-test="runsheet-stale"]').textContent()).trim();
    });
    await journey.shot('a run sheet stale because the proposal version moved');

    await journey.step('an allergy written down after the sheet was composed says exactly that', async () => {
      await page.locator('.ev-pipeline__row').nth(1).click();
      const dietary = page.locator('[data-test="runsheet-stale-dietary"]');
      await expect(dietary).toBeVisible({ timeout: 15000 });
      const text = (await dietary.textContent()).replace(/\s+/g, ' ').trim();
      expect(text).toContain('allergi eller kosthold');
      expect(text).toContain('etter at kjøreplanen ble satt sammen');
      // The note line is the OTHER, weaker cause. Every note in this world predates the sheet, so it
      // must be absent — otherwise the assertion above could be passing for the wrong reason.
      await expect(page.locator('[data-test="runsheet-stale-note"]')).toHaveCount(0);
      return text.slice(0, 100) + '…';
    });

    // The comparison the line asserts has to be checkable by whoever reads it, and the issue time
    // already on the sheet is NOT the stamp the staleness rule uses.
    await journey.step('the composition time is on screen beside the issue time', async () => {
      const facts = await page.locator('.ev-journey__facts div').allTextContents();
      const composed = facts.map(f => f.replace(/\s+/g, ' ').trim()).filter(f => f.startsWith('Satt sammen'));
      expect(composed).toHaveLength(1);
      return composed[0];
    });
    await journey.shot('the same banner, with the allergy named as the cause');

    // Read the third screenshot: BOTH lines are on the dietary enquiry, and only the second one is
    // true of it. That is deliberate, and it is also the residual this lane did not close.
    journey.finding('defect', 'the shared version sentence can still name a cause that did not fire',
      'This enquiry\'s sheet was generated from the version that IS operative (both fields read 1), ' +
      'so "not generated from the operative proposal version" is false of it — and it is still ' +
      'printed, because `isStale` is the server\'s boolean and this surface will not overrule it. ' +
      'The kitchen is no longer misled, because the true cause is now named beside it. Closing the ' +
      'rest needs the WIRE to say which of the four causes fired: one nullable field on ' +
      '`EventsRunSheetView`, set where `EventsRunSheetService.Map` already computes all four. ' +
      'Suppressing the sentence from the client instead would mean deriving the version cause here ' +
      'from two published numbers, and a mistake in that derivation shows a stale sheet as current.');

    journey.finding('defect', 'nothing in the product can correct a personalliste entry, so § 8-5-6\'s correction requirement has no path',
      'The paragraph requires that "dersom det foretas rettelser i personallisten, skal det fremgå ' +
      'hvem som har foretatt rettelsen og tidspunkt for når det er gjort". The sheet renders both ' +
      'fields when an entry carries them — and no entry ever can. Both writes in ' +
      '`WorkforcePersonnelListProjection` (:117 open, :133 close) pass `correctionActor: null, ' +
      'correctedAtUtc: null`, and `WorkforcePersonnelListController` exposes one read action and no ' +
      'write. A venue that punches the wrong person in has no way to correct the register and no ' +
      'way to show that it did. Found while removing the fixture\'s manager correction, which was ' +
      'the only reason this looked solved. Unlike the category gap, the sheet prints NO caveat ' +
      'about it — closing it needs a correction path in the backend, not another paragraph here.')

    journey.finding('note', 'the printed evidence is committed, unlike every other artifact here',
      'artifacts/ is gitignored as run state. The PDF under artifacts/journeys/' + JOURNEY + '/ is ' +
      'force-added, because a caveat on a statutory register that exists only in a browser is the ' +
      'exact defect lane/print-host closed on this page.');
  }
);
