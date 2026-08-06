# A capture names the module tree it was produced against

Lane `L-ARTIFACT-NAMES-ITS-MODULE-TREE`, brief `6305a954`, class **node**.
Branch `lane/artifact-names-its-module-tree`, worktree `/Users/svendaneel/okam/web-modtree`
(created off `8ac6f636`, the shared checkout's HEAD). Commits **`8fa3f6d`**, **`f8980ef`** and
**`c3024b8`** — the last of which puts back a file that should never have been in this branch: two of
this lane's own runs were swept into `f8980ef` by `git add -A`, replacing L-MODAL-SCROLLLOCK's
committed record at the one path `.gitignore` force-adds for that lane. Restored from `8ac6f636`; the
final diff is eight files and no artifact among them. This lane's captures live only in `runs/`.

Nothing was pushed. `npm ci` / `npm install` were never run. No container was started or touched.
Port 4010 was never bound — the fixture ran on 4078 and the web server on 3078.

---

## 0. The tree every number below came from

| number | read from | when |
|---|---|---|
| the two captures, the mutant capture, the ledger lines | runs of `test/e2e/journeys/modal-scroll-lock.spec.js` in `/Users/svendaneel/okam/web-modtree` at **`f8980ef`**, clean | 2026-08-05 10:32–10:38 local |
| the nuxt build-directory rules | `node_modules/@nuxt/cli/dist/cli-generate.js:128`, `cli-export.js:36`, `@nuxt/config/dist/config.js:139` and `:538`, and the absence of any `buildDir` assignment in `cli-dev.js` / `cli-build.js` | same session |
| jest | `npx jest --coverage=false` in the same worktree at `f8980ef` | same session |
| the worktree population, and the `generate` cache mtime | the live filesystem, and `lanes/L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE/census.md` for the counts | same session |

**The shared checkout was dirty before I started** — 338 entries in `git status --porcelain`, including
tracked files under `artifacts/journeys/` — and it is dirty in the same way now. That state was
captured before any work began and none of it is mine; nothing in the shared checkout was written to,
and every commit here is on this lane's own branch in its own worktree.

---

## 1. What was added, and what was deliberately not

**Added — `moduleTree`, one block on every journey artifact, beside `commit`:**

```json
"moduleTree": {
  "state": "symlink",                                          // symlink | own | absent
  "realpath": "/Users/svendaneel/okam/Web-modules/node_modules",
  "owner": "Web-modules",
  "shared": true,
  "detail": "the modules resolve OUTSIDE web-modtree, into Web-modules",
  "root": "/Users/svendaneel/okam/web-modtree",
  "buildDir": { "command": "nuxt dev", "realpath": "/Users/svendaneel/okam/web-modtree/.nuxt",
                "inside": "worktree", "shared": false, "exists": true,
                "mtimeUtc": "2026-08-05T08:32:05.992Z", "detail": null },
  "source": "the dev server that served this run (artifacts/web/dev/127-0-0-1-3078.json, pid 73702)"
}
```

Files: new `test/e2e/support/module-tree.js`; `test/e2e/scripts/dev-server.js` stamps what it
resolved; `test/e2e/support/journey.js` reads that stamp back and files the block;
`test/e2e/support/artifact-store.js` adds two ledger keys; `test/e2e/support/world-stamp.js` gains
`listenersOn` and `isSelfOrDescendant` (see §5); new `test/journey-module-tree.test.js`, 20 tests.

**NOT done, on purpose:** nothing existing was renamed, moved or re-shaped. The last test in the new
suite asserts that all fourteen keys the ledger line already carried are still present under their
old names, because the plan log and the per-backend run records join on them.

### Why the realpath and not the path

`artifact-store.js` keeps absolute paths out of artifacts by rule — a build is `<checkout>@<sha>`,
never a directory layout. This field is the exception, and §3 is the measurement that earns it: the
*path* is `<root>/node_modules` in all 124 worktrees, so a field carrying it would be present on
every artifact, look like an answer, and separate nothing.

### What it reads when there is no module tree at all

`state: "absent"`, `realpath: null`, `owner: null`, and a `detail` saying nothing is installed or
linked. Eighteen worktrees are in that state right now. The block is written on **every** artifact,
so its ABSENCE means an artifact from before this field existed — never a tree without modules. The
ledger keeps the same distinction: `absent` is a word, and a pre-field record reads `null`.

A symlink whose target has been removed stays `state: "symlink"` with a null realpath, because
"borrowed from a tree that no longer exists" and "nothing was ever installed" send a reader to two
different places.

### The build directory actually used, not the configured one

Measured in this repo's own `node_modules`, not remembered:

| command | rule | where it lands |
|---|---|---|
| `nuxt dev`, `nuxt build` | `buildDir: '.nuxt'`, `@nuxt/config/dist/config.js:139`, resolved at `:538`. Neither `cli-dev.js` nor `cli-build.js` assigns `buildDir` at all. | inside the worktree |
| `nuxt generate` | `config.buildDir = config.static && config.static.cacheDir \|\| path.resolve(config.rootDir, "node_modules/.cache/nuxt")`, `cli-generate.js:128` | inside `node_modules` — through a symlink, inside **another checkout** |
| `nuxt export` | `cli-export.js:36` delegates to `generate.default.run` | the same, and this was checked rather than assumed |

The resolution walks the longest existing ancestor and re-joins the rest, so
`<worktree>/node_modules/.cache/nuxt` resolves to the SHARED checkout's cache **before anything has
written a byte into it** — which is the case that matters, the first `generate` in a fresh worktree.
`exists` / `mtimeUtc` beside the path are the disk's corroboration of the rule's claim.

---

## 2. It is the SERVER's tree that is recorded, not the runner's

The process that compiles the app is not the process that writes the artifact, and
`playwright.config.js:101` sets the webServer's `reuseExistingServer: !CI` — so a run can adopt one somebody
else started out of another checkout. `dev-server.js` therefore stamps what it resolved to
`artifacts/web/dev/<host>-<port>.json` (pid, that pid's `ps -o lstart=`, root, module tree, build
dir), and `journey.js` reads it back for the origin it actually drove. The stamp is **refused, never
repaired**, when:

- the process it names is gone;
- the pid is alive but its start time differs — the OS recycled the number;
- the pid is alive and does **not** hold the port, which is exactly what `reuseExistingServer` does.

When no stamp answers, the runner's own checkout is described and `source` says so in words:
`"this checkout, NOT the server that answered: <reason>"`. A fact correctly labelled, not a guess.
The stamp is cleared when the dev server exits; `artifacts/web/dev/` was empty after every run here.

---

## 3. THE EXIT CRITERION: two captures, one tree, distinguishable

Same journey, same commit, same status, same backend key. **Only the module tree differed** — the
worktree's `node_modules` was a symlink for arm A and a `cp -Rc` clone of the same modules for arm B.

| | arm A (symlinked) | arm B (its own) | differ |
|---|---|---|---|
| `state` | `symlink` | `own` | **yes** |
| `realpath` | `/Users/svendaneel/okam/Web-modules/node_modules` | `/Users/svendaneel/okam/web-modtree/node_modules` | **yes** |
| `owner` | `Web-modules` | `web-modtree` | **yes** |
| `shared` | `true` | `false` | **yes** |
| `buildDir.realpath` | `…/web-modtree/.nuxt` | `…/web-modtree/.nuxt` | no — `dev` keeps it in the worktree, which is the census's narrowing, now visible on the record |
| ledger `moduleTree` | `shared:Web-modules` | `own` | **yes** |
| journey / commit / status / key | `modal-scroll-lock` / `f8980ef` / `passed` / `fixture` | identical | — |

Both arms green: `1 passed (32.2s)` and `1 passed (46.3s)`.
Files: `runs/A-symlinked.playwright.json`, `runs/B-own.playwright.json`, `runs/A-symlinked.log`,
`runs/B-own.log`, `runs/ledger.jsonl`.

### The falsification — a field that has never been shown to differ

One line was mutated, `const real = realpathOf(own)` → `const real = own` — the path instead of the
realpath, which is the single choice the brief names — and arm A was re-run against the same
symlinked tree. `runs/M-mutant-path.playwright.json`:

| | mutant A (symlinked) | honest B (its own) | still distinguishable? |
|---|---|---|---|
| `realpath` | `…/web-modtree/node_modules` | `…/web-modtree/node_modules` | **no** |
| `owner` | `web-modtree` | `web-modtree` | **no** |
| `shared` | `false` | `false` | **no** |
| `state` | `symlink` | `own` | yes — and `state` alone cannot name WHICH tree, which is the whole question |

So the naive field collapses a borrowed tree into an owned one on every value that identifies a tree.
Jest went **5 failed / 15 passed** under the same mutation and **20/20** with it reverted; the
mutation was reverted with `git checkout --`, `grep -c MUTANT` is 0 and porcelain was empty after.

---

## 4. Everything that was re-measured

| check | result |
|---|---|
| `npx jest test/journey-module-tree.test.js` | **20 / 20** |
| `npx jest --coverage=false` (whole repo) | **2571 passed, 2 failed, 114 suites** |
| the 2 failing tests | **pre-existing at `8ac6f636`** — measured before any edit: `journey-artifact-store.test.js` 2 failed / 36 passed. Two assertions spell `Web-modules` literally (lines 295, 457) in a file whose own header explains why literals were replaced by a derived `SELF`; they red in every worktree not named `Web-modules` |
| the other 3 failing suites | `core-price-label`, `core-request-path-shape`, `price-absence` — `Could not locate module ~/core/helpers/tools`. `core/` is an empty submodule mount in a fresh worktree; nothing to do with this change |
| `node test/e2e/scripts/guard-proof.js` | **10 / 10 arms, exit 0** |
| `node test/e2e/scripts/build-provenance-proof.js` | **5 / 5 arms, exit 0** |
| `npx eslint` on all eight touched files | clean |
| shared `node_modules/.cache/nuxt/components/index.js` mtime | `2026-08-05 08:02:57` — unchanged by everything above, confirming these runs were `dev` and stayed in the worktree |

---

## 5. Two things found while doing this that are not this

**`guard-proof.js` could not be loaded at all at `8ac6f636`.** Its harness copies `journey.js` and
`artifact-store.js` but not `world-stamp.js`, which `artifact-store.js` requires — so every arm died
on `Cannot find module './world-stamp'` before reaching a browser. Measured directly at HEAD before
any edit of mine, by rebuilding its copy set and requiring it. Repaired here, because this lane adds
a require to the same file and would otherwise have inherited the blame: the copy list is now one
named list, and `buildHarness` **requires the copied harness** and fails with the file to add rather
than letting the arms go red for the script's own reason. It is 10/10 now.

**`listenersOn` / `isSelfOrDescendant` went into `world-stamp.js`, not into `module-tree.js`.**
"Which process is really serving this origin" is one boundary and `world-stamp.js` owns it; drawn
twice it would be wrong twice, which has already happened on this estate with two inline loopback
lists that both carried the same unreachable IPv6 spelling. Note for whoever merges: the *dirty*
`world-stamp.js` in the shared checkout (another lane, uncommitted) already contains functions of
these names with these semantics. Take theirs — `module-tree.js` calls them by name and signature
and will keep working.

**A hazard for other lanes: `git stash` is SHARED across worktrees.** The stash stack lives in the
common `.git` directory, so `git stash pop` in a worktree with nothing of its own to pop reaches for
another lane's entry. That happened here while measuring a baseline: it tried to pop
`stash@{0}: On feature/swiss: swiss: Modal.vue …` from 2026-07-28 and conflicted. Nothing was lost —
git keeps the entry when a pop conflicts — the conflict was undone with `git reset HEAD <file>` +
`git checkout --`, and `git stash list` still shows that entry, unchanged. **Do not use `git stash`
to take a baseline in a worktree on this estate.** Use a fresh temp copy, as §4's HEAD measurement
did.

---

### Artefacts in this lane directory

`run.md` · `runs/A-symlinked.playwright.json` · `runs/B-own.playwright.json` ·
`runs/M-mutant-path.playwright.json` · `runs/A-symlinked.log` · `runs/B-own.log` ·
`runs/M-mutant-path.log` · `runs/ledger.jsonl` · `runs/guard-proof.log` ·
`runs/build-provenance-proof.log`
