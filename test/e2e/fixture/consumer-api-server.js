// The throwaway backend the CONSUMER checkout journey runs against.
//
// Sibling of api-server.js (which serves the Nuxt 2 admin app). This one answers the ConsumerWeb
// (Nuxt 3) checkout: store, cart, payment methods, the Company Meals funding surface, and cart
// completion. Node's `http` and nothing else — no dependency, no container, no SQL.
//
// IT HOLDS THE CONTRACT, NOT JUST THE SHAPES. Everything below that could be waved through is
// enforced instead, because each one is a claim the client makes that no unit test can check:
//
//   • `Idempotency-Key` on the quote mutation. Missing -> 400 naming the precondition, exactly as
//     MealsControllerBase.TryGetIdempotencyKey does. Repeated with the same key -> the SAME token
//     re-derived, and the allowance reserved ONCE.
//   • `reservationToken` on cart completion for a CompanyAccount cart. Absent, unknown, expired,
//     already bound, wrong owner, wrong store, wrong currency, or a cart total over the reserved
//     cap -> the order is CANCELLED and the completion refused with the stable MEALS_* reason, the
//     same order of checks CartService.PromoteToOrder + MealsFundingAuthority.ValidateAndBindAsync
//     run in. That guard is the entire point of the lane, so a fixture that skipped it would prove
//     nothing.
//   • `Authorization: Bearer <token>` on every route here. Missing -> 401.
//   • A quote is refused when the cart total exceeds the remaining allowance. v1 funds an order
//     FULLY or not at all — there is no split tender in the backend and there is none here.
//   • `supersedesToken` on a re-quote releases the reservation it names — and ONLY when that token is
//     this user's, still Reserved and unexpired. A quote that names nothing releases nothing, which is
//     what keeps a genuine second cart paying for the allowance it takes.
//
// WHAT IT DOES NOT DO: it is not a model of the backend. It holds no menu, no pricing engine, no
// journal, no statement run. Anything a journey wants true it seeds here explicitly.

const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const world = require('./consumer-world');

const PORT = Number(process.env.E2E_CONSUMER_FIXTURE_PORT || 4020);

const { BEARER, USER_ID, STORE_ID, COMPANY_ID, CURRENCY, ALLOWANCE_MINOR, MEALS_MODULE_ENABLED, MEALS_ORDERING_ENABLED, store, user, seedCart, withCalculations, company } = world;

function freshState (allowanceMinor, gate) {
  return {
    // The `Features:Meals` host-config gate every route below resolves through. See consumer-world.js
    // for why it is host config and not a per-store flag, and why no page can move it. `ordering` is
    // ANDed with `module` on read, exactly as `MealsFeatureGate.IsOrderingEnabled` does, so a world
    // that turned ordering on over a dark module is not a world this fixture can be put into.
    meals: {
      module: gate && gate.module !== undefined ? !!gate.module : MEALS_MODULE_ENABLED,
      ordering: gate && gate.ordering !== undefined ? !!gate.ordering : MEALS_ORDERING_ENABLED
    },
    // The member's remaining company contribution for the period. A quote reserves against it.
    remainingAllowanceMinor: Number.isFinite(allowanceMinor) ? allowanceMinor : ALLOWANCE_MINOR,
    // reservationId -> reservation. `token` is held so the fixture can hash-match like the API does.
    reservations: {},
    // Idempotency-Key -> reservationId, so a replayed key re-derives the SAME token.
    quoteKeys: {},
    orders: {},
    // Server-side order events, the shape CartService writes into EventLogs. A refused funding bind
    // lands here, which is where a reader learns WHY a cancelled order was cancelled.
    events: [],
    cart: null,
    seq: 0,
    // Every request this fixture answered, and how many. The journey's wrong-world guard reads the
    // count: a run that produced no traffic here was talking to some other API.
    served: 0,
    requests: []
  };
}

let state = freshState();

const nextId = (prefix) => prefix + '-' + (++state.seq);

function send (res, status, body, extraHeaders) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Idempotency-Key, If-Match, ClientPlatform, Language, ClientAppVersion, ClientFeatures, SelectedTheme',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Cache-Control': 'no-store'
  }, extraHeaders || {}));
  res.end(payload);
}

/** RFC 9457 problem+json in the shape MealsProblemDetails emits (`code` is the stable member). */
function problem (res, status, code, detail) {
  send(res, status, {
    type: 'https://okam.no/problems/meals/' + String(code).toLowerCase(),
    title: status === 409 ? 'Conflict' : status === 404 ? 'Not Found' : 'Bad Request',
    status,
    detail,
    code,
    reasonCode: code
  }, { 'Content-Type': 'application/problem+json; charset=utf-8' });
}

/** The `{ message }` body CartsController answers an AppException with — the shape core reads. */
const appException = (res, message) => send(res, 400, { message });

// ---- the Features:Meals gate -------------------------------------------------------------------
//
// Two predicates and one refusal, matching `MealsFeatureGate` exactly.
//
// `isOrderingVisible` ANDs the module in rather than reading `ordering` alone, because that is what
// the gate does (`IsOrderingEnabled => current.Module && current.Ordering`). Spelling it here rather
// than trusting the seed is the difference between modelling the hierarchy and assuming nobody will
// construct the impossible world.
//
// The refusal is 404 `MEALS_NOT_FOUND` — `MealsProblemException.FundingNotFound()`, the same opaque
// answer a guest who belongs to no company gets. That collapse is deliberate on the backend's side
// and load-bearing on the client's: `loadMealsCompanies` swallows it silently so a guest on a
// deployment with the module dark sees an ordinary checkout instead of an error about a feature they
// have never heard of. A fixture that answered a distinguishable code here would let a client start
// telling those two cases apart and pass, against an API that cannot.
const isModuleVisible = () => state.meals.module;
const isOrderingVisible = () => state.meals.module && state.meals.ordering;
const fundingNotFound = (res) => problem(res, 404, 'MEALS_NOT_FOUND', 'Not found.');

const currentCart = () => (state.cart || (state.cart = seedCart()));

// ---- Company Meals -----------------------------------------------------------------------------

// Weekday + time window, as the real context reports them. Wide open on purpose: the journey is
// about the funding path, and a window that closed at 13:00 would make the run depend on the clock.
const contextFor = () => ({
  companyId: COMPANY_ID,
  programId: 'a3f0c8e2-1111-4444-8888-0d1e2f3a4b5c',
  policyVersion: 3,
  storeId: STORE_ID,
  currency: CURRENCY,
  eligible: true,
  ineligibleReasonCode: null,
  allowanceMinor: ALLOWANCE_MINOR,
  remainingAllowanceMinor: state.remainingAllowanceMinor,
  periodKey: '2026-W31',
  localWindowStartMinutes: 0,
  localWindowEndMinutes: 1439,
  eligibleWeekdaysMask: 127,
  timeZoneId: 'Europe/Oslo'
});

/** The API returns the token once and stores only its hash; the fixture keeps the same shape. */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * The reservation a re-quote supersedes, released before the new one is priced.
 *
 * WHY THE CALLER NAMES IT rather than the server releasing "this caller's previous reservation": at
 * this endpoint a re-quote and a second independent cart are the same request — same user, same store,
 * a new hash and a new key. Inferring it would break the two guarantees the backend suite pins from the
 * other side (a 15000 quote followed by a 10000 one against a 20000 allowance must still be refused,
 * and N concurrent quotes must still produce exactly allowance/cap winners). Modelled here because the
 * whole point of this fixture is to hold the contract the client depends on, not just its shapes.
 *
 * Silent on every mismatch — unknown, already released, bound, captured, expired, another user's — so a
 * re-quote never fails because the hold it replaced had already gone. Expired is deliberately excluded:
 * that one belongs to the backend's reconciliation sweep, under its own reason code.
 */
function resolveSuperseded (supersedesToken) {
  if (!supersedesToken) { return null; }
  const hash = hashToken(supersedesToken);
  const superseded = Object.values(state.reservations).find((r) => r.tokenHash === hash);
  if (!superseded) { return null; }
  if (superseded.state !== 'Reserved') { return null; }
  if (superseded.userId !== USER_ID) { return null; }
  if (Date.parse(superseded.expiresAtUtc) <= Date.now()) { return null; }
  return superseded;
}

function createQuote (body, idempotencyKey) {
  const replayed = state.quoteKeys[idempotencyKey];
  if (replayed) {
    const prior = state.reservations[replayed];
    // Idempotent replay re-derives the SAME token verbatim, reserves nothing further and — because it
    // returns before the release below — gives nothing further back either.
    return { ok: true, reservation: prior, token: prior.token };
  }

  const total = Number(body?.cartTotalMinor) || 0;
  if (String(body?.currency || '').toUpperCase() !== CURRENCY) {
    return { ok: false, code: 'MEALS_CURRENCY_MISMATCH', detail: 'The corridor agreement is settled in ' + CURRENCY + '.' };
  }
  if (String(body?.companyId || '') !== COMPANY_ID) {
    return { ok: false, status: 404, code: 'MEALS_MODULE_UNAVAILABLE', detail: 'Not found.' };
  }
  if (!body?.quoteHash) {
    return { ok: false, status: 400, code: 'MEALS_MODULE_UNAVAILABLE', detail: 'A quoteHash is required.' };
  }
  // The release and the new hold are ONE transaction in MealsQuoteService.CreateQuoteAsync: the
  // supersede is applied before the compare-and-increment (or the re-quote is refused on a budget that
  // fits one lunch but not two — the defect, not the fix), and a refused quote rolls it back with it, so
  // the guest keeps the hold they had rather than being left with nothing. Modelled by deciding first
  // and committing only on success.
  const superseded = resolveSuperseded(body?.supersedesToken);
  const freed = superseded ? superseded.reservedCapMinor : 0;
  if (total > state.remainingAllowanceMinor + freed) {
    return { ok: false, code: 'MEALS_ALLOWANCE_EXCEEDED', detail: 'The remaining company contribution for this period is lower than the cart total.' };
  }

  if (superseded) {
    superseded.state = 'Released';
    superseded.releaseReasonCode = 'MEALS_RELEASED_SUPERSEDED';
    state.remainingAllowanceMinor += superseded.reservedCapMinor;
  }

  const token = 'mealtok_' + crypto.randomBytes(24).toString('hex');
  const reservation = {
    reservationId: crypto.randomUUID(),
    token,
    tokenHash: hashToken(token),
    userId: USER_ID,
    storeId: STORE_ID,
    companyId: COMPANY_ID,
    currency: CURRENCY,
    reservedCapMinor: total,
    quoteHash: body.quoteHash,
    state: 'Reserved',
    boundOrderId: null,
    expiresAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  };
  state.reservations[reservation.reservationId] = reservation;
  state.quoteKeys[idempotencyKey] = reservation.reservationId;
  state.remainingAllowanceMinor -= total;
  return { ok: true, reservation, token };
}

/**
 * The bind, in the backend's own order of checks: unknown token, already-consumed reservation,
 * state, owner, store, currency, expiry, cap. Returns a MEALS_* reason or null when it binds.
 */
function bind (token, orderId, cartTotalMinor) {
  // THE GATE, FIRST — before the token is even hashed. `MealsFundingAuthority.ValidateAndBindAsync`
  // checks `IsOrderingEnabled` at its head and denies with `MEALS_MODULE_UNAVAILABLE`, and the
  // fail-closed default binding is `DenyClosedMealsFundingAuthority`, so a deployment that never
  // registered the real one refuses every bind. That ordering matters here rather than being tidy:
  // a live reservation token minted before the switch went down must NOT bind afterwards, and a
  // fixture that checked the token first would answer a token error for a module that is simply off.
  //
  // `MEALS_MODULE_UNAVAILABLE` and not `MEALS_NOT_FOUND`: the checkout deny is not problem+json at
  // all — it leaves through `CartsController`'s legacy `AppException` path as a 400 `{message}` — and
  // it is the one MEALS_* code the consumer app maps to copy of its own (`checkoutPage_mealsUnavailable`).
  if (!isOrderingVisible()) { return 'MEALS_MODULE_UNAVAILABLE'; }
  if (!token) { return 'MEALS_RESERVATION_NOT_FOUND'; }
  const hash = hashToken(token);
  const reservation = Object.values(state.reservations).find((r) => r.tokenHash === hash);
  if (!reservation) { return 'MEALS_RESERVATION_NOT_FOUND'; }
  if (reservation.state === 'Captured') { return 'MEALS_RESERVATION_ALREADY_CAPTURED'; }
  if (reservation.state !== 'Reserved') { return 'MEALS_RESERVATION_EXPIRED'; }
  if (reservation.userId !== USER_ID) { return 'MEALS_RESERVATION_NOT_OWNED'; }
  if (reservation.storeId !== STORE_ID) { return 'MEALS_STORE_MISMATCH'; }
  if (reservation.currency !== CURRENCY) { return 'MEALS_CURRENCY_MISMATCH'; }
  if (Date.parse(reservation.expiresAtUtc) < Date.now()) { return 'MEALS_RESERVATION_EXPIRED'; }
  if (cartTotalMinor < 0 || cartTotalMinor > reservation.reservedCapMinor) { return 'MEALS_OVER_RESERVED_CAP'; }

  reservation.state = 'Bound';
  reservation.boundOrderId = orderId;
  reservation.boundCartTotalMinor = cartTotalMinor;
  return null;
}

// ---- routing -----------------------------------------------------------------------------------

function readBody (req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : null); } catch (e) { resolve(null); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') { return send(res, 204); }

  if (path === '/__fixture/health') { return send(res, 200, { ok: true }); }
  if (path === '/__fixture/stats') { return send(res, 200, { served: state.served, requests: state.requests, remainingAllowanceMinor: state.remainingAllowanceMinor, orders: Object.values(state.orders), events: state.events, reservations: Object.values(state.reservations).map((r) => ({ id: r.reservationId, state: r.state, cap: r.reservedCapMinor, boundTotal: r.boundCartTotalMinor === undefined ? null : r.boundCartTotalMinor, order: r.boundOrderId, releaseReasonCode: r.releaseReasonCode || null })) }); }
  if (path === '/__fixture/reset') {
    // `allowanceMinor` lets a journey stand the world up with a company budget too small for the
    // cart, which is the only way to walk the v1 "funds fully or not at all" refusal from the UI.
    const requested = url.searchParams.get('allowanceMinor');
    // ...and `mealsModule` / `mealsOrdering` let one stand it up with the `Features:Meals` gate down.
    // That is the ONLY way to walk a dark deployment from the UI, because neither switch has a lever
    // in any product surface — see consumer-world.js. `'0'` and `'false'` both read as off, since a
    // query string carries neither a boolean nor a type.
    const asBool = (name) => {
      const raw = url.searchParams.get(name);
      return raw === null ? undefined : !(raw === '0' || raw.toLowerCase() === 'false');
    };
    state = freshState(requested === null ? undefined : Number(requested),
      { module: asBool('mealsModule'), ordering: asBool('mealsOrdering') });
    return send(res, 200, {
      ok: true,
      remainingAllowanceMinor: state.remainingAllowanceMinor,
      meals: state.meals
    });
  }

  state.served++;
  state.requests.push({ method, path, query: url.search || '', at: new Date().toISOString() });

  const authorized = (req.headers.authorization || '') === 'Bearer ' + BEARER;
  if (!authorized) { return send(res, 401, { message: 'Unauthorized' }); }

  const body = method === 'GET' || method === 'DELETE' ? null : await readBody(req);

  // ---- store / user / config -------------------------------------------------------------------
  if (method === 'POST' && /^\/stores\/\d+\/consumer$/.test(path)) { return send(res, 200, store()); }
  if (method === 'GET' && path === '/bootstrap') { return send(res, 200, { publishableKey: 'pk_test_fixture' }); }
  if (method === 'POST' && /^\/products\/favorites\/\d+\/search$/.test(path)) { return send(res, 200, []); }
  // `/user` is the token-validity probe AND the profile read (UserService); the app calls it on load
  // and treats a 401/404 as "signed out", which would have silently emptied the checkout.
  if (method === 'GET' && path === '/user') { return send(res, 200, user()); }
  if (method === 'GET' && path === '/orders') { return send(res, 200, Object.values(state.orders).filter((o) => o.status !== 'Canceled')); }

  // ---- cart ------------------------------------------------------------------------------------
  if (method === 'GET' && /^\/carts\/validate\/\d+$/.test(path)) {
    return send(res, 200, {
      priceTooLowError: false, minimumPrice: 0, paymentTypeError: false, priceDifferError: false,
      deliveryAddressError: false, deliveryMethodError: false, sameDayAfterHoursOrderNotAllowed: false,
      storeIsClosed: false, cartIsEmpty: false, giftcardBalanceTooLow: false, itemsOutOfStock: [], hasErrors: false
    });
  }

  if (method === 'POST' && /^\/carts\/complete\/\d+$/.test(path)) {
    const cart = currentCart();
    const orderId = nextId('order');
    if (String(cart.paymentType) === 'CompanyAccount') {
      // The order row exists before the bind is attempted (the backend saves it, then binds), and a
      // refused bind cancels it. Modelled, because "no order ever stands unbound" is the claim.
      state.orders[orderId] = { id: orderId, status: 'Pending', storeId: STORE_ID };
      const reason = bind(url.searchParams.get('reservationToken'), orderId, cart.calculations.finalAmount);
      if (reason) {
        // ATTRIBUTION. The store cancelled nothing — the funding authority refused the bind — so the
        // cancelled row is NOT flagged as the store's, and the reason code is recorded against the
        // order so the refusal is distinguishable in the data from a store that genuinely cancelled.
        // CartService.PromoteToOrder writes exactly this pair (CanceledByStore = false plus an
        // EventLog naming MEALS_*); it used to write CanceledByStore = true.
        state.orders[orderId].status = 'Canceled';
        state.orders[orderId].canceledByStore = false;
        state.events.push({ eventName: 'MealsFundingRefused', eventValue: reason, orderId, storeId: STORE_ID });
        return appException(res, reason);
      }
    }
    const order = {
      id: orderId,
      code: orderId,
      storeId: STORE_ID,
      status: 'Received',
      paymentType: cart.paymentType,
      currency: CURRENCY,
      finalAmount: cart.calculations.finalAmount,
      itemsAmount: cart.calculations.itemsAmount,
      tipAmount: cart.calculations.tipAmount,
      deliveryAmount: 0,
      created: new Date().toISOString(),
      // `items`, not `lineItems`: that is what core's Order model carries and what OrderSummary reads.
      items: cart.items.map((item, index) => ({
        id: 'oli-' + index, lineNumber: index + 1, name: item.product.name,
        quantity: item.quantity, amount: item.product.amount, currency: CURRENCY,
        negativeAmount: false, options: []
      })),
      taxDetails: [],
      deliveryType: cart.deliveryType,
      userFullName: 'Ingrid Hauge',
      storeName: store().name
    };
    state.orders[orderId] = order;
    state.cart = seedCart();
    return send(res, 200, order);
  }

  if (method === 'GET' && /^\/carts\/\d+$/.test(path)) { return send(res, 200, currentCart()); }

  if (method === 'PUT' && path === '/carts') {
    const incoming = body || {};
    const cart = currentCart();
    // The client PUTs the WHOLE cart, so a percent change arrives alongside the tip amount the previous
    // percent produced. Clearing it here is what makes "back to 0%" mean no tip rather than "keep the
    // last derived amount".
    if ('tipPercent' in incoming && Number(incoming.tipPercent) !== Number(cart.tipPercent)) { cart.tipAmount = 0; incoming.tipAmount = 0; }
    ['deliveryType', 'paymentType', 'tipAmount', 'tipPercent', 'comment', 'discountCode', 'fullAddress', 'zipCode', 'city', 'tableName', 'requestedCompletion', 'useReward'].forEach((key) => {
      if (key in incoming) { cart[key] = incoming[key]; }
    });
    return send(res, 200, withCalculations(cart));
  }

  // MATCHED WITH AND WITHOUT THE TRAILING SLASH. `PaymentController` declares the route bare —
  // `[HttpPost("paymentMethods")]` — and ASP.NET matches either form, so the real API cannot tell
  // the two apart; a fixture pinned to one spelling can, and answers 404 to the client that
  // happens to write the other.
  // This repo's `core/services/payment-service.ts` posts the bare path; ../ConsumerWeb carries its
  // OWN `core` and still posts the slashed one, and this fixture serves that app. Pinning either
  // spelling here would make one of the two clients look broken against a backend that is fine.
  if (method === 'POST' && path.replace(/\/+$/, '') === '/payment/paymentMethods') {
    // A saved card, so the ordinary rail is present and the company tender has to be CHOSEN over it
    // rather than being the only thing on the page.
    return send(res, 200, [{ id: 'pm_card_fixture', paymentType: 'Stripe', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 }]);
  }

  // ---- orders ----------------------------------------------------------------------------------
  if (method === 'GET' && /^\/orders\/ongoing\/\d+$/.test(path)) { return send(res, 200, []); }

  if (method === 'GET' && /^\/orders\/[^/]+$/.test(path)) {
    const order = state.orders[path.split('/')[2]];
    return order ? send(res, 200, order) : send(res, 404, { message: 'Not found' });
  }

  // ---- Company Meals (spec 20 §5, ops 13/14 + the my-companies entry read) ----------------------
  // `RequireVisible()` — the module gate, ahead of every other check on these two reads, exactly as
  // `MealsFundingController` runs it ahead of the companyId validation. Gate before precondition is
  // stated in `MealsControllerBase` as a disclosure control, not a style choice: a dark module must
  // not answer differently for a known company than for an unknown one.
  if (method === 'GET' && path === '/v1/meals/me/companies') {
    if (!isModuleVisible()) { return fundingNotFound(res); }
    return send(res, 200, { companies: [company()] });
  }

  if (method === 'GET' && path === '/v1/meals/me/context') {
    if (!isModuleVisible()) { return fundingNotFound(res); }
    if (url.searchParams.get('companyId') !== COMPANY_ID) { return problem(res, 404, 'MEALS_MODULE_UNAVAILABLE', 'Not found.'); }
    return send(res, 200, contextFor());
  }

  if (method === 'POST' && /^\/v1\/stores\/\d+\/meals\/quotes$/.test(path)) {
    // `RequireOrderingVisible()`, and it is a DIFFERENT gate from the two reads above: a deployment
    // can have the module up and the money path still closed, which is precisely the state a pilot
    // sits in between the agreement being signed and the billing terms being countersigned. In that
    // world the guest sees the company on the checkout and cannot mint a quote against it.
    if (!isOrderingVisible()) { return fundingNotFound(res); }
    const key = (req.headers['idempotency-key'] || '').toString().trim();
    if (!key) { return problem(res, 400, 'MEALS_MODULE_UNAVAILABLE', 'An Idempotency-Key header is required for this mutation.'); }
    const result = createQuote(body, key);
    if (!result.ok) { return problem(res, result.status || 409, result.code, result.detail); }
    return send(res, 200, {
      reservationId: result.reservation.reservationId,
      authorizationToken: result.token,
      reservedCapMinor: result.reservation.reservedCapMinor,
      currency: result.reservation.currency,
      periodKey: '2026-W31',
      expiresAtUtc: result.reservation.expiresAtUtc
    });
  }

  return send(res, 404, { message: 'No fixture route for ' + method + ' ' + path });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('[consumer-fixture] listening on http://127.0.0.1:' + PORT);
});

module.exports = { PORT };
