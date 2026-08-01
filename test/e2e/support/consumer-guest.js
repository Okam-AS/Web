// What every consumer journey needs before it can start: a signed-in guest, a hermetic page, and a
// record of what the app said to the API.
//
// Shared rather than copied because all three of these are places a journey can quietly stop being
// evidence. A guest seeded differently from what the fixture answers produces an empty checkout that
// reads like a product defect; a page allowed out to the public internet produces a run that depends
// on somebody else's uptime; and a journey that does not record its requests can assert that a
// button worked while saying nothing about what was sent.

const { execFileSync } = require('child_process');
const path = require('path');
const world = require('../fixture/consumer-world');

const CONSUMER_ROOT = process.env.E2E_CONSUMER_ROOT || path.resolve(__dirname, '..', '..', '..', '..', 'ConsumerWeb');
const fixtureOrigin = () => 'http://127.0.0.1:' + (process.env.E2E_CONSUMER_FIXTURE_PORT || 4020);

/**
 * The tree actually under test. The app driven here is a SIBLING repo, so the harness's own commit
 * would describe the wrong thing; `core` is named separately because it is the wire layer and it is
 * a submodule with its own lineage (this repo pins a different one).
 */
function underTest () {
  const at = (cwd, args) => {
    try { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(); } catch (e) { return 'unknown'; }
  };
  return 'ConsumerWeb@' + at(CONSUMER_ROOT, ['rev-parse', '--short', 'HEAD']) +
    ' (' + at(CONSUMER_ROOT, ['rev-parse', '--abbrev-ref', 'HEAD']) + ')' +
    ' core@' + at(path.join(CONSUMER_ROOT, 'core'), ['rev-parse', '--short', 'HEAD']);
}

/**
 * ConsumerWeb hydrates its Pinia stores from localStorage, so "signed in, at this store, with a
 * cart" is seeded rather than driven: the sign-in flow needs an SMS one-time code, and a journey
 * about funding should not become a journey about OTP delivery. Everything seeded here is answered
 * identically by the fixture, so the app never reads a world the server disagrees with.
 */
async function seedGuest (page, cart) {
  await page.addInitScript((seed) => {
    window.localStorage.setItem('bearerToken', JSON.stringify(seed.bearer));
    window.localStorage.setItem('clientPlatformName', JSON.stringify('Web'));
    window.localStorage.setItem('cultureCode', JSON.stringify('no'));
    window.localStorage.setItem('userRef', JSON.stringify(seed.user));
    window.localStorage.setItem('store', JSON.stringify(seed.store));
    window.localStorage.setItem('cartsRef', JSON.stringify([seed.cart]));
  }, { bearer: world.BEARER, user: world.user(), store: world.store(), cart: cart || world.seedCart() });
}

/**
 * Stripe.js, Google Fonts and the analytics tags come from public CDNs. Aborted rather than stubbed:
 * the app already handles a Stripe that will not load, and that path is exactly what a guest behind
 * an ad blocker gets — so blocking it tests something real instead of hiding something.
 *
 * `rewrite` lets a journey mutate a request on the way out, which is how the guard journey removes
 * the reservation token: the falsification has to happen on the wire, not by asking the client to
 * misbehave.
 */
async function cutExternalNetwork (page, rewrite) {
  await page.route('**/*', (route) => {
    const request = route.request();
    const url = request.url();
    const local = url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:') || url.startsWith('data:') || url.startsWith('blob:');
    if (!local) { return route.abort(); }
    const replacement = rewrite ? rewrite(url, request) : null;
    return replacement ? route.continue({ url: replacement }) : route.continue();
  });
}

/** Every request the page made to the fixture, for the assertions that read what was actually sent. */
function recordApiCalls (page) {
  const calls = [];
  const origin = fixtureOrigin();
  page.on('request', (request) => {
    const url = request.url();
    if (url.indexOf(origin) !== 0) { return; }
    calls.push({ method: request.method(), url, headers: request.headers(), postData: request.postData() });
  });
  return calls;
}

module.exports = { CONSUMER_ROOT, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, recordApiCalls, world };
