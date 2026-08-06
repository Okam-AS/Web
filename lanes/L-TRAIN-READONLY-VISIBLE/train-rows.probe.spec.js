// What an operator actually sees on the two Training rows of /admin/feature-flags.
//
// NOT a journey: it declares no capability and writes no artifact under artifacts/journeys/, because
// it proves a SENTENCE IS READABLE rather than that a capability can be completed. It exists because
// a green component test is not evidence that an operator can read anything — jsdom stubs `$i`, so
// every assertion in feature-flags-page.test.js is about a translation KEY. This opens the page in a
// browser at the admin locale and reads the rendered Norwegian off the screen.
//
// It is run twice by capture.py — once against the tree as it was, once against the change — so the
// difference is a pair of screenshots rather than a claim.

const { test, expect } = require('@playwright/test');
const { signIn } = require('../../test/e2e/support/admin');
const { flagRow } = require('../../test/e2e/support/flags');

const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';
const OUT = process.env.PROBE_OUT || 'lanes/L-TRAIN-READONLY-VISIBLE/shots/unlabelled';

test('the Training rows of the switchboard, as rendered', async ({ page }) => {
  await page.goto('/admin/feature-flags');
  await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
  await signIn(page, { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED', expectPath: '/admin/feature-flags' });
  await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });

  // The switchboard is catalog-scoped, so the Training section is drawn from the backend catalog
  // rather than from anything this file knows. If these two rows are absent the probe is measuring
  // the wrong page and must say so rather than screenshot an empty section.
  const setup = flagRow(page, SETUP_FLAG);
  const assignments = flagRow(page, ASSIGNMENTS_FLAG);
  await expect(setup).toHaveCount(1);
  await expect(assignments).toHaveCount(1);

  // Read the rendered prose off the screen. `.count()` first, because `.textContent()` on a missing
  // node throws a locator error that would read as a harness fault rather than as "the sentence is
  // not there" — which is exactly the state the BEFORE run is supposed to record.
  const say = async (row) => {
    const note = row.locator('.ff-row__offmeaning');
    return (await note.count()) ? (await note.first().innerText()).replace(/\s+/g, ' ').trim() : null;
  };

  const rendered = {
    intro: (await page.locator('.ff-page__intro').innerText()).replace(/\s+/g, ' ').trim(),
    [SETUP_FLAG]: await say(setup),
    [ASSIGNMENTS_FLAG]: await say(assignments)
  };
  // eslint-disable-next-line no-console
  console.log('PROBE_JSON ' + JSON.stringify(rendered));

  await page.locator('.ff-page__intro').screenshot({ path: OUT + '-intro.png' });
  await setup.screenshot({ path: OUT + '-setup-row.png' });
  await assignments.screenshot({ path: OUT + '-assignments-row.png' });
});
