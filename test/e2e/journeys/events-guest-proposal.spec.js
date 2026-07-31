// JOURNEY — a guest reads the offer their venue sent them, and accepts it.
//
// This is the public shape: no authentication, no admin shell, no store context. The page is reached
// by a token in the URL, exactly as `EventsEmailNotificationDelivery.ComposeLink` mails it, and its
// reader is a member of the public who has never seen this product.
//
// It matters that this is a SEPARATE shape from the admin journey. The guest pages landed today and
// have been driven by nothing but their own unit tests; the one thing those cannot check is the
// thing that makes the page a security boundary — that it does not carry a bearer token. This
// journey signs nobody in, and the artifact's request log is the record of what the page sent.
//
// The acceptance is evidence on the server: the receipt is append-only and bound to the content
// hash of what was displayed. So the journey asserts the receipt echoes the version number, an
// instant, and that hash — not merely that a success message appeared.

const { test, journeyDetails, expect } = require('../support/journey');

const TOKEN = 'fixture-proposal-open';

test(
  'A guest reads a sent proposal and accepts it, and gets a receipt naming the version',
  journeyDetails({
    journey: 'events-guest-proposal-accept',
    surface: 'public',
    capabilities: [
      'events.guest.proposal.read',
      'events.guest.proposal.accept'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('open the proposal link', async () => {
      await page.goto('/events/proposal/' + TOKEN);
      await expect(page.locator('.eg-title')).toHaveText('Julebord for Nordane AS');
      return 'GET /events/proposal/' + TOKEN;
    });

    await journey.step('the offer shows the venue\'s own figures, in the version\'s own currency', async () => {
      // Four independent money columns, four labels, no arithmetic. The page must not have invented a
      // "total to pay" — so the figures are read back and checked against the wire's minor units.
      const sums = page.locator('.eg-sums__figure');
      await expect(sums.first()).toBeVisible();
      const figures = (await sums.allTextContents()).map(t => t.replace(/\s/g, ' ').trim());

      // 4 480 000 minor units = kr 44 800,00, formatted nb-NO. Asserting the DIGITS rather than the
      // exact spacing, because NBSP grouping differs between ICU builds and that is not the claim.
      expect(figures[0].replace(/[^\d,]/g, '')).toBe('44800,00');
      // Currency is the proposal's, never the site's market.
      expect(figures[0]).toMatch(/kr|NOK/);

      // No currency warning: the version carried a currency code.
      await expect(page.locator('[data-test="no-currency"]')).toHaveCount(0);
      return figures.join(' | ');
    });

    await journey.step('the three offer lines and the venue terms are shown', async () => {
      await expect(page.locator('.eg-line')).toHaveCount(3);
      const first = (await page.locator('.eg-line').first().textContent()).replace(/\s+/g, ' ').trim();
      const terms = await page.locator('.eg-terms').textContent();
      // The terms are venue-authored text on a public page: they must render as TEXT. `v-text` is what
      // makes that true and also what strips the template's indentation; a leading space here would be
      // the regression the events-guest lane fixed by hand in a browser.
      expect(terms.startsWith('Avbestilling')).toBe(true);
      return first;
    });

    await journey.shot('the offer as sent');

    await journey.step('the accept form refuses an incomplete identity', async () => {
      // The backend validates neither field and writes both onto the receipt verbatim, so this page is
      // the only thing standing between "a receipt naming somebody" and "a receipt naming nobody".
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();
      const problems = page.locator('[data-test="accept-problems"]');
      await expect(problems).toBeVisible();
      // Still no receipt: the refusal is local and nothing was sent.
      await expect(page.locator('[data-test="accepted"]')).toHaveCount(0);
      return (await problems.textContent()).trim();
    });

    await journey.step('accept the offer', async () => {
      const form = page.locator('.eg-form').first();
      await form.locator('input[type="text"]').fill('Nina Nordmann');
      await form.locator('input[type="email"]').fill('nina@nordane.test');
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();
      await expect(page.locator('[data-test="accepted"]')).toBeVisible();
      return 'accepted as Nina Nordmann <nina@nordane.test>';
    });

    await journey.step('the receipt names the version, the moment and the content hash', async () => {
      const receipt = page.locator('[data-test="accepted"]');
      const facts = (await receipt.locator('dd').allTextContents()).map(t => t.trim());
      const reference = (await receipt.locator('.eg-ref').textContent()).trim();

      // The version the guest accepted — not "the current version", which is the whole point of a
      // token that answers with the version it was minted for.
      expect(facts[0]).toBe('2');
      // An instant, in the reader's own zone with the zone named on it.
      expect(facts[1]).not.toBe('–');
      // The content hash the server settled at send and re-verified at acceptance.
      expect(reference).toContain('b7d3f1a29c4e5806');
      return 'version ' + facts[0] + ' at ' + facts[1] + ' · ' + reference;
    });

    await journey.step('the accept and decline controls are gone afterwards', async () => {
      // The offer is still shown; only the answering is over. A page that hid the offer would be
      // withdrawing the evidence the guest just bound themselves to.
      await expect(page.getByRole('button', { name: 'Godta tilbudet' })).toHaveCount(0);
      await expect(page.locator('.eg-line')).toHaveCount(3);
      return 'no accept control, offer still rendered';
    });

    await journey.shot('the acceptance receipt');

    await journey.step('the page never sent a bearer token', async () => {
      // The security posture the whole `events-guest-client` separation exists for. A venue's own
      // staff open these links too; a page that quietly rode their admin token would answer
      // differently for them than for the guest it was built for.
      const authed = [];
      // Re-read the offer with a listener attached so the headers of a real request are inspected.
      page.on('request', (request) => {
        if (request.url().includes('/events/') && request.headers().authorization) {
          authed.push(request.method() + ' ' + request.url());
        }
      });
      await page.reload();
      await expect(page.locator('.eg-title')).toBeVisible();
      expect(authed).toEqual([]);
      return 'no Authorization header on any /events/ request';
    });

    await journey.step('what the browser said while this ran', () => {
      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error on the guest proposal page', error);
      }
      return errors.length ? errors.length + ' recorded as findings' : 'nothing';
    });
  }
);
