// JOURNEY — the store is still in onboarding, and the kitchen's run sheet prints without the nag.
//
// ---- WHAT THIS IS EVIDENCE FOR ----------------------------------------------------------------
//
// `events-runsheet-print` proved the run sheet prints the dietary requirement and none of the
// guest's bearer addresses. It also recorded, in its own findings, the one shell element it could
// not reach: `OnboardingNotification`, which the admin shell renders ABOVE the page's slot for any
// store that has not finished setup. That banner is a screen affordance with two buttons on it, and
// it was landing on the top of the sheet a kitchen works from. This journey is that residue, closed
// and measured.
//
// ---- WHY IT IS A SEPARATE JOURNEY -------------------------------------------------------------
//
// Because the world is different, not because the assertion is. `events-runsheet-print` runs a store
// that is NOT onboarding, so the banner does not render there at all and "no banner on the sheet"
// would be true of it for the wrong reason — the strongest possible version of the vacuous absence
// assertion this project keeps paying for. The banner has to be REAL on this run before its absence
// from the paper means anything, so this journey seeds the onboarding state the product itself
// writes (`pages/admin/onboarding.vue` -> `saveOnboardingState`) and proves the banner is on screen
// before asking the printer about it.
//
// ---- THE THREE CONTROLS -----------------------------------------------------------------------
//
//   1. ON SCREEN, the banner IS there. Without this the whole journey passes on a build where the
//      onboarding state never loaded and the banner never rendered.
//   2. ON SCREEN, the run sheet's dietary requirement IS there. Without this the PDF assertion
//      passes on a blank page.
//   3. IN THE PDF, the dietary requirement IS there. Without this "no banner in the file" is true of
//      an empty file, a clipped `@page` box and a print that rendered nothing.
//
// Only then does absence mean something, and it is asked of the FILE — `pdftotext` over the bytes
// the browser produced — not of the DOM. The DOM is checked too, but as the diagnosis, not as the
// evidence: the exit for this work is stated on the produced document.
//
// `pdftotext` is therefore REQUIRED here rather than optional as it is in the sibling journey. That
// journey has browser-cascade assertions that stand on their own if the tool is missing; this one
// does not — its entire claim is about the artifact. A run that quietly downgraded to the screen
// would be reporting evidence it did not gather.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, journeyDetails, expect, ARTIFACT_DIR } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

const JOURNEY = 'events-runsheet-onboarding';

// The banner's own copy, which is hardcoded in the component rather than translated. Three separate
// fragments — the sentence, the step counter and the button label — because any one of them alone
// would keep passing against a half-hidden banner (the message suppressed but the buttons still on
// the paper, say). They appear in exactly one file in this repo, so none of them can be satisfied by
// something else on the page.
const BANNER_SENTENCE = 'oppsett-prosess';
const BANNER_STEP = 'Du er på steg';
const BANNER_BUTTON = 'Fortsett oppsett';

// The run sheet's own heading (`ev_runsheet_heading`), which is the first thing the sheet prints.
// Named as the copy a kitchen reads rather than as the key, for the same reason the sibling journey
// names `Selskap og arrangement`: this must red when the DOCUMENT changes, not when a key is renamed.
const RUNSHEET_HEADING = 'Kjøreplan';

/** The onboarding state the product writes for a store whose setup is not finished. */
const ONBOARDING_STATE = {
  storeId: world.STORE_ID,
  storeName: world.STORE_NAME,
  currentStep: 1,
  timestamp: Date.now()
};

/** What the browser's cascade would leave on the paper under whatever media is emulated. */
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
  'A store still in onboarding prints the run sheet, and the setup banner is not on it',
  journeyDetails({
    journey: JOURNEY,
    surface: 'admin',
    capabilities: [
      'events.runsheet.print',
      'events.runsheet.read'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('the store has an unfinished setup, as the onboarding page leaves it', async () => {
      // `addInitScript` rather than an `evaluate` after the first load: `OnboardingNotification`
      // reads localStorage in `mounted()`, which has already run by the time an `evaluate` could
      // write it. Seeded before any page script, the component finds the state a returning host
      // would actually find.
      await page.addInitScript((state) => {
        try {
          window.localStorage.setItem('onboardingInProgress', JSON.stringify(state));
        } catch (e) { /* pre-origin document; the next navigation re-runs this */ }
      }, ONBOARDING_STATE);
      return 'localStorage.onboardingInProgress seeded: step ' + (ONBOARDING_STATE.currentStep + 1) + ' of 4';
    });

    await journey.step('open the events pipeline as an anonymous visitor', async () => {
      await page.goto('/admin/events-pipeline');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search;
    });

    await journey.step('sign in as the host (99999999 / 123123)', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/events-pipeline' });
      return 'landed back on /admin/events-pipeline';
    });

    await journey.step('open the confirmed event', async () => {
      const row = page.locator('.ev-pipeline__row').first();
      await expect(row).toBeVisible({ timeout: 30000 });
      const label = (await row.textContent()).replace(/\s+/g, ' ').trim();
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible({ timeout: 30000 });
      return 'opened: ' + label;
    });

    // ---- CONTROL 1 and 2. Both facts on screen, which is the whole basis of the assertion below.
    await journey.step('on screen the host sees BOTH the setup banner and the run sheet', async () => {
      const banner = page.locator('.onboarding-notification');
      await expect(banner).toBeVisible({ timeout: 30000 });

      const recorded = page.locator('[data-test="dietary-recorded"]');
      await expect(recorded).toBeVisible();

      // Read off the rendered tree rather than off the locators, so this is the same instrument the
      // print step uses and a difference between them can only be the cascade.
      const screenText = await visibleText(page);
      expect(screenText).toContain(BANNER_SENTENCE);
      expect(screenText).toContain(BANNER_STEP);
      expect(screenText).toContain(BANNER_BUTTON);
      expect(screenText).toContain(world.DIETARY_STATEMENT);

      return 'setup banner rendered for ' + world.STORE_NAME + '; dietary statement rendered';
    });

    await journey.shot('the pipeline page on screen, setup banner and all');

    await journey.step('switch the browser to print media', async () => {
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.ev-journey__section--sheet')).toBeVisible();
      return 'media: print';
    });

    // The diagnosis, not the evidence. If the PDF assertion below ever reds, this says whether the
    // rule failed to apply at all or applied and did not reach the paper.
    await journey.step('under print media the banner is dropped by the cascade', async () => {
      const display = await page.evaluate(() => {
        const banner = document.querySelector('.onboarding-notification');
        return banner ? window.getComputedStyle(banner).display : 'absent-from-dom';
      });
      expect(display).toBe('none');

      const printText = await visibleText(page);
      expect(printText).toContain(world.DIETARY_STATEMENT);
      expect(printText).not.toContain(BANNER_SENTENCE);
      expect(printText).not.toContain(BANNER_BUTTON);

      return '.onboarding-notification computed display: ' + display;
    });

    await journey.shot('the run sheet as it will print');

    const pdfFile = path.join(ARTIFACT_DIR, JOURNEY, 'run-sheet-onboarding.pdf');

    await journey.step('produce the printed artifact', async () => {
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
      await page.pdf({ path: pdfFile, printBackground: false });
      const bytes = fs.statSync(pdfFile).size;
      expect(bytes).toBeGreaterThan(1000);
      return 'artifacts/journeys/' + JOURNEY + '/run-sheet-onboarding.pdf (' + bytes + ' bytes)';
    });

    // ---- THE EXIT. Asked of the file the printer would put on paper.
    await journey.step('read the produced PDF back: the sheet is there and the banner is not', () => {
      const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
      // Hard requirement, and stated as one. This journey's only claim is about the artifact, so a
      // run without the tool to read the artifact has proved nothing and must not report otherwise.
      expect(
        probe.error,
        'This journey measures the produced PDF, so `pdftotext` (poppler) is required: brew install poppler'
      ).toBeFalsy();

      const out = spawnSync('pdftotext', ['-layout', pdfFile, '-'], { encoding: 'utf8' });
      expect(out.status).toBe(0);
      const text = out.stdout;

      // CONTROL 3. The sheet really is in the file, so the absences below are absences from a
      // document that has the run sheet on it rather than from an empty one.
      expect(text).toContain(world.DIETARY_STATEMENT);

      // THE EXIT ITSELF.
      expect(text).not.toContain(BANNER_SENTENCE);
      expect(text).not.toContain(BANNER_STEP);
      expect(text).not.toContain(BANNER_BUTTON);

      // AND NOTHING ELSE IS ABOVE IT. The three absences above are about the text layer; this is
      // about the page. The banner sits above the page's slot in the shell, so what it does to a
      // document is push the sheet down — and the honest way to measure that is to ask what the
      // FIRST line on the paper is, not how far down the first line sits.
      //
      // A pt threshold was tried here first and thrown away, and the measurement is worth keeping:
      // the topmost text sits at 56.0pt in BOTH documents — the banner's sentence at 56.0pt before
      // the fix, the run sheet's heading at 56.0pt after it. The banner does not push the sheet down
      // the page at all; it takes the sheet's place at the top and moves it onto later lines. So NO
      // threshold on that number could ever have discriminated: an assertion on it would have been
      // green against the defect and green against the fix, which is the assertion-that-cannot-fail
      // arrived at honestly. What discriminates is WHICH line is first.
      const firstLine = text.split('\n').map(line => line.trim()).find(line => line.length > 0);
      expect(firstLine).toBe(RUNSHEET_HEADING);

      const boxed = spawnSync('pdftotext', ['-bbox', pdfFile, '-'], { encoding: 'utf8' });
      expect(boxed.status).toBe(0);
      const tops = [...boxed.stdout.matchAll(/yMin="([\d.]+)"/g)].map(m => Number(m[1]));
      expect(tops.length).toBeGreaterThan(10);
      // Recorded, not asserted — see above. It is the kind of number a reader of the artifact wants
      // and the kind of number a test should not be resting on.
      const topmost = Math.min(...tops);

      return 'pdftotext read ' + text.length + ' characters out of the file: dietary statement ' +
        'present, no setup banner, first line on the page is "' + firstLine + '" at ' +
        topmost.toFixed(1) + 'pt from the top';
    });
  }
);
