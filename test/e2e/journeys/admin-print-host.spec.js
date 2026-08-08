// THE ADMIN SHELL, PRINTED.
//
// Every other journey in this folder asserts what a page shows. This one asserts what comes out of
// the printer, because three defects lived for weeks in the gap between those two things: the page
// rendered perfectly on screen and the paper was wrong, and no screenshot could have told anyone.
//
//   1. `vue-meta` owns `body.class`. `layouts/default.vue` declares
//      `bodyAttrs: { class: this.isCh ? 'okam-ch' : '' }`, and vue-meta rewrites that attribute
//      WHOLESALE on every head update — so the personalliste's `document.body.classList.add(...)`
//      in `mounted` was wiped to the empty string by the login redirect, and the entire print
//      stylesheet of the one document a labour inspector is handed matched nothing.
//   2. `.admin__main` kept `margin-left: var(--admin-sidebar-width, 264px)` when printing, although
//      `.admin-nav` hides itself, so the sidebar's gutter stayed on the paper of all 47 pages that
//      use the shell — and the same rule's `padding-top: 56px` reserved a strip for a mobile top bar
//      that is not printed either.
//   3. That margin is TRANSITIONED over 300 ms while `window.print()` is synchronous, so what the
//      printer captured depended on when the dialog opened.
//
// WHAT THE EVIDENCE IS. Rendered PDFs, in `artifacts/journeys/admin-print-host/`, produced by
// Chromium's own print path — not screenshots of a screen with print styles emulated. They are read
// by a person; the assertions below only make the run fail loudly when a regression is mechanical
// enough to catch. `artifacts/` is otherwise run state, so these particular files are force-added to
// git, because the exit criterion for this work is a document somebody can open.
//
// TWO PAGES, DELIBERATELY. A print fix that works on the page it was written for and breaks another
// is the shape this repo keeps producing, and the two documents fail differently: on A4 PORTRAIT the
// shell's own `max-width: 1024px` breakpoint already zeroes the gutter, so the personalliste's damage
// came from the content padding instead; on A4 LANDSCAPE the page box is 1123 px, the desktop rule
// applies, and the gutter is what cuts the week grid. Testing only one would have proved half of it.

const fs = require('fs');
const path = require('path');
const { test, expect, journeyDetails, ARTIFACT_DIR } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

const JOURNEY = 'admin-print-host';
const OUT = path.join(ARTIFACT_DIR, JOURNEY);

const PERSONNEL_PATH = '/admin/workforce-personnel-list';
const SCHEDULE_PATH = '/admin/workforce-schedule';

/** A PDF from Chromium's print path, filed under this journey. Returns its size in bytes. */
async function printToPaper (page, name, options) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name + '.pdf');
  await page.pdf(Object.assign({ path: file, printBackground: true }, options));
  return fs.statSync(file).size;
}

/**
 * The shell's gutter as the printer sees it, sampled three times back to back.
 *
 * Three rather than one is the whole point of defect 3: a transitioned margin gives three different
 * answers to the same question, and `window.print()` takes whichever one it lands on.
 */
function printGutter (page) {
  return page.evaluate(() => {
    const el = document.querySelector('.admin__main');
    if (!el) { return null; }
    const read = () => {
      const cs = getComputedStyle(el);
      return { marginLeft: cs.marginLeft, paddingTop: cs.paddingTop, transition: cs.transition };
    };
    return [read(), read(), read()];
  });
}

test(
  'the personalliste and a second admin page print with no sidebar gutter',
  journeyDetails({
    journey: JOURNEY,
    capabilities: ['workforce.personnel-list.print', 'admin.shell.print'],
    surface: 'admin'
  }),
  async ({ page, journey }) => {
    // ---- the statutory register ---------------------------------------------------------------
    await page.goto(PERSONNEL_PATH);
    await journey.step('sign in as the manager', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: PERSONNEL_PATH });
      return 'signed in as ' + world.USERS[world.MANAGER_PHONE].firstName;
    });

    await journey.step('the register answers for the venue\'s own day', async () => {
      const sheet = page.locator('.wfpl-sheet');
      // Beyond the 10s default: this is the FIRST content assertion of the FIRST journey, so on a
      // cold `nuxt dev` it waits on webpack compiling this route's chunk on demand as well as on the
      // read. A 10s budget made this step, and only this step, fail once in five suite runs.
      await expect(sheet).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.wfpl-sheet__table tbody tr')).toHaveCount(4, { timeout: 15000 });
      const date = await page.locator('.wfpl-sheet__fact dd').nth(2).textContent();
      return 'businessDate ' + date.trim() + ', 4 entries';
    });

    // DEFECT 1. The class the print stylesheet is guarded by has to be ON the body, and it has to
    // survive the head updates that follow the login redirect.
    await journey.step('the print-host class is on <body> and survived vue-meta', async () => {
      const bodyClass = await page.evaluate(() => document.body.getAttribute('class') || '');
      expect(bodyClass.split(/\s+/)).toContain('wfpl-print-host');
      return 'body class = "' + bodyClass + '"';
    });

    // What the paper MUST still carry. A print stylesheet that hid the identity-gap caveat would be
    // worse than one that never applied, because the sheet would then claim an identification this
    // system cannot make — so the caveat and the venue's own duty are asserted in print media, not
    // merely on screen.
    await page.emulateMedia({ media: 'print' });
    await journey.step('§ 8-5-6 fields and the identity-gap caveat survive into print media', async () => {
      const gap = page.locator('.wfpl-sheet__gap');
      await expect(gap).toBeVisible();
      const text = (await gap.textContent()).replace(/\s+/g, ' ').trim();
      // The venue's own duty. This is the sentence that makes the sheet honest about what it is not.
      expect(text).toContain('virksomheten må selv føre kodeoversikten');
      await expect(page.locator('.wfpl-sheet__identity')).toBeVisible();
      await expect(page.locator('.wfpl-sheet__foot')).toBeVisible();
      // The organisation number § 8-5-6 asks for, and the rightmost column of the table. Both were
      // being clipped off the right edge of the paper before this lane.
      await expect(page.locator('.wfpl-sheet__identity dd').nth(1))
        .toHaveText(/\d{3} \d{3} \d{3}/);
      // The note CELL, not a note line inside it. The only two things that ever put a line in this
      // column — a correction and a hired-in organisation number — are shapes no production caller
      // writes, so `lane/statute-evidence-world` took them out of the fixture rather than keep
      // printing an inspector's document the product cannot produce. What has to survive onto the
      // paper is the column itself, whatever it happens to contain, and measuring its right edge
      // against the page box is a stricter reading of the defect than "a span is visible" was.
      const note = page.locator('.wfpl-sheet__note').last();
      await expect(note).toBeVisible();
      const edge = await note.evaluate(el => ({
        right: Math.round(el.getBoundingClientRect().right),
        docWidth: document.documentElement.clientWidth
      }));
      expect(edge.right).toBeLessThanOrEqual(edge.docWidth);
      return text.slice(0, 80) + '… (note column ends at ' + edge.right + '/' + edge.docWidth + 'px)';
    });

    // DEFECTS 2 and 3, in the regime where the gutter bites: a page box wider than the shell's
    // 1024 px breakpoint.
    await journey.step('no gutter, and it is not sliding while the printer reads it', async () => {
      const samples = await printGutter(page);
      expect(samples).not.toBeNull();
      for (const sample of samples) {
        expect(sample.marginLeft).toBe('0px');
        expect(sample.paddingTop).toBe('0px');
      }
      // Not merely "settles at 0": a transitioned property has no single value at the instant a
      // synchronous print reads it.
      expect(samples[0].transition).toBe('none');
      return 'margin-left ' + samples.map(s => s.marginLeft).join('/') + ', transition ' + samples[0].transition;
    });
    await page.emulateMedia({ media: null });

    await journey.step('print the register to A4', async () => {
      // `preferCSSPageSize` honours the page's own `@page wfpl-sheet` box (A4 portrait, 14 mm),
      // which is what a browser uses when a person presses the page's own "Skriv ut" button.
      const portrait = await printToPaper(page, '01-personalliste-a4-portrait', { preferCSSPageSize: true });
      // The same register on a landscape sheet — the page box where the 264 px gutter applied.
      const landscape = await printToPaper(page, '02-personalliste-a4-landscape', { format: 'A4', landscape: true });
      return 'portrait ' + portrait + ' B, landscape ' + landscape + ' B';
    });
    await journey.shot('the register on screen');

    // ---- a second, different admin page --------------------------------------------------------
    await page.goto(SCHEDULE_PATH);
    await journey.step('a second admin page prints without the gutter too', async () => {
      await expect(page.locator('.admin__content')).toBeVisible();
      // The guard still guards: the personalliste's unscoped stylesheet must not reach this page.
      const bodyClass = await page.evaluate(() => document.body.getAttribute('class') || '');
      expect(bodyClass.split(/\s+/)).not.toContain('wfpl-print-host');

      await page.emulateMedia({ media: 'print' });
      const samples = await printGutter(page);
      for (const sample of samples) { expect(sample.marginLeft).toBe('0px'); }
      await page.emulateMedia({ media: null });
      return 'body class = "' + bodyClass + '", margin-left ' + samples[0].marginLeft;
    });

    await journey.step('print the week to A4 landscape', async () => {
      const bytes = await printToPaper(page, '03-vaktplan-a4-landscape', { format: 'A4', landscape: true });
      return 'vaktplan ' + bytes + ' B';
    });
    await journey.shot('the week on screen');

    journey.finding('note', 'the printed evidence is committed, unlike every other artifact here',
      'artifacts/ is gitignored as run state. The three PDFs under artifacts/journeys/' + JOURNEY +
      '/ are force-added, because the exit criterion for this work is a document a reader opens ' +
      'rather than an assertion they take on trust.');
  }
);
