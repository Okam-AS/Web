// JOURNEY — the document an inspection is handed, opened by a manager in a browser.
//
// Training's evidence read (endpoint #16) was backend-complete and had ZERO frontend callers. It
// assembles one person's completions with the frozen material they were taken against, their
// certificates, the ledger rows naming who filed each one, and a recomputable integrity summary —
// and until this journey there was no way for anybody to see it. The one document that actually
// satisfies «readable as evidence» could not be opened.
//
// So this walk is about REACHABILITY, and it is deliberately paranoid about it in the one way that
// matters: it arrives at the page by CLICKING THE SIDEBAR LINK. Not `page.goto`, not a handler call.
// A test that calls the handler passes with the button unbound, the route absent, or the link never
// rendered — which is the exact shape found three separate times on this branch. The click is the
// assertion; everything after it is what the click reached.
//
// ---- THE READ IS A WRITE, AND THAT IS WHAT MOST OF THIS FILE CHECKS -----------------------------
//
// `GET …/evidence` appends an `evidence.read` row to an append-only ledger and commits it in the same
// request. The page prints a notice saying so. That notice is a claim about a control, and screens
// naming controls nothing implements are the defect this whole programme keeps removing — so the
// claim is made FALSIFIABLE here rather than trusted:
//
//   before the read   the ledger holds no disclosure, which proves merely ARRIVING at the page
//                     records nothing. That is the property that makes the page safe to link from a
//                     sidebar at all: if it fetched on mount, every visit would write «this manager
//                     read this person's training file» into a table with no delete path.
//   after one read    exactly one disclosure, attributed to the signed-in manager.
//   after two reads   exactly two. An access log that deduplicated would answer «somebody looked
//                     once» for a record read every day, and the sentence on screen would be false
//                     in the direction that matters.
//   and never in it   the document's own audit chain contains no `evidence.read`. The chain is the
//                     PROVENANCE of the evidence, not a record of who has seen it, and a reader who
//                     took it for the latter would conclude nobody had.
//
// The ledger is read from NODE through the fixture's control surface, never through the browser —
// the same rule the confirmation-code and growth-links mailboxes follow. No product surface can
// answer this question: the disclosures are excluded from the document by design, and the route that
// would serve them to a subject (#17) has no handler on this backend branch at all.
//
// ---- WHAT THIS JOURNEY INHERITS RATHER THAN RE-DIAGNOSES ---------------------------------------
//
// `training-course-to-evidence` measured the publish button as unreachable by pointer at 1280px — the
// versions table overflows its grid track and the next column paints over the action cell. This walk
// has to publish a version to have anything to document, so it dispatches that ONE click directly and
// says so, rather than re-filing a defect that already has a home. Every other click here is a real
// pointer click, and the evidence page's own control is measured below rather than assumed.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');
const world = require('../fixture/world');

const FIXTURE_API = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

/** Ola Ansatt's `workforcePersonId` — the PERSON id, not the engagement's `staffMemberId`. */
const OLA = world.STAFF[0].workforcePersonId;
/** Well formed, and names nobody. The subject of the «this is evidence about a Guid» step. */
const NOBODY = world.UNKNOWN_PERSON_REF;

const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';

const COURSE = 'Allergenhåndtering';
// The SIDEBAR label, which is deliberately shorter than the page's own h1: the nav column
// ellipsises anything past about twenty characters, and «Opplæringsdo…» is not a link anybody
// finds. It sits directly under «Opplæring» in the same module group, so the pairing carries
// the meaning the shorter word drops.
const NAV_LABEL = 'Dokumentasjon';
const PAGE_TITLE = 'Opplæringsdokumentasjon';

/**
 * What the append-only ledger holds, read from Node.
 *
 * Counts and event types only — never a payload — so this cannot leak what was disclosed into a
 * journey artifact. It is on the `/__fixture` control surface, so it is not counted in `served`, is
 * never fetched by the browser, and cannot reach `backendSample` (C7).
 */
async function ledger (personRef) {
  const query = personRef ? '?personRef=' + encodeURIComponent(personRef) : '';
  const response = await fetch(FIXTURE_API + '/__fixture/training-disclosures' + query);
  return response.json();
}

/**
 * What the printer would actually put on the paper.
 *
 * Walks the rendered tree under whatever media is currently emulated and keeps only the text of
 * elements the cascade leaves visible, exactly as `events-runsheet-print` does — `getComputedStyle`
 * reflects the emulated media in Chromium, so under `media: 'print'` this is the printed document's
 * text and nothing else.
 *
 * `checkVisibility()` on top of `display`/`visibility`, and it is load-bearing HERE in a way it is
 * not on the run sheet: this document's material inputs sit behind a `<details>`, and a current
 * engine hides a closed one with `content-visibility: hidden` on a `::details-content` box. Its
 * `display` is not `none`, so a walker asking only about `display` would report the pages and the
 * quiz as being on the paper while the printer left them off — the one false positive that would
 * make this whole step worthless.
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
      if (typeof node.checkVisibility === 'function' && !node.checkVisibility()) { return; }
      node.childNodes.forEach(walk);
    };
    document.body.childNodes.forEach(walk);
    return parts.join(' ');
  });
}

/** The civil day the venue's own clock is on, which is the day the document prints. */
function osloDay () {
  return new Intl.DateTimeFormat('no', {
    timeZone: world.TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

test(
  'A manager opens one person\'s training record from the sidebar, and opening it is recorded',
  journeyDetails({
    journey: 'training-evidence-document',
    surface: 'admin',
    capabilities: [
      'training.evidence.reachable-from-navigation',
      'training.evidence.document.read',
      'training.evidence.document.names-course-person-and-date',
      'training.evidence.recomputable-claims-printed',
      'training.evidence.disclosure-recorded-on-read',
      'training.evidence.disclosure-not-written-on-arrival',
      'training.evidence.audit-chain-is-not-an-access-log',
      'training.evidence.absent-person-is-not-an-empty-record',
      // The record can be HANDED OVER. Until this lane the page promised one that «kan legges fram
      // ved tilsyn» and the product had no export of any kind — no file, no download, not even a
      // print stylesheet — so a manager asked for it on the day could show an inspector a tab.
      'training.evidence.record-can-be-produced-on-paper'
    ]
  }),
  async ({ page, journey }) => {
    let hash = null;

    await journey.step('sign in and open the switchboard', async () => {
      await page.goto('/admin/training-courses');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/training-courses' });
      await expect(page.locator('.trn-page__title')).toHaveText('Opplæring');
      // Both Training flags are deny-closed and Training's refusal is READ-ONLY rather than dark, so
      // without this every write below would answer 409 while the page still rendered.
      await turnOn(page, SETUP_FLAG);
      await turnOn(page, ASSIGNMENTS_FLAG);
      return 'signed in; ' + SETUP_FLAG + ' and ' + ASSIGNMENTS_FLAG + ' on for store ' + world.STORE_ID;
    });

    await journey.step('author the course this document will be about', async () => {
      await page.goto('/admin/training-courses');
      await page.locator('[data-test="course-title"]').fill(COURSE);
      await page.locator('[data-test="course-category"]').fill('Mattrygghet');
      await page.locator('[data-test="course-competency"]').fill('food.allergens');
      await page.locator('[data-test="course-submit"]').click();
      await expect(page.locator('[data-test="course-row"]')).toHaveCount(1, { timeout: 15000 });
      return COURSE + ' · food.allergens';
    });

    await journey.step('cut a version, publish it, and capture the hash it froze', async () => {
      await page.locator('[data-test="course-row"]').first().click();
      await expect(page.locator('[data-test="versions-empty"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-test="version-content"]').fill('["De 14 allergenene", "Krysskontaminering"]');
      await page.locator('[data-test="version-threshold"]').fill('80');
      await page.locator('[data-test="version-submit"]').click();
      await expect(page.locator('[data-test="version-row"]')).toHaveCount(1, { timeout: 15000 });

      // The one dispatched click in this file. `training-course-to-evidence` measured this control as
      // covered by the next grid column at 1280px; re-measuring it here would re-file a defect that
      // already has an owner, and `force: true` would fire at the covering element instead.
      await page.locator('[data-test="version-publish"]').dispatchEvent('click');
      const row = page.locator('[data-test="version-row"]').first();
      await expect(row).toContainText('Publisert', { timeout: 15000 });

      // The hash is minted over the exact snapshot being published. The document prints it beside the
      // frozen pages and threshold it was computed from, so it is captured here and matched there.
      hash = (await row.locator('.trn-ref').textContent()).trim();
      expect(hash).not.toBe('—');
      return 'v1 Published, content hash ' + hash;
    });

    await journey.step('file a passing completion and a certificate for Ola Ansatt', async () => {
      await page.locator('[data-test="completion-person"]').fill(OLA);
      await page.locator('[data-test="completion-version"]').selectOption({ index: 1 });
      await page.locator('[data-test="completion-score"]').fill('90');
      await page.locator('[data-test="completion-submit"]').click();
      await expect(page.locator('[data-test="completion-row"]')).toHaveCount(1, { timeout: 15000 });

      await page.locator('[data-test="certificate-person"]').fill(OLA);
      await page.locator('[data-test="certificate-type"]').fill('Truckførerbevis');
      await page.locator('[data-test="certificate-issuer"]').fill('Norsk Kompetanse AS');
      // Required by the panel's own `canSubmit` — a certificate with no issue date is not evidence of
      // anything. No expiry is authored, which is a real state the document has to print as such.
      await page.locator('[data-test="certificate-issue"]').fill('2026-01-15');
      await page.locator('[data-test="certificate-submit"]').click();
      await expect(page.locator('[data-test="certificate-row"]')).toHaveCount(1, { timeout: 15000 });
      return '90% against a threshold of 80, plus one certificate';
    });

    await journey.step('THE LINK EXISTS, AND A MANAGER IS OFFERED IT BY NAME', async () => {
      // The whole point of the lane. Located by the LABEL a manager actually reads rather than by
      // href: a link present in the DOM under the wrong name is not a link anybody finds, and the
      // converse walk in `admin-nav-access.test.js` can only see the path.
      const link = page.locator('a.admin-nav__link', {
        has: page.locator('.admin-nav__label', { hasText: NAV_LABEL })
      });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', /\/admin\/training-evidence/);
      return 'sidebar offers «' + NAV_LABEL + '» → /admin/training-evidence';
    });

    await journey.step('and CLICKING it is how this journey arrives', async () => {
      // A real pointer click, not `goto` and not `dispatchEvent`. If anything paints over this link
      // at this viewport, this step is where it is found.
      await page.locator('a.admin-nav__link', {
        has: page.locator('.admin-nav__label', { hasText: NAV_LABEL })
      }).click();
      await page.waitForURL(/\/admin\/training-evidence/, { timeout: 30000 });
      await expect(page.locator('.trn-ev-page__title')).toHaveText(PAGE_TITLE);
      await expect(page.locator('[data-test="gate"]')).toHaveCount(0);
      return 'arrived at /admin/training-evidence by pointer';
    });

    await journey.step('the warning is on screen BEFORE the act it warns about', async () => {
      // The notice is not a footnote and is not revealed with the document: it describes something
      // that will have happened to somebody else by the time the document appears, so a manager has
      // to be able to read it while the choice is still theirs.
      const notice = page.locator('[data-test="evidence-disclosure-notice"]');
      await expect(notice).toBeVisible();
      await expect(notice).toContainText('er selv en utlevering');
      await expect(notice).toContainText('ikke kan endres eller slettes');
      // Nothing has been fetched: the idle state is a fourth state, and it is not an empty document.
      await expect(page.locator('[data-test="evidence-idle"]')).toBeVisible();
      await expect(page.locator('[data-test="evidence-document"]')).toHaveCount(0);
      return (await notice.textContent()).trim().slice(0, 90) + '…';
    });

    await journey.step('ARRIVING RECORDED NOTHING — the property that makes the link safe', async () => {
      // Falsifiable, and read from the ledger rather than inferred from the screen. A page that
      // fetched on mount would have written a permanent «this manager read this person's file» for a
      // visit that was about nothing, and there is no path that removes one.
      const before = await ledger();
      expect(before.disclosures).toBe(0);
      // …while the ledger is demonstrably live: the completion and the certificate filed above each
      // left a row, so a zero here is «no disclosure» and not «no ledger».
      expect(before.byEventType['completion.recorded']).toBe(1);
      expect(before.byEventType['certificate.registered']).toBe(1);
      return 'ledger: 0 disclosures, 2 mutation rows — the page wrote nothing by being opened';
    });

    await journey.step('DEFECT CHECK — the button is reachable by pointer at this viewport', async () => {
      // The sibling Training page has a control that cannot be clicked at 1280px because a grid
      // column paints over it. This page is a single column, which should make that impossible —
      // «should» is not evidence, so it is measured the same way that one was.
      await page.locator('[data-test="evidence-person-input"]').fill(OLA);
      const button = page.locator('[data-test="evidence-open"]');
      await expect(button).toBeEnabled();
      const box = await button.boundingBox();
      const covering = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tag: el.tagName.toLowerCase(), className: typeof el.className === 'string' ? el.className : '' } : null;
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      const blocked = !!covering && !covering.className.includes('trn-btn');
      if (blocked) {
        journey.finding('defect', 'the evidence page\'s open button cannot be clicked at this viewport',
          'document.elementFromPoint at the button\'s own centre returns <' + covering.tag +
          ' class="' + covering.className + '">, so no pointer at that point can reach it.');
      }
      const viewport = page.viewportSize();
      return blocked
        ? 'BLOCKED by <' + covering.tag + '>'
        : 'clear at ' + viewport.width + '×' + viewport.height;
    });

    await journey.step('open the document — by pressing the button', async () => {
      // The picker is populated from the WORKFORCE roster, a different module with a different
      // authorization. Using it proves that read landed; the text input stays available under every
      // state of it, because the suggestions are not the accepted set.
      await page.locator('[data-test="evidence-person-input-picker"]').selectOption(OLA);
      await expect(page.locator('[data-test="evidence-person-input"]')).toHaveValue(OLA);
      await page.locator('[data-test="evidence-open"]').click();
      await expect(page.locator('[data-test="evidence-document"]')).toBeVisible({ timeout: 15000 });
      return 'document open for ' + OLA;
    });

    await journey.step('IT NAMES THE WORKER, THE COURSE AND THE DATE', async () => {
      // The lane's exit, asserted as three separate facts because a document that got any one of them
      // wrong would still look like a document.
      await expect(page.locator('[data-test="evidence-person"]')).toHaveText('Ola Ansatt');
      await expect(page.locator('[data-test="evidence-person-ref"]')).toHaveText(OLA);
      // No «this reference names nobody» banner: the id resolved to a person record.
      await expect(page.locator('[data-test="evidence-person-absent"]')).toHaveCount(0);

      const row = page.locator('[data-test="evidence-completion-row"]').first();
      const course = row.locator('[data-test="evidence-completion-course"]');
      await expect(course).toContainText(COURSE);
      // The version the attempt was STAMPED to, not whichever the course currently offers.
      await expect(course).toContainText('v1');

      // The venue's own clock, from the zone the context read resolved — and specifically NOT the
      // document's `completedAtStoreLocal`, which is a bare wall clock that would be read as UTC and
      // shift every timestamp here by the store's offset.
      await expect(row.locator('[data-test="evidence-completion-when"]')).toContainText(osloDay());
      return 'Ola Ansatt · ' + COURSE + ' v1 · ' + osloDay();
    });

    await journey.shot('one person\'s record, open');

    await journey.step('every claim is printed beside what it was computed from', async () => {
      const row = page.locator('[data-test="evidence-completion-row"]').first();
      // The score AND the threshold that graded it — the one frozen into this version, so the pair
      // still means something after a later version moves the bar.
      await expect(row.locator('[data-test="evidence-completion-score"]')).toContainText('90%');
      await expect(row.locator('[data-test="evidence-completion-threshold"]')).toHaveText('Grense 80%');
      // The server's verdict, printed as it derived it. There is no control on this page that could
      // have contradicted it and no arithmetic here that recomputes it.
      await expect(row.locator('[data-test="evidence-completion-verdict"]')).toHaveText('Bestått');
      // The hash the completion froze, matched against the one captured at publish — the join between
      // the record and the material it is a record OF.
      //
      // AND PRINTED IN FULL, which is a real difference from the working page rather than an
      // incidental one: `TrainingVersionPanel` truncates the hash to fit a six-column table, and a
      // truncated hash cannot be compared against a recomputation, which is the only thing an
      // inspector would want it for. So the captured value is a PREFIX and the document's is asserted
      // to extend it and to carry no ellipsis.
      const published = hash.replace('…', '');
      const printed = (await row.locator('[data-test="evidence-completion-hash"]').textContent()).trim();
      expect(printed.startsWith(published)).toBe(true);
      expect(printed).not.toContain('…');
      await expect(row.locator('[data-test="evidence-completion-linkage"]')).toHaveText('Koblet');

      // …and the material itself, so the hash can be re-derived rather than believed.
      await page.locator('[data-test="evidence-completion-material"] summary').click();
      await expect(row.locator('[data-test="evidence-completion-pages"]')).toContainText('Krysskontaminering');
      await expect(row.locator('[data-test="evidence-completion-quiz"]')).toContainText('Ingen quiz');

      // Who filed it, recoverable only from the ledger — the completion table has no recorder column.
      await expect(row.locator('[data-test="evidence-completion-provenance"]')).toContainText('user-manager');
      await expect(row.locator('[data-test="evidence-completion-coverage"]')).toHaveText('I journalen');

      // The document's verdict on itself, and it is a finding-or-nothing rather than a reassurance.
      await expect(page.locator('[data-test="evidence-integrity"]')).toContainText('ingen brudd');
      return '90% vs frozen 80% → Bestått, hash ' + printed + ' Koblet, filed by user-manager';
    });

    await journey.step('the certificate and the provenance chain are both on the document', async () => {
      await expect(page.locator('[data-test="evidence-certificate-row"]')).toHaveCount(1);
      await expect(page.locator('[data-test="evidence-certificate-type"]')).toHaveText('Truckførerbevis');
      // No expiry was authored. That is a real fact — the backend models it as permanently valid —
      // and it must print as such rather than as a missing value.
      await expect(page.locator('[data-test="evidence-certificate-expiry"]')).toHaveText('Uten utløp');

      // Two rows: the completion and the certificate. Both mutations left provenance.
      await expect(page.locator('[data-test="evidence-audit-row"]')).toHaveCount(2);
      return '1 certificate, 2 ledger rows';
    });

    await journey.step('THE CHAIN IS NOT AN ACCESS LOG, and says so', async () => {
      // The read that produced this very document appended a disclosure. It is deliberately absent
      // from the chain — which is exactly why the sentence has to be on screen: a reader who took the
      // chain for a list of who has seen the file would conclude nobody had.
      const chain = await page.locator('[data-test="evidence-audit-row"]').allTextContents();
      expect(chain.join(' ')).not.toContain('evidence.read');
      await expect(page.locator('[data-test="evidence-chain-not-access-log"]'))
        .toContainText('Det er ikke en oversikt over hvem som har sett dokumentet');
      return 'no evidence.read in the chain, and the document says why';
    });

    await journey.step('OPENING IT WAS RECORDED — one read, one row, attributed', async () => {
      const after = await ledger(OLA);
      expect(after.disclosures).toBe(1);
      // Attributed to the signed-in manager, not to an ambient system actor. The server refuses to
      // write an unattributed disclosure at all rather than defaulting one.
      expect(after.actors).toEqual(['user-manager']);
      return 'ledger: 1 evidence.read for ' + OLA + ', actor user-manager';
    });

    await journey.step('and a SECOND read is a SECOND row, not a deduplicated one', async () => {
      // The property the notice actually promises. A log that collapsed repeats would answer
      // «somebody looked once» for a record read every day, and the sentence on screen would be false
      // in the direction that matters most to the person it is about.
      await page.locator('[data-test="evidence-open"]').click();
      await expect(page.locator('[data-test="evidence-document"]')).toBeVisible({ timeout: 15000 });
      const after = await ledger(OLA);
      expect(after.disclosures).toBe(2);
      return 'ledger: 2 evidence.read rows for one person';
    });

    // ---- THE RECORD IS HANDED OVER -------------------------------------------------------------
    //
    // The page's own sentence calls this the record «slik den kan legges fram ved tilsyn». That is a
    // promise about a thing the venue can produce, and this is where it is made falsifiable: the
    // control is pressed, the browser's cascade is asked what lands on the paper, and then the FILE
    // the same pipeline produces is read back. The three instruments answer different questions and
    // the last one has already caught what the first two could not — the first stylesheet this lane
    // wrote passed every DOM assertion below and produced a PDF whose `Opphav` column printed as
    // `Opp`, with a blank leading sheet, because a named `@page` box laid the document out at one
    // width and cropped it at another.
    await journey.step('the record can be handed over — the control produces a document', async () => {
      const button = page.locator('[data-test="evidence-print"]');
      await expect(button).toBeEnabled();
      // Bound to the browser's own print, which is what produces both paper and «save as PDF». The
      // command is stubbed because a headless run has no dialog; what is being measured is that the
      // page's button reaches it at all, which is the wire four module journeys on this branch were
      // missing.
      const reached = await page.evaluate(() => {
        let called = false;
        const original = window.print;
        window.print = () => { called = true; };
        document.querySelector('[data-test="evidence-print"]').click();
        window.print = original;
        return called;
      });
      expect(reached).toBe(true);
      return 'the control is live and reaches window.print';
    });

    const printed = await journey.step('what the printer would put on the paper', async () => {
      // On SCREEN first. «Not on the paper» is worth nothing on its own: it is trivially true of a
      // page that failed to load, and of a build where the whole panel is missing. Proving both
      // halves are really there, and only then switching the media, is the difference between
      // evidence and a test that passed on a blank page.
      const screen = await visibleText(page);
      expect(screen).toContain('Å hente dette dokumentet er selv en utlevering');
      expect(screen).toContain('Hent dokumentasjonen');

      await page.emulateMedia({ media: 'print' });
      const paper = await visibleText(page);

      // ON the paper: what the document is, who it is about, and every claim beside the value it was
      // computed from. The material is the one that matters most — it sits behind a `<details>` on
      // screen, a printer cannot open one, and a hash printed without the pages it was taken over is
      // a figure an inspector can only believe.
      expect(paper).toContain(PAGE_TITLE);
      expect(paper).toContain(world.STAFF[0].displayName);
      expect(paper).toContain(OLA);
      expect(paper).toContain('Grense 80%');
      expect(paper).toContain('Krysskontaminering');

      // OFF the paper: the page's own furniture. A control is not part of the document it produces,
      // and a warning about an act the reader is about to perform has nothing to say on the sheet
      // that is the result of having performed it.
      expect(paper).not.toContain('Å hente dette dokumentet er selv en utlevering');
      expect(paper).not.toContain('Hent dokumentasjonen');
      expect(paper).not.toContain('Skriv ut dokumentasjonen');
      expect(paper).not.toContain('Én persons samlede opplæringsjournal');

      return paper.length + ' characters on the sheet (screen: ' + screen.length + '); ' +
        'the frozen threshold and the material are on it, the form and the notice are not';
    });

    await journey.shot('the record as it will print');

    // Kept out of the step so the step's `detail` stays a RELATIVE description — an artifact read in
    // a review should not carry the absolute path of the laptop that produced it.
    const pdfFile = path.join(journey.dir, 'training-evidence.pdf');

    await journey.step('produce the file a manager hands over', async () => {
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
      await page.pdf({ path: pdfFile, format: 'A4', printBackground: false });
      const bytes = fs.statSync(pdfFile).size;
      expect(bytes).toBeGreaterThan(1000);
      return journey.relativeDir + '/training-evidence.pdf (' + bytes + ' bytes)';
    });

    await journey.step('read the produced file back', () => {
      // `pdftotext` (poppler) is NOT a dependency of this repo, and a journey that cannot run without
      // a tool nobody has installed is a journey nobody runs. So this is conditional — and because a
      // check that silently skips is the assertion-that-cannot-fail this project keeps paying for,
      // WHICH MODE RAN is recorded either way.
      const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
      if (probe.error) {
        journey.finding('note', 'the produced file was not read back',
          '`pdftotext` is not on this machine, so the PDF was verified by size only. The content ' +
          'assertions for this capability are the browser-cascade ones above; install poppler to ' +
          'have the bytes checked too.');
        return 'skipped: pdftotext not installed (' + printed + ')';
      }
      const out = spawnSync('pdftotext', [pdfFile, '-'], { encoding: 'utf8' });
      expect(out.status).toBe(0);
      const text = out.stdout.replace(/\s+/g, ' ');

      expect(text).toContain(PAGE_TITLE);
      expect(text).toContain(OLA);
      expect(text).toContain('Krysskontaminering');
      expect(text).not.toContain('Skriv ut dokumentasjonen');

      // A LEADING BLANK SHEET is what a named `@page` box claimed part-way through the flow produced,
      // and every assertion above passed while it did. Handing an inspector a blank first page is not
      // a cosmetic defect, so the file is asked where its first sheet starts.
      const first = out.stdout.split('\f')[0].trim();
      expect(first.startsWith(PAGE_TITLE)).toBe(true);

      // WHERE the text sits, not only that it is there. The admin shell reserves a 264px gutter for
      // the sidebar it hides when printing (~198pt); a document printed inside it would satisfy every
      // assertion above while coming out shoved into the right-hand two-thirds of the paper.
      const boxed = spawnSync('pdftotext', ['-bbox', pdfFile, '-'], { encoding: 'utf8' });
      expect(boxed.status).toBe(0);
      const lefts = [...boxed.stdout.matchAll(/xMin="([\d.]+)"/g)].map(m => Number(m[1]));
      expect(lefts.length).toBeGreaterThan(10);
      const leftmost = Math.min(...lefts);
      expect(leftmost).toBeLessThan(150);

      return 'pdftotext read ' + text.length + ' characters out of the file: the record is on it, ' +
        'the controls are not, the first sheet is the document, leftmost text at ' +
        leftmost.toFixed(1) + 'pt (not in the sidebar gutter)';
    });

    // Back to screen media before the rest of the journey, which measures a SCREEN.
    await page.emulateMedia({ media: 'screen' });

    await journey.step('a reference naming nobody is a document that SAYS so', async () => {
      // An invented id and a colleague who was never trained produce the same empty document. If the
      // page rendered them alike, an empty file could be handed over as evidence about a named
      // person it does not describe.
      await page.locator('[data-test="evidence-person-input"]').fill(NOBODY);
      await page.locator('[data-test="evidence-open"]').click();
      await expect(page.locator('[data-test="evidence-person-absent"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="evidence-state"]')).toContainText('fravær av dokumentasjon');
      await expect(page.locator('[data-test="evidence-completions-empty"]')).toBeVisible();

      // …and THAT read was recorded too. Disclosing that a store holds nothing on somebody is still a
      // disclosure about them, and the ledger does not get to be selective about which reads it
      // remembers.
      const after = await ledger(NOBODY);
      expect(after.disclosures).toBe(1);
      return 'empty document, named as empty; the read still recorded';
    });

    await journey.shot('a reference that names nobody');

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would claim the capability does
      // not work, which is false. The router's «Navigation cancelled» pair is the ADMIN SHELL's login
      // redirect racing itself and appears identically in every signed-in journey in this suite; it
      // is filed as a note so nobody re-diagnoses it from this page.
      const noise = /favicon|Download the Vue Devtools/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in the other signed-in journeys. It is ' +
          'AdminPage\'s login redirect being superseded by the storeId append, not anything on this page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the training evidence journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);
