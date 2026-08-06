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
// built it from and which process is serving it. The build carries its own provenance, and a run reads
// it without asking the port anything.
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
// ---- THE ONE PROPERTY EVERYTHING HERE SERVES --------------------------------------------------
//
//   A STAMP CAN LOSE ITS ANSWER. IT CANNOT INVENT A WRONG ONE.
//
// Losing the answer costs a run its `backendBuild` and files it `-unidentified`, which is honest and
// already ranks below a run that named its build. Inventing one costs every artifact that cites it,
// silently and forever. So every check below is allowed to REFUSE and none of them is allowed to
// guess, and where the two conflict the refusal wins even when it is inconvenient.
//
// A Fable review on 2026-08-04 walked that claim and found it held everywhere except two windows —
// both in the wiring, neither reachable by reading this file alone. They are `W1` and `W2` below, and
// each is closed by a check here rather than by a rule in the shell script that calls it, because the
// shell wiring is exactly what nothing executes end to end.
//
// ---- W1: THE HEAD MOVES BETWEEN THE BUILD AND THE STAMP ---------------------------------------
//
// `live-world.sh` builds the API, starts it, waits for `/health`, and only then stamps. `writeStamp`
// used to ask git for HEAD AT STAMP TIME — so a rebase, a checkout or a branch switch in the API
// worktree during that gap made the stamp name a commit THE RUNNING BINARY WAS NOT BUILT FROM. It
// would be verified-alive, origin-matched, and confidently wrong; and `resolveBackendBuild` would then
// print "this overrode E2E_API_BUILD", dressing the wrong answer up as the guard working. Shared
// worktrees are routine in this estate and heads move under running lanes, so this is not a
// hypothetical window: a window that only needs a rebase to open is a window that is open.
//
// The caller must therefore say WHICH BUILD IT IS STAMPING: `builtFrom`, the token
// `world-stamp.js built <repo>` prints at the moment the binary is built. `writeStamp` recomputes that
// token from the checkout and REFUSES if it has changed. It is required, not optional, so the guard
// cannot be disabled by a caller quietly dropping an argument.
//
// The token is `<sha>` or `<sha>+dirty`, and the `+dirty` half is part of the identity rather than
// noise: a tree that gained an edit after the build is not the tree that was built, and a stamp naming
// `<sha>+dirty` for a binary compiled from clean `<sha>` is the same lie in smaller print.
//
// ---- W2: THE STAMPED PROCESS IS THE LAUNCHER, NOT THE SERVER ----------------------------------
//
// `live-world.sh` starts the API with `nohup dotnet run …`, and `$!` is the LAUNCHER's pid — `dotnet
// run` execs a child named plainly `WebApi`, and that child is what holds the socket. (Step 1 of that
// script kills by port for exactly this reason.) A stamp naming the launcher proves "the launcher is
// alive", which is not "this origin is served by this build": if the WebApi child died and any other
// process took the port, the stamp still verified and answered the old build.
//
// So the caller passes `launchedPid` — the process it started — and this file resolves THE PROCESS
// ACTUALLY HOLDING THE SOCKET and stamps that one. Two things make that safe at write time and not a
// return to interrogating the port:
//
//   * it is done ONCE, by the party that built the world, at a moment when the port was proven free
//     beforehand, our own process was proven to have bound it, and `/health` had answered — not at
//     read time by a stranger asking whoever holds the port now;
//   * the holder must be `launchedPid` or a DESCENDANT of it. A holder that is neither is a stranger,
//     and a stranger means no stamp at all rather than a stamp about somebody else's world.
//
// ---- WHY A STAMP CAN BE TRUSTED, AND EXACTLY WHEN IT CANNOT -----------------------------------
//
// A file on disk saying "the world on :5951 is OkamAPI@abc" is worth nothing on its own: the world it
// describes may have been killed ten minutes ago. So the stamp names the SERVING process, and a reader
// verifies that this exact process is still alive before believing a word of it:
//
//   pid                  the process that was holding the socket when the stamp was written, and
//   processStartedAt     that pid's own start time, read from `ps -o lstart=` when the stamp was
//                        written. Both must still match at read time. The start time is what makes it
//                        a check rather than a formality — pids are recycled, and a stamp verified by
//                        pid alone would eventually name a build for somebody else's process.
//
// If that process is gone, the stamp is REFUSED — not repaired, not trusted-anyway. The reader falls
// through to the sources below it and, when none of them answer either, the run is filed
// `-unidentified`, which is the honest outcome.
//
// This is not "asking the port who it is" in a different costume. THE READER never touches the socket,
// and the answer does not depend on who holds it: the identity comes from the script that did the
// build, and the pid check only asks whether the process that was serving it is still running. The two
// differ precisely in the case that matters — a DIFFERENT process on the same port. `lsof` answers
// about that process, confidently and wrongly; a stamp whose own process is dead answers nothing.
//
//   THE RESIDUAL, SAID IN BOTH DIRECTIONS — which is the correction this file owes. A residual
//   recorded in only its safe direction reads as a bound, and it is not one; that is how W2 survived
//   its first writing. What remains after W2 is closed is narrow and it is stated whole:
//
//     the safe direction    the serving process dies and the stamp is refused. A run then falls back
//                           and may be filed unidentified. The answer is lost. Acceptable.
//     the other direction   the stamped process is STILL ALIVE but has stopped serving this origin,
//                           and something else has taken the port. The stamp would still verify and
//                           would answer for a world that is no longer on that socket. It is not
//                           closed here, and it is small for a reason worth stating rather than
//                           assuming: a server that releases its listener and keeps running is not a
//                           thing Kestrel does short of a crash, and a crash takes the process with
//                           it. Closing it would mean reading the socket AT READ TIME, which is the
//                           source this whole file exists to not depend on.
//
//   AND IT IS LOOPBACK-ONLY. The liveness proof is a local-process proof; a pid means nothing about a
//   machine that is not this one. A stamp is never written or read for a remote origin, the same
//   boundary `buildFromListeningProcess` draws and for the same reason.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

// 2: v1 stamps were written before W1 and W2 were closed — no `builtFrom`, and a `pid` that may be a
// launcher rather than the server. They are refused rather than read leniently, because a stamp
// written by the writer that could be wrong is exactly the artifact this version exists to distrust.
// Nothing is lost by that: a stamp describes a process on this machine and never survives a rebuild.
const STAMP_VERSION = 2;
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
 * The loopback spellings a stamp may be written for, each mapped to its filename key.
 *
 * `[::1]` is here because that is what Node's WHATWG URL actually returns for an IPv6 literal —
 * `new URL('http://[::1]:5951').hostname` is `'[::1]'`, brackets and all. The bare `'::1'` this file
 * used to compare against could therefore never be true, so IPv6 loopback was silently treated as a
 * remote machine. Conservative, and never a wrong answer, but it was a comparison with no reachable
 * case; both spellings are accepted now and they key to the SAME file, because they are one origin.
 */
const LOOPBACK_KEYS = {
  '127.0.0.1': '127-0-0-1',
  localhost: 'localhost',
  '::1': 'ipv6-loopback',
  '[::1]': 'ipv6-loopback'
};

/**
 * The origin, reduced to the things that identify a world on this machine.
 *
 * Returns null for anything that is not a loopback http origin — a remote API's provenance is not
 * something a file on this laptop gets to assert.
 */
function parseLoopback (apiBaseUrl) {
  let url;
  try {
    url = new URL(String(apiBaseUrl));
  } catch (e) {
    return null;
  }
  const host = url.hostname;
  if (!Object.prototype.hasOwnProperty.call(LOOPBACK_KEYS, host)) { return null; }
  return { host, key: LOOPBACK_KEYS[host], port: url.port || (url.protocol === 'https:' ? '443' : '80') };
}

function originKey (apiBaseUrl) {
  const at = parseLoopback(apiBaseUrl);
  return at ? at.key + '-' + at.port : null;
}

/**
 * Is this hostname a name for THIS machine?
 *
 * Exported because `artifact-store.js` drew the same boundary twice with its own inline list, and both
 * copies carried the same unreachable `'::1'`. One list, one place, and a hostname spelling that is
 * wrong is now wrong once.
 */
function isLoopbackHost (host) {
  return Object.prototype.hasOwnProperty.call(LOOPBACK_KEYS, String(host));
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

// ---- WHICH BUILD (W1) --------------------------------------------------------------------------

/**
 * What a checkout is RIGHT NOW, as one token: `<sha>` or `<sha>+dirty`.
 *
 * This is the single implementation of "which build". `live-world.sh` reads it through the `built`
 * subcommand at the moment it builds the binary, and `writeStamp` recomputes it at stamp time and
 * compares. One function rather than two, because a shell that computed the answer its own way could
 * disagree with this one about what "dirty" means and the comparison would then be theatre.
 *
 * Null when there is no checkout to read, which is a refusal and never an empty answer.
 */
function buildTokenOf (repo) {
  if (!repo || !fs.existsSync(repo)) { return null; }
  const head = gitIn(repo, ['rev-parse', 'HEAD']);
  if (!head) { return null; }
  const dirty = (gitIn(repo, ['status', '--porcelain']) || '').length > 0;
  return head + (dirty ? '+dirty' : '');
}

function isDirtyToken (token) { return /\+dirty$/.test(String(token)); }
function shaOfToken (token) { return String(token).replace(/\+dirty$/, ''); }

// ---- WHICH PROCESS (W2) ------------------------------------------------------------------------

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

function parentOf (pid) {
  try {
    const out = execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
    const parent = Number(out);
    return Number.isFinite(parent) && parent > 0 ? parent : null;
  } catch (e) {
    return null;
  }
}

/**
 * Is `pid` the process `ancestor` started, or something it started in turn?
 *
 * This is the OWNERSHIP proof, and it is deliberately about lineage rather than about the port: the
 * question "did the world script cause this process to exist" has one honest answer and asking the
 * socket does not give it. `dotnet run` execs its child, so the answer is usually one hop.
 *
 * pid 1 is never an ancestor worth accepting — everything is a descendant of init, so accepting it
 * would make this check vacuously true for every process on the machine.
 */
function isSelfOrDescendant (pid, ancestor) {
  const target = Number(ancestor);
  if (!Number.isFinite(target) || target <= 1) { return false; }
  let cursor = Number(pid);
  for (let hops = 0; Number.isFinite(cursor) && cursor > 1 && hops < 64; hops += 1) {
    if (cursor === target) { return true; }
    cursor = parentOf(cursor);
  }
  return false;
}

/**
 * The pids LISTENING on a port, or null when this machine cannot say.
 *
 * The two are not the same answer and must not be conflated: an empty list means "nothing is there",
 * and null means "lsof could not be run", and only one of those is a fact about the world. `lsof`
 * exits 1 with no output when nothing matches, which is why this reads the status rather than letting
 * `execFileSync` throw both cases into one catch.
 */
function listenersOn (port) {
  const ran = spawnSync('lsof', ['-nP', '-iTCP:' + String(port), '-sTCP:LISTEN', '-t'],
    { encoding: 'utf8', timeout: 5000 });
  if (ran.error) { return null; }
  const pids = String(ran.stdout || '').trim().split('\n')
    .map(line => Number(line.trim()))
    .filter(pid => Number.isFinite(pid) && pid > 0);
  if (pids.length) { return Array.from(new Set(pids)); }
  return ran.status === 0 || ran.status === 1 ? [] : null;
}

/**
 * The process serving `port`, given the process the caller started. Throws rather than guessing.
 *
 * Every refusal here costs the world its stamp and nothing else — `live-world.sh` treats a stamp
 * failure as non-fatal on purpose — so the bar for refusing is "anything less than certain".
 */
function socketHolder (port, launchedPid) {
  if (!Number.isFinite(Number(launchedPid)) || Number(launchedPid) <= 1) {
    throw new Error('a world stamp must be told which process the caller started; got launchedPid=' + launchedPid);
  }
  const listening = listenersOn(port);
  if (listening === null) {
    throw new Error('lsof could not say who is listening on :' + port + ', so the process holding the socket cannot be identified');
  }
  if (!listening.length) {
    throw new Error('nothing is listening on :' + port + ', so there is no serving process to stamp');
  }
  const ours = listening.filter(pid => isSelfOrDescendant(pid, launchedPid));
  if (!ours.length) {
    throw new Error(':' + port + ' is held by ' + listening.join(', ') + ', and none of them is ' + launchedPid +
      ' or a child of it — a process this run did not start is serving that origin');
  }
  if (ours.length > 1) {
    throw new Error(':' + port + ' is held by several of our own processes (' + ours.join(', ') +
      '), so which one serves this origin is ambiguous');
  }
  return ours[0];
}

// ---- WRITING -----------------------------------------------------------------------------------

/**
 * Writes the stamp for one origin. Called by `live-world.sh` once the world answers `/health`, i.e.
 * once the port it is about to read is demonstrably serving this world.
 *
 *   apiBaseUrl   the loopback origin this world stands on.
 *   repo         the API checkout the world was built from. The stamp keeps its BASENAME and never its
 *                absolute path — an artifact should not carry the directory layout of the laptop that
 *                produced it, the same rule `buildFromCheckout` follows.
 *   builtFrom    REQUIRED (W1). The `buildTokenOf(repo)` value read when the binary was BUILT. If the
 *                checkout has moved since, this refuses instead of naming the commit it moved to.
 *   launchedPid  REQUIRED (W2). The process the caller started. The stamp records the process actually
 *                holding the socket, which is that one or a child of it.
 *
 * Throws rather than returning a bad stamp: a stamp nobody can verify is worse than none, because the
 * sources below it would never be consulted.
 */
function writeStamp ({ apiBaseUrl, repo, launchedPid, builtFrom, writtenBy }, dir) {
  const at = parseLoopback(apiBaseUrl);
  const file = at ? fileFor(apiBaseUrl, dir) : null;
  if (!file) {
    throw new Error('a world stamp is only written for a loopback origin; got ' + apiBaseUrl);
  }

  // W1. Named first because it is the cheapest refusal and the one an operator most needs spelled out.
  const declaredBuild = String(builtFrom == null ? '' : builtFrom).trim();
  if (!declaredBuild) {
    throw new Error('a world stamp must name the build it is stamping: pass `builtFrom`, the token ' +
      '`world-stamp.js built <repo>` printed when the binary was built. Without it the stamp would ' +
      'record whatever the checkout says NOW, which is not necessarily what is running.');
  }
  const nowBuild = buildTokenOf(repo);
  if (!nowBuild) {
    throw new Error('not a git checkout, so there is no build to stamp: ' + repo);
  }
  if (nowBuild !== declaredBuild) {
    throw new Error('the checkout has moved since the build: ' + repo + ' was built from ' + declaredBuild +
      ' and now says ' + nowBuild + '. Refusing to stamp — a stamp naming ' + nowBuild +
      ' would name a commit this binary was not built from.');
  }

  // W2. The launcher is not necessarily the server, and it is the server whose life the stamp stakes
  // its claim on.
  const servingPid = socketHolder(at.port, launchedPid);
  const started = processStartedAt(servingPid);
  if (!started) {
    throw new Error('process ' + servingPid + ' stopped between binding :' + at.port +
      ' and being stamped, so a stamp naming it could never be verified');
  }

  const branch = gitIn(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const name = path.basename(path.resolve(repo));
  const stamp = {
    stamp: STAMP_VERSION,
    origin: normaliseOrigin(apiBaseUrl),
    build: {
      // Derived from `builtFrom` and never from the stamp-time read, so the field says what was BUILT
      // even in a world where the two could differ. They cannot, above — this is belt and braces on
      // the one field that travels into every artifact.
      //
      // `+dirty` in the id and `-dirty` in the short, matching `buildFromCheckout` exactly: the two
      // routes to one tree must produce ONE key, or a build gets two artifact files.
      id: name + '@' + declaredBuild,
      short: shaOfToken(declaredBuild).slice(0, 7) + (isDirtyToken(declaredBuild) ? '-dirty' : ''),
      branch: branch || null,
      builtFrom: declaredBuild
    },
    pid: servingPid,
    processStartedAt: started,
    // What the caller started, when that is not what ended up serving. Informational — the liveness
    // claim rests on `pid` alone — but it is the difference W2 was about, so it is on the record.
    launchedPid: Number(launchedPid) === servingPid ? null : Number(launchedPid),
    stampedAtUtc: new Date().toISOString(),
    // WHO SAID SO, and never a constant: this string travels into `backendBuild.detail` and therefore
    // into a live artifact, so a hard-coded "live-world.sh" would have every stamp — including the
    // ones this repo's own proof harness writes — claiming an authorship it does not have.
    writtenBy: writtenBy ||
      (require.main && require.main.filename ? relativeToCheckout(require.main.filename) : 'test/e2e/support/world-stamp.js')
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Written to a sibling and renamed into place. `writeFileSync` is not atomic, and a reader that
  // caught this file half-written would see "not readable JSON" — a refusal rather than a wrong
  // answer, so this is hardening and not a hole being closed. The temp name carries the pid so two
  // writers cannot collide on the sibling either.
  const pending = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(pending, JSON.stringify(stamp, null, 2) + '\n');
  fs.renameSync(pending, file);
  return { file, stamp };
}

/** Removes the stamp for an origin, if there is one. Used when a world is torn down or rebuilt. */
function clearStamp (apiBaseUrl, dir) {
  const file = fileFor(apiBaseUrl, dir);
  if (file && fs.existsSync(file)) { fs.rmSync(file); return file; }
  return null;
}

// ---- READING -----------------------------------------------------------------------------------

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
    'pid ' + read.stamp.pid + ' (which was serving this origin) still running'];
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
  isLoopbackHost,
  processStartedAt,
  buildTokenOf,
  socketHolder,
  isSelfOrDescendant,
  listenersOn,
  defaultDir,
  STAMP_VERSION
};

// ---- THE CLI live-world.sh CALLS ---------------------------------------------------------------
//
//   node test/e2e/support/world-stamp.js built  <apiRepo>
//   node test/e2e/support/world-stamp.js write  <apiBaseUrl> <apiRepo> <launchedPid> <builtFrom> [writtenBy]
//   node test/e2e/support/world-stamp.js clear  <apiBaseUrl>
//   node test/e2e/support/world-stamp.js show   <apiBaseUrl>
//
// `built` is read at the moment the binary is BUILT and handed back to `write` at the moment the world
// is stamped; that pair is W1's guard, and it is a pair on purpose — one call cannot compare a build
// to itself.
//
// `show` is the one an operator runs when a live artifact came back `-unidentified` and they want the
// reason in a sentence rather than by reading this file.
if (require.main === module) {
  const [command, ...rest] = process.argv.slice(2);
  const out = line => process.stdout.write(line + '\n');
  try {
    if (command === 'built') {
      const token = buildTokenOf(rest[0]);
      if (!token) {
        process.stderr.write('world-stamp: not a git checkout: ' + rest[0] + '\n');
        process.exitCode = 1;
      } else {
        out(token);
      }
    } else if (command === 'write') {
      const [origin, repo, launchedPid, builtFrom, writtenBy] = rest;
      const written = writeStamp({ apiBaseUrl: origin, repo, launchedPid, builtFrom, writtenBy });
      out(written.stamp.build.id + '  ->  ' + path.relative(REPO_ROOT, written.file) +
        '  (pid ' + written.stamp.pid +
        (written.stamp.launchedPid ? ', launched by ' + written.stamp.launchedPid : '') + ')');
    } else if (command === 'clear') {
      const cleared = clearStamp(rest[0]);
      out(cleared ? 'removed ' + path.relative(REPO_ROOT, cleared) : 'no stamp for ' + rest[0]);
    } else if (command === 'show') {
      const read = readStamp(rest[0]);
      out(read.ok
        ? read.stamp.build.id + '  (' + path.relative(REPO_ROOT, read.file) + ')'
        : 'no usable stamp for ' + rest[0] + ': ' + read.reason);
      if (!read.ok) { process.exitCode = 1; }
    } else {
      out('usage: world-stamp.js built <apiRepo>' +
        ' | write <apiBaseUrl> <apiRepo> <launchedPid> <builtFrom> [writtenBy]' +
        ' | clear <apiBaseUrl> | show <apiBaseUrl>');
      process.exitCode = 2;
    }
  } catch (error) {
    process.stderr.write('world-stamp: ' + ((error && error.message) || error) + '\n');
    process.exitCode = 1;
  }
}
