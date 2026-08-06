// PROBE — can a POINTER reach the Training publish control at a laptop width?
//
// Not a journey. It writes nothing under artifacts/journeys/; it drives the page to a real state and
// asks the browser the same question at five widths, in two table states, with the fix on and off.
//
// ---- WHY IT A/B's ITS OWN FIX ------------------------------------------------------------------
//
// The fix is `.trn-table-scroll { overflow-x: auto }`. This probe neutralises it at runtime with an
// injected `overflow-x: visible !important` and measures both ways in ONE run, so the before and the
// after come from the same browser, the same fixture and the same page state. Two runs at two commits
// would prove the same thing more weakly: anything else that moved in between would be inside the
// comparison. It is also the serving check — if the dev server were quietly still serving the old
// bundle, the "fixed" arm would measure identically to the neutralised one and this file would say so
// instead of reporting a pass.
//
// ---- WHAT COUNTS AS "CLICKABLE", AND WHAT IS NOT ALLOWED TO COUNT -------------------------------
//
// `click({ trial: true })` runs the full actionability check — scroll into view, then hit-test at the
// final position — and skips only the press itself. A control covered by another element FAILS it, so
// it cannot pass on a button no mouse can reach. That is the per-width instrument.
//
// NO `force: true` and NO `dispatchEvent`. A forced click still fires at the coordinates, so it
// exercises whatever is painted on top; a dispatched click proves the handler and says nothing about
// the control. Both pass against the defect this lane exists to remove. The two publishes at the end
// are ordinary `.click()` calls, and the version rows they produce are the evidence they landed.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { signIn } = require('../../test/e2e/support/admin');
const { turnOn } = require('../../test/e2e/support/flags');
const world = require('../../test/e2e/fixture/world');

/** Ola Ansatt's `workforcePersonId` — the PERSON id, not the engagement's `staffMemberId`. */
const OLA = world.STAFF[0].workforcePersonId;
const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';
const PUBLISH = '[data-test="version-publish"]';
// 1280 is the briefed width. 1024 and 1440 are the widths either side, so a fix that merely moved the
// failure would show here. 1366 is the commonest laptop panel there is and 1920 the desk monitor.
const WIDTHS = [1024, 1280, 1366, 1440, 1920];

const report = [];
function say (line) { report.push(line); process.stdout.write(line + '\n'); }

/** Turn the lane's own fix off (`false`) or back on (`true`) inside the live page. */
async function setFix (page, on) {
  await page.evaluate((enabled) => {
    const ID = 'lane-neutralise-trn-table-scroll';
    const existing = document.getElementById(ID);
    if (enabled) { if (existing) { existing.remove(); } return; }
    if (existing) { return; }
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = '.trn-table-scroll { overflow-x: visible !important; }';
    document.head.appendChild(style);
  }, on);
  await page.waitForTimeout(80);
}

/**
 * Everything the browser can say about whether a pointer can reach `selector`.
 *
 * `elementFromPoint` returning NULL is recorded as NOT hit, never as clear — the journey's own step 9
 * treats null as "not blocked", which is a false negative for the worst case there is: a control
 * overflowed clean out of the viewport has nothing at its centre at all. That is exactly why that
 * step reported "not blocked at this viewport" against a page whose button no click could reach.
 */
async function probeControl (page, selector) {
  const el = page.locator(selector).first();
  const geom = await el.evaluate((b, sel) => {
    const r = b.getBoundingClientRect();
    const table = b.closest('table');
    const holder = b.closest('.trn-page__column');
    const wrap = table.parentElement;
    const tr = table.getBoundingClientRect();
    const hr = holder.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      overflow: Math.round(tr.right - hr.right),
      wrapOverflowX: getComputedStyle(wrap).overflowX,
      wrapScrolls: Math.round(wrap.scrollWidth) > Math.round(wrap.clientWidth),
      // Is the control inside the wrapper's visible window right now, with no scrolling at all?
      visibleAtRest: r.right <= wrap.getBoundingClientRect().right + 0.5 && r.left >= 0
        && r.right <= document.documentElement.clientWidth,
      hitAtRest: !hit ? 'NULL (nothing at that point)'
        : (hit.closest(sel) === b
          ? 'the control itself'
          : '<' + hit.tagName.toLowerCase() + ' class="'
            + (typeof hit.className === 'string' ? hit.className : '') + '">'),
      // Does the PAGE scroll sideways? A body-level horizontal scrollbar at 1280 is its own defect.
      pageScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  }, selector);

  let trial = 'LANDS';
  try {
    await el.click({ trial: true, timeout: 4000 });
  } catch (e) {
    trial = 'FAILS (' + String(e.message || e).split('\n')[0].slice(0, 60) + ')';
  }
  return { ...geom, trial };
}

async function line (page, label, selector) {
  const r = await probeControl(page, selector);
  say('    ' + label.padEnd(9)
    + ' overflow=' + String(r.overflow + 'px').padEnd(7)
    + ' overflowX=' + r.wrapOverflowX.padEnd(8)
    + ' pageScrollsX=' + String(r.pageScrollsX).padEnd(6)
    + ' visibleAtRest=' + String(r.visibleAtRest).padEnd(6)
    + ' hit=' + r.hitAtRest.padEnd(34)
    + ' pointer-click ' + r.trial);
  return r;
}

test('the Training publish control, five widths x two table states x fix on/off', async ({ page, baseURL }) => {
  const apiBase = process.env.E2E_API_BASE_URL
    || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || '4098'));
  await fetch(apiBase + '/__fixture/reset', { method: 'POST' });
  say('probe base ' + baseURL + ' api ' + apiBase);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/admin/training-courses');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED', expectPath: '/admin/training-courses' });
  await expect(page.locator('.trn-page__title')).toHaveText('Opplæring');
  await turnOn(page, SETUP_FLAG);
  await turnOn(page, ASSIGNMENTS_FLAG);
  await page.goto('/admin/training-courses');
  await expect(page.locator('[data-test="flag-' + SETUP_FLAG + '"]')).toHaveText('På');

  await page.locator('[data-test="course-title"]').fill('Allergenhåndtering');
  await page.locator('[data-test="course-category"]').fill('Mattrygghet');
  await page.locator('[data-test="course-competency"]').fill('food.allergens');
  await page.locator('[data-test="course-submit"]').click();
  await expect(page.locator('[data-test="course-row"]')).toHaveCount(1, { timeout: 15000 });
  await page.locator('[data-test="course-row"]').first().click();
  await expect(page.locator('[data-test="versions-empty"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-test="version-content"]').fill('["De 14 allergenene", "Krysskontaminering"]');
  await page.locator('[data-test="version-threshold"]').fill('80');
  await page.locator('[data-test="version-submit"]').click();
  await expect(page.locator('[data-test="version-row"]')).toHaveCount(1, { timeout: 15000 });

  // SERVING CHECK. If the dev server were still handing out the pre-fix bundle there would be no
  // `.trn-table-scroll` in the DOM at all, and everything below would measure the defect twice.
  const wrappers = await page.locator('.trn-table-scroll').count();
  say('serving check: ' + wrappers + ' .trn-table-scroll wrapper(s) in the DOM'
    + (wrappers === 0 ? '  <<< THE FIX IS NOT BEING SERVED' : ''));
  expect(wrappers).toBeGreaterThan(0);

  const results = { A: {}, B: {} };

  async function sweepState (stateKey, title) {
    say('');
    say('=== STATE ' + stateKey + ' — ' + title);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 720 });
      await page.waitForTimeout(120);
      say('  @' + w + 'px');
      await setFix(page, false);
      const before = await line(page, 'FIX OFF', PUBLISH);
      await setFix(page, true);
      const after = await line(page, 'FIX ON', PUBLISH);
      results[stateKey][w] = { before, after };
    }
  }

  await sweepState('A', 'one Draft row, hash and published-at both "—" (the narrowest this table ever is)');

  // ---- the click that matters, at the briefed width --------------------------------------------
  await page.setViewportSize({ width: 1280, height: 720 });
  await setFix(page, true);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(__dirname, 'shot-1280-before-publish.png') });
  say('');
  say('REAL POINTER CLICK (no force, no dispatch) on publish @1280, state A:');
  await page.locator(PUBLISH).first().click({ timeout: 8000 });

  // AND THE OPERATOR IS TOLD WHAT HAPPENED. A control that works while the page hides its outcome is
  // half a capability, so the visible consequences are asserted rather than assumed.
  const row = page.locator('[data-test="version-row"]').first();
  await expect(row).toContainText('Publisert', { timeout: 15000 });
  await expect(page.locator(PUBLISH)).toHaveCount(0);
  const hash = (await row.locator('.trn-ref').textContent()).trim();
  expect(hash).not.toBe('—');
  say('  LANDED. Row now reads "Publisert", content hash ' + hash
    + ', and the publish control is GONE (a published version is immutable).');
  await page.screenshot({ path: path.join(__dirname, 'shot-1280-after-publish.png') });

  // ---- state B: a published row and a draft row in the same table ------------------------------
  await page.locator('[data-test="version-content"]').fill('["De 14 allergenene", "Krysskontaminering", "Merking"]');
  await page.locator('[data-test="version-threshold"]').fill('80');
  await page.locator('[data-test="version-submit"]').click();
  await expect(page.locator('[data-test="version-row"]')).toHaveCount(2, { timeout: 15000 });
  await expect(page.locator(PUBLISH)).toHaveCount(1);

  await sweepState('B', 'v1 Publisert (real hash + timestamp) beside v2 Utkast — what a second version looks like');

  await page.setViewportSize({ width: 1280, height: 720 });
  await setFix(page, true);
  await page.waitForTimeout(120);
  say('');
  say('REAL POINTER CLICK on publish @1280, state B:');
  await page.locator(PUBLISH).first().click({ timeout: 8000 });
  await expect(page.locator('[data-test="version-row"]').nth(1)).toContainText('Publisert', { timeout: 15000 });
  await expect(page.locator(PUBLISH)).toHaveCount(0);
  say('  LANDED. v2 now reads "Publisert" too.');

  // ---- the sibling controls on the same surface ------------------------------------------------
  const assignVersion = page.locator('[data-test="assignment-version"]');
  await assignVersion.selectOption({ index: 1 });
  await page.locator('[data-test="assignment-scope"]').selectOption('Person');
  await page.locator('[data-test="assignment-reference-picker"]').selectOption(OLA);
  await page.locator('[data-test="assignment-due"]').fill('2026-08-15');
  await page.locator('[data-test="assignment-submit"]').click();
  await expect(page.locator('[data-test="assignment-row"]')).toHaveCount(1, { timeout: 15000 });

  say('');
  say('=== SIBLING — assignment-revoke, the one other action control in a trailing cell');
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 720 });
    await page.waitForTimeout(120);
    say('  @' + w + 'px');
    await setFix(page, false);
    await line(page, 'FIX OFF', '[data-test="assignment-revoke"]');
    await setFix(page, true);
    await line(page, 'FIX ON', '[data-test="assignment-revoke"]');
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await setFix(page, true);
  await page.waitForTimeout(120);
  say('');
  say('=== EVERY .trn-table on the surface @1280, fix ON');
  // TWO DIFFERENT NUMBERS, and conflating them would make this file contradict itself. `table` is the
  // table box, which is SUPPOSED to stay wide inside a scroll container — that width is the content,
  // not the bug. `painted` is the wrapper: the region the table can actually draw into, and the one
  // that must stay inside the column. Before the fix they were the same element and so the same
  // number; that is precisely how the overflow escaped.
  const sweep = await page.locator('.trn-table').evaluateAll(nodes => nodes.map((t) => {
    const holder = t.closest('.trn-page__column').getBoundingClientRect();
    return {
      panel: t.closest('section') ? t.closest('section').className : '?',
      cols: t.querySelectorAll('thead th').length,
      tablePast: Math.round(t.getBoundingClientRect().right - holder.right),
      paintedPast: Math.round(t.parentElement.getBoundingClientRect().right - holder.right),
      overflowX: getComputedStyle(t.parentElement).overflowX
    };
  }));
  for (const t of sweep) {
    say('  ' + t.panel.padEnd(18) + ' ' + t.cols + ' cols  overflowX=' + t.overflowX.padEnd(8)
      + ' table is ' + String(t.tablePast + 'px').padEnd(7) + ' past the column (content — fine if contained)'
      + ' | PAINTS ' + t.paintedPast + 'px past'
      + (t.paintedPast > 0 ? '   <<< STILL ESCAPES ITS COLUMN' : '  (contained)'));
  }

  say('');
  say('==== SUMMARY — pointer-click verdict on the publish control ====');
  for (const stateKey of ['A', 'B']) {
    for (const w of WIDTHS) {
      const r = results[stateKey][w];
      say('  state ' + stateKey + ' @' + String(w).padEnd(5)
        + ' fix OFF: ' + r.before.trial.split(' ')[0].padEnd(6)
        + ' -> fix ON: ' + r.after.trial.split(' ')[0]);
    }
  }

  fs.writeFileSync(path.join(__dirname, process.env.PROBE_OUT || 'probe-report.txt'),
    report.join('\n') + '\n');
});
