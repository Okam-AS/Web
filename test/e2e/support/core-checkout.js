// Borrowing the `core` submodule for the length of a browser run.
//
// THE PROBLEM. `core` is a git submodule (see .gitmodules, branch feature/POS) and lane worktrees do
// not carry a checkout of it — `core/` is an empty directory. Jest never noticed, because
// `jest.config.js` maps `~/*` to the repo root and the 91 suites import page/component code that
// happens not to reach into core at module scope. Webpack notices immediately: `plugins/platform-init`
// imports `~/core/platform` and `plugins/global-mixin` imports `~/core/services`, both of which are
// in nuxt.config's `plugins` list, so with no core there is no client bundle and therefore no app.
//
// TWO RULES. Nothing here may be committed, and nothing here may destroy a real checkout. Git
// enforces the first for us — `core` is a gitlink, so `git add core/anything` is refused with
// "Pathspec is in submodule" — and the `borrowed` flag enforces the second: a directory that already
// had content when we arrived is left exactly as it was, teardown included.
//
// THE THIRD RULE, LEARNED THE HARD WAY. A borrowed core must be the RIGHT core. The first version of
// this file took the first sibling checkout it found; on this machine that was an older one whose
// `services/index.ts` is missing five of the services `plugins/global-mixin.js` imports. Webpack
// reported it as five yellow warnings in a wall of build output, compiled anyway, and produced an
// app where `this._reservationService` is `undefined` — a defect that would have been blamed on the
// pages. So the copy is now VERIFIED against what the app actually imports, and a candidate that
// does not satisfy it is refused by name rather than used quietly. Unknown is not zero; a core that
// nearly matches is not a core.
//
// WHERE THE SOURCE COMES FROM, in order:
//   1. $OKAM_CORE_PATH                       — explicit, wins over everything
//   2. ../Web-modules/core                   — the primary checkout of this repo
//   3. any other sibling `*/core`, sorted    — deterministic, and each one is verified before use

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CORE_DIR = path.join(REPO_ROOT, 'core');
// Under artifacts/ because it is run state, not source, and artifacts/ is already gitignored.
const MARKER = path.join(REPO_ROOT, 'artifacts', '.core-borrowed');

// A checked-out core has these at its top level; an empty submodule mount has nothing.
const CORE_MARKERS = ['services', 'platform', 'interfaces'];

// The one file that decides whether this app can be built at all: every name it pulls out of
// `~/core/services` must be exported by the candidate, or the bundle carries undefined services.
const IMPORT_SITE = path.join(REPO_ROOT, 'plugins', 'global-mixin.js');

function looksLikeCore (dir) {
  return CORE_MARKERS.every(marker => fs.existsSync(path.join(dir, marker)));
}

/** The service names `plugins/global-mixin.js` imports from `~/core/services`. */
function requiredServices () {
  const source = fs.readFileSync(IMPORT_SITE, 'utf8');
  const match = /import\s*\{([\s\S]*?)\}\s*from\s*'~\/core\/services'/.exec(source);
  if (!match) { return []; }
  return match[1].split(',').map(name => name.trim()).filter(Boolean);
}

/** Which of those a candidate's `services/index.ts` does not export. */
function missingFrom (dir, required) {
  const indexFile = path.join(dir, 'services', 'index.ts');
  if (!fs.existsSync(indexFile)) { return required.slice(); }
  const index = fs.readFileSync(indexFile, 'utf8');
  return required.filter(name => !new RegExp('\\b' + name + '\\b').test(index));
}

function candidateSources () {
  const parent = path.resolve(REPO_ROOT, '..');
  const explicit = process.env.OKAM_CORE_PATH ? [path.resolve(process.env.OKAM_CORE_PATH)] : [];
  const siblings = fs.existsSync(parent)
    ? fs.readdirSync(parent, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => {
        // The primary checkout of this repo first; everything else alphabetically, so the choice is
        // the same on every machine and every run.
        if (a === 'Web-modules') { return -1; }
        if (b === 'Web-modules') { return 1; }
        return a.localeCompare(b);
      })
      .map(name => path.join(parent, name, 'core'))
    : [];
  return explicit.concat(siblings);
}

function findSource () {
  const required = requiredServices();
  const rejected = [];

  for (const candidate of candidateSources()) {
    if (candidate === CORE_DIR || !fs.existsSync(candidate) || !looksLikeCore(candidate)) { continue; }
    const missing = missingFrom(candidate, required);
    if (missing.length === 0) { return { source: candidate, required }; }
    rejected.push(candidate + ' (missing: ' + missing.join(', ') + ')');
  }

  return { source: null, required, rejected };
}

/**
 * Makes `core/` usable, and says whether we are the ones who made it so.
 *
 * Returns `{ borrowed, source }`. `borrowed:false` means a real checkout was already there and this
 * did nothing — `releaseCore()` will then also do nothing.
 */
function ensureCore () {
  if (fs.existsSync(CORE_DIR) && looksLikeCore(CORE_DIR)) {
    return { borrowed: false, source: CORE_DIR };
  }

  const found = findSource();
  if (!found.source) {
    throw new Error(
      'core/ is empty in this worktree and no usable source checkout was found.\n' +
      (found.rejected && found.rejected.length
        ? 'Rejected (they do not export everything plugins/global-mixin.js imports):\n  ' +
          found.rejected.join('\n  ') + '\n'
        : '') +
      'Fix it either way:\n' +
      '  git submodule update --init core                  (a real checkout, kept)\n' +
      '  OKAM_CORE_PATH=/path/to/Core npm run test:e2e     (borrowed for the run, then removed)'
    );
  }

  fs.mkdirSync(CORE_DIR, { recursive: true });
  // `.git` is excluded so the borrowed copy can never be mistaken for a checkout, by us or by git.
  for (const entry of fs.readdirSync(found.source)) {
    if (entry === '.git') { continue; }
    fs.cpSync(path.join(found.source, entry), path.join(CORE_DIR, entry), { recursive: true });
  }

  // The marker is how a teardown running in ANOTHER process knows this directory is ours to remove.
  // It matters because Playwright kills a webServer's process tree, and a SIGKILLed wrapper runs no
  // exit handler — see playwright.config.js `gracefulShutdown` and `globalTeardown`.
  fs.mkdirSync(path.dirname(MARKER), { recursive: true });
  fs.writeFileSync(MARKER, JSON.stringify({ source: found.source, at: new Date().toISOString() }) + '\n');

  return { borrowed: true, source: found.source };
}

function removeBorrowed () {
  fs.rmSync(CORE_DIR, { recursive: true, force: true });
  // The submodule's mount point stays, empty, exactly as `git worktree add` leaves it.
  fs.mkdirSync(CORE_DIR, { recursive: true });
  fs.rmSync(MARKER, { force: true });
}

/** Puts `core/` back the way we found it. A no-op unless THIS process borrowed it. */
function releaseCore (state) {
  if (!state || !state.borrowed) { return false; }
  removeBorrowed();
  return true;
}

/** The same, driven by the marker rather than by in-process state. For `globalTeardown`. */
function releaseBorrowedCore () {
  if (!fs.existsSync(MARKER)) { return false; }
  removeBorrowed();
  return true;
}

module.exports = { ensureCore, releaseCore, releaseBorrowedCore, CORE_DIR, REPO_ROOT, MARKER };
