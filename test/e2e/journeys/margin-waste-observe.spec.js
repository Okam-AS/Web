// A RECORDER, NOT A JUDGE. It asserts nothing about the waste panel: it opens a week exactly as a
// venue does and writes down what is on the screen, so the same script can be run against the code
// before this lane and after it and the two outputs compared as prose.
//
// It exists because the defect is a SENTENCE. A pass/fail spec proves the new states are reachable and
// that the old ones are gone; it does not show what a person was being told, and that is the thing
// under discussion. The one assertion here is that the page loaded at all.
//
// Output: artifacts/waste-observation.txt (overwritten per run — the caller renames it per arm).

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MONDAY = '2026-07-20';
const OUT = path.join(__dirname, '..', '..', '..', 'artifacts', 'waste-observation.txt');

const CONTROLS = [
  'waste-record', 'waste-date', 'waste-reason', 'waste-value',
  'waste-description', 'waste-quantity', 'waste-ingredient', 'waste-remove'
];

const STATES = [
  'waste-absent', 'waste-unknown', 'waste-empty', 'waste-frozen', 'waste-row',
  'coverage-waste-absent', 'coverage-waste-unknown', 'waste-none', 'waste-total'
];

test('observe what the waste and coverage panels say on a server with no waste routes', async ({ page }) => {
  const wasteResponses = [];
  page.on('response', (r) => {
    if (r.url().includes('/margin/waste')) { wasteResponses.push(r.status()); }
  });

  await page.goto('/admin/margin-statements');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-statements' });
  await turnOn(page, 'Margin.Module');
  await turnOn(page, 'Margin.Statements');
  await page.goto('/admin/margin-statements');

  await page.locator('[data-test="week-start"]').fill(MONDAY);
  // The waste read is awaited INSIDE `createStatement`, after the statement is already in `data` — so
  // the badge appears before the request lands. Reading the response log at that moment records "no
  // request was made" about a request that is still in flight, which is the same absent-versus-silent
  // confusion this lane is about, committed by the instrument instead of the product.
  const wasteLanded = page.waitForResponse(r => r.url().includes('/margin/waste'), { timeout: 20000 })
    .catch(() => null);
  await page.locator('[data-test="create-statement"]').click();
  await expect(page.locator('[data-test="state-badge"]')).toHaveText('Ikke beregnet', { timeout: 15000 });
  await wasteLanded;
  // One tick for Vue to render off the resolved read.
  await page.waitForTimeout(250);

  const lines = [];
  lines.push('GET /margin/waste statuses seen by the browser: ' +
    (wasteResponses.length ? wasteResponses.join(', ') : 'NO REQUEST WAS MADE'));
  lines.push('');

  // `innerText`, NOT `textContent`, and the rule is suppressed rather than obeyed. This artifact is
  // "what a person reads": innerText is the RENDERED text — it honours line breaks and omits anything
  // the page is not showing, which is exactly the question here. `textContent` would include the text
  // of hidden branches and run it all together, so a panel that correctly hides its form would produce
  // a transcript containing the form. The lint rule is right about production DOM code and wrong about
  // an instrument whose subject is what is visible.
  lines.push('--- the waste panel, as a person reads it -------------------------------------');
  const panel = page.locator('.mwp');
  lines.push((await panel.count())
    // eslint-disable-next-line unicorn/prefer-text-content -- rendered text is the subject; see above
    ? (await panel.first().innerText()).replace(/\n{2,}/g, '\n').trim()
    : 'NO WASTE PANEL ON SCREEN');
  lines.push('');

  lines.push('--- the coverage panel\'s waste section ----------------------------------------');
  const cov = page.locator('.mcv');
  // eslint-disable-next-line unicorn/prefer-text-content -- rendered text is the subject; see above
  lines.push((await cov.count()) ? (await cov.first().innerText()).replace(/\n{2,}/g, '\n').trim() : 'NO COVERAGE PANEL');
  lines.push('');

  lines.push('--- which state hooks are present ---------------------------------------------');
  for (const hook of STATES) {
    lines.push('  ' + (await page.locator('[data-test="' + hook + '"]').count() ? '[present] ' : '[absent ] ') + hook);
  }
  lines.push('');

  lines.push('--- recording controls offered into a route that 404s -------------------------');
  let offered = 0;
  for (const hook of CONTROLS) {
    const n = await page.locator('[data-test="' + hook + '"]').count();
    if (n) { offered += 1; }
    lines.push('  ' + (n ? '[OFFERED] ' : '[absent ] ') + hook);
  }
  lines.push('');
  lines.push('recording controls offered: ' + offered + ' of ' + CONTROLS.length);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

  // ELEMENT shots, not a viewport shot. The waste panel sits below the fold on this page, so a
  // full-page screenshot of the defect showed the page header and none of the sentence under
  // discussion — a picture of the wrong thing is worse than no picture.
  if (await panel.count()) {
    await panel.first().screenshot({ path: path.join(path.dirname(OUT), 'waste-panel.png') });
  }
  if (await cov.count()) {
    await cov.first().screenshot({ path: path.join(path.dirname(OUT), 'coverage-panel.png') });
  }
});
