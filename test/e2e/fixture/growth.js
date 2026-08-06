// The Growth GUEST half of the fixture backend — the anonymous consent surface, and nothing else.
//
// TWO THINGS MAKE THIS FILE DIFFERENT FROM THE OTHER THREE, and both are contract rather than style:
//
//   1. NO AUTHENTICATION, AND NO TOKEN MAY ARRIVE. `GrowthGuestService` is constructed with an empty
//      initializer precisely so it CANNOT attach a bearer, because a venue's own staff open these
//      links too and a page that quietly rode their admin token would answer differently for them
//      than for the guest it was built for. These routes are therefore matched BEFORE the fixture's
//      auth wall, and the journey inspects the request headers itself — the fixture cannot prove a
//      negative for the page, so it records rather than enforces.
//   2. A DIFFERENT ERROR ENVELOPE. Growth does not use RFC 9457: the spec pins
//      `{ "error": { "code", "message", "traceId" } }` (`Models/Growth/GrowthErrorEnvelope.cs`), and
//      `GrowthApiError` reads `body.error.code`. A problem+json body here would leave every Growth
//      failure with `code: null` — silently, with no exception — and the page would stop being able
//      to tell "this venue has the module off" from "the server broke". So the envelope is written
//      the Growth way, and getting it wrong is exactly the drift this shape exists to catch.
//
// WHAT IT HOLDS OF THE CONTRACT:
//
//   • `POST .../subscriptions` ALWAYS answers 202 for a well-formed request. It never varies by
//     whether the address is new, already pending or already verified, because varying would make
//     the route an address-existence oracle — which is why the page after it may not say "check your
//     inbox" and says what was recorded instead.
//   • `consentTextVersionId` must be the id the consent-text read served. A capture pinned to
//     anything else is `growth.consent_text_unknown`, which is the refusal that makes the "display
//     one version, post another" bug impossible to ship quietly.
//   • A store with `growth.module` off answers 404 `growth.not_found`, deliberately the same answer
//     as a store that does not exist.
//
// ---- THE TWO ROUTES ADDED FOR THE LIFECYCLE WALK, AND WHAT THEY MODEL ---------------------------
//
// `POST /v1/growth/subscription-confirmations` (#2) and `POST /v1/growth/unsubscribe` (#6) were the
// only guest routes this fixture did not answer, which is why the plan carried `/subscribe/confirm`
// and `/preferences/unsubscribe` as `reachable · undriven`: both pages post on arrival, so against a
// fixture that 404s them the only state either could ever reach is the failure branch.
//
// NEITHER IS GATED ON `growth.module`, and that is contract rather than an oversight. The dark-store
// 404 belongs to the two routes that JOIN a list (the consent-text read and the capture); a guest who
// is already on one must be able to confirm and — above all — to LEAVE, whatever a venue has since
// done with its switches. A module gate on the way out would make withdrawal depend on the controller
// of the data, which is the one thing GDPR art. 7(3) does not allow.
//
// ⚠ WHERE THE HANDLES COME FROM, SAID PLAINLY. In the product both tokens travel by MAIL, and no mail
// leaves any process on this branch (`F-GROWTH-FAKE-MAIL`: the provider interface is bound to a
// deterministic fake). So the tokens are minted here and read back over `/__fixture/growth-links`,
// the way `/__fixture/confirmation-code` stands in for the account confirmation mail — a journey
// learns the link it would have been sent and learns nothing else. That models the WIRE, and a walk
// built on it may not be read as saying a guest receives anything: it says these pages, this client
// and these routes agree, which is the half that was never shown.
//
// ⚠ KNOWN DELTA — THE UNSUBSCRIBE TOKEN'S PROVENANCE IS A STAND-IN, NOT THE CONTRACT.
//
// This fixture mints it at CONFIRM, once, and never rotates it. THE PRODUCT DOES NOT DO THAT. Read
// on `feature/restaurant-modules` @ 8e2b57de:
//
//   `GrowthDispatchService.cs:465` mints one PER DISPATCHED DELIVERY, inside the send loop and
//   before the irreversible Submitting transition, via `GrowthPreferenceService.MintUnsubscribeToken-
//   Async` — which persists a NEW `GrowthPreferenceToken` row each time with a 730-day expiry
//   (`GrowthPreferenceService.cs:27`). One token per message, not one per contact.
//
// So the state this fixture puts a contact in — verified, holding an exit credential, with zero
// messages ever dispatched — is a state the product cannot produce. It is used anyway because the
// alternative is worse: the newsletter half of this fixture models an audience as a synthetic
// 209-recipient snapshot with a fixed watermark, unconnected to the contact ledger below, so routing
// a real dispatch through it would change figures three other journeys assert by value. The delta is
// declared here instead of being hidden behind a passing walk.
//
// WHAT THAT COSTS THE WALK, EXACTLY. `growth-guest-lifecycle` proves the unsubscribe PAGE, the guest
// client and route #6 agree, and that the withdrawal is idempotent. It does NOT prove a guest ever
// holds such a token, because on this branch nothing dispatches. Closing the delta means driving a
// dispatch before the withdrawal, which needs the audience snapshot wired to this ledger first.
//
// It is written here rather than through the fixture's unmodelled-refusal annotation, because that
// annotation carries a REFUSAL shape — `(status, code)` on an anchored route — and this is a
// provenance delta on a SUCCESS path, which that mechanism cannot express and would not check.
// (The annotation's own token is deliberately not spelled out above: `refusal-shapes.js` scans this
// file for it, and a mention inside prose is reported as an annotation somebody meant to write.)

const world = require('./world');

function fresh () {
  return {
    captures: [],
    // `addressLower -> contact`. The subscriber ledger this fixture keeps, in the only three states
    // a guest can put it in: Pending on capture, Verified on confirm, Withdrawn on unsubscribe.
    contacts: {},
    // Confirm tokens that were SUPERSEDED by a later capture for the same address. Kept rather than
    // dropped so a spent-then-superseded link answers the same 410 as an unknown one — the contract
    // is that unknown, expired and superseded are indistinguishable on the wire, and a fixture that
    // simply failed to find a superseded token would be right for the wrong reason.
    supersededConfirmTokens: {},
    seq: 0
  };
}

/** An opaque handle. Sequential rather than random so a failed run is reproducible. */
function mintToken (state, kind) {
  state.seq += 1;
  return 'gr-' + kind + '-' + state.seq + '-fixture';
}

/**
 * `GrowthPreferenceStateResponse` for one contact — the body `POST /v1/growth/unsubscribe` answers.
 *
 * The three flags are not independent and `utils/growth/guest.js` reads them in a fixed precedence:
 * suppression wins over consent, and an unverified contact is never an eligible recipient whatever
 * else is true. Answered whole so the page renders the server's state rather than its own optimism.
 */
function preferenceState (contact) {
  return {
    channel: 'Email',
    purpose: 'Newsletter',
    consented: contact.state === 'Verified',
    suppressed: contact.state === 'Withdrawn',
    reachable: contact.state === 'Verified'
  };
}

/** The Growth envelope. NOT problem+json — see the header. */
function growthError (ctx, status, code, message) {
  ctx.send(status, { error: { code, message, traceId: 'fixture-trace' } });
  return true;
}

// ---- the gate ----------------------------------------------------------------------------------
//
// `growth.module` IS RESOLVED, NOT ASSUMED. An earlier draft of this file answered for every store
// except one hard-coded dark id, which modelled a world with no flags in it — the exact defect a
// sweep found in six other journeys, and one that matters more here than anywhere: `growth.module`
// is deny-closed, so on a real venue that nobody has switched on, the guest signup page is dark and
// the walk that "proved" it works would have proved nothing.
//
// `ctx.flagEffective` is the shared per-store override table the operator switchboard writes through
// `PUT /stores/{id}/feature-flags`. Nothing here writes a flag.
const MODULE_FLAG = 'growth.module';

/**
 * The one refusal both guest routes give, for BOTH reasons.
 *
 * `growth.not_found` for a store with the module off is deliberately the same answer as for a store
 * that does not exist — the page may not tell a guest their link is wrong, because it cannot know.
 */
function dark (ctx) {
  return growthError(ctx, 404, 'growth.not_found', 'No newsletter here.');
}

function route (ctx) {
  const { method, body } = ctx;
  const state = ctx.state.growth;

  const consentText = /^\/v1\/growth\/stores\/([^/]+)\/consent-text$/.exec(ctx.path);
  if (consentText && method === 'GET') {
    if (!ctx.flagEffective(consentText[1], MODULE_FLAG)) { return dark(ctx); }
    // ONE response carrying the text and the version id TOGETHER, so a page cannot display one
    // version and pin another.
    ctx.send(200, world.GROWTH_CONSENT);
    return true;
  }

  const subscribe = /^\/v1\/growth\/stores\/([^/]+)\/subscriptions$/.exec(ctx.path);
  if (subscribe && method === 'POST') {
    if (!ctx.flagEffective(subscribe[1], MODULE_FLAG)) { return dark(ctx); }
    const email = ((body && body.email) || '').trim();
    if (!email) {
      return growthError(ctx, 400, 'growth.address_required', 'An address is required.');
    }
    if ((body && body.consentTextVersionId) !== world.GROWTH_CONSENT.consentTextVersionId) {
      return growthError(ctx, 400, 'growth.consent_text_unknown',
        'The consent text version this capture pins does not exist.');
    }
    state.captures.push({ email, captureSource: (body && body.captureSource) || null });

    // THE CAPTURE MINTS A FRESH CONFIRM LINK AND KILLS THE PREVIOUS ONE. That is why the signup page
    // replaces its form with the acknowledgment rather than leaving it beside it: a second submit
    // supersedes the pending invite, and the link the first one minted stops working from that
    // instant. Modelled here so the page's sentence is a claim about the product and not about prose.
    const key = email.toLowerCase();
    const existing = state.contacts[key];
    if (existing && existing.confirmToken) {
      state.supersededConfirmTokens[existing.confirmToken] = true;
    }
    state.contacts[key] = {
      email,
      storeId: subscribe[1],
      // A re-capture of an already-withdrawn address goes back to Pending: the withdrawal stands
      // until a fresh confirm click from the mailbox lifts it, which is exactly what the unsubscribe
      // page says on screen («det krever en ny bekreftelse fra innboksen din»).
      state: 'Pending',
      confirmToken: mintToken(state, 'confirm'),
      unsubscribeToken: existing ? existing.unsubscribeToken : null,
      consentTextVersionId: body.consentTextVersionId
    };

    // 202, invariantly. See the header.
    ctx.send(202, { status: 'accepted' });
    return true;
  }

  // #2 — spends the double-opt-in token. NOT gated on `growth.module`; see the header.
  if (ctx.path === '/v1/growth/subscription-confirmations' && method === 'POST') {
    const token = ((body && body.token) || '').trim();
    const contact = token && Object.values(state.contacts).find(c => c.confirmToken === token);
    if (!contact || state.supersededConfirmTokens[token]) {
      // ONE ANSWER FOR THREE CAUSES — unknown, expired, superseded. The page offers all three as
      // possible reasons rather than picking one, because a page that could tell them apart would be
      // a list-membership oracle for anybody holding a guessed token.
      return growthError(ctx, 410, 'growth.token_invalid', 'That link is no longer valid.');
    }
    // IDENTICAL ON EVERY REPLAY, and the token is deliberately NOT burned. A guest who reloads, or
    // whose mail client prefetched the link, must see what they saw the first time — a 410 on the
    // second read would tell somebody their own confirmation had failed. It also keeps the replay
    // indistinguishable from the first confirm, which is the anti-oracle property.
    if (contact.state !== 'Verified') {
      contact.state = 'Verified';
      // STAND-IN, and the header says why at length. The product mints one per DISPATCHED DELIVERY
      // (`GrowthDispatchService.cs:465`), each a fresh row with a 730-day expiry; nothing on this
      // branch dispatches, so the walk would have no exit credential at all without this. Minted at
      // confirm rather than at capture so that at least the ORDER is the product's: no exit handle
      // can exist for a contact who never verified.
      if (!contact.unsubscribeToken) { contact.unsubscribeToken = mintToken(state, 'unsub'); }
    }
    ctx.send(200, { status: 'confirmed' });
    return true;
  }

  // #6 — one-click unsubscribe, in its JSON-body shape. The token is the entire security boundary.
  if (ctx.path === '/v1/growth/unsubscribe' && method === 'POST') {
    const token = ((body && body.token) || '').trim();
    const contact = token && Object.values(state.contacts).find(c => c.unsubscribeToken === token);
    if (!contact) {
      return growthError(ctx, 410, 'growth.token_invalid', 'That link is no longer valid.');
    }
    // IDEMPOTENT, and it answers the resulting state rather than 410 on a replay. A mailbox provider
    // may POST this without a human ever seeing it, and a second POST that failed would be read by
    // that provider as a broken opt-out.
    contact.state = 'Withdrawn';
    ctx.send(200, preferenceState(contact));
    return true;
  }

  return false;
}

module.exports = { fresh, route };
