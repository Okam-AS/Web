// THE ARTIFACT CONTRACT.
//
// A green test proves nothing to this project's evidence standard. Sixteen module capabilities are
// stuck at `built-unverified` precisely because the only evidence they can offer is suite evidence,
// and suite evidence has repeatedly coexisted with code no user could reach. What promotes a
// capability is a record that a browser did the thing — so the record, not the assertion, is the
// deliverable here. A journey that passes and writes no artifact has produced nothing.
//
// ---- WHERE ------------------------------------------------------------------------------------
//
//   artifacts/journeys/<name>.playwright.json                    the STRONGEST run on record
//   artifacts/journeys/runs/<name>.<backendKey>.playwright.json  this run, filed under its backend
//   artifacts/journeys/runs/ledger.jsonl                         append-only, one line per run
//   artifacts/journeys/<name>/<backendKey>/NN-<slug>.png         the screenshots that journey chose to take,
//                                                                and the PDFs two of them print
//
// `<name>` is the journey's own id (the `journey` annotation on the test, see `journeyTest` below),
// NOT the test title and NOT the file name — those are prose and will be reworded. The id is the
// join key a probe reads.
//
// The canonical path and the JSON shape are unchanged, because probes and the plan log join on them.
// What changed is that it is no longer whoever ran last: a run only ever overwrites the file of its
// OWN backend, and the canonical slot is taken only by a run that ranks strictly higher (or by the
// same backend's newer run). `test/e2e/support/artifact-store.js` holds that ruling and the reasons.
// It exists because a fixture re-run had silently replaced the live pass of all three `@live`
// journeys — `playwright.config.js` inverts its tag filter only in live mode, so the live-tagged
// journeys run in fixture mode too, and used to write to the same name.
//
// ---- SHAPE ------------------------------------------------------------------------------------
//
// {
//   "journey":       "workforce-schedule-publish",   // stable id; the join key
//   "title":         "A manager builds and publishes a week",
//   "status":        "passed" | "failed",
//   "startedAtUtc":  "2026-07-31T19:04:11.221Z",
//   "finishedAtUtc": "2026-07-31T19:04:23.880Z",
//   "durationMs":    12659,
//   "capabilities":  ["workforce.schedule.author", ...],  // what this run is evidence FOR
//   "surface":       "admin" | "public",
//   "backend":       "fixture" | "live",
//   "baseUrl":       "http://127.0.0.1:3010",
//   "apiBaseUrl":    "http://127.0.0.1:4010",
//   "commit":        "fc25ff3…",                     // the tree the HARNESS came from, i.e. this repo
//   "underTest":     "ConsumerWeb@e5fee1c core@8931bc3",  // when the app driven is NOT this repo
//   "backendProbe":  { "url": "…/health", "status": 200, "body": "Healthy" },  // live only; see below
//   "backendBuild":  { "id": "OkamAPI@ddc27fa…", "source": "env:E2E_API_BUILD",
//                      "short": "ddc27fa", "detail": "branch feature/…" } | null,   // WHICH BUILD ANSWERED
//                    // fixture runs answer it too, as { "id": "fixture@fc25ff3…",
//                    // "source": "fixture:test/e2e/fixture/api-server.js", … } — never `<repo>@<sha>`,
//                    // which would read as a claim about an API. null only when nothing could say.
//   "artifact":      { "key": "live-5961-ddc27fa",       // the backend this run is filed under
//                      "file": "artifacts/journeys/runs/…",
//                      "canonical": true,                // did it take <name>.playwright.json?
//                      "canonicalHeldBy": "live-5961-ddc27fa",   // and if not, who holds it
//                      "provisional": false,             // true = written at start, run not finished
//                      "supersedes": null | { "key": …, "status": "passed", "finishedAtUtc": …,
//                        "file": "artifacts/journeys/runs/….superseded.playwright.json" } },
//                      // set when THIS run replaced a STRONGER record of its own backend: that record
//                      // is kept whole at `file` instead of being overwritten. See artifact-store.js.
//   "backendServed": 37,                             // responses the browser got FROM apiBaseUrl
//   "backendSubjectServed": 31,                      // …of which were the journey's SUBJECT, i.e. xhr/fetch
//                                                    // to a path that is not the sign-in/store shell
//   "foreignSubjectServed": 0,                       // the same, answered by some OTHER origin
//   "foreignSubjectSample": [],                      // …and who
//   "backendSample": ["GET http://127.0.0.1:5951/feature-flags/catalog -> 200", …],
//   "browser":       "chromium",
//   "steps": [
//     { "n": 1, "name": "sign in as the manager",
//       "status": "passed" | "failed",
//       "startedAtUtc": "…", "durationMs": 1904,
//       "detail": "…" | null, "error": null }
//   ],
//   "findings":      [ { "severity": "defect"|"note", "summary": "…", "detail": "…" } ],
//   "consoleErrors": [ "…" ],       // browser console `error` entries seen during the run
//   "failedRequests":[ { "method": "GET", "url": "…", "status": 500 } ],
//   "screenshots":   [ "workforce-schedule-publish/03-published.png" ],  // relative to artifacts/journeys
//   "error":         null | "the assertion that ended it"
// }
//
// ---- `backend` IS A CLAIM, AND CLAIMS GET CHECKED ---------------------------------------------
//
// `"backend": "live"` is the most consequential word in this file: it is what lets a capability leave
// `built-unverified`, and for a long time it was produced by nothing more than an environment
// variable being set. So both halves are now guarded, symmetrically:
//
//   fixture   the fixture is asked what it served; zero — or a fixture that cannot be asked at all,
//             because it died mid-run — means the app talked to somebody else.
//   live      the declared origin is probed before the browser opens (and refused outright if it
//             answers `/__fixture/health`, i.e. if live mode has been pointed at the throwaway
//             fixture), and afterwards the browser's own responses FROM that origin are counted.
//             Zero fails the run.
//   both      and, because BOTH of those are floors at zero that SIGNING IN clears on its own, a run
//             whose subject calls were all answered by a different origin fails too — see
//             `judgeSubjectOrigin`. That is the case where the served count is honestly non-zero and
//             the artifact's backend claim is still a lie.
//
// `backendServed` and `backendSample` are in the artifact so the claim is auditable by a reader who
// was not there, rather than only by the process that wrote it.
//
// WHICH backend, though, is a separate question from whether one answered, and `/health` cannot
// settle it: it is unauthenticated and its whole body is the word "Healthy", so a world built from a
// stale checkout — or a different lane's world that has since taken the same port — satisfies it
// identically. `backendBuild` is the answer, resolved at run time by `artifact-store.js` from the
// WORLD STAMP the world script left for this origin, else from `E2E_API_BUILD`, else from
// `OKAM_API_REPO`'s own HEAD, else from whoever holds the port, else from the API's published route
// surface, and left null rather than guessed. It is also part of the filename a run is stored under,
// so two builds cannot overwrite each other's record.
//
//   test/e2e/scripts/live-world.sh                       # stamps the world it builds, then prints:
//   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 npm run test:e2e
//
// is the strongest form. The stamp (`artifacts/world/live/<host>-<port>.json`, see
// `support/world-stamp.js`) is what makes the second line enough on its own: the identity comes from
// the script that did the build and is refused when the process it started is gone, so a run in a
// fresh shell names the right checkout without asking the port anything — and cannot be handed the
// wrong one by a command copied from a world that is no longer up.
//
// STATUS IS THE RUN'S, NOT THE PRODUCT'S. A journey that documents where a broken flow stops still
// reports `passed` when it successfully documented that — the defect goes in `findings`, which is
// what a reader is meant to act on. `failed` means the journey itself did not complete: the page did
// not do what it was asserted to do, and nobody has decided what that means yet.
//
// ---- WHY THE FINAL RECORD IS WRITTEN IN FIXTURE TEARDOWN --------------------------------------
//
// So that a FAILING journey still leaves a record. A try/finally in each spec would work until
// somebody forgot one; a fixture cannot be forgotten, and Playwright runs its teardown whether the
// body threw or not. `testInfo.status` and `testInfo.errors` are both settled by then.
//
// BUT TEARDOWN IS NOT GUARANTEED TO RUN AT ALL, and for a while that was the store's second lie: a
// run that was killed, or timed out, or died asking a dead fixture what it served, wrote nothing —
// and the PREVIOUS run's file stayed exactly where it was, labelled passed, reading as this run's
// result. So a provisional record is now written BEFORE the browser opens, `"status": "running"`,
// and it replaces its own backend's standing record. Whatever happens to the process afterwards, the
// worst a reader can find is a run that visibly did not finish.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const base = require('@playwright/test');
const store = require('./artifact-store');
const { isShellPath, judgeSubjectOrigin } = require('./journey-assertions');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts', 'journeys');

function commitSha () {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * A build identity taken from the API ITSELF, for the case where nobody told us which checkout is
 * running — which is every live run today, because `live-world.sh` exports nothing about the tree it
 * built and `OKAM_API_REPO` lives in the shell that stood the world up, not the one running the test.
 *
 * The API's published route surface is the strongest thing available without its cooperation: the
 * sorted list of `METHOD /path` it declares, hashed. Two checkouts whose routes differ hash
 * differently, so they cannot overwrite each other's artifact. It is a SURFACE fingerprint and the
 * record says so — a build that changed only behaviour behind an unchanged route set fingerprints
 * identically, and a reader must not read this as a commit.
 *
 * Only the hash and the route count are kept. The document itself is never written to an artifact.
 */
async function fingerprintFromSwagger (origin) {
  const url = origin + '/swagger/v1/swagger.json';
  try {
    // A real API that does not publish swagger must cost this preflight seconds, not minutes.
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) { return null; }
    const document = await response.json();
    const paths = (document && document.paths) || {};
    const routes = [];
    Object.keys(paths).sort().forEach((route) => {
      Object.keys(paths[route] || {}).sort().forEach((method) => {
        routes.push(method.toUpperCase() + ' ' + route);
      });
    });
    if (!routes.length) { return null; }
    const digest = store.sha(routes.join('\n'), 7);
    const version = (document.info && document.info.version) || null;
    return {
      id: 'api-routes@' + digest + (version ? ' v' + version : ''),
      source: 'probe:' + url,
      short: digest,
      detail: routes.length + ' published routes, hashed; a surface fingerprint, not a commit'
    };
  } catch (error) {
    return null;
  }
}

// Some of these URLs carry a bearer of value in the query string: the Company Meals funding
// authorization travels as `?reservationToken=` on cart completion (the API exposes no other
// inbound path for it). The artifact is a file on disk that gets read, copied and pasted into
// reviews, so a refused completion must not write a live token into it. Redacted by NAME, so a
// token added to another route is covered the day it is named here rather than the day it leaks.
const SECRET_QUERY_PARAMS = ['reservationToken', 'token', 'accessToken', 'code', 'secret'];

function redactUrl (url) {
  try {
    const parsed = new URL(url);
    let touched = false;
    SECRET_QUERY_PARAMS.forEach((name) => {
      if (parsed.searchParams.has(name)) { parsed.searchParams.set(name, '***redacted***'); touched = true; }
    });
    return touched ? parsed.toString() : url;
  } catch (e) {
    return url;
  }
}

function slug (text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

/** The origin of a URL, or null when it is not one. Used to attribute traffic to the declared API. */
function originOf (url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return null;
  }
}

/** The path of a URL, query dropped — what `isShellPath` matches against. */
function pathOf (url) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return '';
  }
}

/**
 * `resourceType()` is documented but is read here defensively: it is the discriminator the
 * split-origin guard rests on, and a Playwright version that ever stopped answering it must make
 * this classify nothing rather than throw inside an event handler, where the rejection would be
 * unhandled and the run would fail for a reason unrelated to the product.
 */
function safeResourceType (response) {
  try {
    return response.request().resourceType();
  } catch (e) {
    return null;
  }
}

class JourneyRecorder {
  constructor (meta) {
    this.meta = meta;
    this.startedAt = Date.now();
    this.steps = [];
    this.findings = [];
    this.consoleErrors = [];
    this.failedRequests = [];
    this.screenshots = [];
    // What the browser actually got FROM the declared API origin. This is the live-mode counterpart of
    // the fixture's `/__fixture/stats.served`: the one number that distinguishes a journey that talked
    // to the backend its artifact names from one that never touched it. Kept per-origin-match rather
    // than per-request-count so a run against a DIFFERENT origin cannot inflate it.
    this.backendResponses = 0;
    this.backendSample = [];
    // ...AND WHICH OF THEM WERE THE JOURNEY'S SUBJECT. `backendResponses` counts everything the named
    // origin answered, which signing in reaches on its own — so on its own it cannot tell a run that
    // exercised the module from a run that only opened the door there and did the rest elsewhere.
    // `isShellPath` splits the two, and the same split is applied to every OTHER origin the browser
    // fetched from, because "nobody served the subject" and "somebody else did" are different
    // findings and only the second is a lie about the backend. See `judgeSubjectOrigin`.
    this.backendSubjectResponses = 0;
    this.foreignSubjectResponses = 0;
    this.foreignSubjectSample = [];
    // Computed once, and by the same function the store files the JSON with, so a run's pictures and
    // its record can never end up under different names for the same backend.
    this.backendKey = store.backendKeyFor(meta);
    this._apiOrigin = originOf(meta.apiBaseUrl);
    // The app's own origin, so its documents, bundles and any same-origin call it makes are never
    // mistaken for a second API.
    this._appOrigin = originOf(meta.baseUrl);
    this._page = null;
  }

  /** Attaches the console and network listeners whose output lands in the artifact. */
  watch (page) {
    this._page = page;
    page.on('console', (message) => {
      if (message.type() === 'error') { this.consoleErrors.push(message.text()); }
    });
    page.on('pageerror', (error) => {
      this.consoleErrors.push('pageerror: ' + (error && error.message));
    });
    page.on('requestfailed', (request) => {
      this.failedRequests.push({ method: request.method(), url: redactUrl(request.url()), status: null, failure: (request.failure() || {}).errorText || null });
    });
    page.on('response', (response) => {
      const origin = originOf(response.url());
      // `xhr` and `fetch` ONLY. A webfont, a favicon or a script from a CDN is not a call this
      // journey made about its subject, and counting one would turn the split-origin guard below into
      // a guard that reds on a page having assets — which is a guard somebody deletes.
      const kind = safeResourceType(response);
      const isApiCall = kind === 'xhr' || kind === 'fetch';
      const subject = isApiCall && !isShellPath(pathOf(response.url()));

      if (this._apiOrigin && origin === this._apiOrigin) {
        this.backendResponses += 1;
        if (subject) { this.backendSubjectResponses += 1; }
        // A handful is enough to READ; the count is what is asserted on. Redacted like every other URL
        // that reaches this file, because a funding token travels in a query string.
        if (this.backendSample.length < 8) {
          this.backendSample.push(response.request().method() + ' ' + redactUrl(response.url()) + ' -> ' + response.status());
        }
      } else if (subject && origin && origin !== this._appOrigin) {
        this.foreignSubjectResponses += 1;
        if (this.foreignSubjectSample.length < 8) {
          this.foreignSubjectSample.push(response.request().method() + ' ' + redactUrl(response.url()) + ' -> ' + response.status());
        }
      }
      if (response.status() >= 400) {
        this.failedRequests.push({ method: response.request().method(), url: redactUrl(response.url()), status: response.status() });
      }
    });
  }

  /**
   * One named step. Times it, records it, and re-throws — so a failing step is recorded as the step
   * that failed AND still fails the test.
   *
   * `fn` may return a string, which becomes the step's `detail`. That is the place to put what the
   * step actually observed (the revision id, the amount on screen), because "clicked publish" is not
   * evidence and "publication 1, 2 recipients" is.
   */
  async step (name, fn) {
    const entry = {
      n: this.steps.length + 1,
      name,
      status: 'passed',
      startedAtUtc: new Date().toISOString(),
      durationMs: 0,
      detail: null,
      error: null
    };
    this.steps.push(entry);
    const began = Date.now();
    try {
      const detail = await fn();
      if (typeof detail === 'string' && detail) { entry.detail = detail; }
      return detail;
    } catch (error) {
      entry.status = 'failed';
      entry.error = (error && error.message) || String(error);
      throw error;
    } finally {
      entry.durationMs = Date.now() - began;
    }
  }

  /** Something true about the product that the journey saw and a reader must act on. */
  finding (severity, summary, detail) {
    this.findings.push({ severity, summary, detail: detail || null });
  }

  /**
   * WHERE THIS RUN'S FILES GO — screenshots, and the PDFs two journeys print.
   *
   * Under the BACKEND KEY, for the same reason the JSON is: a fixture re-run used to overwrite the
   * pixels a live artifact referenced, so the strongest record on disk could end up illustrated by the
   * weakest run's screenshots while still saying `"backend": "live"`. Same lie, one level down.
   */
  get dir () {
    return path.join(ARTIFACT_DIR, this.meta.journey, this.backendKey);
  }

  /** The same, written the way an artifact or a review should quote it — never an absolute path. */
  get relativeDir () {
    return 'artifacts/journeys/' + this.meta.journey + '/' + this.backendKey;
  }

  /** A screenshot, filed under this journey and this backend, and referenced from its JSON. */
  async shot (name) {
    if (!this._page) { return null; }
    fs.mkdirSync(this.dir, { recursive: true });
    const file = String(this.screenshots.length + 1).padStart(2, '0') + '-' + slug(name) + '.png';
    await this._page.screenshot({ path: path.join(this.dir, file), fullPage: true });
    const relative = this.meta.journey + '/' + this.backendKey + '/' + file;
    this.screenshots.push(relative);
    return relative;
  }

  toJSON (status, error) {
    const finished = Date.now();
    return {
      journey: this.meta.journey,
      title: this.meta.title,
      status,
      startedAtUtc: new Date(this.startedAt).toISOString(),
      finishedAtUtc: new Date(finished).toISOString(),
      durationMs: finished - this.startedAt,
      capabilities: this.meta.capabilities,
      surface: this.meta.surface,
      backend: this.meta.backend,
      baseUrl: this.meta.baseUrl,
      apiBaseUrl: this.meta.apiBaseUrl,
      commit: this.meta.commit,
      underTest: this.meta.underTest || null,
      // WHAT MAKES `backend` CHECKABLE RATHER THAN A LABEL. `backendProbe` is what the declared API
      // origin answered to a request this harness made itself before the browser opened; `backendServed`
      // is how many responses the browser then got from that same origin. A reader who distrusts the
      // word "live" can read both, and a run that produced the word without the traffic is failed below.
      backendProbe: this.meta.backendProbe || null,
      // WHICH BUILD ANSWERED. `commit` above is this repo's HEAD and says nothing about the API — one
      // live world on this branch was built from a detached worktree and its artifacts still named the
      // frontend tree. Null when nothing could tell us, never inferred.
      backendBuild: this.meta.backendBuild || null,
      backendServed: this.backendResponses,
      // FILED EVERY RUN, not only when a guard trips. `backendServed` alone reads as "the backend
      // answered" when it may only mean "the login did"; these two say how much of what the journey
      // is ABOUT reached the origin the artifact names, and how much of it went somewhere else. A
      // number on the record is what stops the guard's threshold from quietly becoming slack.
      backendSubjectServed: this.backendSubjectResponses,
      foreignSubjectServed: this.foreignSubjectResponses,
      foreignSubjectSample: this.foreignSubjectSample,
      backendSample: this.backendSample,
      browser: this.meta.browser,
      steps: this.steps,
      findings: this.findings,
      consoleErrors: this.consoleErrors,
      failedRequests: this.failedRequests,
      screenshots: this.screenshots,
      error: error || null
    };
  }

  /**
   * Files the run. Returns what `artifact-store.writeRun` returned, so the caller can say whether this
   * run took the canonical slot or was outranked by a stronger one already on record.
   */
  write (status, error) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    return store.writeRun(ARTIFACT_DIR, this.toJSON(status, error));
  }

  /**
   * Files that the run has STARTED. Its own backend's standing record is replaced by a visibly
   * unfinished one, so an interrupted run cannot leave its predecessor's pass reading as this result.
   */
  begin () {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    return store.beginRun(ARTIFACT_DIR, this.toJSON('running', null));
  }
}

/**
 * The extended `test` every journey imports.
 *
 * A spec declares its identity through `test.info().annotations` — set with `journeyTest(...)` below
 * rather than by hand, so a journey cannot be written without an id and a capability list.
 */
const test = base.test.extend({
  // `auto: true` on purpose: the artifact is the deliverable, so it must not be possible to write a
  // journey that forgets to produce one by leaving `journey` out of its destructured fixtures.
  journey: [async ({ page, browserName, baseURL }, use, testInfo) => {
    const annotation = type => (testInfo.annotations.find(a => a.type === type) || {}).description;
    // The id is not optional. A journey filed under a slug of its prose title would be re-filed the
    // day somebody rewords the title, and every probe joined on the old name would silently find
    // nothing — which reads exactly like "this capability has no evidence".
    if (!annotation('journey')) {
      throw new Error(
        'This test has no `journey` annotation, so its artifact would have no stable name.\n' +
        'Declare it with `journeyDetails({ journey, capabilities, surface })` as the test details:\n' +
        '  test(title, journeyDetails({ journey, capabilities, surface }), async ({ page, journey }) => ...)'
      );
    }
    const meta = {
      journey: annotation('journey'),
      title: testInfo.title,
      capabilities: (annotation('capabilities') || '').split(',').map(s => s.trim()).filter(Boolean),
      surface: annotation('surface') || 'unknown',
      backend: process.env.E2E_API_BASE_URL ? 'live' : 'fixture',
      baseUrl: baseURL || null,
      apiBaseUrl: process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010)),
      commit: commitSha(),
      // The app a journey drives is not always THIS repo: the consumer checkout lives in the
      // sibling ConsumerWeb (see playwright.consumer.config.js). `commit` would then name the tree
      // the HARNESS came from and say nothing about the code under test, so a journey that crosses
      // a repo boundary declares what it actually drove and the artifact carries both.
      underTest: annotation('under-test') || null,
      // Which BUILD is on the other end of `apiBaseUrl`, answered for BOTH backends.
      //
      // The fixture's answer used to be a deliberate `null`, on the reasoning that resolving it would
      // put the FRONTEND's commit in `backendBuild` and that is the confusion the field exists to end.
      // The danger was real; silence was the wrong remedy. It left nineteen of the twenty-two
      // artifacts standing on this branch unable to answer "which build answered this run?" at all, so
      // the field could not be read as an answer anywhere. `fixtureBuild` names it `fixture@<sha>`
      // with the fixture's own file as the source — unmistakable for an API build — and the ordering
      // is untouched, because `backend` is compared before identity and two fixture runs share one
      // key. The live half is filled in by the preflight below, from the strongest source that will
      // answer, and stays `null` rather than guessed when none will.
      backendBuild: process.env.E2E_API_BASE_URL ? null : store.fixtureBuild(REPO_ROOT),
      browser: browserName
    };

    // A journey must start from a world it did not inherit. The browser CONTEXT is already fresh per
    // test (Playwright's doing), but the fixture backend is one process holding one set of
    // revisions and proposals — without this, running the suite twice against a reused server would
    // fail on the second pass ("a revision already covers this range", "already accepted"), which is
    // the worst kind of flake: it looks like a product defect and is not.
    if (meta.backend === 'fixture') {
      const response = await fetch(meta.apiBaseUrl + '/__fixture/reset', { method: 'POST' });
      if (!response.ok) { throw new Error('fixture reset failed: HTTP ' + response.status); }
    }

    // ---- THE LIVE PREFLIGHT ---------------------------------------------------------------------
    //
    // A live run has no `/__fixture/reset` to fail on, so until now it had NO check of any kind: set
    // E2E_API_BASE_URL to anything at all and every artifact would say `"backend": "live"` regardless
    // of what — if anything — was on the other end. The word has to cost something to say.
    //
    // Two things are established here, both BEFORE the browser opens, so a bad target fails with a
    // sentence rather than as a selector timeout eighty lines into a journey:
    //
    //   1. Something is actually there, and its answer is recorded in the artifact.
    //   2. It is NOT the throwaway fixture. Pointing live mode at `test/e2e/fixture/api-server.js`
    //      would produce the single most dangerous artifact this instrument can emit: a file that
    //      claims a live backend, names a real-looking origin, and describes a run against a
    //      hard-coded store 42 that exists in no database. The fixture answers `/__fixture/health`
    //      and a real WebApi has no such route, so the difference is one request.
    if (meta.backend === 'live') {
      const origin = meta.apiBaseUrl.replace(/\/+$/, '');
      // THE FIXTURE TELL IS CHECKED FIRST, and the order is the whole point of it. The fixture serves
      // no `/health`, so a health-first preflight would refuse this case with "that backend is not
      // healthy" — true, useless, and pointing the reader at the wrong problem entirely.
      const fixtureTell = await fetch(origin + '/__fixture/health').then(r => r.ok).catch(() => false);
      if (fixtureTell) {
        throw new Error(
          'live mode is pointed at the THROWAWAY FIXTURE (' + meta.apiBaseUrl + ' answers /__fixture/health).\n' +
          'Every artifact from this run would claim "backend": "live" while describing the fixture world — ' +
          'the one result worse than having no live run at all. Point E2E_API_BASE_URL at a real API.');
      }
      const probeUrl = origin + '/health';
      let probe;
      try {
        const response = await fetch(probeUrl);
        probe = { url: probeUrl, status: response.status, body: (await response.text()).trim().slice(0, 120) };
      } catch (error) {
        throw new Error(
          'live mode was asked for, but nothing answered ' + probeUrl + ' (' + ((error && error.message) || error) + ').\n' +
          'Stand a world up first:  OKAM_API_REPO=<path> test/e2e/scripts/live-world.sh');
      }
      if (probe.status >= 400) {
        throw new Error('live mode: ' + probeUrl + ' answered HTTP ' + probe.status + ' — that backend is not healthy.');
      }
      meta.backendProbe = probe;

      // `/health` proves SOMETHING is there; it cannot prove WHICH. Its body is the word "Healthy" and
      // it takes no credential, so a world built three releases ago — or another lane's world that has
      // since taken this port — satisfies it exactly as well as the current one. Both of those were
      // standing on this machine on 2026-08-02, on different ports, out of different api worktrees at
      // different commits, and both answered "Healthy".
      meta.backendBuild = store.resolveBackendBuild(process.env, meta.apiBaseUrl) ||
        await fingerprintFromSwagger(origin);

      if (!meta.backendBuild) {
        // NOT a failure, and deliberately not treated as one: refusing the run would stop live evidence
        // being produced at all on a machine where nothing can answer the question. But it is the
        // difference between evidence and an anecdote, so it is said once, plainly, with the fix.
        //
        // The STAMP's verdict is quoted, because "no world stamp for this origin" and "the world it
        // describes is gone (no process 41234)" send an operator to two completely different places,
        // and neither is guessable from a bare `unidentified`.
        process.stdout.write(
          '[journey] ' + meta.journey + ': NOTHING could say which BUILD is answering on ' + meta.apiBaseUrl + '.\n' +
          '          world stamp: ' + (store.readWorldStamp(meta.apiBaseUrl).reason || 'usable') + '.\n' +
          '          This run will be filed as `unidentified` and will not outrank one that named its build.\n' +
          '          Stand the world up with test/e2e/scripts/live-world.sh, which stamps it, or declare it:\n' +
          '            E2E_API_BUILD="OkamAPI@$(git -C "$OKAM_API_REPO" rev-parse HEAD)" ...\n');
      }
    }

    const recorder = new JourneyRecorder(meta);
    recorder.watch(page);

    // THE RUN IS ON RECORD BEFORE THE BROWSER OPENS. Placed after the preflight rather than before it
    // so a run that was refused a backend files nothing — it never ran — and after `meta` is settled so
    // the provisional lands under the same backend key the final record will. From here on the process
    // may die any way it likes and the store still says "running", never a stale "passed".
    recorder.begin();

    await use(recorder);

    // `testInfo.status` is settled here. `errors` is checked too: a soft assertion failure leaves
    // the status 'passed' in some versions, and a journey with a failed expectation is not evidence.
    let failed = testInfo.status !== 'passed' || testInfo.errors.length > 0;
    let error = testInfo.errors.length ? testInfo.errors[0].message : null;
    // Set by either wrong-world guard below, and RE-THROWN after the artifact is on disk. Marking the
    // artifact was not enough: reproduced on 2026-08-02 by pointing a live-labelled run at a dev
    // server compiled against the fixture, the run wrote `"status": "failed"` into the file and
    // Playwright still printed `1 passed` and exited 0. A guard whose whole subject is "this run is
    // not what it says it is" cannot leave the runner — and therefore CI — reporting success.
    //
    // `test/e2e/scripts/guard-proof.js` is the standing proof of that, and it is a proof rather than
    // an assertion because the exit code is what was lying: it drives real `playwright test` children
    // and reads their exit status, then repeats the two mislabelled runs against a copy of THIS file
    // with the re-throw removed and requires them to go green again. Delete the re-throw below and
    // that script goes red; change its shape and the script refuses to report success at all.
    let wrongWorld = false;

    // THE WRONG-WORLD GUARD. `reuseExistingServer` adopts whatever is already on the port, so a dev
    // server somebody else started against the real API would be used silently — and the journeys
    // would pass, against production, while the artifact said `"backend": "fixture"`. A journey that
    // sent this fixture no traffic at all did not talk to it, and a green run in that case is the
    // most dangerous result this instrument could produce.
    if (meta.backend === 'fixture' && !failed) {
      // ASKED INSIDE A TRY, because this line used to be able to throw PAST the artifact write: a
      // fixture that had died mid-run makes the fetch reject, the fixture teardown unwinds, nothing is
      // written, and the previous run's file stays on disk labelled passed. A fixture that cannot be
      // asked what it served is the same finding as one that served nothing — the run's backend claim
      // is not checkable — so it lands in the same branch rather than as an exception.
      let stats = null;
      try {
        stats = await fetch(meta.apiBaseUrl + '/__fixture/stats').then(r => r.json());
      } catch (fetchError) {
        stats = { served: 0, unreachable: (fetchError && fetchError.message) || String(fetchError) };
      }
      if (stats.unreachable) {
        failed = true;
        error = 'The fixture backend at ' + meta.apiBaseUrl + ' could not be asked what it served (' +
          stats.unreachable + '). It died during this journey, or was never the thing the app was ' +
          'talking to. Either way this run cannot support the claim its artifact would make.';
        recorder.finding('defect', 'the fixture could not be asked what it served', error);
        wrongWorld = true;
      } else if (!stats.served) {
        failed = true;
        error = 'The fixture backend answered nothing during this journey. The app under test is ' +
          'talking to some other API — most likely a dev server already running on ' + meta.baseUrl +
          ' that was adopted by `reuseExistingServer`. Stop it and run again.';
        recorder.finding('defect', 'journey ran against the wrong backend', error);
        wrongWorld = true;
      }
    }

    // THE SAME GUARD FROM THE LIVE SIDE. `reuseExistingServer` is just as willing to adopt a dev
    // server built against the fixture, or against some other origin entirely — and the failure mode
    // is identical: a green journey and an artifact naming a backend it never reached. The fixture
    // half above asks the fixture what it served; there is nobody to ask here, so the browser's own
    // traffic is the evidence, attributed by ORIGIN rather than counted in total.
    if (meta.backend === 'live' && !failed && recorder.backendResponses === 0) {
      failed = true;
      error = 'This journey is labelled live against ' + meta.apiBaseUrl + ', and the browser received ' +
        'NOT ONE response from that origin. Whatever it exercised, it was not that backend — most ' +
        'likely a dev server already running on ' + meta.baseUrl + ' that was adopted by ' +
        '`reuseExistingServer` and compiled against a different API_BASE_URL. Stop it and run again.';
      recorder.finding('defect', 'live journey never reached the backend it names', error);
      wrongWorld = true;
    }

    // THE SAME LIE, ONE STEP SHORTER OF TOTAL. Both branches above are floors at zero, and signing in
    // clears both: `stats.served` counts the login, and so does `backendResponses`. So a build whose
    // subject calls left for a different origin — a client with its own base URL, a half-adopted dev
    // server — would reach the named backend for the door and nothing else, and file an artifact
    // naming a backend that answered only `POST /user/login`. This is that case, and ONLY that case:
    // it needs the named origin to have served none of the journey's subject WHILE another origin
    // served some. Applied to both backend kinds, because neither floor could see it.
    if (!failed) {
      const split = judgeSubjectOrigin({
        apiBaseUrl: meta.apiBaseUrl,
        subjectFromBackend: recorder.backendSubjectResponses,
        subjectFromElsewhere: recorder.foreignSubjectResponses,
        elsewhereSample: recorder.foreignSubjectSample
      });
      if (split) {
        failed = true;
        error = split;
        recorder.finding('defect', 'journey subject calls went to a different origin', error);
        wrongWorld = true;
      }
    }

    const filed = recorder.write(failed ? 'failed' : 'passed', error);
    try {
      testInfo.attachments.push({ name: 'journey', path: filed.runFile, contentType: 'application/json' });
      if (filed.canonicalFile) {
        testInfo.attachments.push({ name: 'journey (canonical)', path: filed.canonicalFile, contentType: 'application/json' });
      }
    } catch (e) { /* the artifact on disk is the record; the HTML report link is a nicety */ }

    // SAID OUT LOUD, because a run that quietly did not take the canonical slot looks exactly like a
    // run that did, and the reader who most needs to know is the one about to cite the canonical file
    // as this run's evidence. It is not an error: the loser is on disk under its own backend key and in
    // the ledger, and the slot is held by a run this one did not outrank.
    if (!filed.canonical) {
      process.stdout.write(
        '[journey] ' + meta.journey + ': filed as ' + path.relative(REPO_ROOT, filed.runFile) + '.\n' +
        '          artifacts/journeys/' + meta.journey + '.playwright.json still belongs to `' + filed.heldBy +
        '`, which this run did not outrank.\n' +
        '          To hand it over deliberately, delete that file and run again.\n');
    }

    // AFTER the artifact is written, never before: the record of a wrong-world run is the most useful
    // thing this fixture can leave behind, and throwing first would destroy it. Only re-thrown when
    // the journey itself was otherwise green — a run that already failed has its own error, and
    // replacing it with this one would hide what actually broke.
    if (wrongWorld) { throw new Error(error); }
  }, { auto: true }]
});

/**
 * The DETAILS object that turns a Playwright test into a journey. Used as the second argument to
 * `test(...)`, which is where Playwright reads tags and annotations from.
 *
 * It has to be the details object rather than something the body pushes: the recorder fixture is
 * built BEFORE the body runs, so an annotation added inside the body does not exist yet. It is also
 * why each spec calls `test(...)` itself instead of going through a wrapper — a wrapper would put
 * this file at the top of the call stack, and Playwright would then report every journey's location
 * as `support/journey.js` rather than as the spec somebody wants to open.
 *
 * `journey` is the artifact's name and a probe's join key, `capabilities` is what a passing run is
 * evidence FOR, and `surface` says whether it went through authentication.
 */
function journeyDetails ({ journey, capabilities, surface, tag, underTest }) {
  return {
    // `@fixture` means "this journey depends on state only the fixture backend has". It is what a
    // live-backend run filters OUT — see playwright.config.js.
    tag: tag || ['@fixture'],
    annotation: [
      { type: 'journey', description: journey },
      { type: 'capabilities', description: (capabilities || []).join(',') },
      { type: 'surface', description: surface || 'unknown' },
      { type: 'under-test', description: underTest || '' }
    ]
  };
}

module.exports = { test, expect: base.expect, journeyDetails, ARTIFACT_DIR };
