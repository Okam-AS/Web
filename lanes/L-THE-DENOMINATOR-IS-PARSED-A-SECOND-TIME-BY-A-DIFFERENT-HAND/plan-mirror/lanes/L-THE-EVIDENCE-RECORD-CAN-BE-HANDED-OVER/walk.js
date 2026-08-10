// The lane's own browser walk, against the OWNER'S live world (web :3971, API :5971). Not the e2e
// harness: that config starts its own nuxt and its own fixture backend, and this lane may start
// neither. Everything below drives the server that is already running.
//
// What it has to prove is one sentence: a person opens the training evidence page, obtains the
// record, and can hand it over. So it signs in as a human would, presses the page's own button to
// perform the disclosure, presses the page's own PRINT control, and then produces the artifact the
// browser's «save as PDF» produces from the same pipeline — and reads that file back.

const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/svendaneel/okam/Web-modules/node_modules/playwright');

const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:3971';
const PHONE = '99681931';
const CODE = '849666';
const PERSON = '4dc94bb7-2515-46ed-aad5-c9e23552dabd'; // Selma Haug, Two Humans Kafé

/** What the printer would actually put on the paper: the tree under the currently emulated media. */
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
      // `content-visibility: hidden` is how a current engine hides a closed <details>'s contents,
      // and `display` says nothing about it. checkVisibility() knows; without this the walker would
      // report the material as being on the paper when it is not.
      if (typeof node.checkVisibility === 'function' && !node.checkVisibility()) { return; }
      node.childNodes.forEach(walk);
    };
    document.body.childNodes.forEach(walk);
    return parts.join(' ');
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];
  const say = (m) => { log.push(m); console.log(m); };

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const failures = [];
  page.on('response', r => { if (r.status() >= 400) { failures.push(r.status() + ' ' + r.url()); } });

  try {
    // ---- sign in, as a person -----------------------------------------------------------------
    await page.goto(BASE + '/admin/training-evidence', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    say('1. opened /admin/training-evidence anonymously -> ' + new URL(page.url()).pathname + new URL(page.url()).search);

    // The door is part of the route: phone, then the six OTP boxes filled one by one, exactly as
    // `test/e2e/support/admin.js` does it — the component only advances on a per-input event.
    const modal = page.locator('.login-modal');
    await modal.waitFor({ state: 'visible', timeout: 30000 });
    await modal.locator('.input-wrapper input[type="tel"]').fill(PHONE);
    await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();
    const boxes = modal.locator('.otp-input input');
    await boxes.first().waitFor({ timeout: 20000 });
    const digits = String(CODE).split('');
    for (let i = 0; i < digits.length; i++) { await boxes.nth(i).fill(digits[i]); }
    await page.waitForURL(url => url.pathname === '/admin/training-evidence', { timeout: 30000 });
    await page.waitForTimeout(3000);
    say('2. signed in as ' + PHONE + ' -> ' + new URL(page.url()).pathname);

    // ---- the control exists and is refused until there is a record ----------------------------
    await page.waitForSelector('[data-test="evidence-print"]', { timeout: 20000 });
    const disabledBefore = await page.locator('[data-test="evidence-print"]').isDisabled();
    say('3. the print control is on the page, disabled before any read: ' + disabledBefore);
    await page.screenshot({ path: path.join(OUT, '01-page-before-read.png'), fullPage: true });

    // ---- the disclosure, performed by the manager ---------------------------------------------
    await page.fill('[data-test="evidence-person-input"]', PERSON);
    await page.click('[data-test="evidence-open"]');
    await page.waitForSelector('[data-test="evidence-document"]', { timeout: 20000 });
    const subject = (await page.locator('[data-test="evidence-person"]').textContent()).trim();
    const rows = await page.locator('[data-test="evidence-completion-row"]').count();
    const certs = await page.locator('[data-test="evidence-certificate-row"]').count();
    const chain = await page.locator('[data-test="evidence-audit-row"]').count();
    say('4. record opened for ' + subject + ': ' + rows + ' completion(s), ' + certs + ' certificate(s), ' + chain + ' ledger row(s)');
    await page.screenshot({ path: path.join(OUT, '02-record-on-screen.png'), fullPage: true });

    const disabledAfter = await page.locator('[data-test="evidence-print"]').isDisabled();
    say('5. the print control is now live: ' + !disabledAfter);

    // ---- the manager presses PRINT. Headless Chromium has no dialog, so the press is recorded
    //      and the artifact is produced below by the same pipeline the press invokes.
    const pressed = await page.evaluate(() => {
      let called = false;
      const original = window.print;
      window.print = () => { called = true; };
      document.querySelector('[data-test="evidence-print"]').click();
      window.print = original;
      return called;
    });
    say('6. pressing the button reached the browser\'s print command: ' + pressed);

    // ---- what the printer would put on the paper ----------------------------------------------
    const screen = await visibleText(page);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(400);
    const paper = await visibleText(page);
    await page.screenshot({ path: path.join(OUT, '03-under-print-media.png'), fullPage: true });

    const onScreenOnly = [
      'Velg en person og hent', 'Å hente dette dokumentet er selv en utlevering',
      'Hent dokumentasjonen', 'Skriv ut dokumentasjonen', 'Én persons samlede opplæringsjournal'
    ];
    const paperMust = ['Opplæringsdokumentasjon', subject, PERSON];
    say('7. on paper: ' + paper.length + ' characters (screen: ' + screen.length + ')');
    for (const s of paperMust) {
      say('   ON  the paper  «' + s.slice(0, 46) + '»: ' + paper.includes(s));
    }
    for (const s of onScreenOnly) {
      say('   OFF the paper  «' + s.slice(0, 46) + '»: ' + (!paper.includes(s)) + ' (on screen: ' + screen.includes(s) + ')');
    }

    // ---- THE ARTIFACT -------------------------------------------------------------------------
    // The same pipeline the button invokes, asked for A4 — which is what a manager choosing «save as
    // PDF» in the dialog gets.
    const pdf = path.join(OUT, 'training-evidence.pdf');
    await page.pdf({ path: pdf, format: 'A4', printBackground: false });
    say('8. produced ' + path.basename(pdf) + ' (' + fs.statSync(pdf).size + ' bytes)');

    // ---- and the same questions asked of the FILE rather than of the DOM ------------------------
    // A different instrument, and it catches what the cascade walk cannot: a page box that crops the
    // sheet, a table laid out wider than the paper, a blank first page. The first version of this
    // lane's stylesheet passed every DOM assertion above and produced a file whose `Opphav` column
    // read `Opp`.
    const { spawnSync } = require('child_process');
    const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
    if (probe.error) {
      say('9. pdftotext is not on this machine — the FILE was verified by size only');
    } else {
      const out = spawnSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });
      const text = out.stdout.replace(/\s+/g, ' ');
      fs.writeFileSync(path.join(OUT, 'pdf-text.txt'), out.stdout);
      const info = spawnSync('pdfinfo', [pdf], { encoding: 'utf8' }).stdout || '';
      const pages = (info.match(/Pages:\s*(\d+)/) || [])[1];
      say('9. read the file back: ' + pages + ' pages, ' + text.length + ' characters');
      const inFile = [
        'Opplæringsdokumentasjon', 'Selma Haug', PERSON,
        'Opphav', 'I journalen',                        // the provenance column, clipped by the first draft
        'journalrad som sier hvem som førte den',       // a whole sentence, not a truncated one
        'Beståttgrense: 80%',                           // the frozen threshold the verdict was measured against
        'Varmebehandling ≥ 75 °C',                      // the material the content hash was taken over
        '"scorePercent":"85"}',                         // a ledger delta, closing brace and all
        'sha256:db69110e'                               // the hash itself
      ];
      for (const s of inFile) { say('   in the FILE  «' + s.slice(0, 44) + '»: ' + text.includes(s)); }
      for (const s of onScreenOnly) { say('   NOT in file «' + s.slice(0, 44) + '»: ' + !text.includes(s)); }
      // A blank leading sheet is what a named `@page` box claimed part-way through the flow produced.
      const first = out.stdout.split('\f')[0].trim();
      say('   first sheet is not blank: ' + (first.length > 0) + ' (starts «' + first.slice(0, 30) + '»)');
    }

    await page.emulateMedia({ media: 'screen' });
    fs.writeFileSync(path.join(OUT, 'paper-text.txt'), paper);
    fs.writeFileSync(path.join(OUT, 'screen-text.txt'), screen);
    fs.writeFileSync(path.join(OUT, 'walk.log'), log.join('\n') + '\n');
    if (failures.length) { fs.writeFileSync(path.join(OUT, 'failed-requests.txt'), failures.join('\n') + '\n'); }
    say('10. failed requests during the walk: ' + failures.length);
  } catch (e) {
    say('WALK FAILED: ' + e.message);
    await page.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(OUT, 'walk.log'), log.join('\n') + '\n');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
