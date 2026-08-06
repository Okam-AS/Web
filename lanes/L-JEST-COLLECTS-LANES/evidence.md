# L-JEST-COLLECTS-LANES — evidence

Baseline taken by this lane: `e34977acebd59b223584158c33451b6f1ffd82c1` (shared checkout on
`feature/restaurant-modules`, **261 dirty files** from concurrent lanes at the moment of measurement,
265 by the last run — none of the churn is this lane's). First measurement 2026-08-04 23:52 CEST.

Lane worktree: `/Users/svendaneel/okam/web-jestlanes` — basename **`web-jestlanes`**, detached at the
baseline commit. Every run below marked "lane worktree" was executed from it.

The count under `lanes/` depends on which siblings have landed evidence by the time you run, so each
run below states its tree and its moment.

---

## 1. The premise, verified rather than inherited — confirmed, with three corrections

Unmodified `e34977ac`, shared checkout, 23:52, 261 dirty:

```
Test Suites: 5 failed, 125 passed, 130 total
Tests:       2920 passed, 2920 total
```

**"N failed suites, 0 failed tests" is exactly right**, and all five failures are the same error —
`require('@playwright/test')` evaluated outside a Playwright runner:

```
at Object.<anonymous> (lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe.spec.js:18:26)
```

Three corrections to the figures I was handed:

| claim | actual |
|---|---|
| "four lanes" | **four lane directories, five failing suites** — `L-WF-PIVOT-DEFECTS` contributes two |
| the specs are "other lanes' committed evidence" | **only three of the five are committed anywhere.** The two `L-WF-PIVOT-DEFECTS` probes are in **no commit on any of the 84 refs** — they exist only as untracked files in the shared checkout |
| a naive pattern would also catch `docs/plans/` | the path is **`docs/plan/lanes/`** (singular `plan`). `docs/plans/` does not exist. The hazard is real; the path named was not |

The 1→3 growth I was told about is structural and I reproduced it directly — see §5.

## 2. The two populations, kept apart

The brief warned these look alike and must not be conflated. They are:

| | population | where it lives | count |
|---|---|---|---|
| A | Playwright probes committed as lane evidence | `lanes/` on the lane's own branch | 3 |
| B | Playwright probes a concurrent lane left **untracked** in the shared checkout | working tree only | 2 |

Both are lane evidence under `lanes/`, and the fix is scoped to `lanes/` — so it covers both **without
touching the different hazard** a sibling reported, where an untracked *page* left in the shared tree
broke a legitimate suite. That failure is in `pages/`, `components/` or `test/`; nothing here can hide
it. This fix cannot silence a suite outside `lanes/`, which §6 proves by diffing the collected set.

## 3. What else the pattern would catch — checked before widening it

Every file under `lanes/` on **every ref** (84 branches), not just this one:

```
lane/L-JOURNEY-PORT-HARDCODED  :: lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js
lane/train-publish-unclickable :: lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js
lane/train-readonly-visible    :: lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js
lane/mrg-page-test-vacuous     :: lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js
```

The fourth is the important one, and it changed the shape of the fix.

### The archived jest test — the harm that is not red

`lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` is **not** a Playwright probe. It is a
real, runnable jest suite: the pre-fix **copy** of `test/margin-recipes-page.test.js`, kept by that
lane to show what its fix replaced. 551 lines, **29 `test(` cases**; the live test that superseded it
has 681 lines and 31.

**Two corrections to that sentence, both measured 2026-08-05.** The keyword is `test(`, not `it(` —
these suites declare no `it()` blocks at all, so a count of them returns 0 for both files and the
figure 29 came from `test(`. And the "681 lines and 31" live test exists **only on
`lane/mrg-page-test-vacuous`**, the branch this lane read. On `feature/restaurant-modules` at
`e34977ac`, `test/margin-recipes-page.test.js` is **byte-identical** to the archived copy — the same
551 lines and 29 `test(` cases — so on the branch the fix is landing on, the inflation is an exact
duplicate rather than a superseded-versus-replacement pair. The count of 29 is right either way.

Collected by jest, it does not go red. It **passes** — see §5 — so 29 superseded assertions silently
rejoin the green count as duplicates of the live test, and the vacuous version that a lane
deliberately removed is quietly counted as evidence again.

This is why the repo's naming convention is **not** a safe basis for the pattern. Every Playwright
journey here is `*.spec.js` (37 in `test/e2e/`) and every jest test is `*.test.js` (125 in `test/`), so
an exclusion narrowed to `lanes/**/*.spec.js` would have silenced the five reds and **left the
archived copy running**. The directory is the right unit: `lanes/` is lane working directories, and
nothing in it is this suite's input. Across all 84 refs there is **no file under `lanes/` that any
lane wants jest to collect**.

## 4. The change

`jest.config.js` only. One entry appended to `testPathIgnorePatterns`, alongside the `test/e2e/` entry
that already exists for the identical reason:

```js
'<rootDir>/lanes/'
```

Nothing was deleted. The probes are still run by `npm run test:e2e`, the archive is still on its
lane's branch.

**Anchored on purpose.** These entries are regexes tested against the whole path, so a bare `lanes`
matches any path merely containing the word. Both forms evaluated against real paths in this repo:

| path | bare `lanes` | `<rootDir>/lanes/` |
|---|---|---|
| `lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js` | IGNORED | IGNORED |
| `lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` | IGNORED | IGNORED |
| `docs/plan/lanes/L-FRAGILE-NEEDLES/mutation-log.md` (**real**) | IGNORED | kept |
| `docs/plan/lanes/L-XZ-CREDIT-FIELDS/evidence.md` (**real**) | IGNORED | kept |
| `test/multi-lanes-rollout.test.js` (hypothetical) | IGNORED | kept |

`docs/plan/lanes/` holds **6** real paths, all `.md`, so **nothing there is collectable today** — the
bare form's damage is latent, not current. It is still the wrong pattern to leave behind.

**The 14 written here first was never true of any ref.** Re-measured 2026-08-05: 6 untracked `.md`
files on disk, **0 tracked on `feature/restaurant-modules`**, and 0 on every one of the 120 refs
except `refs/lanes/plan-snapshot` (`51970563`, the preservation snapshot taken that night), which
holds the same 6. The directory is real and the hazard is real; only the count was invented. The same
false 14 rode into the `jest.config.js` comment at `82127eb` and is corrected there.

## 5. Exit criterion — a full jest run from a lane worktree

All four runs from `/Users/svendaneel/okam/web-jestlanes`, detached at `e34977ac`.

| # | tree | collected | under `lanes/` | suites | tests |
|---|---|---|---|---|---|
| 1 | pristine, 0 dirty | 112 | 0 | **1 failed**, 111 passed | 2 failed, 2581 passed |
| 2a | + 1 sibling's committed evidence | 113 | 1 | **2 failed**, 111 passed | 2 failed, 2581 passed |
| 2b | + all four lanes (**BEFORE**) | 118 | 6 | **6 failed**, 112 passed | 2 failed, 2610 passed |
| 3 | same tree, **AFTER** the fix | 112 | 0 | **1 failed**, 111 passed | 2 failed, 2581 passed |

**Run 2b — BEFORE.** The defect reproduced, both populations present:

```
FAIL lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js
FAIL lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js
FAIL lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js
FAIL lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe-roles.spec.js
FAIL lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe.spec.js
FAIL test/journey-artifact-store.test.js
PASS lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js   <-- the silent one
PASS test/margin-recipes-page.test.js                                <-- running beside its own archive
Test Suites: 6 failed, 112 passed, 118 total
Tests:       2 failed, 2610 passed, 2612 total
```

**Run 3 — AFTER, same tree, only `jest.config.js` changed:**

```
Test Suites: 1 failed, 111 passed, 112 total
Tests:       2 failed, 2581 passed, 2583 total
FAIL test/journey-artifact-store.test.js
```

**No failing suite belongs to another lane's `lanes/` directory.** Exit criterion met.

Two numbers worth reading together: passing tests fell 2610 → 2581, exactly **−29**, the archived
copy's 29 `test(` cases leaving the count they should never have joined. Removing suites *lowered* the
green total, which is the honest direction.

### 5b. The same run against the LANDED commit, not the working copy

Runs 1–3 ran a working copy. This one runs the tree as committed (`cbb5a98`), with the four siblings'
committed evidence checked out beside it — the merged future, not an edit sitting in a directory:

```
WORKTREE: web-jestlanes  HEAD: cbb5a98
the specs ARE on disk:
  lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js
  lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js
  lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js
  lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js
Test Suites: 1 failed, 111 passed, 112 total
Tests:       2 failed, 2581 passed, 2583 total
FAIL test/journey-artifact-store.test.js
```

The files are **present and not collected**, so it is the exclusion doing the work and not their
absence — the distinction the brief asked for. Nothing was deleted to get this run green.

### The growth is structural, reproduced not assumed

Runs 1 → 2a → 2b are the same tree with siblings' evidence added one step at a time: failing suites
go **1 → 2 → 6** while **failed tests stay at exactly 2**. The count tracks how many siblings have
landed evidence, not anything about this suite's code. That is the tell the brief described.

### Which failures are mine, and which were already there

`test/journey-artifact-store.test.js` fails in runs 1–3 **identically, before and after**, with two
genuinely failing tests at `:295` and `:457`. It is not mine and not new: it is the
worktree-basename pin, already fixed on `lane/worktree-basename-pin` but not yet on `e34977ac`, and it
reds in any worktree not named `Web-modules`. I inherited it by naming my worktree normally rather
than dodging it.

It is also the clean counter-example this lane exists to protect. Compare the signatures:

- a **collection** artefact reads `N failed suites, 0 failed tests` — nothing ran;
- a **real** red reads `1 failed suite, 2 failed tests` — something ran and disagreed.

The fix removes only the first kind. It removes no failing *test* anywhere: 2 failed before, 2 failed
after.

## 6. The converse — still passes where it already passed, and drops nothing legitimate

The risk in an ignore pattern is silencing something real. Two diffs of the **collected set**:

**BEFORE vs AFTER, same tree** — 6 removed, **0 added**, and every removal under `lanes/`:

```
lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js
lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js
lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js
lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js
lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe-roles.spec.js
lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe.spec.js
removed: 6   added: 0   removed NOT under lanes/: 0
```

**PRISTINE baseline vs AFTER** — byte-identical 112-path collected set. Where there was nothing to
fix, the change is a **no-op**: it collects nothing new and drops nothing.

### And in the shared checkout, where the defect was reported

Same instant, same tree (00:02, 265 dirty), the pre-fix config simulated by CLI override so both
measurements see one identical tree:

```
collected WITHOUT the lanes/ entry: 131
collected WITH    the lanes/ entry: 126
removed: 5 — all under lanes/       added: 0
```

Full run there, after the fix:

```
Test Suites: 126 passed, 126 total
Tests:       2978 passed, 2978 total
```

**Fully green.** The five `lanes/` collection errors were the shared checkout's only failures. (It
does not show the basename red because its basename *is* `Web-modules`; 131 vs the 130 measured at
23:52 is siblings landing a test file in the ten minutes between runs.)

---

## Adjacent finding — NOT fixed, out of scope, reported for a ruling

**Every lane worktree in the estate runs with an empty `core/` submodule.** `core` is a submodule
pinned at `1bcab0b6`; a fresh `git worktree add` leaves it unpopulated, and `~/core/...` then fails to
resolve. My first run showed it:

```
FAIL test/core-price-label.test.js        ● Test suite failed to run
FAIL test/core-request-path-shape.test.js ● Test suite failed to run
FAIL test/price-absence.test.js           ● Test suite failed to run
Configuration error: Could not locate module ~/core/helpers/tools
```

I checked four sibling worktrees — `web-journeys`, `wt-margin`, `web-wtbasename`, `web-fe-ci` — and
**`core/` is empty in all four**. So three suites fail to collect in every lane worktree, in the same
`0 failed tests` shape, from a second and unrelated cause. This is the same pathology this lane was
opened against and it is larger, but the remedy is worktree setup rather than config, it affects
every lane at once, and it is not what I was asked to change. Recorded, not touched.

The remedy that worked here, for whoever takes it:

```
git -c protocol.file.allow=always submodule update --init core
```

The bare `git submodule update --init` fails with `fatal: transport 'file' not allowed`. After
populating `core` at the pinned SHA my run-1 failures dropped from 4 suites to 1, and all runs above
were taken with it populated so the confounder is out of the measurement.

## Ports

None bound. Every run is jest. No Playwright runner was started, no server, no browser. **PID 73160
on port 4010 was neither contacted nor disturbed** — this change's entire purpose is to stop jest
loading the specs that would have talked to it. No container.
