// WHAT THE WORLD SAYS ABOUT ITSELF, WRITTEN BY THE THING THAT BUILT IT.
//
// A live journey artifact's most consequential field is `backendBuild`: it is what separates evidence
// from an anecdote, because `/health` answers the word "Healthy" for every API ever built and two live
// worlds stood on this machine on 2026-08-02 out of two DIFFERENT api worktrees at two different
// commits, each satisfying it identically.
//
// `artifact-store.js` could already answer the question three ways, and each of them is somebody's
// cooperation or somebody's guess:
//
//   E2E_API_BUILD          a string in the RUNNER's shell. It is a declaration, and nothing checks it
//                          against the origin the run is pointed at — so a command copied from the
//                          world that was up an hour ago names that world, confidently and wrongly.
//   OKAM_API_REPO          a checkout path in the runner's shell, with no link to the origin either.
//                          It answers with whatever that tree's HEAD is NOW, which is not necessarily
//                          what the running binary was built from.
//   the listening process  `lsof` on the port, then that pid's cwd, then that directory's HEAD. It
//                          needs nobody's cooperation, and it is the one this estate has actually been
//                          carried by — but it INTERROGATES THE PORT, which is the source that fails
//                          exactly when it matters: whoever holds the port at read time answers, and a
//                          stale process holds it just as firmly as the right one.
//
// This file is the fourth source and the only one bound to BOTH the origin and a living process: the
// script that built the world writes down, at the moment the world came up healthy, which checkout it
// built it from and which process it started. The build carries its own provenance, and a run reads it
// without asking the port anything.
//
// ---- THE FILE ---------------------------------------------------------------------------------
//
//   artifacts/world/live/<host>-<port>.json      one per ORIGIN, written by test/e2e/scripts/live-world.sh
//
// It lives under `artifacts/` deliberately, alongside the journey artifacts and under the same
// gitignore, and for the same reason the comment there gives: the FILE is a record of a run, not
// source. It does not survive a clone and is not meant to — a stamp describes a process on THIS
// machine, and a stamp that outlived the machine would be the very lie this file exists to prevent.
//
// ---- WHY A STAMP CAN BE TRUSTED, AND EXACTLY WHEN IT CANNOT -----------------------------------
//
// A file on disk saying "the world on :5951 is OkamAPI@abc" is worth nothing on its own: the world it
// describes may have been killed ten minutes ago. So the stamp names the PROCESS the world script
// started, and a reader verifies that this exact process is still alive before believing a word of it:
//
//   pid                  the process the world script started, and
//   processStartedAt     that pid's own start time, read from `ps -o lstart=` when the stamp was
//                        written. Both must still match at read time. The start time is what makes it
//                        a check rather than a formality — pids are recycled, and a stamp verified by
//                        pid alone would eventually name a build for somebody else's process.
//
// If that process is gone, the stamp is REFUSED — not repaired, not trusted-anyway. The reader falls
// through to the sources below it and, when none of them answer either, the run is filed
// `-unidentified`, which is the honest outcome and already ranks below a run that named its build.
//
// This is not "asking the port who it is" in a different costume. Nothing here reads the socket, and
// the answer does not depend on who holds it: the identity comes from the script that did the build,
// and the pid check only asks whether the world that script started is still running. The two differ
// precisely in the case that matters — a DIFFERENT process on the same port. `lsof` answers about that
// process, confidently and wrongly; a stamp whose own process is dead answers nothing at all.
//
//   THE RESIDUAL, SAID PLAINLY. `live-world.sh` starts the API with `nohup dotnet run …`, and `$!` is
//   the LAUNCHER's pid — `dotnet run` execs a child named `WebApi` which is what actually holds the
//   socket (step 1 of that script kills by port for exactly this reason). So a launcher that died
//   while its child kept serving makes the stamp read STALE and the run falls back. That is the
//   conservative direction: the stamp can lose its answer, and cannot invent a wrong one.
//
//   AND IT IS LOOPBACK-ONLY. The liveness proof is a local-process proof; a pid means nothing about a
//   machine that is not this one. A stamp is never read for a remote origin, the same boundary
//   `buildFromListeningProcess` draws and for the same reason.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STAMP_VERSION = 1;
const DIRNAME = path.join('artifacts', 'world', 'live');

/** This checkout, derived from this file's own depth — the same way journey.js finds its artifacts. */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function defaultDir () {
  return path.join(REPO_ROOT, DIRNAME);
}

function gitIn (dir, args) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * The origin, reduced to the two things that identify a world on this machine.
 *
 * Returns null for anything that is not a loopback http origin — a remote API's provenance is not
 * something a file on this laptop gets to assert.
 */
function originKey (apiBaseUrl) {
  let url;
  try {
    url = new URL(String(apiBaseUrl));
  } catch (e) {
    return null;
  }
  const host = url.hostname;
  if (!(host === '127.0.0.1' || host === 'localhost' || host === '::1')) { return null; }
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return host.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-' + port;
}

function fileFor (apiBaseUrl, dir) {
  const key = originKey(apiBaseUrl);
  return key ? path.join(dir || defaultDir(), key + '.json') : null;
}

/** A path a reader can act on, that carries no directory layout of the machine that wrote it. */
function relativeToCheckout (file) {
  const relative = path.relative(REPO_ROOT, file);
  return relative.startsWith('..') ? path.basename(file) : relative;
}

/** The origin with its trailing slashes off, so `…:5951` and `…:5951/` are one world and not two. */
function normaliseOrigin (apiBaseUrl) {
  return String(apiBaseUrl || '').replace(/\/+$/, '');
}

/**
 * A pid's own start time, as the operating system reports it — `Mon Aug  4 02:31:07 2026`.
 *
 * Null when there is no such process, which is the whole point: this doubles as the liveness check.
 * The STRING is compared rather than parsed; it only has to be stable between two reads of the same
 * process on the same machine, and the format is the kernel's business.
 */
function processStartedAt (pid) {
  if (!pid || !Number.isFinite(Number(pid))) { return null; }
  try {
    const out = execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
    return out || null;
  } catch (e) {
    return null;
  }
}

/**
 * Writes the stamp for one origin. Called by `live-world.sh` once the world answers `/health`, i.e.
 * once the pid it is about to record is demonstrably the one serving that origin.
 *
 * `repo` is the API checkout the world was built from. The stamp keeps its BASENAME and never its
 * absolute path — an artifact should not carry the directory layout of the laptop that produced it,
 * the same rule `buildFromCheckout` follows.
 *
 * Throws rather than returning a bad stamp: a stamp nobody can verify is worse than none, because the
 * sources below it would never be consulted.
 */
function writeStamp ({ apiBaseUrl, repo, pid, writtenBy }, dir) {
  const file = fileFor(apiBaseUrl, dir);
  if (!file) {
    throw new Error('a world stamp is only written for a loopback origin; got ' + apiBaseUrl);
  }
  const head = repo && fs.existsSync(repo) ? gitIn(repo, ['rev-parse', 'HEAD']) : null;
  if (!head) {
    throw new Error('not a git checkout, so there is no build to stamp: ' + repo);
  }
  const started = processStartedAt(pid);
  if (!started) {
    throw new Error('no process ' + pid + ' is running, so a stamp naming it could never be verified');
  }
  const dirty = (gitIn(repo, ['status', '--porcelain']) || '').length > 0;
  const branch = gitIn(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const name = path.basename(path.resolve(repo));
  const stamp = {
    stamp: STAMP_VERSION,
    origin: normaliseOrigin(apiBaseUrl),
    build: {
      // `+dirty` in the id and `-dirty` in the short, matching `buildFromCheckout` exactly: the two
      // routes to one tree must produce ONE key, or a build gets two artifact files.
      id: name + '@' + head + (dirty ? '+dirty' : ''),
      short: head.slice(0, 7) + (dirty ? '-dirty' : ''),
      branch: branch || null
    },
    pid: Number(pid),
    processStartedAt: started,
    stampedAtUtc: new Date().toISOString(),
    // WHO SAID SO, and never a constant: this string travels into `backendBuild.detail` and therefore
    // into a live artifact, so a hard-coded "live-world.sh" would have every stamp — including the
    // ones this repo's own proof harness writes — claiming an authorship it does not have.
    writtenBy: writtenBy ||
      (require.main && require.main.filename ? relativeToCheckout(require.main.filename) : 'test/e2e/support/world-stamp.js')
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(stamp, null, 2) + '\n');
  return { file, stamp };
}

/** Removes the stamp for an origin, if there is one. Used when a world is torn down or rebuilt. */
function clearStamp (apiBaseUrl, dir) {
  const file = fileFor(apiBaseUrl, dir);
  if (file && fs.existsSync(file)) { fs.rmSync(file); return file; }
  return null;
}

/**
 * Reads the stamp for an origin and says whether it may be believed.
 *
 * Always returns a verdict rather than throwing, because "no stamp" and "a stamp whose world is gone"
 * are both ordinary and neither is an error — they are the cases where a later source gets its turn.
 * `reason` is for the harness to print, so an operator is told WHY their run was filed unidentified.
 */
function readStamp (apiBaseUrl, dir) {
  const file = fileFor(apiBaseUrl, dir);
  if (!file) { return { ok: false, file: null, stamp: null, reason: 'not a loopback origin' }; }
  if (!fs.existsSync(file)) { return { ok: false, file, stamp: null, reason: 'no world stamp for this origin' }; }

  let stamp;
  try {
    stamp = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { ok: false, file, stamp: null, reason: 'the world stamp is not readable JSON' };
  }
  if (!stamp || stamp.stamp !== STAMP_VERSION || !stamp.build || !stamp.build.id) {
    return { ok: false, file, stamp, reason: 'the world stamp is not a stamp this version understands' };
  }
  // The stamp names the origin it is about, and it is checked against the origin being ASKED about.
  // A stamp is found by filename, and a filename is a thing that can be copied, renamed or hand-edited;
  // the field inside is what the writer actually meant.
  if (normaliseOrigin(stamp.origin) !== normaliseOrigin(apiBaseUrl)) {
    return { ok: false, file, stamp, reason: 'the world stamp is about ' + stamp.origin + ', not ' + apiBaseUrl };
  }
  const started = processStartedAt(stamp.pid);
  if (!started) {
    return { ok: false, file, stamp, reason: 'the world it describes is gone (no process ' + stamp.pid + ')' };
  }
  if (started !== stamp.processStartedAt) {
    // Pid reuse. Something else is running under that number now, and a stamp verified by pid alone
    // would have named this world's build for that stranger's process.
    return { ok: false, file, stamp, reason: 'process ' + stamp.pid + ' is not the one that was stamped (started ' + started + ')' };
  }
  return { ok: true, file, stamp, reason: null };
}

/**
 * `{ id, source, short, detail }` for the world standing on `apiBaseUrl`, or null when no stamp may be
 * believed. The shape every other build source in `artifact-store.js` returns.
 */
function buildFromWorldStamp (apiBaseUrl, dir) {
  const read = readStamp(apiBaseUrl, dir);
  if (!read.ok) { return null; }
  const detail = ['stamped by ' + read.stamp.writtenBy + ' at ' + read.stamp.stampedAtUtc,
    'pid ' + read.stamp.pid + ' still running'];
  if (read.stamp.build.branch) { detail.unshift('branch ' + read.stamp.build.branch); }
  return {
    id: read.stamp.build.id,
    // The path, relative to this checkout: a reader who doubts the answer can open the file that gave
    // it. The absolute path stays out, for the same reason `buildFromCheckout` keeps it out — and a
    // stamp dir OUTSIDE the checkout (which only a test has) is reduced to the filename rather than
    // written as a `../../../var/folders/…` escape, which is the laptop's layout by another spelling.
    source: 'stamp:' + relativeToCheckout(read.file),
    short: read.stamp.build.short,
    detail: detail.join(', ')
  };
}

module.exports = {
  writeStamp,
  clearStamp,
  readStamp,
  buildFromWorldStamp,
  fileFor,
  originKey,
  processStartedAt,
  defaultDir,
  STAMP_VERSION
};

// ---- THE CLI live-world.sh CALLS ---------------------------------------------------------------
//
//   node test/e2e/support/world-stamp.js write  <apiBaseUrl> <apiRepo> <pid> [writtenBy]
//   node test/e2e/support/world-stamp.js clear  <apiBaseUrl>
//   node test/e2e/support/world-stamp.js show   <apiBaseUrl>
//
// `show` is the one an operator runs when a live artifact came back `-unidentified` and they want the
// reason in a sentence rather than by reading this file.
if (require.main === module) {
  const [command, origin, repo, pid, writtenBy] = process.argv.slice(2);
  const out = line => process.stdout.write(line + '\n');
  try {
    if (command === 'write') {
      const written = writeStamp({ apiBaseUrl: origin, repo, pid, writtenBy });
      out(written.stamp.build.id + '  ->  ' + path.relative(REPO_ROOT, written.file));
    } else if (command === 'clear') {
      const cleared = clearStamp(origin);
      out(cleared ? 'removed ' + path.relative(REPO_ROOT, cleared) : 'no stamp for ' + origin);
    } else if (command === 'show') {
      const read = readStamp(origin);
      out(read.ok
        ? read.stamp.build.id + '  (' + path.relative(REPO_ROOT, read.file) + ')'
        : 'no usable stamp for ' + origin + ': ' + read.reason);
      if (!read.ok) { process.exitCode = 1; }
    } else {
      out('usage: world-stamp.js write <apiBaseUrl> <apiRepo> <pid> | clear <apiBaseUrl> | show <apiBaseUrl>');
      process.exitCode = 2;
    }
  } catch (error) {
    process.stderr.write('world-stamp: ' + ((error && error.message) || error) + '\n');
    process.exitCode = 1;
  }
}
