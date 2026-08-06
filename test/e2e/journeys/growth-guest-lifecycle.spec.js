// JOURNEY — the whole consent lifecycle, from a stranger joining a list to that same person being off
// it again: join, supersede, confirm, replay, withdraw, replay.
//
// ---- WHAT WAS MISSING, AND WHY IT IS THIS WALK -------------------------------------------------
//
// The plan carries `/subscribe/confirm` and `/preferences/unsubscribe` as `reachable · undriven` —
// the only two of Growth's four public pages nothing had ever opened. `growth-guest-consent` covers
// the JOIN in full and is not re-walked here. What was never shown is that a capture turns into a
// verified subscription and that the verified subscription can be ended, which is the half the
// module's whole claim rests on: GDPR art. 7(3) says withdrawal must be as easy as consent, and a
// consent surface that can only be joined is not a consent surface.
//
// ---- THE THREE REFUSALS COME BEFORE THEIR SUCCESSES --------------------------------------------
//
// Each page's failure branch is provoked FIRST, against the same page, in the same world, and only
// then is the good link opened. Without that ordering, "the confirm page confirms" is a sentence
// about a page that might confirm anything put in front of it — including a link somebody guessed —
// and the assertion could not fail. With it, one thing differs between the two arrivals and it is the
// token.
//
// AND ONE OF THE THREE IS PRODUCT-CAUSED RATHER THAN SYNTHETIC. A second capture of the same address
// SUPERSEDES the first, which is exactly why the signup page replaces its form with the
// acknowledgment instead of leaving it beside it: a second submit kills the link the first one
// minted. So this walk subscribes twice on purpose and then opens the FIRST link, and the page it
// gets is the dead-link card. That refusal is the product's own rule, not a token this test invented.
//
// ---- WHAT THIS JOURNEY MAY NOT BE READ AS SAYING -----------------------------------------------
//
// NOT that a guest receives mail. `F-GROWTH-FAKE-MAIL`: the provider interface is bound to a
// deterministic fake in `Program.cs` and the transactional sender carries no SMTP dependency at all,
// so on the deployment no double-opt-in link is ever delivered and `/subscribe/confirm` cannot be
// reached by a real guest. The links here are read from the fixture's control surface the way
// `account-email-confirm` reads its six digits — from Node, never through the browser, so no
// credential can reach the artifact (C7). What this walk shows is that these pages, this client and
// these routes agree end to end. The delivery gap is recorded as a finding, not glossed.
//
// NOT that a guest can FIND the exit either. `pages/preferences/unsubscribe.vue` says in its own
// header that nothing links to it: the newsletter footer points at the preference centre instead, and
// the RFC 8058 URI is fixed to the API origin. A guest reaches this page only by constructing the
// URL, which is what this walk does — and it files that as a reachability finding (C3) rather than
// letting a green walk imply a door exists.
//
// ---- THE WALK PUTS THE LEVER BACK DOWN, AND THAT IS AN ASSERTION -------------------------------
//
// `growth.module` is deny-closed, so this journey has to pull it before a guest can join at all. It
// pulls it back down at the end and re-opens the same venue's signup page, which does two things at
// once: it proves the lever this walk pulled is load-bearing rather than decorative — everything
// above would read identically against a page that had stopped consulting the flag — and it leaves
// the world with no switch lit for whatever runs next.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip, flagRow } = require('../support/flags');
const world = require('../fixture/world');

const STORE = world.STORE_ID;
const MODULE_FLAG = 'growth.module';
const FIXTURE_API = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

/** The stranger. Not a fixture identity — nothing in the world knows this address before step 2. */
const GUEST_ADDRESS = 'nina.gjest@nordane.test';

/**
 * The links this guest would have found in their inbox, and the state of their row.
 *
 * Fetched from NODE and never through the browser. A confirm token and an unsubscribe token are
 * single-purpose credentials: a response the page received would be counted in `backendServed`, could
 * surface in `backendSample`, and would therefore land in a file people paste into reviews (C7). The
 * tokens are used to build URLs and are never returned to a caller that could put one in a step
 * `detail`.
 */
async function mailbox (address) {
  const response = await fetch(FIXTURE_API + '/__fixture/growth-links?address=' + encodeURIComponent(address));
  return await response.json();
}

/**
 * Arrive at a guest link the way a guest does — from OUTSIDE this app.
 *
 * The `about:blank` hop is not ceremony. Two confirm links differ only in their FRAGMENT, and a
 * browser treats a same-path fragment change as a SAME-DOCUMENT navigation: `mounted()` would not run
 * again, nothing would be posted, and the second link would be "checked" by a page still showing the
 * first link's answer. That is a green step asserting nothing, which is the failure shape this whole
 * suite exists to stop. A click in a mail client is always a fresh document load, and this is that.
 */
async function openFromMailbox (page, url) {
  await page.goto('about:blank');
  await page.goto(url);
}

/** What is left in the address bar after a page has stripped its own token out of it. */
async function visibleUrl (page) {
  return await page.evaluate(() => window.location.pathname + window.location.search + window.location.hash);
}

test(
  'A guest joins a venue\'s newsletter, confirms it from the link, and takes themselves back off it',
  journeyDetails({
    journey: 'growth-guest-lifecycle',
    surface: 'public',
    capabilities: [
      'platform.feature-flags.write',
      'growth.guest.module.gate',
      'growth.guest.subscribe',
      'growth.guest.confirm',
      'growth.guest.confirm.superseded-link',
      'growth.guest.confirm.replay',
      'growth.guest.unsubscribe',
      'growth.guest.unsubscribe.replay',
      'growth.consent.withdrawal'
    ]
  }),
  async ({ page, journey }) => {
    // Counted from the browser's own request log rather than from the fixture: the claim below is
    // about what these PAGES sent, and a fixture counter cannot tell a request that was never made
    // from one that was made to somewhere else.
    const guestCalls = [];
    // The FIRST link, held across the second capture so the superseded case can be opened later. A
    // token and nothing else — it is never returned from a step and never reaches the artifact (C7).
    let firstConfirmToken = null;
    page.on('request', (request) => {
      const match = /\/v1\/growth\/(stores\/\d+\/subscriptions|subscription-confirmations|unsubscribe)/.exec(request.url());
      if (match && request.method() === 'POST') {
        guestCalls.push({ route: match[1].replace(/stores\/\d+/, 'stores/{id}'), authorization: request.headers().authorization || null });
      }
    });

    await journey.step('an operator switches the newsletter module on for this venue', async () => {
      // Through the product, and first, because `growth.module` is deny-closed: at a venue nobody has
      // switched on there is no consent version in existence for a form to pin, so the signup page
      // draws no form at all and no lifecycle can begin. `/admin/feature-flags` is the only caller of
      // `PUT /stores/{id}/feature-flags` in the whole frontend, so pressing its button is what makes
      // this a capability rather than a curl.
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      await expect(flagRow(page, MODULE_FLAG).locator('.ff-row__badge')).toHaveText('Av');
      await turnOn(page, MODULE_FLAG);
      return MODULE_FLAG + ' on for store ' + STORE + ', from «Av»';
    });

    // ---- JOIN -----------------------------------------------------------------------------------
    await journey.step('the guest joins from the venue\'s public signup page', async () => {
      await page.goto('/subscribe/' + STORE);
      await expect(page.getByRole('heading', { name: 'Meld deg på nyhetsbrevet' })).toBeVisible({ timeout: 30000 });
      // Unticked on arrival, every time. A pre-ticked box is not an affirmative action under GDPR
      // art. 4(11) and would make the receipt this whole walk is about worthless.
      await expect(page.locator('[data-test="consent"] input')).not.toBeChecked();
      await page.locator('.gg-field input').fill(GUEST_ADDRESS);
      await page.locator('[data-test="consent"] input').check();
      await page.getByRole('button', { name: 'Meld meg på' }).click();

      await expect(page.locator('[data-test="accepted"] .gg-title'))
        .toHaveText('Vi har tatt imot forespørselen', { timeout: 15000 });
      // WHAT THE ACKNOWLEDGMENT REFUSES TO CLAIM, asserted by value rather than by presence: not
      // active yet, and nothing has been recorded as a consent. The capture endpoint answers 202
      // identically whether the address is new, pending or already verified, so a page that said
      // «you are subscribed» here would be claiming a state the response cannot support.
      await expect(page.locator('[data-test="accepted"] .gg-lede')).toHaveText(
        'Påmeldingen er ikke aktiv ennå. Den blir det først når den bekreftes fra innboksen til ' +
        'adressen du oppga.');
      return 'capture accepted; the page says the signup is NOT active yet';
    });

    await journey.step('nothing is consented yet, and the server agrees', async () => {
      // The page's sentence above is a claim about a row, so the row is read. `Pending` is the state
      // in which the venue may send this person exactly one thing — the confirmation — and nothing
      // else; a fixture that had jumped straight to Verified would make every assertion below
      // vacuous, because there would be no transition left for the confirm click to cause.
      const box = await mailbox(GUEST_ADDRESS);
      expect(box.state).toBe('Pending');
      expect(box.captures).toBe(1);
      // A pending capture has no way out yet. In the product no exit handle exists at this point
      // either — it is minted per dispatched delivery — so the ORDER here is the product's even
      // though the fixture's mint TIMING is a declared stand-in (see `fixture/growth.js`).
      expect(box.unsubscribeToken).toBe(null);
      expect(typeof box.confirmToken).toBe('string');
      firstConfirmToken = box.confirmToken;
      return 'contact Pending after 1 capture; a confirm link exists and an unsubscribe link does not';
    });

    await journey.shot('the acknowledgment, before anything is confirmed');

    // ---- THE FIRST REFUSAL: NO TOKEN AT ALL -----------------------------------------------------
    await journey.step('the confirm page opened WITHOUT a link does not confirm anything', async () => {
      // The commonest real failure on this page: the part after `#` is dropped when a link is copied
      // or forwarded. Provoked before the success so that «bekreftet» below cannot be a state this
      // page shows on arrival regardless.
      await openFromMailbox(page, '/subscribe/confirm');
      await expect(page.locator('[data-test="no-token"] .gg-title'))
        .toHaveText('Lenken er ufullstendig', { timeout: 30000 });
      await expect(page.locator('[data-test="confirmed"]')).toHaveCount(0);
      // NOTHING WAS POSTED. Not "the server refused it" — the page never asked, which is the only
      // state in which "this browser confirmed nothing" is true.
      expect(guestCalls.filter(c => c.route === 'subscription-confirmations')).toEqual([]);
      return 'no-token card; zero POSTs to /subscription-confirmations';
    });

    // ---- THE SECOND REFUSAL: A LINK THE PRODUCT ITSELF KILLED -----------------------------------
    await journey.step('the same guest signs up a second time, which supersedes the first link', async () => {
      // Not a contrivance — this is what a guest who is unsure whether the first one worked does, and
      // it is the reason the signup page REPLACES its form rather than leaving it beside the
      // acknowledgment. The pending invite is superseded and the first link dies at this instant.
      await page.goto('/subscribe/' + STORE);
      await page.locator('.gg-field input').fill(GUEST_ADDRESS);
      await page.locator('[data-test="consent"] input').check();
      await page.getByRole('button', { name: 'Meld meg på' }).click();
      await expect(page.locator('[data-test="accepted"]')).toBeVisible({ timeout: 15000 });

      const box = await mailbox(GUEST_ADDRESS);
      expect(box.captures).toBe(2);
      expect(box.state).toBe('Pending');
      // A NEW LINK, and the assertion is that it is a different one. Without this the step below
      // would be opening a link the second capture had left perfectly alive, and its refusal would
      // be about something else entirely.
      expect(box.confirmToken).not.toBe(firstConfirmToken);
      return 'second capture recorded; the contact is still Pending; the confirm link rotated';
    });

    await journey.step('THE SUPERSEDED LINK IS DEAD, and the page offers every reason it could be', async () => {
      // The first link, opened after the second capture. The refusal is the PRODUCT's rule rather
      // than a token this test made up, which is what makes this the strongest of the three.
      await openFromMailbox(page, '/subscribe/confirm#token=' + encodeURIComponent(firstConfirmToken));
      await expect(page.locator('[data-test="token-dead"] .gg-title'))
        .toHaveText('Lenken virker ikke lenger', { timeout: 30000 });
      await expect(page.locator('[data-test="confirmed"]')).toHaveCount(0);

      // AND IT DOES NOT SAY WHICH. Unknown, expired and superseded are one answer on the wire, so all
      // three are offered — a page that could tell them apart would let anybody holding a guessed
      // token test who is on the list. Asserted as the whole list, in order, rather than sampled.
      const reasons = (await page.locator('[data-test="token-dead"] .gg-list li').allTextContents())
        .map(text => text.replace(/\s+/g, ' ').trim());
      expect(reasons).toEqual([
        'den er allerede brukt, og da står du sannsynligvis på lista fra før',
        'den er eldre enn 30 dager',
        'du meldte deg på en gang til etterpå, og da ble den forrige lenken ugyldig'
      ]);
      // The server was asked and it refused; this is not the no-token branch a second time.
      expect(guestCalls.filter(c => c.route === 'subscription-confirmations').length).toBe(1);
      return '410 on the superseded link; three indistinguishable reasons offered, none picked';
    });

    await journey.shot('the superseded confirmation link');

    // ---- THE CONFIRM ----------------------------------------------------------------------------
    await journey.step('THE LIVE LINK CONFIRMS, and the page strips the credential out of the URL', async () => {
      const box = await mailbox(GUEST_ADDRESS);
      await openFromMailbox(page, '/subscribe/confirm#token=' + encodeURIComponent(box.confirmToken));

      await expect(page.locator('[data-test="confirmed"] .gg-title'))
        .toHaveText('Påmeldingen er bekreftet', { timeout: 30000 });
      await expect(page.locator('[data-test="confirmed"] .gg-lede')).toHaveText(
        'Du står nå på nyhetsbrevlista til stedet du meldte deg på. Det gjelder bare det ene stedet.');

      // THE STRIP, which is unfalsifiable anywhere but here. A single-use credential left in the
      // address bar of a page that stays open is a credential in every screenshot, every history
      // entry and everything the guest pastes when they ask the venue about it. `replaceState`
      // rewrites the current entry rather than adding one, so Back still leaves the page.
      expect(await visibleUrl(page)).toBe('/subscribe/confirm');
      return 'confirmed; the token is gone from the address bar';
    });

    await journey.step('the confirmation reached the row, and the fixture hands over an exit handle', async () => {
      const box = await mailbox(GUEST_ADDRESS);
      expect(box.state).toBe('Verified');
      // THE ONE STEP HERE THAT IS NOT THE PRODUCT'S. The contact is genuinely Verified — that is the
      // confirm click above doing its work. The exit credential appearing NOW is the fixture's
      // stand-in: the product mints one per dispatched delivery (`GrowthDispatchService.cs:465`),
      // and nothing on this branch dispatches, so a walk that waited for the real provenance could
      // not reach a withdrawal at all. Declared in `fixture/growth.js` and in the finding below.
      expect(typeof box.unsubscribeToken).toBe('string');
      return 'contact Verified; the fixture hands over an exit handle the product would mint at dispatch';
    });

    await journey.shot('the subscription, confirmed');

    await journey.step('OPENING THE SAME LINK AGAIN SHOWS THE SAME THING, not a failure', async () => {
      // A mail client that prefetches links, a guest who reloads, a forwarded message opened twice.
      // The replay is identical BY DESIGN — a 410 on the second read would tell somebody their own
      // confirmation had failed, and a different answer would make the route a membership oracle.
      const box = await mailbox(GUEST_ADDRESS);
      await openFromMailbox(page, '/subscribe/confirm#token=' + encodeURIComponent(box.confirmToken));
      await expect(page.locator('[data-test="confirmed"] .gg-title'))
        .toHaveText('Påmeldingen er bekreftet', { timeout: 30000 });
      // ...and the page says so out loud rather than leaving a guest to wonder whether they are now
      // on the list twice.
      await expect(page.locator('[data-test="confirmed"] .gg-quiet')).toHaveText(
        'Åpner du lenken igjen, ser du det samme. Du blir ikke meldt på to ganger.');
      const after = await mailbox(GUEST_ADDRESS);
      expect(after.state).toBe('Verified');
      expect(after.captures).toBe(2);
      return 'replay identical; still one Verified contact, still 2 captures';
    });

    // ---- THE THIRD REFUSAL, THEN THE WITHDRAWAL -------------------------------------------------
    await journey.step('an unsubscribe link nobody minted is refused', async () => {
      // Provoked on the withdrawal page before the real one, for the same reason as the two above:
      // «Du er meldt av» has to be an outcome this page can fail to reach.
      await openFromMailbox(page, '/preferences/unsubscribe?token=not-a-real-unsubscribe-handle');
      await expect(page.locator('[data-test="token-dead"] .gg-title'))
        .toHaveText('Lenken virker ikke lenger', { timeout: 30000 });
      await expect(page.locator('[data-test="done"]')).toHaveCount(0);
      // The contact is untouched. A page that had rendered its failure branch while still writing
      // would be the worst outcome on this surface.
      expect((await mailbox(GUEST_ADDRESS)).state).toBe('Verified');
      return 'dead-link card; the verified contact is untouched';
    });

    await journey.step('ONE CLICK, AND THEY ARE OUT — no confirmation step, by law', async () => {
      // The `?token=` form on purpose: this is the RFC 8058 one-click URI as a guest holds it, and
      // the page accepts the query for exactly that case. It unsubscribes ON ARRIVAL and asks nothing
      // first — RFC 8058 §1 says the act completes without a confirmation step, GDPR art. 7(3)
      // requires withdrawal to be as easy as consent, and markedsføringsloven § 15 requires a working
      // opt-out in every marketing message. An «are you sure?» here would be the dark pattern all
      // three exist to forbid.
      const box = await mailbox(GUEST_ADDRESS);
      await openFromMailbox(page, '/preferences/unsubscribe?token=' + encodeURIComponent(box.unsubscribeToken));

      await expect(page.locator('[data-test="done"] .gg-title'))
        .toHaveText('Du er meldt av', { timeout: 30000 });
      await expect(page.locator('[data-test="done"] .gg-lede'))
        .toHaveText('Det blir ikke sendt flere nyhetsbrev til deg fra dette stedet.');
      // THE SCOPE IS STATED, and it is the one thing a guest most often gets wrong: this is one
      // venue's list, not the platform.
      await expect(page.locator('[data-test="done"] .gg-body')).toHaveText(
        'Det gjelder dette ene stedet. Har du meldt deg på hos flere, må hvert av dem meldes av for seg.');
      // Stripped here too, and this is the token most likely to end up somewhere public — it is the
      // one that legitimately travels in a QUERY string, so it is the one that lands in history
      // entries and pasted messages.
      expect(await visibleUrl(page)).toBe('/preferences/unsubscribe');
      return 'withdrawn on arrival, nothing asked first; the token is gone from the address bar';
    });

    await journey.step('the withdrawal is the SERVER\'s state, not the page\'s optimism', async () => {
      const box = await mailbox(GUEST_ADDRESS);
      expect(box.state).toBe('Withdrawn');
      return 'contact Withdrawn';
    });

    await journey.shot('withdrawn');

    await journey.step('the unsubscribe link keeps working, because a provider may POST it unseen', async () => {
      // Idempotent by contract: a mailbox provider posts the `List-Unsubscribe` URI without a human
      // ever seeing the result, and a second POST that failed would be read by that provider as a
      // broken opt-out — which is what gets a sending domain penalised.
      const box = await mailbox(GUEST_ADDRESS);
      await openFromMailbox(page, '/preferences/unsubscribe?token=' + encodeURIComponent(box.unsubscribeToken));
      await expect(page.locator('[data-test="done"] .gg-title'))
        .toHaveText('Du er meldt av', { timeout: 30000 });
      expect((await mailbox(GUEST_ADDRESS)).state).toBe('Withdrawn');
      return 'replayed unsubscribe answers the same; still Withdrawn';
    });

    // ---- THE LEVER GOES BACK DOWN, AND THAT IS THE MUTATION -------------------------------------
    await journey.step('put the module switch back down, and the same venue goes dark', async () => {
      // Everything above would read identically against a signup page that had stopped consulting
      // the flag entirely, so the walk ends by moving the one row it moved at the start and watching
      // the same URL stop offering a form. Nothing else changed.
      //
      // It also leaves the world with no switch lit. A journey that ends with a lever up hands the
      // next run a venue no fixture reset in ITS setup put there.
      await page.goto('/admin/feature-flags');
      await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 30000 });
      await flip(page, 'off', MODULE_FLAG);
      await expect(flagRow(page, MODULE_FLAG).locator('.ff-row__badge')).toHaveText('Av');

      await page.goto('/subscribe/' + STORE);
      await expect(page.locator('[data-test="unavailable"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-test="consent"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Meld meg på' })).toHaveCount(0);
      return MODULE_FLAG + ' back to «Av»; the signup page draws no form; no lever left lit';
    });

    await journey.step('NO GUEST CALL EVER CARRIED A BEARER, and this browser has one', async () => {
      // `GrowthGuestService` is built with an empty initializer so it CANNOT attach a token, and the
      // property is unfalsifiable while nobody is signed in. The operator signed in at step one and
      // the session is still live — a venue's own staff open these links too, and a page that quietly
      // rode their admin token would answer differently for them than for the guest it was built for.
      //
      // Asserted over the whole log rather than over one call: three different routes on three
      // different pages, and it takes only one of them attaching a header to break the property.
      expect(guestCalls.map(call => call.route)).toEqual([
        'stores/{id}/subscriptions',
        'stores/{id}/subscriptions',
        'subscription-confirmations',
        'subscription-confirmations',
        'subscription-confirmations',
        'unsubscribe',
        'unsubscribe',
        'unsubscribe'
      ]);
      expect(guestCalls.filter(call => call.authorization !== null)).toEqual([]);
      return guestCalls.length + ' guest POSTs across 3 routes, not one Authorization header, ' +
        'with an admin session live';
    });

    await journey.step('what this walk does NOT show, recorded rather than glossed', () => {
      journey.finding('note',
        'no double-opt-in mail is sent AS CONFIGURED — which is a config posture, not a missing transport',
        'Worth stating precisely, because the milder wording («the code cannot send») is false of ' +
        'this branch and it is the gentler half of a go-live finding. `Program.cs:963-965` registers ' +
        'THREE providers — Fake, Smtp and a fully live Postmark HTTP client — and the deployment ' +
        'picks one through `Growth:MailProvider`. The committed `appsettings.json:176-177` pins ' +
        '`"Enabled": false` and `"MailProvider": "Fake"`, so as configured nothing leaves the ' +
        'process and `/subscribe/confirm` is unreachable by a real guest. ONE CONFIG KEY CHANGES ' +
        'THAT, with no code change and no deploy of new code. Read on the API\'s own ' +
        '`feature/restaurant-modules` @ 8e2b57de. The confirm and ' +
        'unsubscribe links this walk opened were read from the fixture\'s control surface, which is ' +
        'what a mailbox would have carried. So this journey is evidence that the two pages, the ' +
        'guest client and the three anonymous routes agree end to end — and is NOT evidence that a ' +
        'guest receives anything. FT-GROWTH\'s stated exit names a real mail from the ruled ' +
        'provider; that step is still owed and belongs to L-GROWTH-MAIL after D-MAIL.');
      journey.finding('defect',
        'nothing in the product links a guest to /preferences/unsubscribe',
        'The page\'s own header says so: the newsletter footer (`GrowthMarketingFooter`) links the ' +
        'preference centre instead, and the RFC 8058 one-click URI is fixed to the API origin, which ' +
        'answers POST only — a guest who long-presses that affordance and opens it in a browser gets ' +
        'a 405, which reads as a broken opt-out. This walk reached the page by constructing the URL, ' +
        'which is currently the only way to reach it (C3). The preference centre, which the footer ' +
        'DOES link, cannot open a session from the deployed origins at all (`F-PREF-UNREACHABLE`, ' +
        '`D-PREF-ORIGIN`) — so as deployed there is no surface from which a guest can take ' +
        'themselves off a list, which is the art. 7(3) obligation this module is built around. ' +
        'TWO INDEPENDENT BLOCKERS, and only the first is about mail: (1) no message is sent, so no ' +
        'guest holds either link; (2) even holding a valid one, the preference session cookie is ' +
        'HttpOnly+Secure+SameSite=Strict on the API origin and cannot cross okam.no -> ' +
        'okamapi.azurewebsites.net, while CORS is built with AllowAnyOrigin() and therefore cannot ' +
        'carry credentials at all. THE SECOND SURVIVES MAIL GOING LIVE — turning the provider on ' +
        'does not open this door.');
      journey.finding('note',
        'the exit credential this walk spends has fixture provenance, not the product\'s',
        'The product mints an unsubscribe token PER DISPATCHED DELIVERY inside the send loop ' +
        '(`GrowthDispatchService.cs:465`), each a fresh row with a 730-day expiry; this fixture ' +
        'mints one at confirm and never rotates it. So the state walked here — verified, holding an ' +
        'exit credential, zero messages ever dispatched — is one the product cannot produce. What ' +
        'the walk therefore proves is that the unsubscribe PAGE, the guest client and route #6 ' +
        'agree and that the withdrawal is idempotent; it does NOT prove a guest ever comes to hold ' +
        'such a token. Closing this means driving a real dispatch before the withdrawal, which ' +
        'needs the fixture\'s synthetic 209-recipient audience wired to the contact ledger first — ' +
        'a change that would move figures three other journeys assert by value, so it is named here ' +
        'rather than smuggled in. Declared at length in `test/e2e/fixture/growth.js`.');
      return '2 notes (mail is config-off, not code-absent; the exit token is fixture-minted), ' +
        '1 defect (no door to the exit, and one of its two blockers survives mail going live)';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED — the flow completed, so failing here would say the capability does
      // not work, which is false. The 404 and 410 are the dark-venue and dead-link probes this
      // journey performed on purpose and handled honestly on screen: counted, named, and not filed
      // as news.
      const noise = /favicon|Download the Vue Devtools|status of 404|status of 410/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here, during the operator detour, and identically in ' +
          'growth-guest-consent, growth-privacy-queue and the workforce journeys. It is AdminPage\'s ' +
          'login redirect being superseded by the storeId append, not anything on the guest pages.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the growth guest lifecycle journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' these pages\''
        : 'nothing';
    });
  }
);
