// JOURNEY — a host prints the kitchen's run sheet, and the guest's links stay off the paper.
//
// WHY THIS JOURNEY IS A BROWSER JOURNEY AND NOT A SUITE. The Events module's exit says the run sheet
// PRINTS a recorded dietary requirement. A jsdom suite cannot say anything about that: jsdom has no
// print media, no cascade for `@media print`, and no page box. Asserting that a `@media print` rule
// EXISTS in a `.vue` file is the assertion-that-cannot-fail this estate has been bitten by — this
// project has already shipped one print stylesheet that was present in the file and inert in the
// browser, because the body class it was guarded by was rebuilt away by vue-meta. The rules stayed,
// the document printed with the admin shell on it, and every test stayed green.
//
// So the measurement here is the browser's own cascade under emulated PRINT media: the DOM is walked
// and every element whose computed style resolves to `display:none` or `visibility:hidden` is
// dropped, exactly as the printer drops it. What comes back is what lands on the paper.
//
// THE TWO ASSERTIONS, AND WHY THE FIRST ONE MATTERS AS MUCH AS THE SECOND:
//
//   1. The recorded dietary sentence IS on the paper.
//   2. The guest's deposit bearer address is NOT.
//
// (2) is worthless on its own. "No token on the sheet" is trivially true of a page that has no token
// anywhere, of a page that failed to load, and of a build where the whole panel is missing. So the
// journey first proves — on SCREEN, before any print emulation — that both the dietary sentence and
// the guest link are really there. Only then does it switch the media and assert that exactly one of
// them survived. That pair is the difference between evidence and a test that passes on a blank page.
//
// WHAT IT DOES NOT ECHO. The deposit token's value never reaches the artifact. Its absence is proved
// by looking for it, not by printing it, and a journey file that gets copied into a review must not
// carry a bearer with it.

const fs = require('fs');
const path = require('path');
const { test, journeyDetails, expect, ARTIFACT_DIR } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');
const world = require('../fixture/world');

const JOURNEY = 'events-runsheet-print';

// The sentence a venue that has not been switched on reads instead of its pipeline (`ev_pipeline_disabled`).
// Matched on the copy rather than on the key, so this reds when the venue's experience changes and not
// when a translation key is renamed. A fragment, because the full sentence carries a second clause
// about enquiry counts that is not the claim here.
const NOT_ENABLED = 'ikke slått på for dette utsalgsstedet';

// The full guest address as it is rendered on screen — origin + path. Built from the fixture's own
// token so this cannot drift away from what the page actually shows.
function depositAddress (baseURL) {
  return new URL('/events/deposit/' + world.ADMIN_DEPOSIT_TOKEN, baseURL).toString();
}

/**
 * What the browser would actually put on the paper.
 *
 * Walks the rendered tree under whatever media is currently emulated and keeps only the text of
 * elements the cascade leaves visible. `getComputedStyle` reflects the emulated media in Chromium,
 * so under `media: 'print'` this returns the print document's text and nothing else — which is the
 * only honest way to ask "is this on the sheet" without parsing a PDF.
 */
function visibleText (page) {
  return page.evaluate(() => {
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (text) { parts.push(text); }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) { return; }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') { return; }
      node.childNodes.forEach(walk);
    };
    document.body.childNodes.forEach(walk);
    return parts.join(' ');
  });
}

test(
  'A host prints the run sheet: the dietary requirement is on it and the guest links are not',
  journeyDetails({
    journey: JOURNEY,
    surface: 'admin',
    capabilities: [
      'events.runsheet.read',
      'events.runsheet.print',
      'events.dietary.read',
      // What the two steps below are evidence for: the store gate really refuses, and the operator
      // lever really lifts it. Declared so this run counts as evidence for them and not only for the
      // print, which is the thing the journey was named after.
      'events.module.store-gate',
      'platform.feature-flags.write'
    ]
  }),
  async ({ page, journey, baseURL }) => {
    const guestAddress = depositAddress(baseURL);

    await journey.step('open the events pipeline as an anonymous visitor', async () => {
      await page.goto('/admin/events-pipeline');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the host (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/events-pipeline' });
      return 'landed back on /admin/events-pipeline';
    });

    // ---- the switch, and the proof it is doing something -----------------------------------------
    //
    // `Events.Core` gates every store-scoped Events route and it gates the READS: the pipeline list,
    // the event detail, the deposits, the run sheet and the notification health all resolve through
    // `IEventsModuleGate.IsStoreEnabledAsync` and answer 404 `EVENTS_DISABLED` for a store that has
    // not been switched on. It is deny-closed, so that is EVERY store until an operator flips it.
    //
    // This journey used to open the pipeline and find an event there, which on a real venue could not
    // have happened. The refusal is asserted FIRST, before the lever is pulled, and that ordering is
    // the whole point: a journey that only turned the switch on would pass identically against a
    // fixture that had no gate at all — which is the defect this sweep exists to close, reproduced
    // one level up. Seeing the venue dark is what makes the flip mean something.
    await journey.step('before any switch is flipped, the venue is dark', async () => {
      const notice = page.locator('.ev-pipeline__notice');
      await expect(notice).toBeVisible({ timeout: 30000 });
      await expect(notice).toContainText(NOT_ENABLED);
      // Not merely "the notice is present": there is no pipeline behind it either. A page that
      // printed the sentence above a table of events would satisfy the locator and refuse nothing.
      await expect(page.locator('.ev-pipeline__row')).toHaveCount(0);
      return 'the pipeline reads: ' + (await notice.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('the venue before Events is switched on');

    await journey.step('the host switches Events on for this venue', async () => {
      // Through `/admin/feature-flags` — the product's own lever, and the only caller of
      // `PUT /stores/{id}/feature-flags` there is. A journey that wrote the row itself would prove
      // the fixture can hold it, not that a host can pull it.
      //
      // `Events.Core` ONLY. `Events.Deposits` and `Events.Settlement` stay down, which is the
      // ordinary posture of a venue running events without the money machine — and it means the
      // settlement facet below answers `EVENTS_DISABLED` while the run sheet reads fine. That the
      // page survives one of its four facet reads being refused is a property this journey now
      // carries and nothing else did.
      await turnOn(page, world.EVENTS_CORE_FLAG);
      await page.goto('/admin/events-pipeline');
      return world.EVENTS_CORE_FLAG + ' on for store ' + world.STORE_ID +
        '; ' + world.EVENTS_SETTLEMENT_FLAG + ' deliberately left off';
    });

    await journey.step('open the confirmed event', async () => {
      const row = page.locator('.ev-pipeline__row').first();
      await expect(row).toBeVisible({ timeout: 30000 });
      const label = (await row.textContent()).replace(/\s+/g, ' ').trim();
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible({ timeout: 30000 });
      return 'opened: ' + label;
    });

    // ---- the screen. Both facts present, which is what makes the print assertion mean something.
    await journey.step('on screen the venue holds a dietary requirement AND a guest deposit link', async () => {
      const recorded = page.locator('[data-test="dietary-recorded"]');
      await expect(recorded).toBeVisible();
      await expect(recorded).toContainText(world.DIETARY_STATEMENT);

      // The negative control for the whole journey. If this ever stops being true, the "no token on
      // the sheet" assertion below becomes unfalsifiable — so it fails HERE instead of passing there.
      const screenText = await visibleText(page);
      expect(screenText).toContain(guestAddress);
      expect(screenText).toContain(world.DIETARY_STATEMENT);

      return 'dietary statement rendered; a guest deposit address is on screen (value withheld)';
    });

    await journey.shot('the pipeline page on screen, links and all');

    await journey.step('the print control is offered against the sheet the server holds', async () => {
      const button = page.locator('[data-test="runsheet-print"]');
      await expect(button).toBeVisible();
      return 'control: "' + (await button.textContent()).trim() + '"';
    });

    // ---- the paper.
    await journey.step('switch the browser to print media', async () => {
      await page.emulateMedia({ media: 'print' });
      // Nothing is asserted from a frame that has not settled under the new cascade.
      await expect(page.locator('.ev-journey__section--sheet')).toBeVisible();
      return 'media: print';
    });

    // The admin sidebar takes ITSELF off the paper — `.admin-nav`'s own `@media print` rule, which
    // this change does not own and therefore checks rather than trusts. If it ever stops applying, a
    // navigation column prints down the side of every kitchen sheet.
    await journey.step('the admin sidebar is not part of the printed document', async () => {
      const navDisplay = await page.evaluate(() => {
        const nav = document.querySelector('.admin-nav');
        return nav ? window.getComputedStyle(nav).display : 'absent';
      });
      expect(navDisplay).toBe('none');
      return '.admin-nav display: ' + navDisplay;
    });

    const printed = await journey.step('what the printer would put on the paper', async () => {
      const text = await visibleText(page);

      // (1) The sheet carries the requirement the kitchen has to cook to.
      expect(text).toContain(world.DIETARY_STATEMENT);

      // (2) And it carries no guest bearer address. Asserted three ways, because one of them alone
      //     would pass on a near miss: the whole address, the bare token, and the guest route prefix
      //     — a sheet printing `/events/deposit/` at all is a sheet printing a link.
      expect(text).not.toContain(guestAddress);
      expect(text).not.toContain(world.ADMIN_DEPOSIT_TOKEN);
      expect(text).not.toContain('/events/deposit/');
      expect(text).not.toContain('/events/proposal/');

      // The rest of the pipeline page is off the paper too. Named by the copy a venue actually sees,
      // so this reds if the page half of the print path stops applying rather than if a class is
      // renamed: the page's own title, the guest-links panel and the action buttons are none of them
      // part of a kitchen document.
      expect(text).not.toContain('Selskap og arrangement');
      expect(text).not.toContain('Gjestelenker');
      expect(text).not.toContain('Handlinger');

      return text.length + ' characters on the sheet; dietary statement present; no guest address';
    });

    await journey.shot('the run sheet as it will print');

    // ---- the artifact itself, produced by the same print pipeline the rules above govern.
    // Kept out of the step so the step's `detail` can stay a RELATIVE description: an artifact that
    // is read in a review should not carry the absolute path of the laptop that produced it.
    const pdfFile = path.join(ARTIFACT_DIR, JOURNEY, 'run-sheet.pdf');

    await journey.step('produce the printed artifact', async () => {
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
      await page.pdf({ path: pdfFile, printBackground: false });
      const bytes = fs.statSync(pdfFile).size;
      // A zero-length or trivially small PDF is a print that produced nothing, which would otherwise
      // pass every assertion above — those measure the DOM, this measures the output.
      expect(bytes).toBeGreaterThan(1000);
      return 'artifacts/journeys/' + JOURNEY + '/run-sheet.pdf (' + bytes + ' bytes)';
    });

    // ---- and the same two questions asked of the FILE, not of the DOM.
    //
    // The assertions above measure the browser's cascade; this one measures the bytes that came out
    // of it. They are different instruments and the second can catch what the first cannot — a
    // `@page` box that clips the sheet, a font that renders nothing, a print pipeline that took a
    // different tree from the one `getComputedStyle` was asked about.
    //
    // It needs `pdftotext` (poppler), which is NOT a dependency of this repo, and a journey that
    // cannot run without a tool nobody has installed is a journey nobody runs. So it is conditional —
    // and, because a check that silently skips is the assertion-that-cannot-fail this project keeps
    // paying for, WHICH MODE RAN is recorded in the artifact either way. A reader can tell whether
    // the PDF itself was read or only the DOM was.
    await journey.step('read the produced PDF back', () => {
      const { spawnSync } = require('child_process');
      const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
      if (probe.error) {
        journey.finding('note', 'the PDF was not read back',
          '`pdftotext` is not on this machine, so the printed file was verified by size only. The ' +
          'content assertions in this journey are the browser-cascade ones; install poppler to have ' +
          'the bytes checked too.');
        return 'skipped: pdftotext not installed (DOM-cascade assertions still applied)';
      }
      const out = spawnSync('pdftotext', ['-layout', pdfFile, '-'], { encoding: 'utf8' });
      expect(out.status).toBe(0);
      const text = out.stdout;

      expect(text).toContain(world.DIETARY_STATEMENT);
      expect(text).not.toContain(world.ADMIN_DEPOSIT_TOKEN);
      expect(text).not.toContain('/events/deposit/');
      expect(text).not.toContain('/events/proposal/');
      expect(text).not.toContain('Selskap og arrangement');

      // WHERE the text sits on the page, not only that it is there. The admin shell reserves a 264px
      // gutter for the sidebar it hides when printing, and a sheet printed inside that gutter would
      // satisfy every assertion above while coming out of the printer shoved into the right-hand
      // two-thirds of the paper. 264px is ~198pt, so a sheet that started beyond ~150pt would be
      // sitting in it. The `@page` box is 14mm (~40pt), which is where the text should begin.
      const boxed = spawnSync('pdftotext', ['-bbox', pdfFile, '-'], { encoding: 'utf8' });
      expect(boxed.status).toBe(0);
      const lefts = [...boxed.stdout.matchAll(/xMin="([\d.]+)"/g)].map(m => Number(m[1]));
      expect(lefts.length).toBeGreaterThan(10);
      const leftmost = Math.min(...lefts);
      expect(leftmost).toBeLessThan(150);

      return 'pdftotext read ' + text.length + ' characters out of the file: dietary statement ' +
        'present, no guest address, no page chrome; leftmost text at ' + leftmost.toFixed(1) +
        'pt (inside the 14mm page box, not in the sidebar gutter)';
    });

    journey.finding(
      'note',
      'the three 404s in this run are refusals the journey asked for',
      'A reader of `failedRequests` will see three. Two are BEFORE the switch was flipped — the ' +
      'pipeline list and the notification health, both refused `EVENTS_DISABLED` because ' +
      '`Events.Core` was still down, which is the control this journey now opens with. The third is ' +
      'the settlement facet AFTER the flip: `Events.Settlement` is a separate deny-closed money flag ' +
      'and it gates the GET as well as every mutation, so a venue running events without the ' +
      'settlement machine reads exactly this. None of the three is a fault, and the page renders the ' +
      'run sheet through all of them — which is the property a store in the ordinary pilot posture ' +
      'needs and which nothing had walked before.'
    );

    journey.finding(
      'note',
      'one shell element can still reach the paper: the onboarding banner',
      'Both print stylesheets in this change are SCOPED, which is what makes them incapable of ' +
      'restyling another admin screen — and it also means they cannot reach the shell that wraps ' +
      'them, since `.admin__main` and `OnboardingNotification` are ANCESTORS of this page\'s scope. ' +
      'Two of the three shell concerns turned out not to need reaching: `.admin-nav` hides itself ' +
      'when printing (asserted above), and the 264px sidebar gutter is visible only in a viewport ' +
      'screenshot under emulated print media — the A4 document the browser actually produces is not ' +
      'inset by it, which is measured here from the PDF\'s own text geometry rather than assumed. ' +
      'What remains is `OnboardingNotification`, which renders only for a store still in onboarding ' +
      'and would print above the sheet for one. It is cosmetic — no guest address, no other event ' +
      'and no page chrome reaches the paper — and removing it needs an unscoped rule guarded by a ' +
      'body class, which on this branch is the mechanism that was MEASURED INERT: vue-meta rebuilds ' +
      'body.class from its own map, and layouts/default.vue still declares it as a STRING, so an ' +
      'array-valued contributor would strip `okam-ch` on the Swiss market. That is a merge decision ' +
      'across the lanes touching layouts/default.vue, not a decision this lane can take alone.'
    );

    // Recorded last so the artifact says what was measured, not merely that it passed.
    expect(printed).toBeTruthy();
  }
);
