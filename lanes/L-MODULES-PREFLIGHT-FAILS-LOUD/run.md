# L-MODULES-PREFLIGHT-FAILS-LOUD — a suite that cannot run says so

Two worktrees of this repository, at one commit, differing only in whether their module trees are
there. Evidence written here, in the plan repo's lane directory — a different tree from either one
measured, so no run log can push a measured tree's build id to `+dirty`.

| | |
|---|---|
| HEALTHY | `/Users/svendaneel/okam/web-preflight` — `node_modules` symlinked at `/Users/svendaneel/okam/Web-modules/node_modules`, `core` submodule populated at `1bcab0b6` |
| MISSING | `/Users/svendaneel/okam/web-preflight-missing` — no `node_modules`, `core/` present and empty. **Created deliberately for this lane and never repaired.** |
| BEFORE | `e34977a` — the tip this lane cut from |
| AFTER | `eb9d52e` — `lane/modules-preflight-fails-loud`, three commits |

Driver `falsify.sh`, full transcript `falsify.txt` (3,026 lines). It asserts each tree's HEAD, dirty
count, `node_modules` shape and `core/` entry count **before** reading any number out of it.

---

## The before — exactly what a tree without modules does today

| stage | tree | command | exit | what it reported | does anything name the cause? |
|---|---|---|---|---|---|
| BEFORE | MISSING | `npm test` | **127** | `sh: jest: command not found` | no — names a binary, not a tree |
| BEFORE | MISSING | `npx jest --ci` | **1** | `Module ts-jest in the transform option was not found` — **no suite total at all** | no |
| BEFORE | MISSING | `npx jest --ci 2>&1 \| tail -3` | **0** | the last 3 lines are a docs URL | **no, and it reads as a pass** |
| BEFORE | HEALTHY | `npm test` | 1 | `112 suites, Tests: 2 failed, 2581 passed, 2583 total` | — (2 pre-existing failures, unrelated) |
| BEFORE | HEALTHY | `npm test -- test/chf-format.test.js` | 0 | `5 passed, 5 total` | — |

**Which of the three known failures my worktree produced: the second, and — through the caller — the
third.** It did *not* produce the first. That distinction is the finding below.

## The smaller green is a different failure from the missing `node_modules`

Same tree, same commit, same healthy `node_modules`. Only the `core` submodule differs:

| `core/` | suites | tests | exit |
|---|---|---|---|
| present but **empty** (`coreempty-2547.txt`) | 112 total, **4 failed** | 2 failed, 2545 passed, **2547 total** | 1 |
| populated (`corepopulated-2583.txt`) | 112 total, **1 failed** | 2 failed, 2581 passed, **2583 total** | 1 |

Three suites — `core-request-path-shape`, `price-absence`, `core-price-label` — fail at LOAD,
contribute zero tests each, and **36 real tests leave the denominator**. The exit code is 1 either
way, for an unrelated reason, so nothing in the run changes when the number does. **This is the
"smaller green".** An absent `node_modules` does not produce a smaller green; it produces no green,
no red and no total.

**Three corrections the brief is owed, each measured, none inherited:**

1. **2547 is real and is not the `node_modules` failure.** It is this commit's total with the `core`
   submodule empty. **2729 is not a total this commit produces in any state I could construct** —
   whole, this commit is **2583**. Both halves of "2547 instead of 2729" are figures attributed to a
   tree that could not have produced them together.
2. **Jest does not exit 0 on the Validation Error.** `npx jest --ci` exits **1**. The 0 comes from
   the caller's pipeline — zsh and bash both return the tail's status. Measured both ways, and it is
   the only one of the three that a preflight cannot fix.
3. **The shared module tree is not another repository.** `/Users/svendaneel/okam/Web-modules` is
   itself a linked worktree; the main checkout is `/Users/svendaneel/okam/Web` at `feature/POS`,
   same repo (`git@github.com:Okam-AS/Web.git`). Its `package-lock.json` is a *different file*
   (2,171,861 vs 2,175,217 bytes), so linking at it is a stale tree, not a foreign one.

## The estate, counted (`census.sh` → `census.txt`, 2026-08-05T04:09:32Z)

```
worktrees carrying a package.json ......... 115
  node_modules ABSENT ..................... 21   (the suite cannot start)
  node_modules symlinked elsewhere ........ 80
    ...of those, linked at a checkout whose package-lock.json DIFFERS: 16
  node_modules a real directory ........... 14
  core/ present but EMPTY ................. 68   (the suite runs and undercounts)
  core/ populated ......................... 47
```

Three of the 21 are mine, created for this lane. **The count moves while you measure it** — 107 an
hour earlier — because sibling lanes add worktrees continuously. That is why the number is a
snapshot with a timestamp and a script beside it, and why the remedy is not "remember to install".

---

## The after

`scripts/suite-preflight.js` — **zero dependencies, node builtins only**, because it is the one thing
that must work in a tree where nothing is installed. It resolves every module `jest.config.js` names
(discovered from the config object, not hard-coded: `ts-jest`, `babel-jest`, `vue-jest`, `vue`), the
runner, and all 48 declared dependencies; requires each to resolve out of **this tree's own**
`node_modules` rather than an ancestor's; and requires every submodule `.gitmodules` declares to be
populated. **48 modules + 1 submodule in 6 ms** on the sound path.

**It installs, clones and repairs nothing.** It names the two repairs and stops.

| stage | tree | command | exit | what it reported |
|---|---|---|---|---|
| AFTER | MISSING | `npm test` | **1** | `SUITE-PREFLIGHT: this tree cannot run the suite` + the absent list; jest never ran |
| AFTER | MISSING | `npx jest --ci` | **1** | same message, from the config layer |
| AFTER | MISSING | `npx jest --ci 2>&1 \| tail -3` | 0 *(pipeline)* | **the verdict line is inside those 3 lines** |
| AFTER | HEALTHY | `npm test` | 1 | `112 suites, Tests: 2 failed, 2581 passed, 2583 total` — **line-for-line the BEFORE result** |
| AFTER | HEALTHY | `npm test -- test/chf-format.test.js` | 0 | `5 passed, 5 total` — unchanged |

The refusal's **last** line repeats the verdict, because the one measured escape is a caller that
truncates:

```
SUITE-PREFLIGHT: this tree cannot run the suite — 48 module(s) absent, 0 resolved outside it,
1 submodule(s) empty. NO TESTS RAN; there is no total.
```

### The ancestor case, constructed deliberately

A worktree placed inside a directory that carries a `node_modules` symlink — no ancestor of any real
worktree in this estate has one today, so it had to be built (`ancestor-before.txt`,
`ancestor-after.txt`):

- **before:** the suite **ran**, reported `112 suites / 2547 total`, exit 1. Nothing said the modules
  came from `/Users/svendaneel/okam/Web-modules/node_modules`.
- **after:** refused, exit 1, `48 module(s) resolved from OUTSIDE this tree`, each with the path it
  actually came from.

An explicit symlink *at* the tree is accepted; an implicit ancestor is not. That is the intended
distinction: the first is a choice someone made about this tree, the second is an accident.

### What runs it (C3)

`package.json` `"pretest"` — the earliest point in the `npm test` path, before `jest` is even looked
for, which is what replaces the bare `sh: jest: command not found`. And `jest.config.js` calls it on
the way out — the earliest point in the `npx jest` path, since jest requires the config before it
normalises anything, and a `globalSetup` would run *after* the transform validation that already
failed. `"check:suite-preflight"` is the standalone operator lever. **`.github/workflows/nuxtjs.yml`
does not run the suite at all** (install + `generate` only), so there is no CI gate here to wire
into — which is the same shape this program has already found three times, and is why the check sits
in two live paths rather than a config nothing reads.

A test file could not have been the enforcement point for this defect: when the modules are absent,
no test runs.

---

## What this check cannot see — named, because naming it is part of the deliverable

1. **A stale module tree.** It resolves **names**, not **versions**. A `node_modules` installed
   against an older `package.json` resolves every name and is a different failure. **16 of the 80
   symlinked worktrees are in exactly that state right now** and this check calls them sound.
   *Partial mitigation only:* the remedy it prints offers a checkout to link at only when that
   checkout's `package-lock.json` is byte-identical to the failing tree's — verified by sha256, and
   it is why `/Users/svendaneel/okam/Web` is never offered. Nothing stops a person linking elsewhere
   afterwards.
2. **A submodule at the wrong commit.** It sees an **empty** submodule directory, not a populated one
   a hundred commits behind its pin.
3. **Modules a test file imports that `package.json` does not declare.** Nothing enumerates them.
4. **A caller that discards the exit code.** Measured: the pipeline still returns 0. All the check
   can do — and does — is make its verdict the last line on screen.
5. **A wrong node.** `package.json` asks for `node 22.x`; the runs above were on **v24.15.0** and
   nothing checked. That is a fourth silent-divergence class, untouched by this lane.
6. **A tree with modules that are broken rather than absent** — a half-written install, a corrupt
   package. `require.resolve` succeeding is not the same as the module loading.

Each wants its own check. This one closes exactly the class it names, and the file's header carries
this same list so it travels with the code.

## Not done, deliberately

The 21 worktrees without `node_modules` and the 68 with an empty `core/` were **counted, not
repaired**. Repairing them would have hidden the same problem one layer along, and this estate has
already been bitten by a script that silently measured another tree.

## Files

| file | what it is |
|---|---|
| `falsify.sh` / `falsify.txt` | the driver and its 3,026-line transcript, BEFORE and AFTER in both trees |
| `census.sh` / `census.txt` | the estate count, re-runnable, timestamped |
| `coreempty-2547.txt` / `corepopulated-2583.txt` | the 36-test gap, one tree, one commit |
| `ancestor-before.txt` / `ancestor-after.txt` | the ancestor-resolution case, built on purpose |
