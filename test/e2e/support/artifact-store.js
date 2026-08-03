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
//   artifacts/journeys/runs/<name>.<backendKey>.superseded.playwright.json
//                                                              THE STRONGEST RECORD THAT BACKEND EVER
//                                                              PRODUCED, kept whole when its own later
//                                                              run reports worse. See below.
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
// ---- THE ONE CASE WHERE A WEAKER RUN STILL TAKES THE SLOT, AND WHAT IT COSTS -------------------
//
// The same-lineage rule above is a deliberate hole in "a weaker run cannot displace the evidence",
// and it has to be: a world that has started failing must be able to say so, and the provisional
// `running` record that stops an interrupted run leaving a stale pass behind is itself the weakest
// record there is. Both would be refused by a pure ranking, and refusing them brings back the defect
// this store was built to end.
//
// It landed in practice on 2026-08-03 anyway. `growth-newsletter-send-gate` failed at the branch tip
// before reaching a newsletter route at all — the app shell never settled — and because it was the
// same fixture lineage it replaced the passing record at the canonical path AND at `runs/`, leaving
// one summary line in the ledger as the only trace that the green run had ever existed. Recorded as
// `F-GR-SEND-GATE-JOURNEY-RED`.
//
// So the hole is kept and the LOSS is closed instead. Before a run overwrites its OWN lineage's
// record with a strictly weaker one, the record it displaces is copied whole to
// `runs/<name>.<backendKey>.superseded.playwright.json` — steps, findings, screenshots and all — and
// the incoming record names it in `artifact.supersedes`, as does its ledger line. That file only ever
// moves UP: a later displaced record replaces it when it outranks what is held, never when it is
// weaker, so it settles on the strongest run that backend ever produced.
//
// A reader joining on the canonical path therefore finds what is true NOW, and, in the same file, is
// told that a stronger run of the same world exists and exactly where to read it. Neither fact is
// destroyed by the other, which is the whole point: an evidence store that argues against itself is
// worse than none.
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
//
// THE FIXTURE ANSWERS THE SAME QUESTION ABOUT ITSELF — see `fixtureBuild`. It was left null at first,
// on the reasoning that resolving it would put the FRONTEND's commit in `backendBuild` and that is the
// confusion the field exists to end. The reasoning was right about the danger and wrong about the
// remedy: it left nineteen of the twenty-two artifacts standing on this branch answering "which build
// answered this run?" with `null`, so the field could not be read as an answer anywhere. It is named
// `fixture@<sha>`, never `<repo>@<sha>`, and its `source` names the fixture's own file — a reader
// cannot mistake it for an API build, and the question now has an answer on EVERY artifact.
//
// It changes no ordering. `backend` is compared before identity, so live still outranks fixture
// whatever either can name; and two fixture runs share one key, so they are the same lineage and the
// rank is never consulted between them. `test/journey-artifact-store.test.js` pins both.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RUNS_DIRNAME = 'runs';
const LEDGER_NAME = 'ledger.jsonl';
const UNIDENTIFIED = 'unidentified';
const DIRTY = '+dirty';

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
 *
 * `+dirty` SURVIVES, as `-dirty`. `buildFromCheckout` below marks a dirty tree in its own `short`, so
 * without this the same tree keyed through `E2E_API_BUILD` and keyed through `OKAM_API_REPO` produced
 * two DIFFERENT keys for the same build — and, worse, a clean and a dirty tree at one commit produced
 * the SAME key through the declared route, which is exactly the collision the build token is in the
 * filename to prevent.
 */
function shortOfBuild (id) {
  const text = String(id || '').toLowerCase();
  const hex = /[0-9a-f]{7,40}/.exec(text);
  const suffix = text.includes(DIRTY) ? '-dirty' : '';
  return (hex ? hex[0].slice(0, 7) : sha(id)) + suffix;
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
 * What the FIXTURE backend is, said in the same field every other backend answers in.
 *
 * The fixture is `test/e2e/fixture/api-server.js` inside this repo, so its build is this checkout —
 * and that is precisely why it was left `null` at first: a bare `<repo>@<sha>` in `backendBuild` reads
 * as a claim about the API and is the confusion the field exists to end. The remedy is the NAME, not
 * silence: `fixture@<sha>` cannot be read as an API build, `source` points at the file that served the
 * run, and `detail` says in words that this is the in-repo stand-in.
 *
 * Silence cost more than it saved. It left the field unanswerable on every fixture artifact — nineteen
 * of the twenty-two standing on this branch — so "does this artifact say which build answered it?"
 * had no checkable answer for the majority of the evidence.
 *
 * Null when this is not a checkout (the guard-proof harness copies these files into a temp tree that
 * is not one), which is the same honest null every other source returns.
 */
function fixtureBuild (repoRoot, fixtureFile) {
  const built = buildFromCheckout(repoRoot, 'fixture:' + (fixtureFile || 'test/e2e/fixture/api-server.js'));
  if (!built) { return null; }
  const at = built.id.indexOf('@');
  return {
    id: 'fixture@' + built.id.slice(at + 1),
    source: built.source,
    short: built.short,
    detail: 'the in-repo fixture backend, not an API build' + (built.detail ? ' (' + built.detail + ')' : '')
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
    superseded: path.join(runsDir, journey + '.' + key + '.superseded.playwright.json'),
    ledger: path.join(runsDir, LEDGER_NAME)
  };
}

function relative (artifactDir, file) {
  return path.relative(path.resolve(artifactDir, '..', '..'), file);
}

/**
 * Keeps whole the record a run is about to overwrite with a worse one of its OWN backend.
 *
 * Called only for that case — same lineage, strictly weaker — because that is the one path by which
 * this store still destroys evidence. Everywhere else the loser survives untouched under its own key.
 *
 * The kept file only ever moves UP: a record that does not outrank what is already held is not
 * written, so after a red re-run, a killed re-run and a second red re-run, this still holds the pass.
 * Returns what the incoming record should say about it, or null when nothing was kept.
 */
function preserveStrongest (artifactDir, files, standing) {
  const held = fs.existsSync(files.superseded) ? readJson(files.superseded) : null;
  const file = relative(artifactDir, files.superseded);
  const kept = held && compareRank(standing, held) <= 0 ? held : standing;
  if (kept !== held) {
    fs.writeFileSync(files.superseded, JSON.stringify(kept, null, 2) + '\n');
  }
  return {
    key: keyOfRecord(kept),
    status: kept.status || null,
    finishedAtUtc: kept.finishedAtUtc || null,
    file
  };
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
  const incoming = Object.assign({}, record, { artifact: { key } });
  const takes = canTakeCanonical(incoming, standing, !!opts.provisional);

  // THE ONE PATH BY WHICH THIS STORE STILL DESTROYS EVIDENCE, and the whole of what is done about it.
  // A run of the same backend takes the slot unconditionally — a failing world must be able to say so
  // — and it overwrites its own `runs/` file too, so without this the stronger record it replaces is
  // gone from disk entirely and survives only as a summary line in the ledger. That happened to
  // `growth-newsletter-send-gate` on 2026-08-03. The displacement still stands; the loss does not.
  const supersedes = takes && standing && keyOfRecord(standing) === key && compareRank(incoming, standing) < 0
    ? preserveStrongest(artifactDir, files, standing)
    : null;

  const filed = Object.assign({}, record, {
    artifact: {
      key,
      file: relative(artifactDir, files.run),
      canonical: takes,
      canonicalHeldBy: takes ? key : keyOfRecord(standing),
      provisional: !!opts.provisional,
      // Named IN the canonical record, not only in the ledger: the reader who most needs to know that
      // a stronger run of this same world exists is the one reading this file as the journey's result.
      supersedes
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
    canonicalHeldBy: filed.artifact.canonicalHeldBy,
    supersedes: supersedes ? supersedes.file : null
  }) + '\n');

  return {
    key,
    runFile: files.run,
    canonicalFile: takes ? files.canonical : null,
    canonical: takes,
    heldBy: filed.artifact.canonicalHeldBy,
    supersededFile: supersedes ? files.superseded : null,
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
  fixtureBuild,
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
