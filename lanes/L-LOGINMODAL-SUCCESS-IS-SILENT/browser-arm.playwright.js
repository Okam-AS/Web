// BROWSER ARM — does the serialized response ever PAINT?
//
// jsdom cannot answer this one. The form that holds the error box lives inside
// `<transition name="fade" mode="out-in">`, and `mode="out-in"` keeps an OUTGOING element mounted
// for the length of its leave animation. jsdom has no CSS and no animation clock, so it collapses
// that window to nothing — exactly the window in which a one-frame paint would happen. Only a real
// browser with the real 0.3s `.fade-leave-active` transition can settle it.
//
// WHY A MutationObserver AND NOT A READ-AFTER-WAIT. A box that appears for 300ms and then leaves
// with the modal is invisible to any single `expect(...)` taken afterwards, and a sleep long enough
// to be safe is also long enough to miss it. So the page records EVERY change to every
// `.alert--error` from before the first click until after the modal is gone, and the arm reports the
// whole recording. A sleep is used nowhere as a barrier.
//
// WHY NOTHING REACHES A REAL SERVER. `API_BASE_URL` is pointed at 127.0.0.1:4897, where nothing is
// bound, and every call is fulfilled by `page.route` below. No sign-in attempt leaves this laptop.

const { test, expect } = require('@playwright/test');

const BASE = process.env.ARM_BASE_URL;
const ARM = process.env.ARM_NAME;
// `success` = the API accepts the code. `wrongcode` = it refuses it. The second is the POSITIVE
// CONTROL: an empty recording from the first arm means nothing unless the same observer, on the same
// page, demonstrably CATCHES an error box when one is genuinely shown.
const SCENARIO = process.env.ARM_SCENARIO || 'success';

// A value that appears nowhere in the application, so "did the response reach the DOM" is a
// substring test rather than a judgement call. It is NOT a real token.
const SENTINEL = 'SENTINEL-CREDENTIAL-DO-NOT-RENDER';

// The shape `/user/login` answers with. Key names are real; the token value is the sentinel.
const LOGIN_BODY = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
  phoneNumber: '+4799999999',
  firstName: 'Kari',
  lastName: 'Nordmann',
  adminIn: [{ id: 7, name: 'Kafe Nord' }],
  token: SENTINEL
};

test(`arm ${ARM}: a correct sign-in and everything the error slot says while it happens`, async ({ page }) => {
  // The page is served from :3897 and the API base is :4897, so every call is CROSS-ORIGIN and the
  // browser sends a preflight first — the request carries Authorization, ClientPlatform,
  // ClientAppVersion and a JSON content type, every one of which makes it non-simple. A fulfilled
  // 200 with only `access-control-allow-origin` fails that preflight, the real request is never
  // sent, and the arm looks like a product failure when it is a harness failure. So OPTIONS is
  // answered explicitly and the allow-headers/-methods are spelled out.
  const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '600'
  };
  const json = (body) => ({
    status: 200,
    contentType: 'application/json',
    headers: CORS,
    body: JSON.stringify(body)
  });
  const answer = (body) => (route, request) => {
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    return route.fulfill(json(typeof body === 'function' ? body(request) : body));
  };

  // ---- COLLECT EVERY SCRIPT THE BROWSER IS ACTUALLY SERVED --------------------------------------
  //
  // Enumerating `script[src]` after load is not enough: the admin page's components arrive in
  // webpack chunks fetched on demand, so the chunk holding LoginModal is not a `<script src>` tag at
  // document load and the first version of this check read the wrong files — and reported the
  // defect ABSENT from a stock arm. Listening to responses from before the first navigation catches
  // every chunk however it arrives.
  const scriptBodies = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/\.js(\?|$)/.test(url) && !url.includes('/_nuxt/')) return;
    try { scriptBodies.push({ url, body: await response.text() }); } catch (e) { /* body gone */ }
  });

  const seen = [];
  page.on('console', (m) => { if (m.type() === 'error') seen.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => seen.push(`failed: ${r.method()} ${r.url()} ${r.failure() && r.failure().errorText}`));
  page.on('request', (r) => { if (r.url().includes(':4897')) seen.push(`sent: ${r.method()} ${r.url()}`); });

  // ORDER MATTERS. Playwright tries the LAST registered matching route first, so the catch-all is
  // registered FIRST and the two specific endpoints after it. Registered the other way round the
  // catch-all answered /user/sendverificationtoken with `null`, SendVerificationToken returned
  // false, and the modal correctly refused to advance — a harness failure that reads exactly like a
  // product failure, and did until the requests were logged.
  await page.route('**/127.0.0.1:4897/**', answer(null));
  await page.route('**/user/sendverificationtoken', answer(true));
  if (SCENARIO === 'wrongcode') {
    // What the backend really does for a bad code: a non-200. TryParseResponse turns that into
    // undefined, UserService.Login rejects, and the modal's catch arm says «Feil kode».
    await page.route('**/user/login', (route, request) => (
      request.method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: CORS, body: '' })
        : route.fulfill({ status: 400, contentType: 'application/json', headers: CORS, body: JSON.stringify({ message: 'bad code' }) })
    ));
  } else {
    await page.route('**/user/login', answer(LOGIN_BODY));
  }

  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });

  // Wait for the modal itself, not for a duration. Doing this BEFORE the bundle check also
  // guarantees the chunk holding LoginModal has been fetched — it is on screen.
  await page.waitForSelector('.login-modal .input-wrapper input[type="tel"]', { timeout: 60000 });

  // ---- DID THIS ARM ACTUALLY GET THIS ARM'S CODE? ----------------------------------------------
  //
  // The failure mode the whole script is built against: a dev server that outlived a source edit
  // keeps serving the bundle it already built, so the arm silently measures the other arm's code and
  // "passes against the defect". Rather than trust that the restart worked, READ THE CHUNKS the
  // browser was actually served and look for the defect's own text. Nuxt's dev build is unminified,
  // so `JSON.stringify(response)` survives verbatim when it is there.
  //
  // `carrier` first proves the check is looking at the right file at all: «Feil kode» is unique to
  // this component, so a run where NO served chunk contains it is a broken check, not a clean arm.
  // Line comments are stripped before the search. The fixed component EXPLAINS the defect in a
  // comment, and the first version of this check found that comment and concluded the fixed build
  // still carried the defect — the barrier failing safe, in the opposite direction to the one it
  // was written for.
  const codeOnly = (body) => body.replace(/^\s*\/\/.*$/gm, '');
  const carrier = scriptBodies.filter((s) => s.body.includes('Feil kode'));
  const bundleCarriesDefect = carrier.some((s) => codeOnly(s.body).includes('JSON.stringify(response)'));
  const tag0 = `[ARM ${ARM}/${SCENARIO}]`;
  console.log(`${tag0} scripts served: ${scriptBodies.length}; carrying LoginModal: ${carrier.length}`);
  console.log(`${tag0} chunk served to the browser carries JSON.stringify(response): ${bundleCarriesDefect}`);
  // A run that cannot see the component's own code cannot testify about it.
  expect(carrier.length).toBeGreaterThan(0);

  // Start recording BEFORE anything is clicked. Every mutation anywhere in the document is
  // inspected for `.alert--error` and its text banked with a timestamp.
  await page.evaluate(() => {
    window.__errorSightings = [];
    const sample = (why) => {
      document.querySelectorAll('.alert--error').forEach((node) => {
        const text = (node.textContent || '').trim();
        const last = window.__errorSightings[window.__errorSightings.length - 1];
        if (!last || last.text !== text) {
          window.__errorSightings.push({ t: Math.round(performance.now()), why, text });
        }
      });
    };
    sample('start');
    window.__obs = new MutationObserver(() => sample('mutation'));
    window.__obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    // A raf loop as well, so a paint that lands between mutations is still seen.
    const spin = () => { sample('frame'); window.__raf = requestAnimationFrame(spin); };
    spin();
  });

  const modalCount = await page.locator('.login-modal').count();

  await page.fill('.login-modal .input-wrapper input[type="tel"]', '99999999');
  await page.click('.login-modal button.btn--primary');

  // The six code boxes appearing is the signal the send succeeded — a state, not a duration.
  await page.waitForSelector('.login-modal .otp-input input', { timeout: 30000 }).catch((err) => {
    console.log(`[ARM ${ARM}] the send never advanced. diagnostics:\n  ${seen.join('\n  ')}`);
    throw err;
  });

  const boxes = page.locator('.login-modal .otp-input input');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) {
    await boxes.nth(i).fill(String(i + 1));
  }

  if (SCENARIO === 'success') {
    // Wait for the modal to be GONE — the success path's own consequence — rather than for a clock.
    await page.waitForSelector('.login-modal', { state: 'detached', timeout: 20000 }).catch(() => {});
  } else {
    // The refusal keeps the modal open; wait for the box itself to exist, not for a duration.
    await page.waitForSelector('.login-modal .alert--error', { timeout: 20000 }).catch(() => {});
  }

  const sightings = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    window.__obs.disconnect();
    return window.__errorSightings;
  });
  const html = await page.content();
  const tag = `[ARM ${ARM}/${SCENARIO}]`;

  console.log(`${tag} login modals on page at start: ${modalCount}`);
  console.log(`${tag} code boxes offered: ${count}`);
  console.log(`${tag} modal still present: ${await page.locator('.login-modal').count()}`);
  console.log(`${tag} error-slot sightings: ${JSON.stringify(sightings)}`);
  console.log(`${tag} sentinel anywhere in final DOM: ${html.includes(SENTINEL)}`);
  console.log(`${tag} any sighting carried the sentinel: ${sightings.some((s) => s.text.includes(SENTINEL))}`);
  console.log(`${tag} any sighting carried a serialized body: ${sightings.some((s) => /[{}]|(^|\s)true($|\s)/.test(s.text))}`);

  // ---- WHAT EACH ARM ASSERTS -------------------------------------------------------------------
  expect(count).toBe(6);

  // The barrier check. If this ever fails, the arm measured the OTHER arm's code and every number
  // above is worthless — which is exactly the trap a reused dev server sets.
  expect(bundleCarriesDefect).toBe(ARM === 'stock');

  if (SCENARIO === 'wrongcode') {
    // POSITIVE CONTROL. The observer must demonstrably catch a real error box on this same page,
    // or an empty recording in the success arm proves nothing about the product.
    expect(sightings.length).toBeGreaterThan(0);
    expect(sightings.some((s) => s.text.includes('Feil kode'))).toBe(true);
  } else {
    // The claim: a sign-in that WORKED puts nothing in the error slot — no serialized body, and
    // above all no credential — at any point between the click and the modal closing.
    expect(sightings.some((s) => s.text.includes(SENTINEL))).toBe(false);
    expect(html.includes(SENTINEL)).toBe(false);
  }
});
