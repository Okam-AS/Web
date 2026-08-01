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
//
// WHAT IT DOES NOT DO: it is not a model of the backend. It holds no menu, no pricing engine, no
// journal, no statement run. Anything a journey wants true it seeds here explicitly.

const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const world = require('./consumer-world');

const PORT = Number(process.env.E2E_CONSUMER_FIXTURE_PORT || 4020);

const { BEARER, USER_ID, STORE_ID, COMPANY_ID, CURRENCY, ALLOWANCE_MINOR, store, user, seedCart, withCalculations, company } = world;

function freshState (allowanceMinor) {
  return {
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

function createQuote (body, idempotencyKey) {
  const replayed = state.quoteKeys[idempotencyKey];
  if (replayed) {
    const prior = state.reservations[replayed];
    // Idempotent replay re-derives the SAME token verbatim and reserves nothing further.
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
  if (total > state.remainingAllowanceMinor) {
    return { ok: false, code: 'MEALS_ALLOWANCE_EXCEEDED', detail: 'The remaining company contribution for this period is lower than the cart total.' };
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
  if (path === '/__fixture/stats') { return send(res, 200, { served: state.served, requests: state.requests, remainingAllowanceMinor: state.remainingAllowanceMinor, orders: Object.values(state.orders), events: state.events, reservations: Object.values(state.reservations).map((r) => ({ id: r.reservationId, state: r.state, cap: r.reservedCapMinor, boundTotal: r.boundCartTotalMinor === undefined ? null : r.boundCartTotalMinor, order: r.boundOrderId })) }); }
  if (path === '/__fixture/reset') {
    // `allowanceMinor` lets a journey stand the world up with a company budget too small for the
    // cart, which is the only way to walk the v1 "funds fully or not at all" refusal from the UI.
    const requested = url.searchParams.get('allowanceMinor');
    state = freshState(requested === null ? undefined : Number(requested));
    return send(res, 200, { ok: true, remainingAllowanceMinor: state.remainingAllowanceMinor });
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

  if (method === 'POST' && path === '/payment/paymentMethods/') {
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
  if (method === 'GET' && path === '/v1/meals/me/companies') {
    return send(res, 200, { companies: [company()] });
  }

  if (method === 'GET' && path === '/v1/meals/me/context') {
    if (url.searchParams.get('companyId') !== COMPANY_ID) { return problem(res, 404, 'MEALS_MODULE_UNAVAILABLE', 'Not found.'); }
    return send(res, 200, contextFor());
  }

  if (method === 'POST' && /^\/v1\/stores\/\d+\/meals\/quotes$/.test(path)) {
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
