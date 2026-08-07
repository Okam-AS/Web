// JOURNEY — a guest holding no session leaves a mailing list from the message that put them on it,
// across an origin boundary, against the real API.
//
// ---- WHAT WAS ALREADY PROVED, SO THAT WHAT IS NEW HERE IS VISIBLE ------------------------------
//
// `F-GR-NO-EXIT-FROM-A-LIST` records two independent blockers. The first — that nothing linked a
// guest to the working exit — is closed on the backend and proved three ways already: the footer
// composition at the service tier, the RFC 8058 surface at the wire tier, and a browser leg
// (`growth-guest-unsubscribe`) whose backend is `test/e2e/fixture/growth.js`.
//
// NONE OF THOSE CAN SEE THE SECOND BLOCKER, and the flag says the second is the one that matters.
// It is a claim about what a BROWSER is PERMITTED to do: the page is served from the consumer-web
// origin, the API answers on a different one, and the API's deployed CORS registration is
// `AllowAnyOrigin()` WITHOUT credentials. A service-tier test calls a method. A wire-tier test runs
// the CORS middleware but has no browser to enforce anything against it. And a fixture on the app's
// own origin is not cross-origin at all, so the question is never asked.
//
// ---- WHAT THIS RUN IS, EXACTLY ----------------------------------------------------------------
//
//   the page      `nuxt dev` behind a TLS front end on `https://localhost:<port>`
//   the API       `WebApi.Program`'s REAL composition root on real Kestrel, real TLS,
//                 `https://127.0.0.1:<port>` — a different HOST and a different PORT, so the
//                 request is cross-origin AND cross-site
//   the link      copied verbatim out of `world.json`, which the backend world wrote from the body
//                 `GrowthFakeMailProvider` actually received. NOT constructed here. A journey that
//                 built its own URL would prove the page works and say nothing about whether
//                 anything emits that address, which is the whole defect.
//   the guest     a fresh browser context with no storage and no cookie, asserted rather than assumed
//
// ---- WHAT IT STILL CANNOT SEE, SAID HERE RATHER THAN IN A FOOTNOTE ----------------------------
//
// It is NOT `okam.no` and `okamapi.azurewebsites.net`. This branch is not deployed and deploying it
// is an owner-only action (`D-PREFCENTRE-DEPLOY` is ruled `deploy-the-branch`;
// `L-PREFCENTRE-DEPLOY-EXEC` is where that lives). What this reproduces is the deployment's SHAPE —
// https on both sides, two origins, two sites, no cookie, and the real CORS registration — not its
// hostnames. The database is in-memory SQLite rather than SQL Server, and the mail provider is the
// Fake one, which is why `Growth:MailProvider` never has to be touched for this to run.

const fs = require('fs');
const path = require('path');
const { test, journeyDetails, expect } = require('../support/journey');

const RUN_DIR = process.env.GROWTH_GUEST_EXIT_WORLD_DIR;

/** The world's handshake — what the dispatcher composed, as the dispatcher composed it. */
function readWorld () {
  if (!RUN_DIR) {
    throw new Error(
      'GROWTH_GUEST_EXIT_WORLD_DIR is not set, so there is no dispatched message to read a link out of.\n' +
      'Run this through test/e2e/scripts/growth-guest-exit-world.sh, which stands the world up and sets it.');
  }
  const file = path.join(RUN_DIR, 'world.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      'No ' + file + '. The backend world never published a dispatched message — it failed before the\n' +
      'dispatch, or it is still starting. Its log is ' + path.join(RUN_DIR, 'world.log') + '.');
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Tells the world that the withdrawal request has RETURNED, so it may read its database.
 *
 * A concurrency fence, not a claim being taken on trust. The world's host and every context in it share
 * one `SqliteConnection` — that is what makes an in-memory database exist — and two threads on one
 * connection is unsupported: a world that polled its suppression table while serving the browser's POST
 * made that POST 500 with "The transaction object is not associated with the same connection object as
 * this command". This says WHEN to look. What the world then finds is its own database, and the
 * assertions below are on that, not on this file's existence.
 */
function reportWithdrawalReturned () {
  fs.writeFileSync(path.join(RUN_DIR, 'withdrawn'), new Date().toISOString());
}

/** What the backend recorded about the effect of the browser's request, once it has recorded it. */
async function readOutcome (timeoutMs) {
  const file = path.join(RUN_DIR, 'outcome.json');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      // The world writes this file whole; a partial read is possible on a slow filesystem and reads
      // exactly like malformed evidence, so a parse failure retries rather than failing the journey.
      try { return JSON.parse(raw); } catch (e) { /* keep waiting */ }
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(
    'The backend never recorded a suppression for the recipient whose exit link this journey opened.\n' +
    'The done card can render on an optimistic client; this file is what makes the withdrawal DURABLE,\n' +
    'and its absence means the browser\'s request did not land. Read ' + path.join(RUN_DIR, 'world.log') + '.');
}

/**
 * Every arrival goes through `about:blank` first, and it is not defensive tidiness.
 *
 * The page reads its token in `mounted()` and then strips it from the address bar, so after one visit
 * the URL is a bare `/preferences/unsubscribe`. A later `page.goto()` that differs only in the
 * FRAGMENT is a SAME-DOCUMENT navigation: the component never remounts, nothing is re-requested, and
 * the assertions afterwards sit looking at the card the previous arrival left behind. That is how the
 * sibling journey's first green run passed its replay and refusal legs without opening anything.
 */
async function arriveAt (page, url) {
  await page.goto('about:blank');
  await page.goto(url);
}

test(
  'a guest with no session opens the link the newsletter carried and the withdrawal lands in the real backend',
  journeyDetails({
    journey: 'growth-guest-exit-cross-origin',
    surface: 'guest',
    // NOT `@fixture`: there is no fixture in this run at all. Not `@live` either, because the `@live`
    // journeys are selected together against `live-world.sh`'s SQL-Server world and this one runs
    // against its own process on its own ports; selecting it into that set would have it open a
    // handshake file that world never writes. It has its own config and its own harness script.
    tag: ['@guest-exit'],
    capabilities: [
      'growth.unsubscribe.session-free',
      'growth.unsubscribe.cross-origin',
      'growth.dispatch.footer-exit'
    ]
  }),
  async ({ page, context, journey }) => {
    const world = readWorld();

    await journey.step('the dispatched message names an origin that is not the API\'s', async () => {
      const web = new URL(world.webOrigin);
      const api = new URL(world.apiOrigin);
      const exit = new URL(world.exitUrl);

      expect(web.protocol, 'the page is served over https').toBe('https:');
      expect(api.protocol, 'the API is served over https').toBe('https:');
      // THE PRECONDITION OF THE WHOLE JOURNEY. If these were one origin the browser would never
      // consult a CORS policy and a green run would mean nothing.
      expect(web.origin, 'page and API are different origins').not.toBe(api.origin);
      expect(web.hostname, 'page and API are different hosts, not merely different ports')
        .not.toBe(api.hostname);
      // And the link the guest is about to open is on the PAGE's origin, which is what makes it a
      // link a browser can follow rather than a machine URI.
      expect(exit.origin).toBe(web.origin);
      expect(exit.pathname).toBe('/preferences/unsubscribe');
      expect(exit.hash.startsWith('#token='), 'the credential rides the fragment').toBe(true);
      expect(world.exitUrl.includes('?token='), 'and never the query').toBe(false);

      return 'page ' + web.origin + ', API ' + api.origin +
        ', link on ' + exit.pathname + ' with a ' + (exit.hash.length - '#token='.length) +
        '-character fragment credential, from ' + world.submissions + ' dispatched messages';
    });

    await journey.step('the guest holds no session with the API', async () => {
      // Asserted, not assumed. Playwright gives each test a fresh context, but "fresh" is the
      // harness's promise and this journey's subject is precisely that the exit needs nothing the
      // guest does not already have.
      //
      // Scoped to the API ORIGIN rather than to the whole context, because the whole context is the
      // wrong question. The consumer web app sets first-party cookies of its own on its own origin
      // (a language preference, and analytics — see the finding below); none of them can ride a
      // cross-site request to the API, and none of them is a Growth preference session. What must be
      // empty is the jar the API would be sent, and that is what is read here.
      const before = await context.cookies(world.apiOrigin);
      expect(before, 'no cookie exists for the API origin before the guest arrives').toHaveLength(0);
      return 'the browser holds nothing the API would receive';
    });

    await journey.step('open the link, exactly as the recipient would', async () => {
      await arriveAt(page, world.exitUrl);
      await expect(page.locator('[data-test="done"]')).toBeVisible();
      await expect(page.locator('[data-test="done"]')).toContainText('Du er meldt av');
      await journey.shot('the withdrawal confirmed on the guest origin');
      return 'the done card rendered on arrival, with no confirmation step';
    });

    await journey.step('the withdrawal crossed the origin boundary and was permitted there', async () => {
      // What the browser was ALLOWED to do, read off the response it got rather than off the config
      // that produced it. A same-origin request would carry no such header at all, and a policy that
      // refused this origin would have failed the preflight before this response existed.
      const answers = journey.backendSample.filter(line => line.includes('/v1/growth/unsubscribe'));
      expect(answers.length, 'the browser reached the API origin for the unsubscribe').toBeGreaterThan(0);
      expect(answers.some(line => line.endsWith('-> 200')), 'and was answered 200: ' + answers.join(' | ')).toBe(true);
      expect(journey.backendSubjectResponses,
        'the subject of this journey was served by the origin the artifact names').toBeGreaterThan(0);
      return answers.join(' | ');
    });

    await journey.step('the withdrawal opened no session, which is why it works at all', async () => {
      // THE CLAIM THE WHOLE REMEDY RESTS ON. The preference centre is unreachable across these
      // origins because it first exchanges its link token for a `SameSite=Strict` session cookie on
      // the API origin, and no such cookie can ride a cross-site request. This exit works precisely
      // because it never asks for one. If a cookie appeared on the API origin here, the surface would
      // have acquired the same dependency and the deployed origins could not satisfy it either.
      const after = await context.cookies(world.apiOrigin);
      expect(after, 'the withdrawal set no cookie on the API origin: ' +
        after.map(c => c.name).join(', ')).toHaveLength(0);

      // Named explicitly as well as counted, because a future change that renames the session cookie
      // would keep the count honest and this name is the one the contract is written in.
      const all = await context.cookies();
      expect(all.map(c => c.name)).not.toContain('growth_pref_session');

      // NOT THIS JOURNEY'S SUBJECT, AND NOT ITS FIX — but it is what the browser did, and this
      // surface is a GDPR art. 7(3) withdrawal page reached by a guest who has consented to nothing
      // on the web origin. Recorded rather than asserted on: failing here would be this lane
      // silently taking ownership of a global analytics decision.
      const analytics = all.filter(c => /^_ga|^_gid$|^_gat$/.test(c.name)).map(c => c.name);
      if (analytics.length) {
        journey.finding('defect',
          'the guest withdrawal page sets analytics cookies before any consent',
          'The browser arrived at ' + world.exitUrl.split('#')[0] + ' holding nothing and left holding ' +
          analytics.join(', ') + ' on ' + world.webOrigin + '. That is the app-wide analytics plugin ' +
          'rather than anything Growth does, and it is out of this lane\'s boundary — but a consent ' +
          'withdrawal surface is the worst possible page for it to be true on.');
      }

      return 'no cookie on ' + world.apiOrigin + ' after the withdrawal completed' +
        (analytics.length ? '; ' + analytics.length + ' analytics cookies on the web origin (finding)' : '');
    });

    await journey.step('the credential is gone from the address bar', async () => {
      const url = page.url();
      expect(url).toContain('/preferences/unsubscribe');
      expect(url.includes('token='), 'no token survives in the address bar').toBe(false);
      return 'address bar reads ' + new URL(url).pathname + ' with no token';
    });

    await journey.step('the backend recorded the withdrawal, and the next campaign honours it', async () => {
      // A done card is a client-side fact. THIS is the durable one, and it is read from the backend's
      // own view of its database rather than from anything the browser was told.
      reportWithdrawalReturned();
      const outcome = await readOutcome(120 * 1000);
      expect(outcome.suppressionCount, 'a suppression row exists for this recipient').toBeGreaterThan(0);
      expect(outcome.leaverNextCampaign, 'the leaver is suppressed on the next campaign').toBe('Suppressed');
      // THE CONTROL, and without it the line above is worthless: a rolling 7-day frequency cap also
      // produces `Suppressed`, so a world with one recipient would pass against a withdrawal that did
      // nothing at all. The other recipient never withdrew and must still be accepted.
      expect(outcome.stayerNextCampaign, 'the recipient who stayed still receives it').toBe('ProviderAccepted');
      return 'suppressions ' + outcome.suppressionCount + ', next campaign — leaver ' +
        outcome.leaverNextCampaign + ', control recipient ' + outcome.stayerNextCampaign;
    });

    await journey.step('a second click on the same link is still a done card', async () => {
      await arriveAt(page, world.exitUrl);
      await expect(page.locator('[data-test="done"]')).toBeVisible();
      return 'replayed through about:blank so the component genuinely remounted; still the done card';
    });

    await journey.step('arriving with no token at all is a stated state, not a blank page', async () => {
      await arriveAt(page, world.webOrigin + '/preferences/unsubscribe');
      await expect(page.locator('[data-test="no-token"]')).toBeVisible();
      await journey.shot('a token-less arrival says so');
      return 'the no-token card rendered';
    });
  }
);
