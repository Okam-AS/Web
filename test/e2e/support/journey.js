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

function slug (text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
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
      this.failedRequests.push({ method: request.method(), url: request.url(), status: null, failure: (request.failure() || {}).errorText || null });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        this.failedRequests.push({ method: response.request().method(), url: response.url(), status: response.status() });
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

    const recorder = new JourneyRecorder(meta);
    recorder.watch(page);

    await use(recorder);

    // `testInfo.status` is settled here. `errors` is checked too: a soft assertion failure leaves
    // the status 'passed' in some versions, and a journey with a failed expectation is not evidence.
    let failed = testInfo.status !== 'passed' || testInfo.errors.length > 0;
    let error = testInfo.errors.length ? testInfo.errors[0].message : null;

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
      }
    }
    const file = recorder.write(failed ? 'failed' : 'passed', error);
    try {
      testInfo.attachments.push({ name: 'journey', path: file, contentType: 'application/json' });
    } catch (e) { /* the artifact on disk is the record; the HTML report link is a nicety */ }
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
function journeyDetails ({ journey, capabilities, surface, tag }) {
  return {
    // `@fixture` means "this journey depends on state only the fixture backend has". It is what a
    // live-backend run filters OUT — see playwright.config.js.
    tag: tag || ['@fixture'],
    annotation: [
      { type: 'journey', description: journey },
      { type: 'capabilities', description: (capabilities || []).join(',') },
      { type: 'surface', description: surface || 'unknown' }
    ]
  };
}

module.exports = { test, expect: base.expect, journeyDetails, ARTIFACT_DIR };
