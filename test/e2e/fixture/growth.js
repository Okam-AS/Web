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

const world = require('./world');

function fresh () {
  return { captures: [] };
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
    // 202, invariantly. See the header.
    ctx.send(202, { status: 'accepted' });
    return true;
  }

  return false;
}

module.exports = { fresh, route };
