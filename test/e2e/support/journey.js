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
//   artifacts/journeys/<name>.playwright.json     one file per journey, overwritten each run
//   artifacts/journeys/<name>/NN-<slug>.png       the screenshots that journey chose to take
//
// `<name>` is the journey's own id (the `journey` annotation on the test, see `journeyTest` below),
// NOT the test title and NOT the file name — those are prose and will be reworded. The id is the
// join key a probe reads.
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
//   "commit":        "fc25ff3…",                     // the tree this evidence describes
//   "underTest":     "ConsumerWeb@e5fee1c core@8931bc3",  // when the app driven is NOT this repo
//   "backendProbe":  { "url": "…/health", "status": 200, "body": "Healthy" },  // live only; see below
//   "backendServed": 37,                             // responses the browser got FROM apiBaseUrl
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
//   fixture   the fixture is asked what it served; zero means the app talked to somebody else.
//   live      the declared origin is probed before the browser opens (and refused outright if it
//             answers `/__fixture/health`, i.e. if live mode has been pointed at the throwaway
//             fixture), and afterwards the browser's own responses FROM that origin are counted.
//             Zero fails the run.
//
// `backendServed` and `backendSample` are in the artifact so the claim is auditable by a reader who
// was not there, rather than only by the process that wrote it.
//
// STATUS IS THE RUN'S, NOT THE PRODUCT'S. A journey that documents where a broken flow stops still
// reports `passed` when it successfully documented that — the defect goes in `findings`, which is
// what a reader is meant to act on. `failed` means the journey itself did not complete: the page did
// not do what it was asserted to do, and nobody has decided what that means yet.
//
// ---- WHY IT IS WRITTEN IN FIXTURE TEARDOWN ----------------------------------------------------
//
// So that a FAILING journey still leaves a record. A try/finally in each spec would work until
// somebody forgot one; a fixture cannot be forgotten, and Playwright runs its teardown whether the
// body threw or not. `testInfo.status` and `testInfo.errors` are both settled by then.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const base = require('@playwright/test');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts', 'journeys');

function commitSha () {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
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
    this._apiOrigin = originOf(meta.apiBaseUrl);
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
      if (this._apiOrigin && originOf(response.url()) === this._apiOrigin) {
        this.backendResponses += 1;
        // A handful is enough to READ; the count is what is asserted on. Redacted like every other URL
        // that reaches this file, because a funding token travels in a query string.
        if (this.backendSample.length < 8) {
          this.backendSample.push(response.request().method() + ' ' + redactUrl(response.url()) + ' -> ' + response.status());
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

  /** A screenshot, filed under this journey and referenced from its JSON. */
  async shot (name) {
    if (!this._page) { return null; }
    const dir = path.join(ARTIFACT_DIR, this.meta.journey);
    fs.mkdirSync(dir, { recursive: true });
    const file = String(this.screenshots.length + 1).padStart(2, '0') + '-' + slug(name) + '.png';
    await this._page.screenshot({ path: path.join(dir, file), fullPage: true });
    const relative = this.meta.journey + '/' + file;
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
      backendServed: this.backendResponses,
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

  write (status, error) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const file = path.join(ARTIFACT_DIR, this.meta.journey + '.playwright.json');
    fs.writeFileSync(file, JSON.stringify(this.toJSON(status, error), null, 2) + '\n');
    return file;
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
    }

    const recorder = new JourneyRecorder(meta);
    recorder.watch(page);

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
    let wrongWorld = false;

    // THE WRONG-WORLD GUARD. `reuseExistingServer` adopts whatever is already on the port, so a dev
    // server somebody else started against the real API would be used silently — and the journeys
    // would pass, against production, while the artifact said `"backend": "fixture"`. A journey that
    // sent this fixture no traffic at all did not talk to it, and a green run in that case is the
    // most dangerous result this instrument could produce.
    if (meta.backend === 'fixture' && !failed) {
      const stats = await fetch(meta.apiBaseUrl + '/__fixture/stats').then(r => r.json());
      if (!stats.served) {
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
    const file = recorder.write(failed ? 'failed' : 'passed', error);
    try {
      testInfo.attachments.push({ name: 'journey', path: file, contentType: 'application/json' });
    } catch (e) { /* the artifact on disk is the record; the HTML report link is a nicety */ }

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
