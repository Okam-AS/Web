// JOURNEY — one private booking, from the enquiry a member of the public sends to the statement the
// venue closes.
//
// ---- WHY THIS ONE EXISTS ----------------------------------------------------------------------
//
// Four Events journeys stand on this branch and they all walk the MIDDLE: a sent proposal read and
// accepted, a run sheet printed, a deposit flag armed. Neither END was ever walked. The enquiry is
// how a booking starts and the settled statement is how it ends, and between them sit two lever
// flips, two lifecycle transitions the guest owns and three the venue owns — none of which any
// artifact on this branch had ever seen connected.
//
// So the subject here is the CONNECTION, not any one screen. It is the reason nothing in this world
// is seeded: the event this journey settles is the event the guest created on the first screen, and
// every step is asked to name the thing the previous step produced — the reference the guest was
// given, the contact name they typed, the token the venue hands over, the content hash the guest's
// receipt binds to. A world seeded with an event would prove those screens render and nothing about
// whether they are the same booking.
//
// ---- THE OFF-FLAG ARM, AND WHY IT IS THE LOAD-BEARING HALF ------------------------------------
//
// `F-EV-ACCEPT-UNGATED` was open until today: the public accept and decline WROTE for a store that
// had never switched Events on. A venue that never bought the module — or turned it off — could
// still have its proposals accepted from the outside. It was closed in the service where the token
// resolves the store, and this walk is where that gate meets a browser.
//
// The arm is built to be non-vacuous, which on this branch means something specific: an absence
// assertion in a world that cannot produce presence is one of at least twenty-two shapes catalogued
// here this week that cannot fail. So the refusal and the success are THE SAME WALK — same token,
// same page, same form, same button, same identity typed into it — and they differ in exactly one
// variable, which is flipped through the operator's own lever and nowhere else:
//
//    off  ->  the answer is refused, no receipt, and the server's state is unmoved
//    on   ->  the same press produces the receipt
//
// The refusal is also asserted to be the RIGHT refusal. `EVENTS_PROPOSAL_NOT_FOUND` is deliberate —
// the same 404 an unknown link gets, so an anonymous caller cannot turn this surface into a roster
// of which venues bought the module — which means the guest sees the "no such offer" sentence and
// NOT the "unavailable" one. A journey that accepted either would pass against a page that had
// merely broken.
//
// ---- WHAT IT DOES NOT CLAIM -------------------------------------------------------------------
//
// THE ENQUIRY WRITE IS NOT GATED, and this journey asserts that it succeeds. That is not an
// oversight and not a defect being papered over: `F-EV-INQUIRY-UNGATED` is open as a PRODUCT
// question, because the enquiry form is plausibly how a venue discovers the module at all, and
// whether the answer is "refuse the write" or "the form should not be reachable" is a ruling nobody
// has made. What this journey does instead of asserting a gate that does not exist is walk the
// consequence: the guest is handed a reference, and the venue's own pipeline — on the very next
// step, with the same store — is dark. That is the finding stated as a thing a person can see.
//
// AND WHICH GATE IT EXERCISED IS THE ARTIFACT'S ANSWER, NOT THIS HEADER'S. This paragraph used to
// read "AND IT IS A FIXTURE RUN", which was true of every run that could then be made and is no
// longer true of every run that can. The walk is now selected in both modes, so read `backend` in the
// artifact:
//
//   "backend": "fixture"   the gate exercised is the fixture's MODEL of
//                          `EventsProposalService.GuardStoreEnabledAsync`. What such a run proves is
//                          that the journey reaches a browser, that every screen in it exists and
//                          connects, and that the refusal lands where a guest can read it.
//   "backend": "live"      the gate exercised is the .NET service itself, on a real database, and
//                          `backendBuild` names the build that answered.
//
// Those are different claims and neither replaces the other — which is why `support/artifact-store.js`
// files them under separate keys instead of letting the cheaper run overwrite the dearer one.
//
// ---- THE TWO WAYS THIS FILE COULD ONLY EVER BE RUN ONCE ---------------------------------------
//
// Both were found by `L-LIVE-WORLD-DISCOVER` from outside its own subject, and neither was visible
// as a failure, which is exactly why they stood.
//
// A WRITTEN-DOWN EXPIRY IS NOT A PASSING ASSERTION, IT IS A COUNTDOWN. This file used to draft its
// offer with `expiryDay: '2026-11-30'`. The send preflight refuses a version whose expiry is not in
// the future — `test/e2e/fixture/events.js`, «The proposal expiry must be in the future», and
// `EventsProposalService` refuses it the same way — so on 30 November 2026 this journey turns red
// EVERYWHERE, in one step, on a day nobody changed anything. The first instinct will be to hunt a
// regression in the Events module, and there will not be one to find: the only thing that moved is
// the calendar. A date literal in a test is not evidence that something works, it is a promise that
// it will stop. The expiry and the event date are therefore both computed from the run's own clock,
// which is the same thing an operator does — nobody types a date that has already gone.
//
// A CONSTANT CONTACT NAME MAKES THE WALK A FIXTURE TEST WEARING A JOURNEY'S NAME. Four steps below
// find this booking's pipeline row by the contact name the guest typed, and that name used to be the
// constant «Nina Nordmann». Against a freshly reset fixture that locates exactly one row and the
// journey passes. Against any world that KEEPS what the previous run wrote — which is every real
// world — the second run creates a second row with the same name, `toHaveCount(1)` fails, and if it
// did not, the walk would go on against whichever of the two rows Playwright happened to pick. So
// the name, the address, the occasion and the invoice number all carry a per-run tag now.
//
// THE SHAPE IS THE SIBLING'S, DELIBERATELY. `events-guest-proposal.spec.js` solved this first and
// this file copies its `RUN` token and its `daysFromNow` helper spelling for spelling, because two
// journeys that tag their subjects differently is the same predicate collision this estate keeps
// paying for, wearing test clothes. `test/journey-rerunnability.test.js` holds both files to it.
//
// ---- WHAT USED TO STOP THIS JOURNEY FROM RUNNING LIVE, AND WHAT REPLACED IT --------------------
//
// This section used to say: "`STORE` below is still `world.STORE_ID` — the FIXTURE's store 42 — and
// the tag is still `@fixture`, so live mode filters this walk out before either fault could matter.
// The sibling could discover its venue because it signs in FIRST; this one cannot without reordering
// itself, because its opening move is a public enquiry sent BEFORE anybody signs in."
//
// THE DIAGNOSIS WAS RIGHT AND THE PROPOSED REMEDY WAS WRONG. Reordering the walk would have paid for
// the venue with the finding: the enquiry arriving BEFORE anybody signs in is what makes the next two
// steps mean anything, because it is how a member of the public reaches a venue that has not opened
// the module. A version that signed in first to learn its own store id would still show a dark
// pipeline, but it would no longer show a STRANGER's enquiry landing in one.
//
// So the venue is discovered OUT OF BAND instead, before the browser opens, and the browser's walk is
// untouched — same order, same first navigation, same anonymous enquiry. `support/venue.js` asks the
// backend on `apiBaseUrl` which store the demo manager administers, over the same `/user/login` the
// login modal itself posts. That is the harness standing in for the one thing it honestly is: THE
// VENUE HANDING OUT ITS OWN LINK. Nothing in the product mints `/events/inquiry/{store}` for a
// stranger — a venue publishes it — so there is no browsing path to it to walk, and inventing one
// would be inventing a surface that does not ship.
//
// AND IT IS ONE PATH IN BOTH WORLDS, which is the property that keeps this file honest. The fixture
// answers `/user/login` with a manager whose `adminIn` carries store 42; a live WebApi answers with
// whatever store the seeded `StoreAdmins` row names. The walk below therefore does not know or care
// which backend it is on, and there is no `@live` branch in it to drift from the `@fixture` one.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip, flagRow } = require('../support/flags');
const { venueStoreId } = require('../support/venue');

const JOURNEY = 'events-enquiry-to-settlement';

// The two module switches this walk pulls. Spelled as LITERALS rather than imported from
// `fixture/world.js`, and the file no longer imports that module at all: a flag key is a property of
// the PRODUCT — `Services/Events/EventsFeatureFlags.cs` contributes both — and reaching into the
// fixture for one would make a live run quote a stand-in for a fact the backend owns.
const EVENTS_CORE_FLAG = 'Events.Core';
const EVENTS_SETTLEMENT_FLAG = 'Events.Settlement';

// The venue this booking is for, and the store the host signs in to administer. ONE store on both
// sides is the point: the enquiry, the lever, the proposal and the statement all name it, so a walk
// that quietly changed venues halfway would fail rather than read as a success. Resolved in the first
// step below rather than written here — see the header.
let STORE = null;

// What makes this run's booking findable, and findable ONLY as itself. Spelled exactly as
// `events-guest-proposal.spec.js` spells it, on purpose: one convention for per-run subjects across
// the Events family, not two that drift.
const RUN = Date.now().toString(36) + Math.random().toString(16).slice(2, 6);

/** A day in the future, as the date inputs want it. Computed, because a written-in expiry expires. */
function daysFromNow (days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// What the guest types. Every field a later step LOOKS THIS BOOKING UP BY carries the run tag: the
// contact name is what four steps below locate the pipeline row with, and a constant there finds one
// row on a reset fixture and two on the second run against a world that kept the first. The company
// and the dietary message are deliberately NOT tagged — nothing searches by them, they are asserted
// inside a row this walk has already opened, and tagging them would only make the artifact harder to
// read.
const GUEST = {
  occasion: 'Julebord ' + RUN,
  date: daysFromNow(120),
  guests: '40',
  from: '18:00',
  to: '23:30',
  name: 'Nina Nordmann ' + RUN,
  email: 'nina+' + RUN + '@nordane.test',
  phone: '91000002',
  company: 'Nordane AS',
  message: 'To gjester har cøliaki. Vi trenger et glutenfritt alternativ.'
};

// The offer the venue drafts, in the units the OPERATOR types — kroner, not minor units. 40 × 895,00
// is 35 800,00, and that figure is asserted on three screens: the version, the guest's offer and the
// closed statement. The deposit is deliberately 0: a private booking billed on invoice is exactly the
// shape that ends in a settled statement, and a zero-deposit acceptance confirms the booking outright
// rather than waiting for a money path this world does not hold.
//
// `expiryDay` is sixty days out from the run's own clock rather than a written date — see the header.
// The figure it becomes on the wire is the START of that day at the VENUE (`proposalExpiryParam`
// through `zonedMidnightToUtc`), never midnight where the laptop is.
const OFFER = {
  currency: 'NOK',
  minimumSpend: '30000',
  roomFee: '4000',
  deposit: '0',
  expiryDay: daysFromNow(60),
  terms: 'Avbestilling senere enn 14 dager før arrangementet faktureres i sin helhet.',
  lineKind: 'Package',
  lineDescription: 'Julebordmeny',
  lineQuantity: '40',
  lineUnitPrice: '895',
  lineVat: '0.25'
};

// The venue's own invoice, put on the statement. The reference carries the run tag for a reason that
// is the venue's rather than the harness's: an invoice number is unique in a set of books, and two
// runs against one world filing the same number against two different bookings is a thing an
// accountant would have to explain. Nothing searches by it — it is asserted inside the statement this
// walk opened — so this is hygiene rather than a lookup key.
const INVOICE = { reference: 'F-' + RUN, amount: '35800', note: 'Faktura sendt etter arrangementet' };

// Copy a person reads, matched as copy rather than as translation keys — the same rule the sibling
// Events journeys follow. These must red when the SENTENCE changes, because the sentence is what the
// venue and the guest actually get.
const NOT_ENABLED = 'ikke slått på for dette utsalgsstedet';
const ENQUIRY_SENT = 'Takk. Forespørselen er sendt.';
const REFUSED_HEADING = 'Svaret ble ikke registrert';
// The two guest refusal sentences, and telling them apart is the point. The gate answers the SAME
// 404 an unknown link gets, so the guest must land on the "no such offer" sentence; the
// "unavailable" one belongs to `EVENTS_DISABLED`, which this route deliberately never emits.
const REFUSED_NOT_FOUND = 'Vi finner ikke det lenken peker på';
const REFUSED_UNAVAILABLE = 'Dette er ikke tilgjengelig akkurat nå';

/** kr 35 800,00 as the page formats it, compared on digits — NBSP grouping differs between ICU builds. */
function digitsOf (text) {
  return String(text).replace(/[^\d,]/g, '');
}

test(
  'A private booking runs from a public enquiry to a settled statement, and the accept refuses while the module is off',
  journeyDetails({
    journey: JOURNEY,
    surface: 'public+admin',
    // NOT `@fixture` any more. That tag means "this journey depends on state only the fixture has",
    // and after the venue moved to `support/venue.js` this walk depends on none: every subject it
    // names — the booking, the offer, the token, the statement — is created by the walk itself, and
    // the one thing it does not create is asked of whichever backend is answering. In live mode this
    // is now selected; in fixture mode it still runs alongside the rest, against the same code.
    tag: ['@live'],
    capabilities: [
      'events.inquiry.public-create',
      'events.proposal.author',
      'events.proposal.send',
      'events.guest.proposal.accept',
      'events.proposal.accept.store-gate',
      'events.settlement.close',
      'events.settlement.line',
      'events.settlement.reconcile',
      'events.module.store-gate',
      'platform.feature-flags.write'
    ]
  }),
  async ({ page, journey }) => {
    // A whole lifecycle is longer than the single-screen journeys this default was set for: this one
    // compiles two routes cold, signs in, and makes eleven writes. Raised here rather than in the
    // config so no other journey's budget moves.
    test.setTimeout(6 * 60 * 1000);

    let token = null;
    let reference = null;

    // ---- 0. WHICH VENUE ------------------------------------------------------------------------
    await journey.step('the venue whose public link this booking arrives on', async () => {
      // Out of band and BEFORE the browser opens on anything, so the walk itself starts where it
      // always started: at a public form, with nobody signed in. See the header for why this is the
      // venue publishing its own address rather than the harness reading the answer to a question a
      // later step is supposed to earn.
      STORE = await venueStoreId(journey.meta.apiBaseUrl);
      expect(STORE).toBeTruthy();
      return 'store ' + STORE + ', as ' + journey.meta.apiBaseUrl + ' reports the demo manager administers';
    });

    // ---- 1. THE ENQUIRY, WITH THE MODULE OFF ---------------------------------------------------
    await journey.step('a guest fills in the venue\'s public enquiry form', async () => {
      await page.goto('/events/inquiry/' + STORE);
      await expect(page.getByRole('heading', { name: 'Forespørsel om arrangement' })).toBeVisible({ timeout: 60000 });
      await page.getByLabel('Anledning').fill(GUEST.occasion);
      await page.getByLabel('Dato').fill(GUEST.date);
      await page.getByLabel('Antall gjester').fill(GUEST.guests);
      await page.getByLabel('Fra').fill(GUEST.from);
      await page.getByLabel('Til').fill(GUEST.to);
      await page.getByLabel('Navn', { exact: true }).fill(GUEST.name);
      await page.getByLabel('E-post', { exact: true }).fill(GUEST.email);
      await page.getByLabel('Telefon').fill(GUEST.phone);
      await page.getByLabel('Firma').fill(GUEST.company);
      await page.getByLabel('Er det noe mer stedet bør vite?').fill(GUEST.message);
      return GUEST.name + ' <' + GUEST.email + '>, ' + GUEST.guests + ' gjester on ' + GUEST.date;
    });

    await journey.step('the enquiry is accepted even though the venue has Events switched off', async () => {
      // ASSERTED AS IT IS, NOT AS IT OUGHT TO BE. `F-EV-INQUIRY-UNGATED` is open for a ruling: the
      // public enquiry write carries no store gate, so this succeeds against a store whose every
      // admin read answers 404. The next two steps show what that costs.
      await page.getByRole('button', { name: 'Send forespørselen' }).click();
      const sent = page.locator('[data-test="sent"]');
      await expect(sent).toBeVisible();
      await expect(sent).toContainText(ENQUIRY_SENT);
      // The reference the guest is told to keep. It is the join key for the rest of this walk.
      reference = (await sent.locator('.eg-ref').textContent()).replace('Referanse:', '').trim();
      expect(reference.length).toBeGreaterThan(10);
      return 'the guest holds reference ' + reference;
    });

    await journey.shot('the enquiry the guest sent');

    // ---- 2. THE VENUE, STILL DARK --------------------------------------------------------------
    await journey.step('sign in as the host (99999999 / 123123)', async () => {
      await page.goto('/admin/events-pipeline');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 60000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/events-pipeline' });
      return 'landed on /admin/events-pipeline as the host of store ' + STORE;
    });

    await journey.step('the venue cannot see the enquiry it has already been sent', async () => {
      // THE CONSEQUENCE OF THE UNGATED WRITE, shown rather than argued. The guest was given a
      // reference thirty seconds ago; the venue's pipeline is dark, and it is dark for a
      // CONFIGURATION reason the page says out loud rather than reporting an empty list.
      const notice = page.locator('.ev-pipeline__notice');
      await expect(notice).toBeVisible({ timeout: 60000 });
      await expect(notice).toContainText(NOT_ENABLED);
      await expect(page.locator('.ev-pipeline__row')).toHaveCount(0);
      journey.finding(
        'note',
        'the public enquiry write is not gated, and the guest holds a reference the venue cannot see',
        'F-EV-INQUIRY-UNGATED, open for a product ruling. POST /events/inquiries carries no ' +
        'store-scoped Events.Core gate, so this walk created event ' + reference + ' for store ' +
        STORE + ' while every admin read for that store answered 404 EVENTS_DISABLED. The guest was ' +
        'told to keep a reference for a booking nobody at the venue can open. This journey asserts ' +
        'what is true rather than the gate a ruling might add.'
      );
      return 'the pipeline reads: ' + (await notice.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('the venue, dark, with the enquiry already filed');

    // ---- 3. THE LEVER --------------------------------------------------------------------------
    await journey.step('the host switches Events on for this venue', async () => {
      // Through the product's own switchboard, never a seeded row — see support/flags.js.
      await turnOn(page, EVENTS_CORE_FLAG);
      await page.goto('/admin/events-pipeline');
      return EVENTS_CORE_FLAG + ' on for store ' + STORE;
    });

    await journey.step('the guest\'s enquiry is now in the pipeline, under the name they typed', async () => {
      // THE JOIN. The row is found by the guest's OWN contact name, and that name carries THIS run's
      // tag — so a page rendering the standing event fails here, and so does a page rendering the
      // booking a PREVIOUS run of this same journey left behind. `toHaveCount(1)` is the assertion
      // doing that work: with a constant name it would have been the first of two on a second run.
      const row = page.locator('.ev-pipeline__row', { hasText: GUEST.name });
      await expect(row).toHaveCount(1, { timeout: 60000 });
      await expect(row).toContainText('Forespørsel');
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible();
      // And the detail is the same booking: the message the guest typed came with it.
      await expect(page.locator('.ev-journey__facts')).toContainText(GUEST.company);
      return 'opened: ' + (await row.textContent()).replace(/\s+/g, ' ').trim();
    });

    // ---- 4. THE OFFER --------------------------------------------------------------------------
    await journey.step('the venue drafts the offer', async () => {
      await page.getByRole('button', { name: 'Lag tilbudsutkast' }).click();
      const form = page.locator('.ev-page__form', { has: page.getByRole('heading', { name: 'Nytt tilbudsutkast' }) });
      await expect(form).toBeVisible();
      await form.getByLabel('Valuta').fill(OFFER.currency);
      await form.getByLabel('Minimumsforbruk').fill(OFFER.minimumSpend);
      await form.getByLabel('Lokalleie').fill(OFFER.roomFee);
      await form.getByLabel('Depositum kreves').fill(OFFER.deposit);
      await form.getByLabel('Utløper dag').fill(OFFER.expiryDay);
      await form.getByLabel('Vilkår').fill(OFFER.terms);
      await form.getByLabel('Type').selectOption(OFFER.lineKind);
      await form.getByLabel('Beskrivelse').fill(OFFER.lineDescription);
      await form.getByLabel('Antall').fill(OFFER.lineQuantity);
      await form.getByLabel('Enhetspris').fill(OFFER.lineUnitPrice);
      await form.getByLabel('MVA-sats').fill(OFFER.lineVat);
      await form.getByRole('button', { name: 'Lagre utkast' }).click();

      // The version the SERVER priced. The operator typed a unit price and a quantity and no total,
      // so a total on screen is the server's arithmetic and not the form's.
      const version = page.locator('.ev-journey__version').first();
      await expect(version).toBeVisible();
      await expect(version).toContainText('Versjon 1');
      const total = version.locator('.ev-journey__facts dd').first();
      expect(digitsOf(await total.textContent())).toBe('35800,00');
      return 'version 1 drafted at ' + (await total.textContent()).trim();
    });

    await journey.step('the venue sends it, and gets a link to hand the guest', async () => {
      await page.getByRole('button', { name: 'Send versjon 1' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Tilbudet er sendt.', { timeout: 30000 });

      // The handover address, read off the page the way a member of staff copies it — dispatch is
      // dark by default, so this link IS the delivery mechanism today.
      const handover = page.locator('.ev-journey__handover code').first();
      await expect(handover).toBeVisible();
      const link = (await handover.textContent()).trim();
      expect(link).toContain('/events/proposal/');
      token = link.split('/events/proposal/')[1];
      expect(token.length).toBeGreaterThan(8);
      // The token's VALUE is kept out of this step's detail — the JSON gets its shape, not its
      // bytes. The SCREENSHOT of the venue's own screen does carry it, and that is deliberate rather
      // than an oversight: the pipeline prints these links on purpose because dispatch is dark, and
      // keeping them off the KITCHEN's paper is the run-sheet journey's whole subject. The token here
      // belongs to a throwaway world that `/__fixture/reset` destroys.
      return 'a proposal link was minted (' + token.length + ' characters, not echoed into this detail)';
    });

    await journey.shot('the sent offer in the venue\'s pipeline');

    // ---- 5. THE OFF-FLAG ARM -------------------------------------------------------------------
    await journey.step('the host switches Events back OFF for this venue', async () => {
      // The one variable. Everything else about the next two steps is identical.
      await page.goto('/admin/feature-flags');
      await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 60000 });
      await flip(page, 'off', EVENTS_CORE_FLAG);
      await expect(flagRow(page, EVENTS_CORE_FLAG).locator('.ff-row__badge')).toHaveText('Av');
      return EVENTS_CORE_FLAG + ' off for store ' + STORE;
    });

    await journey.step('the guest opens the offer and answers it — and the answer is refused', async () => {
      await page.goto('/events/proposal/' + token);
      // The offer still READS: `GetPublicAsync` carries no store refinement, which is a separate open
      // finding. What matters here is that the guest reaches the same page with the same offer on it,
      // so the refusal below cannot be a page that failed to load.
      await expect(page.locator('.eg-title')).toHaveText(GUEST.occasion, { timeout: 60000 });
      expect(digitsOf(await page.locator('.eg-sums__figure').first().textContent())).toBe('35800,00');

      const form = page.locator('.eg-form').first();
      await form.locator('input[type="text"]').fill(GUEST.name);
      await form.locator('input[type="email"]').fill(GUEST.email);
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();

      const refusal = page.locator('[data-test="refusal"]');
      await expect(refusal).toBeVisible();
      await expect(refusal).toContainText(REFUSED_HEADING);
      // THE RIGHT REFUSAL, not merely a refusal. The gate answers the same 404 an unknown link gets,
      // so a guest must not be told the venue's configuration — and a run where this arrived as
      // EVENTS_DISABLED would be a different product decision reaching the guest.
      await expect(refusal).toContainText(REFUSED_NOT_FOUND);
      await expect(refusal).not.toContainText(REFUSED_UNAVAILABLE);
      // NOTHING WAS RECORDED.
      await expect(page.locator('[data-test="accepted"]')).toHaveCount(0);
      return (await refusal.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('the refusal a guest reads while the module is off');

    await journey.step('and the server\'s state is unmoved: the offer is still answerable', async () => {
      // A refusal that had written half of an acceptance would leave the version un-answerable on
      // reload. This is the negative half of the write assertion, asked of a fresh read.
      await page.reload();
      await expect(page.getByRole('button', { name: 'Godta tilbudet' })).toBeVisible();
      await expect(page.locator('[data-test="accepted"]')).toHaveCount(0);
      return 'the accept control is still offered after the refusal';
    });

    // ---- 6. THE SAME WALK, WITH THE FLAG ON ----------------------------------------------------
    await journey.step('the host switches Events on again', async () => {
      await page.goto('/admin/feature-flags');
      await expect(page.locator('.ff-page__title')).toBeVisible({ timeout: 60000 });
      await flip(page, 'on', EVENTS_CORE_FLAG);
      await expect(flagRow(page, EVENTS_CORE_FLAG).locator('.ff-row__badge')).toHaveText('På');
      return EVENTS_CORE_FLAG + ' on for store ' + STORE;
    });

    await journey.step('the guest presses the same button on the same offer, and it is accepted', async () => {
      await page.goto('/events/proposal/' + token);
      await expect(page.locator('.eg-title')).toHaveText(GUEST.occasion, { timeout: 60000 });
      const form = page.locator('.eg-form').first();
      await form.locator('input[type="text"]').fill(GUEST.name);
      await form.locator('input[type="email"]').fill(GUEST.email);
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();

      const receipt = page.locator('[data-test="accepted"]');
      await expect(receipt).toBeVisible();
      await expect(page.locator('[data-test="refusal"]')).toHaveCount(0);
      const facts = (await receipt.locator('dd').allTextContents()).map(t => t.trim());
      // The version the guest answered, and the content hash the server settled at send and
      // re-verified at acceptance — the receipt is bound to the bytes that were on the screen.
      expect(facts[0]).toBe('1');
      expect(facts[1]).not.toBe('–');
      const ref = (await receipt.locator('.eg-ref').textContent()).trim();
      expect(ref).toMatch(/Referanse: [0-9a-f]{8,}/);
      return 'accepted version ' + facts[0] + ' at ' + facts[1];
    });

    await journey.shot('the guest\'s acceptance receipt');

    await journey.step('the page never sent a bearer token', async () => {
      // The security posture the guest client's separation exists for, asserted on the traffic of a
      // real reload rather than on the class that made it.
      const authed = [];
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

    // ---- 7. THE TAIL ---------------------------------------------------------------------------
    await journey.step('the venue sees the booking confirmed by the guest\'s own answer', async () => {
      await page.goto('/admin/events-pipeline');
      const row = page.locator('.ev-pipeline__row', { hasText: GUEST.name });
      await expect(row).toHaveCount(1, { timeout: 60000 });
      // Confirmed, not merely Accepted: the offer required no deposit, so the acceptance itself
      // promoted the booking — and the transition log says WHO did each half.
      await expect(row).toContainText('Bekreftet');
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible();
      const activity = page.locator('.ev-journey__section').last();
      await expect(activity).toContainText('T5');
      await expect(activity).toContainText('T8');
      return 'the pipeline row reads Bekreftet, with T5 (Guest) and T8 (System) in the activity log';
    });

    await journey.step('the settlement is dark behind its own flag, and says so', async () => {
      // `Events.Settlement` is a SECOND deny-closed flag and it gates the read as well as the
      // writes. "Core on, money machine closed" is the ordinary state of a pilot venue, and the page
      // distinguishes it from "there is no statement yet" — two absences that mean different things.
      const settlement = page.locator('.ev-journey__section', { hasText: 'Oppgjør' }).first();
      await expect(settlement).toContainText(NOT_ENABLED);
      return 'the settlement panel reads the gated sentence, not the empty one';
    });

    await journey.step('the host opens the settlement machine for this venue', async () => {
      await turnOn(page, EVENTS_SETTLEMENT_FLAG);
      await page.goto('/admin/events-pipeline');
      const row = page.locator('.ev-pipeline__row', { hasText: GUEST.name });
      await expect(row).toHaveCount(1, { timeout: 60000 });
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible();
      return EVENTS_SETTLEMENT_FLAG + ' on for store ' + STORE;
    });

    await journey.step('service starts, and the event is closed after it', async () => {
      await page.getByRole('button', { name: 'Start service' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Service er startet.', { timeout: 30000 });
      await page.getByRole('button', { name: 'Lukk arrangementet' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Arrangementet er lukket.', { timeout: 30000 });
      // Closing GENERATES the statement — it is not created by anybody typing on it.
      const settlement = page.locator('.ev-journey__section', { hasText: 'Oppgjør' }).first();
      await expect(settlement).toContainText('Draft');
      return 'the event is Settling and an empty Draft statement exists';
    });

    await journey.step('the venue puts its invoice on the statement', async () => {
      await page.getByRole('button', { name: 'Legg til oppgjørslinje' }).click();
      const form = page.locator('.ev-page__form', { has: page.getByRole('heading', { name: 'Legg til oppgjørslinje' }) });
      await expect(form).toBeVisible();
      await form.getByLabel('Beløp').fill(INVOICE.amount);
      await form.getByLabel('Referanse').fill(INVOICE.reference);
      await form.getByLabel('Merknad').fill(INVOICE.note);
      await form.getByRole('button', { name: 'Legg til linjen' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Linjen er lagt til i oppgjøret.', { timeout: 30000 });

      const settlement = page.locator('.ev-journey__section', { hasText: 'Oppgjør' }).first();
      await expect(settlement).toContainText(INVOICE.reference);
      // UNVERIFIED until a reconcile has fetched the truth. An unverified line must not read as a
      // matched one, and the truth column is a dash rather than a repeat of the recorded figure.
      await expect(settlement).toContainText('Unverified');
      return 'line 1: ' + INVOICE.reference + ' at ' + INVOICE.amount + ', Unverified';
    });

    await journey.step('the statement is reconciled, then closed', async () => {
      await page.getByRole('button', { name: 'Avstem oppgjøret' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Oppgjøret er avstemt.', { timeout: 30000 });
      const settlement = page.locator('.ev-journey__section', { hasText: 'Oppgjør' }).first();
      await expect(settlement).toContainText('Reconciled');
      await expect(settlement).toContainText('Matched');

      await page.getByRole('button', { name: 'Lukk oppgjøret' }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Oppgjøret er lukket.', { timeout: 30000 });
      return 'reconciled with no mismatched lines, then closed';
    });

    // ---- 8. THE END OF THE WALK ----------------------------------------------------------------
    await journey.step('the booking is settled, and the statement carries the venue\'s own figure', async () => {
      const settlement = page.locator('.ev-journey__section', { hasText: 'Oppgjør' }).first();
      await expect(settlement).toContainText('Closed');
      const figures = await settlement.locator('.ev-journey__facts dd').allTextContents();
      // `Linjesum` — the server's own sum of the line magnitudes. Nothing on this page nets anything
      // off it, because the wire carries no sign convention that would say which kinds subtract.
      expect(digitsOf(figures[1])).toBe('35800,00');
      // The closing is stamped with the person who did it, not with the system.
      expect(figures[4]).not.toBe('–');

      const row = page.locator('.ev-pipeline__row', { hasText: GUEST.name });
      await expect(row).toContainText('Oppgjort');
      return 'the statement is Closed at ' + figures[1].trim() + ' and the booking reads Oppgjort';
    });

    await journey.shot('the settled statement');

    await journey.step('every refusal in this run is one the journey asked for', () => {
      // THIS WALK IS MADE OF REFUSALS, so the usual move — excluding «status of 404» from the console
      // noise filter — would be excluding the subject. Each failed request is instead matched against
      // the set of refusals this journey drove on purpose, and anything else fails the step. That
      // turns a blanket exclusion into an assertion, which is the difference between a journey that
      // ignores its own 404s and one that knows what they were.
      const asked = [
        // the pipeline list and the store-wide notification health, while Events.Core was down
        /\/events\/admin\/\d+\/events(\?|$)/,
        /\/events\/admin\/\d+\/notifications\/health$/,
        // the settlement facet, behind the separate deny-closed Events.Settlement flag
        /\/events\/admin\/\d+\/events\/\d+\/settlement$/,
        // the run sheet: this booking never had one generated, and the facet's own 404 says so
        /\/events\/admin\/\d+\/events\/\d+\/run-sheet$/,
        // THE GATE. The one write refusal, and the reason this journey exists.
        /\/events\/proposals\/[^/]+\/accept$/
      ];
      const unexpected = journey.failedRequests.filter(
        request => !(request.status === 404 && asked.some(pattern => pattern.test(request.url))));
      expect(unexpected, 'a failed request this journey did not ask for').toEqual([]);

      const gateRefusals = journey.failedRequests.filter(
        request => /\/events\/proposals\/[^/]+\/accept$/.test(request.url));
      // Exactly one: the off-flag press. A second would mean the on-flag press was refused too, and
      // the arm would be comparing two refusals rather than a refusal against a success.
      expect(gateRefusals).toHaveLength(1);
      return journey.failedRequests.length + ' refusals, all asked for; ' +
        'the accept was refused exactly once, while the flag was off';
    });

    await journey.step('what the browser said while this ran', () => {
      // `status of 404` is excluded only because the step above accounted for every one of them
      // individually. A 500, a 400 or anything else still lands as a defect.
      const noise = /favicon|Download the Vue Devtools|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));

      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in margin-recipe-to-margin, ' +
          'growth-privacy-queue, workforce-flag-lever and workforce-schedule-publish. It is ' +
          'AdminPage\'s login redirect being superseded by the storeId append, not anything on these ' +
          'pages. Recorded so it is not re-diagnosed from here.');
      }
      const real = errors.filter(text => !shellRedirect.test(text));
      for (const error of real) {
        journey.finding('defect', 'browser error during the enquiry-to-settlement walk', error);
      }
      return real.length ? real.length + ' recorded as findings' : 'nothing beyond the shell redirect';
    });
  }
);
