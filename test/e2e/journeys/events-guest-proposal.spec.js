// JOURNEY — a guest reads the offer their venue sent them, and accepts it.
//
// This is the public shape: no authentication, no admin shell, no store context on the guest's half.
// The page is reached by a token in the URL, exactly as `EventsEmailNotificationDelivery.ComposeLink`
// mails it, and its reader is a member of the public who has never seen this product.
//
// It matters that this is a SEPARATE shape from the admin journey. The guest pages have been driven
// by little but their own unit tests; the one thing those cannot check is the thing that makes the
// page a security boundary — that it does not carry a bearer token. The artifact's request log is the
// record of what the page sent.
//
// ---- WHY THIS JOURNEY WAS REWRITTEN, AND WHAT CHANGED -----------------------------------------
//
// It used to open `/events/proposal/fixture-proposal-open` and assert `44 800,00`, three lines,
// version `2` and the content hash `b7d3f1a29c4e5806`. Every one of those is a property of the
// FIXTURE that minted them and of nothing else. Against any other world the journey either fails for
// a reason that says nothing about the product or — worse — passes while asserting about a booking
// nobody made. That is `F-PROBE-ROOT-WRONG-WORLD` in miniature: the journey and the world drift apart
// and nothing says so. A hard-coded id also silently stops testing anything the moment the seed
// changes: it becomes a test of the fixture rather than of the product.
//
// So it no longer knows a single one of those values. It DISCOVERS them, from the world under test,
// through the product:
//
//   the venue      whichever store the admin shell resolved for the signed-in host — read out of the
//                  same state `pages/admin/events-pipeline.vue` reads it from, never pinned to 42.
//   the booking    created here, by the guest, on that venue's own public enquiry form. Its occasion
//                  and contact name carry a per-run tag, so the pipeline row this walk opens is THIS
//                  walk's booking and cannot be a standing event that happens to be on screen.
//   the offer      drafted and sent through the venue's own pipeline. The operator types unit prices;
//                  every figure asserted afterwards is the SERVER's arithmetic over them.
//   the token      read off `.ev-journey__handover` the way a member of staff copies it — dispatch is
//                  dark by default, so that link IS the delivery mechanism today.
//   the version    read off the version panel the venue is looking at.
//   the hash       read off the guest's own offer page, BEFORE the acceptance that binds to it.
//
// The claims are then CROSS-SURFACE EQUALITIES — what the guest is shown is what the venue sent —
// which is a stronger statement than any literal could make, and it is true in every world rather
// than in one. The old file's "version 2" is the only claim that lost something: it distinguished
// «the token answers with the version it was minted for» from «the token answers with the current
// version», and that needs a world holding two sent versions. This walk makes one, so the assertion
// is now the honest weaker one — the version the guest answers is the version the venue sent — and
// the two-version case is named in a finding at the foot of this file rather than faked with a
// seeded token.
//
// ---- DISCOVERY THAT CANNOT FALL BACK ----------------------------------------------------------
//
// A discovery with a default is a hard-coded literal with extra steps. `discover()` below refuses to
// invent: when the venue's screen carries no handover link, no version head or no content hash, the
// walk STOPS and the artifact's `error` names which of them was missing. That is proved rather than
// asserted — with the lever step removed the pipeline is dark, the discovery comes up empty and the
// run reds at the discovery rather than proceeding against a token nobody minted.
//
// ---- WHAT IT NEEDS FROM A WORLD ---------------------------------------------------------------
//
// A store, a host who administers it, and the `Events.Core` lever. Nothing else — no seeded event, no
// seeded proposal, no seeded token — which is what makes this the one journey of its family that can
// go live against the world `test/e2e/scripts/live-world.sh` already builds. It still carries
// `@fixture` because no live run has been made yet: the tag is a claim about evidence rather than an
// intention, and it moves when there is a live artifact to move it with.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

// The lever's catalog key. NOT a world literal: the flag board pins all eighteen keys in order and
// the live catalog was confirmed to be exactly those, so `Events.Core` is the same string in every
// world this journey can run against. A key is a name in the product; an id is a row in a database.
const EVENTS_CORE = 'Events.Core';

// What makes this run's booking findable, and findable ONLY as itself. A constant contact name — the
// shape the sibling lifecycle journey uses — locates one row on a freshly reset fixture and TWO rows
// on the second run against a live database that keeps what the first run wrote. This tag is the
// difference between a journey that can be re-run against a real world and one that can be run once.
const RUN = Date.now().toString(36) + Math.random().toString(16).slice(2, 6);

/** A day in the future, as the date inputs want it. Computed, because a written-in expiry expires. */
function daysFromNow (days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// What the guest types into the venue's public form.
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

// What the venue types into the draft, in the units the OPERATOR uses — kroner, not minor units. No
// total is typed anywhere: 40 × 895,00 is the server's arithmetic and this walk never states it. All
// four money columns are deliberately non-zero and deliberately different from one another, so a page
// that rendered the right figure in the wrong column fails rather than passes.
const OFFER = {
  currency: 'NOK',
  minimumSpend: '30000',
  roomFee: '4000',
  deposit: '5000',
  expiryDay: daysFromNow(60),
  terms: 'Avbestilling senere enn 14 dager før arrangementet faktureres i sin helhet.',
  lineKind: 'Package',
  lineDescription: 'Julebordmeny',
  lineQuantity: '40',
  lineUnitPrice: '895',
  lineVat: '0.25'
};

/**
 * Money as digits alone. NBSP grouping and currency placement differ between the two surfaces and
 * between ICU builds, and neither of those is this journey's claim; the figure is.
 */
function digitsOf (value) {
  return String(value).replace(/[^\d,]/g, '');
}

const textOf = element => element.textContent();

/**
 * Reads one thing THE WORLD UNDER TEST produced, and refuses to invent one.
 *
 * The whole point of this file is that it holds none of its own ids, and the failure mode that would
 * quietly restore them is a discovery that falls back to a default when it finds nothing. So there is
 * no default here: an empty discovery throws, naming what was missing and where it was looked for,
 * and the artifact carries that sentence as the run's error.
 */
async function discover (what, locator, read) {
  const found = await locator.count();
  if (found === 0) {
    throw new Error(
      'DISCOVERY CAME UP EMPTY: ' + what + '. This journey holds no fallback for it on purpose — a ' +
      'default here would let the walk pass against a world that never produced the thing it claims ' +
      'to have read. Nothing was asserted and nothing was invented.');
  }
  const value = String(await read(locator.first())).trim();
  if (!value) {
    throw new Error('DISCOVERY CAME UP BLANK: ' + what + ' is on screen but carries no text.');
  }
  return value;
}

test(
  'A guest reads the offer their venue just sent and accepts it, and the receipt names what was on screen',
  journeyDetails({
    journey: 'events-guest-proposal-accept',
    surface: 'public+admin',
    capabilities: [
      'events.guest.proposal.read',
      'events.guest.proposal.accept',
      'events.inquiry.public-create',
      'events.proposal.author',
      'events.proposal.send'
    ]
  }),
  async ({ page, journey }) => {
    // Three routes compile cold in this walk and it makes six writes. Raised here rather than in the
    // config so that no other journey's budget moves.
    test.setTimeout(6 * 60 * 1000);

    let storeId = null;
    let token = null;
    let sentVersionNo = null;
    let venueFigures = null;
    let venueLineSums = null;
    let displayedHash = null;

    // ---- THE VENUE ------------------------------------------------------------------------------
    await journey.step('sign in as the venue\'s host (99999999 / 123123)', async () => {
      // Landed on the switchboard rather than on the pipeline, which would be the more obvious door.
      // The pipeline is gated and the lever below has not been pulled yet, so opening it here would
      // fan out two reads that answer 404 EVENTS_DISABLED — correct product behaviour that would
      // arrive in THIS journey's artifact as failed requests and console errors, and a reader would
      // have to work out that the noise is a gate doing its job before they could trust anything else
      // in the file. The privacy-queue journey opens the same way for the same reason.
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 60000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      return 'landed on /admin/feature-flags';
    });

    await journey.step('discover WHICH venue this host administers, rather than assuming one', async () => {
      // The same resolution `pages/admin/events-pipeline.vue` performs: the selected store if the
      // operator picked one, otherwise the first store the account administers. Read out of the
      // persisted Vuex state the shell itself wrote, so this is the venue the page is about to use
      // and not a second opinion about it. A journey pinning 42 here would be asserting about a store
      // that need not exist in the world it is running against.
      storeId = await page.evaluate(() => {
        const raw = window.localStorage.getItem('state');
        if (!raw) { return null; }
        const state = JSON.parse(raw);
        if (state.selectedAdminStore) { return String(state.selectedAdminStore); }
        const admin = (state.currentUser && state.currentUser.adminIn) || [];
        return admin.length ? String(admin[0].id) : null;
      });
      if (!storeId) {
        throw new Error(
          'DISCOVERY CAME UP EMPTY: the signed-in account administers no store, so there is no venue ' +
          'for this booking. Nothing was assumed in its place.');
      }
      return 'the shell resolved store ' + storeId;
    });

    await journey.step('the host switches Events on for this venue', async () => {
      // Through the product's own switchboard, never a seeded row — see support/flags.js. Every
      // per-store flag on this branch is deny-closed, so a walk that skipped this would be walking a
      // surface a real venue refuses.
      await turnOn(page, EVENTS_CORE);
      return EVENTS_CORE + ' on for store ' + storeId;
    });

    // ---- THE BOOKING ----------------------------------------------------------------------------
    await journey.step('a guest sends the venue an enquiry through its public form', async () => {
      await page.goto('/events/inquiry/' + storeId);
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
      await page.getByRole('button', { name: 'Send forespørselen' }).click();

      const sent = page.locator('[data-test="sent"]');
      await expect(sent).toBeVisible();
      const reference = await discover(
        'the reference the guest is told to keep, on the enquiry confirmation',
        sent.locator('.eg-ref'), textOf);
      // Its SHAPE, not its bytes — the same rule the handover line follows below. Against a live
      // world this string is a real booking's public reference, and an artifact is a file somebody
      // else reads; the run is evidence that one was minted and handed over, which does not require
      // publishing it.
      return 'the guest holds a ' + reference.replace(/\D/g, '').length +
        '-digit-bearing reference, not echoed into this detail';
    });

    await journey.step('the venue opens the booking under the name the guest typed', async () => {
      // THE JOIN, and the reason that name carries a per-run tag: this row is THIS walk's booking. A
      // page rendering a standing event instead fails here rather than passing on somebody else's.
      await page.goto('/admin/events-pipeline');
      const row = page.locator('.ev-pipeline__row', { hasText: GUEST.name });
      await expect(row).toHaveCount(1, { timeout: 60000 });
      await row.click();
      await expect(page.locator('.ev-journey')).toBeVisible();
      await expect(page.locator('.ev-journey__facts')).toContainText(GUEST.company);
      return 'opened the pipeline row for ' + GUEST.name;
    });

    // ---- THE OFFER ------------------------------------------------------------------------------
    await journey.step('the venue drafts the offer and the server prices it', async () => {
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

      // Proposal versions carry a version head; the deposits section reuses the block class and does
      // not, which is what keeps this locator off a deposit row.
      const version = page.locator('.ev-journey__version', { has: page.locator('.ev-journey__version-head') }).first();
      await expect(version).toBeVisible();
      const head = await discover('the version number on the venue\'s own panel',
        version.locator('.ev-journey__version-head strong'), textOf);
      const numbered = /(\d+)/.exec(head);
      if (!numbered) {
        throw new Error('DISCOVERY CAME UP EMPTY: the version panel head reads "' + head +
          '" and carries no version number to read.');
      }
      sentVersionNo = numbered[1];
      return 'the venue is looking at ' + head.replace(/\s+/g, ' ').trim();
    });

    await journey.step('the venue sends it, and hands over the address the guest will open', async () => {
      // Located by the version the previous step DISCOVERED, not by «1»: on a world where this event
      // already carried drafts the button says something else, and this walk must follow it.
      await page.getByRole('button', { name: 'Send versjon ' + sentVersionNo }).click();
      await expect(page.locator('.ev-page__toast')).toContainText('Tilbudet er sendt.', { timeout: 30000 });

      const version = page.locator('.ev-journey__version', { has: page.locator('.ev-journey__version-head') }).first();
      const link = await discover(
        'the guest address on the venue\'s handover line, after the send',
        version.locator('.ev-journey__handover code'), textOf);
      if (!link.includes('/events/proposal/')) {
        throw new Error('DISCOVERY READ THE WRONG THING: the handover line reads "' + link +
          '", which is not a proposal address. A deposit address is the other link this panel can ' +
          'carry, and it is the run-sheet journey\'s subject rather than this one\'s.');
      }
      token = link.split('/events/proposal/')[1];
      if (!token || token.length < 8) {
        throw new Error('DISCOVERY CAME UP EMPTY: the proposal address "' + link +
          '" carries no token after /events/proposal/.');
      }

      // The four money columns AND the line sums, as the venue's own screen states them. Everything
      // the guest is shown is compared against these rather than against a number written in here.
      venueFigures = (await version.locator('.ev-journey__facts dd').allTextContents())
        .slice(0, 4).map(digitsOf);
      venueLineSums = (await version.locator('.ev-journey__table tbody tr td:last-child').allTextContents())
        .map(digitsOf);
      if (!venueLineSums.length) {
        throw new Error('DISCOVERY CAME UP EMPTY: the sent version shows no priced lines to compare.');
      }

      // The token's VALUE stays out of this detail — the JSON gets its shape, not its bytes. The
      // screenshot of the venue's own screen does carry it, deliberately: the pipeline prints these
      // links on purpose because dispatch is dark, and keeping them off the KITCHEN's paper is the
      // run-sheet journey's subject rather than this one's.
      return 'version ' + sentVersionNo + ' sent; a ' + token.length + '-character address handed over; ' +
        venueLineSums.length + ' priced line(s); figures ' + venueFigures.join(' / ');
    });

    await journey.shot('the sent offer, on the venue\'s screen');

    // ---- THE GUEST ------------------------------------------------------------------------------
    await journey.step('the guest opens the address and is shown WHAT THE VENUE SENT', async () => {
      await page.goto('/events/proposal/' + token);
      // The occasion the guest typed on the enquiry form, carried through the whole booking. Exact
      // equality rather than a substring: this title is the one thing on the page that says which
      // booking is being read, and a substring of a per-run tag could match by accident.
      await expect(page.locator('.eg-title')).toHaveText(GUEST.occasion, { timeout: 60000 });

      const guestFigures = (await page.locator('.eg-sums__figure').allTextContents()).map(digitsOf);
      // Compared as SETS, because the two surfaces order their columns differently by design and a
      // reordering is not a defect; a figure that changed between them is. The total is then also
      // compared positionally, since both templates put it first, so a swap between the total and any
      // other column still fails.
      expect(guestFigures.slice().sort()).toEqual(venueFigures.slice().sort());
      expect(guestFigures[0]).toBe(venueFigures[0]);
      // No currency warning: the version carried a currency code, so the figures are denominated.
      // This absence is checkable against THE PAGE and not against the world — the send preflight
      // refuses a version with no currency, so no reachable world can put the warning here; what it
      // can fail on is the page ceasing to read `currencyCode` off the response, which would withhold
      // every figure above. Recorded as what it is rather than counted as evidence about a server.
      await expect(page.locator('[data-test="no-currency"]')).toHaveCount(0);

      const guestLineSums = (await page.locator('.eg-line__sum').allTextContents()).map(digitsOf);
      expect(guestLineSums).toEqual(venueLineSums);

      // The venue's own words, rendered as TEXT on a public page. `v-text` is what makes that true
      // and also what strips the template's indentation, so this is exact rather than trimmed: a
      // leading space here is the regression the events-guest lane fixed by hand in a browser.
      const terms = await page.locator('.eg-terms').textContent();
      expect(terms).toBe(OFFER.terms);

      return guestLineSums.length + ' line(s) and ' + guestFigures.length +
        ' money columns, every one of them equal to the venue\'s screen';
    });

    await journey.step('discover the reference the guest is shown, before answering anything', async () => {
      // The content hash the backend settles at send. It is on the page BEFORE the acceptance, which
      // is the only reason the receipt's binding can be checked at all: read afterwards it would be
      // the receipt agreeing with itself.
      const printed = await discover('the content hash printed on the guest\'s offer',
        page.locator('[data-test="reference"]'), textOf);
      const hash = /([0-9a-f]{8,})/i.exec(printed);
      if (!hash) {
        throw new Error('DISCOVERY CAME UP EMPTY: the guest\'s reference line reads "' + printed +
          '" and carries no content hash.');
      }
      displayedHash = hash[1];
      return 'the guest is shown a ' + displayedHash.length + '-character reference';
    });

    await journey.shot('the offer as the guest reads it');

    await journey.step('the accept form refuses an incomplete identity', async () => {
      // The backend validates neither field and writes both onto the receipt verbatim, so this page
      // is the only thing standing between «a receipt naming somebody» and «a receipt naming nobody».
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();
      const problems = page.locator('[data-test="accept-problems"]');
      await expect(problems).toBeVisible();
      // Still no receipt: the refusal is local and nothing was sent.
      await expect(page.locator('[data-test="accepted"]')).toHaveCount(0);
      return (await problems.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.step('the guest accepts the offer', async () => {
      const form = page.locator('.eg-form').first();
      await form.locator('input[type="text"]').fill(GUEST.name);
      await form.locator('input[type="email"]').fill(GUEST.email);
      await page.getByRole('button', { name: 'Godta tilbudet' }).click();
      await expect(page.locator('[data-test="accepted"]')).toBeVisible();
      // Read out of the page rather than off a status code: a refusal and an acceptance are told
      // apart here by which card the guest is looking at.
      await expect(page.locator('[data-test="refusal"]')).toHaveCount(0);
      return 'accepted as ' + GUEST.name;
    });

    await journey.step('the receipt names the version the VENUE sent and the reference the GUEST saw', async () => {
      const receipt = page.locator('[data-test="accepted"]');
      const facts = (await receipt.locator('dd').allTextContents()).map(fact => fact.trim());
      // The version the guest answered is the version the venue sent — read off two different
      // screens, neither of them written down in this file.
      expect(facts[0]).toBe(sentVersionNo);
      // An instant, in the reader's own zone with the zone named on it. The page prints an en dash
      // when it has none, and an en dash is not an instant.
      expect(facts[1]).not.toBe('–');
      expect(facts[1].length).toBeGreaterThan(4);

      // THE BINDING. The receipt's reference must be the hash that was on the screen the guest read,
      // not merely hash-shaped: `EventsProposalService` settles it at send and re-verifies it at
      // acceptance, and a receipt bound to anything else is a receipt for a different offer. The
      // needle is the full discovered hash, so it cannot be satisfied by a coincidence inside some
      // other identifier on the line.
      const printed = (await receipt.locator('.eg-ref').textContent()).trim();
      expect(printed).toContain(displayedHash);
      return 'version ' + facts[0] + ' at ' + facts[1] + ', bound to the reference shown before the click';
    });

    await journey.step('the accept and decline controls are gone afterwards', async () => {
      // The offer is still shown; only the answering is over. A page that hid the offer would be
      // withdrawing the evidence the guest just bound themselves to.
      await expect(page.getByRole('button', { name: 'Godta tilbudet' })).toHaveCount(0);
      const stillThere = (await page.locator('.eg-line__sum').allTextContents()).map(digitsOf);
      expect(stillThere).toEqual(venueLineSums);
      return 'no accept control; the offer is still rendered in full';
    });

    await journey.shot('the acceptance receipt');

    await journey.step('the page never sent a bearer token', async () => {
      // The security posture the whole `events-guest-client` separation exists for. A venue's own
      // staff open these links too — this browser is signed in as the host right now, which makes the
      // assertion stronger than it was when nobody was — and a page that quietly rode their admin
      // token would answer differently for them than for the guest it was built for. Asserted on the
      // traffic of a real reload rather than on the class that made it.
      const authed = [];
      page.on('request', (request) => {
        if (request.url().includes('/events/') && request.headers().authorization) {
          authed.push(request.method() + ' ' + request.url());
        }
      });
      await page.reload();
      await expect(page.locator('.eg-title')).toBeVisible();
      expect(authed).toEqual([]);
      return 'no Authorization header on any /events/ request, from a browser that holds one';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would claim the capability does
      // not work, which is false. The router's «Navigation cancelled» pair is the ADMIN SHELL's login
      // redirect racing itself and appears identically in journeys that touch nothing this one
      // touches; filing it against the guest page would send somebody to read the wrong file.
      const noise = /favicon|Download the Vue Devtools/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(line => !noise.test(line));
      const shell = errors.filter(line => shellRedirect.test(line));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in the privacy-queue and workforce ' +
          'journeys. It is AdminPage\'s login redirect being superseded by the storeId append, not ' +
          'anything on the guest proposal page.');
      }

      // The browser also logs a bare «Failed to load resource … 404» for every 404, with no URL on
      // the line, so those cannot be judged from the console text alone — which is the same trap as
      // reading a refusal off a status code. They are judged from the requests instead. The pipeline
      // detail fans out five reads and two of them answer 404 BY DESIGN on this walk: the run sheet
      // has its own absence dialect (`EVENTS_RUNSHEET_NOT_FOUND` — none has been generated) and the
      // settlement is behind the second, deny-closed `Events.Settlement` flag this walk never pulls.
      // Anything else that failed is this walk's own and is filed as a defect.
      const answeredAbsence = /\/(run-sheet|settlement)$/;
      const byDesign = journey.failedRequests.filter(r => r.status === 404 && answeredAbsence.test(r.url));
      const unexplained = journey.failedRequests.filter(r => !(r.status === 404 && answeredAbsence.test(r.url)));
      if (byDesign.length) {
        journey.finding('note',
          'the pipeline detail answers 404 on two facets, and both are the product answering',
          byDesign.map(r => r.method + ' ' + r.url + ' -> ' + r.status).join('; ') +
          '. The page renders «no run sheet yet» and the gated-settlement sentence rather than an ' +
          'error, so these are answered absences and not faults. Recorded because a reader counting ' +
          'console 404s would otherwise have to re-derive that.');
      }
      for (const request of unexplained) {
        journey.finding('defect', 'a request failed during the guest proposal journey',
          request.method + ' ' + request.url + ' -> ' + (request.status || request.failure));
      }
      const consoleOwn = errors.filter(line => !shellRedirect.test(line) && !/Failed to load resource/i.test(line));
      for (const error of consoleOwn) {
        journey.finding('defect', 'browser error during the guest proposal journey', error);
      }
      return shell.length + ' shell-redirect, ' + byDesign.length + ' answered-absence 404 (both notes), ' +
        (unexplained.length + consoleOwn.length) + ' unexplained';
    });

    await journey.step('the two-version claim this rewrite gave up, and why', () => {
      journey.finding('note',
        'no browser evidence exists that a proposal token answers with the version it was MINTED for',
        'The file this replaced asserted version «2» against a seeded token, which is the only way to ' +
        'hold two sent versions today: the e2e fixture refuses a second proposal version once an ' +
        'event is in ProposalSent (T4 from ProposalSent is not modelled), so no walk can make one. ' +
        'The claim that needs it — that a token answers with its own version rather than the current ' +
        'one — is therefore unproven by any browser run, on either backend. Named here rather than ' +
        'restored as a literal, because a literal would have asserted it against the fixture that ' +
        'invented it.');
      return 'recorded as a note';
    });
  }
);
