// WHERE A JOURNEY'S RECORD GOES, AND WHICH RECORD A READER FINDS FIRST.
//
// The evidence contract (test/e2e/support/journey.js) says what a journey artifact CONTAINS. This
// file decides where it is filed and, when two runs of the same journey disagree, which one gets the
// name a reader joins on. That was previously not a decision at all — every run wrote
// `artifacts/journeys/<name>.playwright.json` and the last writer won — and the store lied because
// of it. Three defects, all observed on this branch on 2026-08-02:
//
//   1. LAST WRITER WINS AT A SINGLE JOIN KEY. `playwright.config.js` applies its inverse tag filter
//      only when E2E_API_BASE_URL is set, so in FIXTURE mode the `@live` journeys run too — against
//      the throwaway fixture — and wrote over the live pass at the same path. All three live
//      journeys had been displaced this way; the passing live artifacts survived only because lanes
//      had copied them under lanes/.
//   2. TEARDOWN-ONLY WRITES. The artifact was written after the test body, in fixture teardown. A run
//      that was killed, timed out, or whose `/__fixture/stats` fetch threw because the fixture had
//      died left the PREVIOUS run's file standing — live-labelled and passed — describing a run that
//      did not happen. Nothing cleared it at the start.
//   3. NO BACKEND IDENTITY. `commit` is this repo's HEAD, i.e. the tree the HARNESS came from. The
//      backend was identified by nothing but an origin and an unauthenticated `/health` that answers
//      one word, so a world built from a stale checkout, or a different lane's world that had since
//      taken the same port, was indistinguishable from the current one.
//
// ---- THE LAYOUT ------------------------------------------------------------------------------
//
//   artifacts/journeys/<name>.playwright.json                  THE CANONICAL SLOT — the strongest run
//                                                              on record. Unchanged path, unchanged
//                                                              shape: probes and the plan log join here.
//   artifacts/journeys/runs/<name>.<backendKey>.playwright.json ONE PER BACKEND. A run only ever
//                                                              overwrites the file of its own backend.
//   artifacts/journeys/runs/ledger.jsonl                       APPEND-ONLY. One line per run, including
//                                                              the ones that lost the canonical slot and
//                                                              the ones that never finished.
//
// `runs/` is a subdirectory rather than a suffix in the same folder ON PURPOSE: several lanes count
// evidence with `artifacts/journeys/*.playwright.json`, and sibling files there would have turned one
// journey into three in every such count.
//
// ---- WHAT MAY TAKE THE CANONICAL SLOT ---------------------------------------------------------
//
// A run is ranked, most significant first:
//
//   backend     live (2) beats fixture (1).       A fixture re-run can never displace a live pass.
//   status      passed (2), failed (1), running (0).
//   identity    a run that names the build that answered (1) beats one that cannot (0).
//
// and the standing canonical is replaced when, and only when:
//
//   • there is none, or the one there cannot be parsed; or
//   • the incoming run has the SAME backend key — its own lineage, so its newer record replaces its
//     older one even when the news is worse (a world that has started failing must be able to say so); or
//   • the incoming run ranks STRICTLY higher.
//
// Equal rank from a DIFFERENT backend does not displace — that is the exit criterion of this lane
// stated directly. Nothing is lost either way: the loser is written under `runs/` and appended to the
// ledger, and its own record says which key holds the slot. To hand the canonical slot to a different
// world deliberately, delete `artifacts/journeys/<name>.playwright.json` and run again.
//
// ---- HOW THE BACKEND IS IDENTIFIED ------------------------------------------------------------
//
// In order, first hit wins:
//
//   E2E_API_BUILD                 what a world script exports about the checkout it built and ran.
//                                 `test/e2e/scripts/live-world.sh` does not export it yet; when it
//                                 does, `E2E_API_BUILD="OkamAPI@$(git -C "$OKAM_API_REPO" rev-parse HEAD)"`
//                                 is the whole change and everything below becomes a fallback.
//   OKAM_API_REPO / E2E_API_REPO  the checkout is asked for its own HEAD, and whether it is dirty.
//   THE LISTENING PROCESS         for a loopback origin: whoever holds the port is asked what
//                                 directory it is running from, and THAT directory is asked for its
//                                 HEAD. This needs nothing from anybody, which is why it is here — on
//                                 2026-08-02 the two live worlds standing on this machine were
//                                 `dotnet run` out of two DIFFERENT api worktrees at two different
//                                 commits, and nothing in either artifact said so.
//   the API's own route surface   see `fingerprintFromSwagger` in journey.js. Last, and honestly a
//                                 long shot on this estate: `live-world.sh` starts the API with no
//                                 swagger, so `/swagger/v1/swagger.json` answers 404 (checked against
//                                 both standing worlds). It is kept for the APIs that do publish one.
//
// When none of them answer, the key ends `-unidentified`, the run ranks below any run that could be
// identified, and the harness says so on stdout with the variable to set. That is deliberate: unknown
// is not zero, and it must not read like zero either.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RUNS_DIRNAME = 'runs';
const LEDGER_NAME = 'ledger.jsonl';
const UNIDENTIFIED = 'unidentified';

/** Filesystem-safe, lowercase, and stable — this ends up in a filename a human reads. */
function sanitize (text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sha (text, length) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, length || 7);
}

/**
 * The short token that goes in a filename for a build id.
 *
 * A build id that already contains a commit-ish hex run is shown by that run, so the filename ties
 * back to something a reader can `git show`. Anything else is hashed, because an arbitrary string is
 * not a path component.
 */
function shortOfBuild (id) {
  const hex = /[0-9a-f]{7,40}/.exec(String(id || '').toLowerCase());
  return hex ? hex[0].slice(0, 7) : sha(id);
}

function gitIn (dir, args) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch (e) {
    return null;
  }
}

/** `{ id, short, detail }` for a checkout, or null when it is not one. */
function buildFromCheckout (repo, source) {
  if (!repo || !fs.existsSync(repo)) { return null; }
  const head = gitIn(repo, ['rev-parse', 'HEAD']);
  if (!head) { return null; }
  const dirty = (gitIn(repo, ['status', '--porcelain']) || '').length > 0;
  const branch = gitIn(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return {
    id: path.basename(path.resolve(repo)) + '@' + head + (dirty ? '+dirty' : ''),
    source,
    // A dirty tree is NOT the commit it sits on, and two dirty trees on one commit are not each
    // other. Saying so in the key is the difference between "this build" and "some build near it".
    short: head.slice(0, 7) + (dirty ? '-dirty' : ''),
    // The checkout's NAME, never its absolute path. `id` already carries the name, and this file is
    // read in reviews — the same reason events-runsheet-print.spec.js keeps its PDF path relative:
    // an artifact should not carry the directory layout of the laptop that produced it.
    detail: branch ? 'branch ' + branch : null
  };
}

/**
 * Who is holding the port, and what were they built from.
 *
 * Loopback only — a remote origin's process is not ours to inspect and the answer would be about this
 * machine, not that one. Best effort throughout: no `lsof`, a process with no cwd we can read, or a
 * cwd that is not a checkout all mean `null`, which is the honest answer and not a failure.
 *
 * This is the source that needs nobody's cooperation. `live-world.sh` exports nothing about the tree
 * it built, and the command it prints for running a journey does not carry OKAM_API_REPO into the
 * runner's shell — so without this, every live run on this estate is `unidentified` today.
 */
function buildFromListeningProcess (apiBaseUrl) {
  let host = null;
  let port = null;
  try {
    const url = new URL(apiBaseUrl);
    host = url.hostname;
    port = url.port;
  } catch (e) {
    return null;
  }
  if (!port || !(host === '127.0.0.1' || host === 'localhost' || host === '::1')) { return null; }

  try {
    const pids = execFileSync('lsof', ['-nP', '-iTCP:' + port, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim().split('\n').filter(Boolean);
    if (!pids.length) { return null; }
    const cwdLine = execFileSync('lsof', ['-a', '-p', pids[0], '-d', 'cwd', '-Fn'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
      .split('\n').find(line => line.startsWith('n'));
    if (!cwdLine) { return null; }
    return buildFromCheckout(cwdLine.slice(1), 'process:' + host + ':' + port);
  } catch (e) {
    return null;
  }
}

/**
 * Who built the backend this run is about to talk to.
 *
 * `apiBaseUrl` is optional and only enables the listening-process source; pass it for a LIVE backend
 * and never for the fixture, whose process is this repo — resolving it would put the frontend's own
 * commit in `backendBuild`, which is precisely the confusion this field exists to end.
 *
 * Returns `null` when nothing can say. Null, never a guess.
 */
function resolveBackendBuild (env, apiBaseUrl) {
  const environment = env || process.env;

  const declared = (environment.E2E_API_BUILD || '').trim();
  if (declared) {
    return { id: declared, source: 'env:E2E_API_BUILD', short: shortOfBuild(declared), detail: null };
  }

  const repo = (environment.E2E_API_REPO || environment.OKAM_API_REPO || '').trim();
  const fromRepo = repo ? buildFromCheckout(repo, 'git:' + repo) : null;
  if (fromRepo) { return fromRepo; }

  return apiBaseUrl ? buildFromListeningProcess(apiBaseUrl) : null;
}

/**
 * The join key a run writes under. Same key means "the same backend", and only the same backend may
 * overwrite a run's file.
 */
function backendKeyFor ({ backend, apiBaseUrl, build }) {
  if (backend === 'fixture') {
    // One fixture, one file. The fixture IS this repo — its version travels in `commit` — and keying
    // it per frontend commit would grow a file per commit for no reader's benefit.
    return 'fixture';
  }
  if (backend !== 'live') { return sanitize(backend) || 'unknown'; }

  let host = '';
  let port = '';
  try {
    const url = new URL(apiBaseUrl);
    host = url.hostname;
    port = url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch (e) {
    host = 'unparseable';
  }
  const loopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  const where = loopback ? port : sanitize(host) + '-' + port;
  return ['live', where, (build && build.short) || UNIDENTIFIED].filter(Boolean).join('-');
}

const BACKEND_RANK = { live: 2, fixture: 1 };
const STATUS_RANK = { passed: 2, failed: 1, running: 0 };

/** [backend, status, identified] — compared left to right. See the header. */
function rankOf (record) {
  const identified = record && record.backendBuild && record.backendBuild.id ? 1 : 0;
  return [
    BACKEND_RANK[record && record.backend] || 0,
    STATUS_RANK[record && record.status] === undefined ? 0 : STATUS_RANK[record.status],
    identified
  ];
}

function compareRank (a, b) {
  const left = rankOf(a);
  const right = rankOf(b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) { return left[i] < right[i] ? -1 : 1; }
  }
  return 0;
}

/**
 * The backend key of a record already on disk.
 *
 * Artifacts written before this file existed carry no key, so one is derived from what they DO carry.
 * A pre-existing live artifact therefore derives `live-<port>-unidentified` — which is the truth
 * about it: it named an origin and no build.
 */
function keyOfRecord (record) {
  if (!record) { return null; }
  if (record.artifact && record.artifact.key) { return record.artifact.key; }
  return backendKeyFor({
    backend: record.backend,
    apiBaseUrl: record.apiBaseUrl,
    build: record.backendBuild && record.backendBuild.short ? record.backendBuild : null
  });
}

function readJson (file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * May `incoming` take the canonical slot currently held by `standing`?
 *
 * `provisional` is a run that has only STARTED. It may replace its own lineage's record — that is
 * the invalidation that stops a killed run leaving a stale pass behind — but it may not take the slot
 * from another backend on strength, because it has not earned anything yet.
 */
function canTakeCanonical (incoming, standing, provisional) {
  if (!standing) { return true; }
  const sameLineage = keyOfRecord(standing) === keyOfRecord(incoming);
  if (sameLineage) { return true; }
  if (provisional) { return false; }
  return compareRank(incoming, standing) > 0;
}

function pathsFor (artifactDir, journey, key) {
  const runsDir = path.join(artifactDir, RUNS_DIRNAME);
  return {
    runsDir,
    canonical: path.join(artifactDir, journey + '.playwright.json'),
    run: path.join(runsDir, journey + '.' + key + '.playwright.json'),
    ledger: path.join(runsDir, LEDGER_NAME)
  };
}

function relative (artifactDir, file) {
  return path.relative(path.resolve(artifactDir, '..', '..'), file);
}

/**
 * Files one run.
 *
 * `record` is the artifact object; it must already carry `journey`, `backend`, `status`, and
 * `backendBuild` (or null). The `artifact` block is filled in HERE and is part of what is written, so
 * a reader of the losing file learns that it lost and to whom.
 *
 * Returns `{ key, runFile, canonicalFile, canonical, heldBy }`.
 */
function writeRun (artifactDir, record, options) {
  const opts = options || {};
  const key = backendKeyFor({ backend: record.backend, apiBaseUrl: record.apiBaseUrl, build: record.backendBuild });
  if (record.journey === RUNS_DIRNAME) {
    throw new Error('a journey may not be called "' + RUNS_DIRNAME + '": that name is the per-backend run store.');
  }
  const files = pathsFor(artifactDir, record.journey, key);
  fs.mkdirSync(files.runsDir, { recursive: true });

  const standing = fs.existsSync(files.canonical) ? readJson(files.canonical) : null;
  const takes = canTakeCanonical(Object.assign({}, record, { artifact: { key } }), standing, !!opts.provisional);

  const filed = Object.assign({}, record, {
    artifact: {
      key,
      file: relative(artifactDir, files.run),
      canonical: takes,
      canonicalHeldBy: takes ? key : keyOfRecord(standing),
      provisional: !!opts.provisional
    }
  });

  const json = JSON.stringify(filed, null, 2) + '\n';
  fs.writeFileSync(files.run, json);
  if (takes) { fs.writeFileSync(files.canonical, json); }

  // The ledger is the only record no later run can touch. Everything else in this store is a slot
  // somebody else may legitimately take; this is the history that says who ran, against what, and how
  // it ended — including the runs that never came back.
  fs.appendFileSync(files.ledger, JSON.stringify({
    at: new Date().toISOString(),
    journey: filed.journey,
    key,
    backend: filed.backend,
    apiBaseUrl: filed.apiBaseUrl,
    build: filed.backendBuild ? filed.backendBuild.id : null,
    buildSource: filed.backendBuild ? filed.backendBuild.source : 'unknown',
    commit: filed.commit,
    status: filed.status,
    backendServed: filed.backendServed === undefined ? null : filed.backendServed,
    provisional: !!opts.provisional,
    canonical: takes,
    canonicalHeldBy: filed.artifact.canonicalHeldBy
  }) + '\n');

  return {
    key,
    runFile: files.run,
    canonicalFile: takes ? files.canonical : null,
    canonical: takes,
    heldBy: filed.artifact.canonicalHeldBy,
    record: filed
  };
}

/**
 * Files the fact that a run has STARTED, before the browser opens.
 *
 * This is the answer to teardown-only writes. A run that is killed, times out, or dies while asking
 * the fixture what it served now leaves `"status": "running"` on disk — visibly unfinished — instead
 * of leaving its predecessor's pass standing as though it were this run's result.
 */
function beginRun (artifactDir, record) {
  return writeRun(artifactDir, Object.assign({}, record, { status: 'running' }), { provisional: true });
}

module.exports = {
  writeRun,
  beginRun,
  resolveBackendBuild,
  buildFromListeningProcess,
  backendKeyFor,
  canTakeCanonical,
  compareRank,
  rankOf,
  keyOfRecord,
  shortOfBuild,
  sha,
  RUNS_DIRNAME,
  LEDGER_NAME
};
