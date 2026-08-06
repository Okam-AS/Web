# L-VUE-JEST-UPGRADE-MEASURED — the upgrade does not mount the four templates

**Answer: no.** Upgrading the template transpiler to the newest version this repository can take changes
nothing. The four templates do not mount before the upgrade and do not mount after it. **The workaround
must not be reverted**, and the receipt modal's two rewritten lines are the only thing that makes that
document mountable by a test at all.

The full suite is neither better nor worse under the upgrade — it is *bit-identical in outcome*. That is
not an argument for taking the upgrade, because the upgrade buys nothing: it is the same buble.

## Where every number came from

| | |
|---|---|
| Commit measured | **`8ac6f63648015d8c7a230181a7f07bf303d43268`** (`lane/focustrap-teardown` tip), clean checkout |
| `core` submodule | `1bcab0b6b3882bc232795437d7ad48455a5af0a6` — the SHA the gitlink at `8ac6f63` pins |
| Worktree | `/Users/svendaneel/okam/web-vuejest`, `node_modules` **copied** (`cp -Rc`), never symlinked |
| Baseline transpiler | `vue-jest@3.0.7` (what `package.json` declares) |
| Upgrade transpiler | `vue-jest@4.0.1` — the newest release whose peer range accepts this repo's jest 26 |

Both arms are the same commit and the same `node_modules`; the **only** difference between them is the
contents of `node_modules/vue-jest`. Nothing else was installed, and no source file was edited.

> The shared checkout was **not** measured. It carries 79 tracked modified files (+6002/−766) and 257
> untracked paths from other lanes, including edits to three of the four target templates and to
> `jest.config.js`. Numbers taken there would describe nobody's commit. It was left exactly as found.

## The full suite, before and against the upgrade

| | vue-jest 3.0.7 (baseline) | vue-jest 4.0.1 (upgrade) |
|---|---|---|
| Test suites | 112 passed, **1 failed**, 113 total | 112 passed, **1 failed**, 113 total |
| Tests | 2587 passed, **2 failed**, 2589 total | 2587 passed, **2 failed**, 2589 total |

### Suites whose outcome differs: **none**

Totals matching is the weak claim, and the brief is right that it is the dangerous one. So the two
`--json` reports were compared **key-by-key**, suite path by suite path and test full-name by test
full-name (`compare.js`, output in `evidence/compare-baseline-vs-401.txt`):

```
SUITES differing: 0
TESTS  differing: 0
VERDICT: IDENTICAL outcome sets (no suite and no test changed side)
```

No suite changed side. No individual test changed side. The count is stable *and* the membership is
stable — the third and best of the three possible results, but only because nothing moved at all.

### The one red suite is pre-existing and is not the transpiler

`test/journey-artifact-store.test.js` — 2 tests:
- `backend identity asks whoever is holding the port what directory they are running from`
- `backend identity the world stamp names the checkout the world script recorded, not the one holding the port`

It asserts the checkout's **directory name** (`/^Web-modules@[0-9a-f]{40}(\+dirty)?$/`, line 295), so it
reds in any worktree and is green only in the main checkout. It fails **identically in both arms**. It is
not evidence about vue-jest, and it is not this lane's.

## Do the four templates mount? No — under either version

`mount-probe.probe.js` asks two separate questions per file, because "cannot be mounted" has two very
different causes and they must not be reported as one finding:

| Template | 3.0.7 transforms | 3.0.7 mounts | 4.0.1 transforms | 4.0.1 mounts |
|---|---|---|---|---|
| `components/molecules/ReceiptModal.vue` | ✗ `Unexpected token (1:1470)` | ✗ | ✗ `Unexpected token (1:1480)` | ✗ |
| `pages/admin/products.vue` | ✗ `Unexpected token (2:922)` | ✗ | ✗ `Unexpected token (2:922)` | ✗ |
| `pages/admin/wolt-menu.vue` | ✗ `Unexpected token (1:903)` | ✗ | ✗ `Unexpected token (1:913)` | ✗ |
| `components/onboarding/OnboardingProductImages.vue` | ✗ `Unexpected token (2:133)` | ✗ | ✗ `Unexpected token (2:133)` | ✗ |

8 failed / 8 in both arms. The column numbers shift by ten because the two versions emit a slightly
different render-function prologue; the failure is the same failure.

### Note on the receipt modal's state at this commit

`bfa1992` ("German locale names Norwegian identifiers rather than German equivalents") — the commit
holding the `(order.user || {}).phoneNumber` repair — **is not an ancestor of `8ac6f63`**
(`git merge-base --is-ancestor` says no). At the commit measured here, `ReceiptModal.vue` still carries
`order.user?.phoneNumber` on lines 51 and 55, so it is measured in its *pre-repair* form and is a genuine
fourth unmountable template rather than a control. **Its lines were not touched.** This is also the useful
arrangement: it shows the repair, not the toolchain, is what makes the kassasystemforskrifta artifact
reachable by a test, and the repair currently lives on a commit that is not on this line.

### The probe discriminates — three controls, both arms, all passing

Without controls, "eight failures" is equally consistent with a broken probe. Each control isolates one
variable, and all three behave identically under 3.0.7 and 4.0.1:

| Control fixture | Expectation | Result |
|---|---|---|
| `(thing \|\| {}).name` in **template** | mounts | ✓ mounts, renders |
| `thing?.name` in **script only** | mounts | ✓ mounts, renders |
| `thing?.name` in **template** | fails | ✓ fails with `Unexpected token` |

The second row is the precise boundary and is worth keeping: **optional chaining in `<script>` is fine** —
babel-jest handles it. Only the `<template>` is affected. A rewrite therefore only ever has to touch
template expressions, never script bodies. (`ReceiptModal.vue` line 195, `this.order?.items`, is in the
script and needs nothing.)

One false pass was found and removed while building this probe: a failed vue-jest transform leaves an
**empty module object** in jest's registry, and Vue mounts `{}` with only a console warning, so
`wrapper.exists()` returns `true` and the probe reported *four green mounts for four templates that
produced no DOM*. The assertion is now a compiled `render` function plus non-empty `html()`, and
`jest.resetModules()` runs before each test so a cached failed require cannot masquerade as a success.

## Why no version of this upgrade can work

The upgrade cannot help, and this is structural rather than a matter of picking a better version:

- `vue-jest@3.0.7` transpiles the render function with `vue-template-es2015-compiler` (a buble fork).
- `vue-jest@4.0.1` delegates to `@vue/component-compiler-utils`, whose `compileTemplate` calls
  **the same** `vue-template-es2015-compiler` — unconditionally. Its whole option surface is
  `compilerOptions, transpileOptions, transformAssetUrls, isProduction, isFunctional, optimizeSSR,
  prettify`. **There is no opt-out**, and `transpileOptions` only tunes buble; it cannot make buble parse.
- Measured directly: `vue-template-es2015-compiler@1.9.1` (latest) throws `Unexpected token (1:51)` on
  `_vm.order.user?.phoneNumber` and accepts `(_vm.order.user || {}).phoneNumber`.
- Every maintained Vue-2 transformer depends on `@vue/component-compiler-utils@^3.1.0`:
  `@vue/vue2-jest@27.0.0`, `@28.1.0`, `@29.2.6` all do — and `@vue/component-compiler-utils@3.3.0`
  (latest) still depends on `vue-template-es2015-compiler@^1.9.0`.

**So there is no Vue 2 jest transformer at any version that mounts these templates**, and jumping to
`@vue/vue2-jest@29` would drag jest 26 → 29 across all 113 suites for exactly zero benefit here. The only
transformer without the buble step is `@vue/vue3-jest@29.2.6`, which has neither dependency — but it peers
on `vue@^3.0.0-0`. The real fix is a Vue 3 migration, not a transpiler bump.

**Consequence for the open decision: the rewrite is not a workaround awaiting a real fix. On the Vue 2
line it is the only fix.** Reverting it would silently un-mount the kassasystemforskrifta artifact again.

## Two things found on the way

1. **`npm install` cannot complete in this repository today.** Any `npm install`/`npm ci` fails with
   `ETARGET — No matching version found for @nuxt/cli-edge@*`; the `*` range no longer resolves in the
   registry. This is why the upgrade was staged surgically rather than installed. Anyone who runs
   `npm ci` here will not get a working tree back — and in the shared checkout it would also delete the
   `node_modules` that ~124 worktrees symlink to.
2. **Nothing runs any of this in CI**, so all 113 suites and 2589 tests are only ever green on somebody's
   laptop. That is the standing reason an unmeasured toolchain change was the wrong risk to take, and it
   remains true after this measurement.

## Reproducing

```sh
cd /Users/svendaneel/okam/web-vuejest              # worktree at 8ac6f63, node_modules copied not linked
./lanes/L-VUE-JEST-UPGRADE-MEASURED/switch-vue-jest.sh 3.0.7   # or 4.0.1; both staged under
                                                   # node_modules/.lane-vendor/
npx jest --json --outputFile=/tmp/run.json         # full suite  -> 113 suites / 2589 tests
npx jest --coverage=false --testMatch '**/mount-probe.probe.js'   # the four templates + 3 controls
node lanes/L-VUE-JEST-UPGRADE-MEASURED/compare.js evidence/A.json evidence/B.json
```

The probe is named `.probe.js`, **not** `.test.js`, deliberately: jest's default `testMatch` will not
collect it, so it cannot join a sibling's suite and hand them a red they have to explain away. Verified —
the full suite re-run with every file of this lane present is still 113 suites / 2589 tests, outcome-set
identical to the baseline (`evidence/baseline-recheck.json`).

## Evidence

| File | What it is |
|---|---|
| `evidence/baseline.json` / `.stderr.txt` | full suite, vue-jest 3.0.7 |
| `evidence/upgrade-vuejest401.json` / `.stderr.txt` | full suite, vue-jest 4.0.1 |
| `evidence/compare-baseline-vs-401.txt` | the key-by-key comparison — 0 suites, 0 tests differing |
| `evidence/probe-3.0.7.json` / `probe-4.0.1.json` (+ `.stderr.txt`) | the four templates and three controls, both arms |
| `evidence/baseline-recheck.json` | full suite with all lane files present — proves this lane adds nothing |
| `mount-probe.probe.js`, `fixtures/*.vue`, `compare.js`, `switch-vue-jest.sh` | the instruments |
