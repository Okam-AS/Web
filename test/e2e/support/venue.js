// WHICH VENUE THIS RUN IS ABOUT — asked of the backend, instead of written into the journey.
//
// ---- THE PROBLEM THIS SOLVES ------------------------------------------------------------------
//
// A journey whose first move is PUBLIC needs a store id before anybody has signed in. Every admin
// journey gets one for free: it signs in, and the Vuex shell picks the store out of `adminIn`. A
// public one cannot — `/events/inquiry/{store}` IS the first navigation, and the venue is in the URL.
//
// So `events-enquiry-to-settlement` hard-coded `world.STORE_ID`, the fixture's store 42, and its own
// header named that as the single thing keeping it off a live backend: "STORE below is still
// world.STORE_ID — the FIXTURE's store 42 — and the tag is still @fixture, so live mode filters this
// walk out before either fault could matter." Against a real database store 42 is not this world's
// venue and very often is not a store at all; the walk would either 404 at the first navigation or,
// far worse, write an enquiry against somebody else's store while its artifact claimed to be walking
// this one.
//
// ---- WHY THIS IS HONEST, AND WHAT IT MUST NEVER BECOME ----------------------------------------
//
// This is the harness standing in for the one thing the harness genuinely is: THE VENUE HANDING OUT
// ITS OWN LINK. A real guest does not guess `/events/inquiry/7` — the venue publishes it, on a
// website or in an email. Nothing in the product mints that address for a stranger, so a browser
// journey cannot discover it by browsing, and pretending otherwise would mean inventing a discovery
// surface that does not ship.
//
// What it must never become is a way to read state the JOURNEY is supposed to prove. It answers one
// question — which store does the demo manager administer — and it answers it from the same route
// and the same credential the login modal itself posts (`/user/login`, `AppSettings.DemoPhoneNumber`
// / `DemoVerificationCode`). It reads no event, no proposal, no token, no flag and no settlement: all
// of those are things a step below has to earn through the browser. If a later journey reaches in
// here for a proposal token because discovering it through the UI is awkward, that journey has
// stopped being evidence.
//
// ---- ONE PATH, BOTH WORLDS --------------------------------------------------------------------
//
// The same call answers against the throwaway fixture (`test/e2e/fixture/api-server.js` serves
// `/user/login` and its manager carries `adminIn: [{ id: 42 }]`) and against a real WebApi (where
// `UserController.Login` answers the store the seeded `StoreAdmins` row names). That is deliberate
// and it is the reason this exists rather than an `E2E_LIVE_STORE_ID` environment variable: a walk
// that took its venue from the environment in live mode and from a constant in fixture mode would be
// two walks wearing one name, and the estate has already paid for that shape more than once.
//
// LOWERCASE `/user/login`, WHICH IS NOT A DETAIL. ASP.NET's attribute routing is case-insensitive, so
// `/User/login` and `/user/login` are the same action live — but the fixture matches
// `path === '/user/login'` on the raw pathname and would 404 the capitalised spelling. Lowercase is
// also what the shipped client posts (`core/services/user-service.ts:90`), so this sends the string
// the product sends rather than a third spelling that happens to work on one of the two.
//
// ---- C7 ---------------------------------------------------------------------------------------
//
// The login response carries a BEARER TOKEN. It is never logged, never returned and never put in an
// error message: the failures below name the field that was missing and the number that was used,
// the same discipline `live-world.sh` keeps for the same response. Only the store id leaves here.

const DEMO_PHONE = '+4799999999';   // AppSettings.DemoPhoneNumber
const DEMO_CODE = '123123';         // AppSettings.DemoVerificationCode

/**
 * The store the demo manager administers, as the backend on `apiBaseUrl` reports it.
 *
 * @param apiBaseUrl  the origin the journey's app is pointed at (fixture or live)
 * @param phone       the full international number, as `/user/login` wants it
 * @param code        the verification code
 * @returns {Promise<string>} the store id, as a string — ids are numeric live and numeric in the
 *          fixture, but every consumer of this puts it in a URL, and a string cannot be accidentally
 *          arithmetic'd into a different venue.
 */
async function venueStoreId (apiBaseUrl, { phone = DEMO_PHONE, code = DEMO_CODE } = {}) {
  const origin = String(apiBaseUrl).replace(/\/+$/, '');
  const url = origin + '/user/login';

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, token: code })
    });
  } catch (error) {
    throw new Error(
      'could not reach ' + url + ' to find out which venue this run is about: ' + error.message);
  }

  if (!response.ok) {
    // The BODY is deliberately not included: a 200 carries a bearer and a refusal can echo the
    // credential back. The status and the number used are what a reader needs.
    throw new Error(
      'POST ' + url + ' answered HTTP ' + response.status + ' for ' + phone + '. The demo sign-in ' +
      'needs AppSettings.DemoPhoneNumber/DemoVerificationCode to match it.');
  }

  let user;
  try {
    user = await response.json();
  } catch (error) {
    throw new Error('POST ' + url + ' answered 200 with a body that is not JSON');
  }

  const stores = (user && user.adminIn) || [];
  if (!stores.length) {
    // The same condition `AdminPage.initAuth` treats as "not an admin", so this failure is the one
    // the browser would hit two navigations later as a redirect to /registrer.
    throw new Error(
      'POST ' + url + ' answered 200 but ' + phone + ' administers no store, so there is no venue ' +
      'for this journey to be about. Seed one: test/e2e/scripts/live-world.sh');
  }

  const id = stores[0] && stores[0].id;
  if (id === undefined || id === null || id === '') {
    throw new Error('the first entry of adminIn for ' + phone + ' carries no id');
  }
  return String(id);
}

module.exports = { venueStoreId, DEMO_PHONE, DEMO_CODE };
