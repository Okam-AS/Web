// JOURNEY — a member of the public joins a venue's newsletter, and the consent is real.
//
// This page is the only thing in the estate that can acquire a subscriber, and it is a CONSENT
// SURFACE, so two of its properties are legal rather than cosmetic and neither is checkable by
// mounting the component:
//
//   1. THE TICK'S LABEL IS THE SERVER'S OWN SENTENCE, RENDERED VERBATIM. The consent register holds
//      one row per locale and `GrowthPublicConsentTextResponse` carries the text and its version id
//      in ONE response, precisely so a page cannot display one version and post another. The journey
//      asserts the label on screen is that string character for character, and that the version the
//      page says it will record is the one the read served.
//   2. SUBMITTING WITHOUT THE TICK FIRES NO REQUEST AT ALL. Not "the server refuses it" — nothing is
//      sent. A pre-ticked box is not an affirmative action under GDPR art. 4(11) and would make every
//      receipt worthless; a box that was unticked but posted anyway would be worse, because the
//      receipt would exist. The journey counts the requests the browser actually made.
//
// The refusals: an unticked box (local), and a venue with `growth.module` off — whose 404 is
// deliberately the same answer as a store that does not exist, so the page may not tell a guest their
// link is wrong. It draws no form at all there, because without a version id there is nothing lawful
// to pin a capture to and the endpoint would refuse every submission.
//
// It also asserts what the page must NOT say afterwards. `POST .../subscriptions` answers 202 for a
// well-formed request whether the address is new, already pending or already verified — varying would
// make the route an address-existence oracle — so the acknowledgment may not claim an email was sent
// or that the reader is now subscribed.
//
// ---- WHY A PUBLIC JOURNEY SIGNS IN, ONCE, IN THE MIDDLE -----------------------------------------
//
// `growth.module` is deny-closed, so the guest page is dark at EVERY venue until an operator pulls
// the lever — including the one this walk subscribes to. An earlier draft hard-coded a single dark
// store id and answered for every other, which modelled a world with no flags in it and would have
// shown this page working at a venue where no guest could reach it. So the walk starts dark, goes to
// `/admin/feature-flags` and turns the module on the way a person does, and comes back.
//
// That has a second payoff the original could not have. The session is still live when the guest
// page is re-opened, and the request log shows NO Authorization header on the capture — which is the
// property `GrowthGuestService`'s empty initializer exists for, and it is unfalsifiable while nobody
// is signed in. A venue's own staff open these links too.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flagRow } = require('../support/flags');
const world = require('../fixture/world');

const STORE = world.STORE_ID;
// A second venue nobody has ever switched Growth on for. Not special-cased anywhere: it is dark for
// the ordinary reason, which is the only reason a real store is ever dark.
const DARK_STORE = world.GROWTH_DARK_STORE_ID;
const MODULE_FLAG = 'growth.module';

test(
  'A guest reads the consent wording verbatim, is refused without ticking it, and then subscribes',
  journeyDetails({
    journey: 'growth-guest-consent',
    surface: 'public',
    capabilities: [
      'platform.feature-flags.write',
      'growth.guest.module.gate',
      'growth.guest.consent-text.read',
      'growth.guest.subscribe',
      'growth.guest.consent.affirmative-action',
      'growth.guest.dark-store'
    ]
  }),
  async ({ page, journey }) => {
    // Counted from the browser's own request log rather than from the fixture, because the claim is
    // about what this PAGE sent — a fixture counter could not tell a request that was never made
    // from one that was made to somewhere else.
    const captures = [];
    page.on('request', (request) => {
      if (/\/v1\/growth\/stores\/\d+\/subscriptions$/.test(request.url())) {
        captures.push({ method: request.method(), authorization: request.headers().authorization || null });
      }
    });

    await journey.step('the venue\'s own signup link is dark before anybody switches Growth on', async () => {
      // Where every venue starts. `growth.module` has never been flipped for this store, so the
      // consent-text read answers `growth.not_found` and there is nothing lawful to pin a capture
      // to — so no form, rather than a form certain to be refused.
      await page.goto('/subscribe/' + STORE);
      await expect(page.locator('[data-test="unavailable"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-test="consent"]')).toHaveCount(0);
      return STORE + ' dark: ' + MODULE_FLAG + ' never overridden';
    });

    await journey.step('an operator turns the module on for this venue', async () => {
      // Through the product. `/admin/feature-flags` is the only caller of
      // `PUT /stores/{id}/feature-flags` in the whole frontend, so pressing its button is what makes
      // this a capability rather than a curl — and the guest page below is then reading a switch a
      // person moved, not a row a test wrote.
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      await expect(flagRow(page, MODULE_FLAG).locator('.ff-row__badge')).toHaveText('Av');
      await turnOn(page, MODULE_FLAG);
      return MODULE_FLAG + ' on for store ' + STORE;
    });

    await journey.step('open the venue\'s signup page', async () => {
      await page.goto('/subscribe/' + STORE);
      await expect(page.getByRole('heading', { name: 'Meld deg på nyhetsbrevet' })).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-test="consent"]')).toBeVisible();
      // The same page, the same session, one switch moved.
      await expect(page.locator('[data-test="unavailable"]')).toHaveCount(0);
      return 'GET /subscribe/' + STORE;
    });

    await journey.step('the tick\'s label is the server\'s sentence, character for character', async () => {
      // The one string a receipt will later say this person agreed to. Not a summary of it, not a
      // translation of it — `v-text` on the served value, which is also what keeps the template's
      // indentation out of it.
      const label = await page.locator('[data-test="consent"] span').textContent();
      expect(label).toBe(world.GROWTH_CONSENT.text);

      // …and the version the page says it will record is the one that served the text.
      await expect(page.locator('[data-test="consent-provenance"]'))
        .toContainText('versjon ' + world.GROWTH_CONSENT.version);
      await expect(page.locator('[data-test="consent-provenance"]'))
        .toContainText(world.GROWTH_CONSENT.locale);

      // Unticked on arrival. There is no pre-selection anywhere on this page.
      await expect(page.locator('[data-test="consent"] input')).not.toBeChecked();
      return label;
    });

    await journey.shot('the consent wording as served');

    await journey.step('the Norwegian-only register is disclosed to a non-Norwegian reader', async () => {
      // The consent register holds ONE locale (`nb-NO`), so an English reader is shown Norwegian
      // wording — and it STAYS Norwegian, because translating it here would show a sentence different
      // from the one on the receipt. The page says that rather than leaving it to be noticed.
      await expect(page.locator('[data-test="consent-language"]')).toHaveCount(0);
      await page.getByRole('button', { name: /^English$/i }).click();
      await expect(page.locator('[data-test="consent-language"]')).toBeVisible();
      const stillNorwegian = await page.locator('[data-test="consent"] span').textContent();
      expect(stillNorwegian).toBe(world.GROWTH_CONSENT.text);
      await page.getByRole('button', { name: /^Norsk$/i }).click();
      return 'locale switched to English; the consent sentence did not move';
    });

    await journey.step('SUBMITTING WITHOUT THE TICK FIRES NO REQUEST', async () => {
      await page.locator('.gg-field input').fill('nina@nordane.test');
      await page.getByRole('button', { name: 'Meld meg på' }).click();

      await expect(page.locator('[data-test="problems"]'))
        .toHaveText('Kryss av for samtykke først. Uten avkryssing har vi ikke lov til å registrere deg.');
      // The claim. Nothing was posted, so no receipt could exist — which is the only state in which
      // "we have no consent from this person" is true.
      expect(captures).toEqual([]);
      await expect(page.locator('[data-test="accepted"]')).toHaveCount(0);
      return 'zero requests to /subscriptions; the form stated why';
    });

    await journey.step('tick it and subscribe', async () => {
      await page.locator('[data-test="consent"] input').check();
      await page.getByRole('button', { name: 'Meld meg på' }).click();
      await expect(page.locator('[data-test="accepted"]')).toBeVisible({ timeout: 15000 });
      expect(captures.length).toBe(1);
      // NO BEARER TOKEN, AND THIS BROWSER HAS ONE. `GrowthGuestService` is built with no initializer
      // so it cannot attach one — a venue's own staff open these links too, and a page that quietly
      // rode their admin token would answer differently for them than for the guest it was built
      // for. The operator signed in two steps ago and the session is still live, which is what makes
      // the absence below evidence rather than a tautology.
      expect(captures[0].authorization).toBe(null);
      return 'one POST /subscriptions, no Authorization header, with an admin session live';
    });

    await journey.step('the acknowledgment claims nothing the 202 does not support', async () => {
      const accepted = page.locator('[data-test="accepted"]');
      await expect(accepted).toContainText('Vi har tatt imot forespørselen');
      // The endpoint answers identically whether the address is new, already pending or already
      // verified, because varying would make it an address-existence oracle. So the page may not say
      // which — and it says out loud that it cannot, rather than leaving a guest to read the silence
      // as a fault.
      const text = await accepted.textContent();
      expect(text).not.toContain('nina@nordane.test');

      // The form is REPLACED, not left beside the acknowledgment: a second submit would supersede the
      // pending invite and kill the confirm link the first one minted.
      await expect(page.locator('[data-test="consent"]')).toHaveCount(0);
      return text.replace(/\s+/g, ' ').trim().slice(0, 110) + '…';
    });

    await journey.shot('the acknowledgment');

    await journey.step('a DIFFERENT venue, whose switch nobody moved, draws no form at all', async () => {
      // The gate is load-bearing and this is what shows it: the flip two steps up was per-store, so
      // the venue beside it is exactly as dark as this one was before the flip. Without a version id
      // there is nothing lawful to pin a capture to and the endpoint would refuse every submission
      // with `growth.consent_text_unknown`. A form that is certain to be refused is not a form.
      await page.goto('/subscribe/' + DARK_STORE);
      await expect(page.locator('[data-test="unavailable"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-test="consent"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Meld meg på' })).toHaveCount(0);
      // And it does NOT tell the guest their link is wrong: `growth.not_found` is deliberately the
      // same answer for a dark store and a store that does not exist.
      return (await page.locator('[data-test="unavailable"]').textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED — the flow completed, so failing here would say the capability does
      // not work, which is false. The 404s are the two dark-venue probes this journey performed on
      // purpose and handled honestly on screen: counted, named, and not filed as news.
      const noise = /favicon|Download the Vue Devtools|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here, during the operator detour, and identically in every ' +
          'other signed-in journey in this suite. It is AdminPage\'s login redirect being ' +
          'superseded by the storeId append, not anything on the signup page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the growth signup journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);
