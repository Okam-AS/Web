# L-THE-REVIEWED-INSTRUMENT-LANDS — the landing of the .vue coverage instrument

## What landed

`lane/vue-coverage-instrument` (`52dd348`, one commit) merged onto `feature/restaurant-modules`.

- trunk before: `3ff7f07` (`Merge branch 'lane/fe-wf-correction-path'`)
- trunk after: **`780d405`** — `Land lane/vue-coverage-instrument onto the restaurant-modules trunk`
- parents: `3ff7f07` (first) + `52dd348` (second). Merge strategy `ort`, **no conflicts**, no `git merge-file` needed.
- `git diff --stat 3ff7f07 780d405` is exactly the lane's five files and nothing else:
  `jest.config.js` (+8/-1), `lanes/L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS/evidence.md`,
  `test/fixtures/coverage-probe.vue`, `test/support/vue-sfc-transform.js`,
  `test/vue-coverage-instrumentation.test.js`.
- `core` submodule pin unchanged at `9626a561bb0442b0aed026be75b7f9419337ac6d`.
- **Not pushed.** No remote-tracking ref for this branch exists.

The merge was clean because the trunk touched `jest.config.js` in no commit between the lane's parent
`a63c30f` and `3ff7f07` — the eight commits in that span add only `test/e2e/**`, workforce personnel
tests and `utils/workforce/*`.

## Revert

    git branch -f feature/restaurant-modules 3ff7f07

Nothing else needs undoing: no push, no submodule move, no file written outside `docs/plan/lanes/`
for this lane.

## The probe still bites at the new tip

The instrument's whole value is that `test/vue-coverage-instrumentation.test.js` resolves the `.vue`
transform out of `jest.config.js` on disk, so reverting that one config line must red it. Verified
**at `780d405`**, not inherited from the lane's account:

| state of `jest.config.js` transform line | result | log |
|---|---|---|
| `'<rootDir>/test/support/vue-sfc-transform.js'` (merged) | 1 suite / **5 passed** | `probe-green-780d405.log` |
| reverted to `'vue-jest'` | 1 suite / **5 failed**, exit 1 | `probe-reverted-780d405.log` |

All five named assertions red on the revert:

    ✕ counts every indented statement in the script block
    ✕ counts statements that are indented, not only statements in column 0
    ✕ records a function entry for data(), a computed and a method
    ✕ records a branch inside a method body
    ✕ measures a real component past its export default, not just its import list

`jest.config.js` was restored with `git checkout --` afterwards; the worktree was clean before the
branch was advanced.

## Tier at the new tip, and every difference accounted for

Both runs are `npx jest --ci` in a worktree at the respective commit, `core` at the pinned commit,
`node_modules` symlinked to `/Users/svendaneel/okam/Web-modules/node_modules` (no `npm ci`/`install`).

| commit | suites | tests | failed | jest `Time` | log |
|---|---|---|---|---|---|
| `3ff7f07` (trunk before) | 152 passed / 152 | 3589 passed / 3589 | 0 | 9.342 s | `tier-3ff7f07-baseline.log` |
| `780d405` (new tip, cold) | **153 passed / 153** | **3594 passed / 3594** | **0** | 21.634 s | `tier-780d405-run1.log` |
| `780d405` (new tip, warm) | 153 passed / 153 | 3594 passed / 3594 | 0 | 10.250 s | `tier-780d405-run2-warm.log` |

The `3ff7f07` baseline I measured myself reproduces the clerk's 152 / 3589 / 0 exactly.

**Delta: +1 suite, +5 tests, 0 failures — the probe, and nothing else.** No existing suite changed
name, count or result.

### The five buble failures are pre-existing and unchanged

Neither run has a failing suite, but both emit five `Failed to collect coverage from …` errors out of
`vue-template-es2015-compiler/buble.js` — template-compile `SyntaxError`s that keep five SFCs out of
the coverage report without failing anything. The file list is **byte-identical before and after**:

    components/molecules/ReceiptModal.vue
    components/onboarding/OnboardingProductImages.vue
    pages/admin/offers.vue
    pages/admin/products.vue
    pages/admin/wolt-menu.vue

These are the same five the lane reported. They are not caused by, and not fixed by, this merge.

## The inherited caveat is resolved, not merely carried

The lane reported the suite getting *faster* after adding instrumentation (12.0 s → 8.3 s) and never
explained it; the reviewer flagged that a cold run would not reproduce it. Two runs at the **same**
commit `780d405`, cold then warm, settle it:

    cold 21.634 s  →  warm 10.250 s   (same tree, same tests, same 153/3594/0)

The suite is transform-cache dominated: warmth is worth ~11 s, which is larger than the 3.7 s
"speed-up" the lane reported. The instrument does not make the suite faster — the lane's before/after
numbers were taken cold-then-warm. **Honest cost of the instrument is not measurable from those two
numbers, and this lane does not claim one.**

## The coverage headline moves, as designed

`All files` on the jest summary, same `collectCoverageFrom` (`components/**/*.vue`, `pages/**/*.vue`)
in both runs:

| commit | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `3ff7f07` | 65.38 | 49.73 | 54.71 | 65.42 |
| `780d405` | **33.93** | 31.46 | 37.74 | 35.27 |

The number went down because the denominator stopped hiding indented statements. `collectCoverageFrom`
is untouched, as the lane left it — widening it to `utils/`, `core/`, `store/` remains an owner call.

## Worktree and branch handling to note

`feature/restaurant-modules` was checked out in `/Users/svendaneel/okam/Web-modules-wt/L-SEEDS-STATUTORY`,
the worktree of lane **L-THE-SEEDS-AND-THE-STATUTORY-TOP-LAND, which is `retracted`**. A branch checked
out in another worktree cannot be force-updated. That worktree was verified clean (`git status
--porcelain` empty), then **detached in place at `3ff7f07`** — its HEAD stopped being a symbolic ref;
**not one file in it changed**, and it was not removed. `git branch -f feature/restaurant-modules
780d405` then succeeded.

The owner's checkout `/Users/svendaneel/okam/Web-modules` on `wip/session-2026-08-06-all-work` was
never checked out, never reset and never committed to.

Worktree created and removed by this lane: `/Users/svendaneel/okam/web-vueinstr-land`.
