# L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS — evidence

Branched from `feature/restaurant-modules` = **`a63c30f`** (read fresh; no landing lane had moved it).
Branch `lane/vue-coverage-instrument`. `core` submodule pinned at **`9626a561`** (clean).
Worktree basename `Web-modules` (trunk lacks the basename pin). No container, no `:3971`/`:5971`,
no `pkill`, no `npm ci`/`npm install` — `node_modules` symlinked. Nothing pushed.

---

## 1. The defect, confirmed at the mechanism

`vue-jest@3.0.7` compiles the `<script>` with babel, then **discards babel's map** and rebuilds one
line at a time from a single **column-0** probe — `node_modules/vue-jest/lib/generate-source-map.js:12-30`:

```js
script.split(splitRE).forEach(function (line, index) {
  var ln = index + 1
  var originalLine = inputMapConsumer
    ? inputMapConsumer.originalPositionFor({ line: ln, column: 0 }).line
    : ln
  if (originalLine) { map.addMapping({ /* ... column: 0 ... */ }) }
})
```

Babel emits a mapping at the column where a token actually begins. `source-map`'s
`originalPositionFor` rejects a candidate whose `generatedLine` differs from the query, so on an
**indented** generated line the column-0 probe returns `{ source: null }` and the line gets **no
mapping at all**.

The consequence is the coverage number, not the map. Jest's pipeline is three stages and the drop
happens in the third:

| stage | where | effect |
|---|---|---|
| 1. transform | the configured `.vue` transform | code + inline map |
| 2. instrument | `@jest/transform/build/ScriptTransformer.js:378-402` — `babel-plugin-istanbul` with `inputSourceMap: <that map>` | statementMap/fnMap/branchMap in **generated** positions |
| 3. remap | `@jest/reporters/build/CoverageReporter.js:646` → `istanbul-lib-source-maps` `getMapping` | anything unplaceable is **dropped from the report** — not counted as uncovered, simply absent |

Asserting on stage 2 proves nothing; the probe therefore runs all three.

## 2. Fix — and the routes that were not available

| route | verdict |
|---|---|
| upgrade `vue-jest` 3→4, or move to `@vue/vue2-jest` | **not reachable.** `npm ci`/`npm install` are banned repo-wide, and neither `@vue/vue2-jest` nor any second `vue-jest` exists in the shared `node_modules` (`find node_modules -maxdepth 4 -name vue-jest` → one hit, 3.0.7). Whether v4 fixed this line could not be read, only guessed at — so it stays unverified rather than asserted. `L-VUE-JEST-UPGRADE-MEASURED` measured suite counts, not instrumentation, so it does not transfer. |
| edit `node_modules/vue-jest` | refused. One `node_modules` is shared by ~160 worktrees, the edit is invisible to review, and it does not survive an install. |
| **replace the source-map step, locally and in-repo** | **taken.** |

`test/support/vue-sfc-transform.js` (new) is `vue-jest` with **one function** replaced: it seeds
`require.cache` with a corrected `generate-source-map` before requiring `vue-jest`, then delegates
`process()` unchanged. The replacement carries **every babel mapping at its own column**, shifted by
the single `;(function(){` line `process.js` prepends, instead of one column-0 probe per line.

`vue-jest`'s own `process.js` still runs, so template compilation, CSS modules, `src=` blocks,
functional components and the `addTemplateMapping` pass are byte-for-byte unchanged.

Two guards make the coupling loud rather than silent: the module throws if
`vue-jest/lib/generate-source-map` is no longer a 5-argument function, and it exports a
`getCacheKey` that folds in its own content hash (jest's default key hashes the file, the filename
and the config — never the transform, so without it an edit here would be served from a stale
cache).

`jest.config.js:45` now points `.vue` at `<rootDir>/test/support/vue-sfc-transform.js`.

## 3. The probe — reds today, greens after

`test/vue-coverage-instrumentation.test.js` + `test/fixtures/coverage-probe.vue`.

The fixture tags five **indented** statements, three function declarations and one branch with
`// PROBE(...)` markers; the test locates them by marker (not by hard-coded line) and asserts each
appears in the report-stage coverage data. It resolves the transform **from `jest.config.js` on
disk**, so reverting the config line reds it. A fifth case walks `components/` for the first SFC
declaring `methods:` and asserts it has at least one statement past `export default` — the estate
claim, not pinned to a filename.

The fixture lives under `test/fixtures/`, outside `collectCoverageFrom`; it contributes to no
reported figure and nothing mounts it.

**Red proof** (reverting only `jest.config.js:45` back to `'vue-jest'`):

```
FAIL test/vue-coverage-instrumentation.test.js
  ✕ counts every indented statement in the script block
  ✕ counts statements that are indented, not only statements in column 0
  ✕ records a function entry for data(), a computed and a method
  ✕ records a branch inside a method body
  ✕ measures a real component past its export default, not just its import list
Tests: 5 failed, 5 total

missing: [ "module-scope-indented (line 15)", "data-body (line 21)", "computed-body (line 25)",
           "branch-consequent (line 31)", "method-body (line 33)" ]
instrumentedStatementLines: [12, 14, 17]      ← the whole of a component, as measured today
fnDeclLines: []                               ← data(), a computed and a method: no entries at all
```

**Green proof** (config restored): `Tests: 5 passed, 5 total`.

An indented statement at **module scope** is dropped exactly like a method body, which is what
identifies indentation rather than scope as the cause.

## 4. Suite impact — the cost, measured

| run | suites | tests | failed | wall clock | statements reported |
|---|---:|---:|---:|---:|---|
| trunk `a63c30f`, as configured | 150 | 3563 | 0 | 12.0 s | 65.35% (762/1166) |
| baseline re-run in this worktree, transform forced back to `vue-jest` | 150 | 3563 | 0 | ~12 s | **65.35% (762/1166)** — reproduced exactly |
| **with the fix** | **151** | **3568** | **0** | **8.3 s** | **33.73% (6125/18157)** |

The extra suite and five tests are the probe. **No existing test changed behaviour, and none was
touched.** Wall clock did not regress.

The honest answer to "does the fix break more than it measures" is **no**: it breaks nothing
measurable, and it puts 16,991 statements into a denominator that held 1,166.

**Transform failures are unchanged.** The same five files fail to collect, before and after — the
buble optional-chaining fault, a separate defect this lane did not touch:
`components/molecules/ReceiptModal.vue`, `components/onboarding/OnboardingProductImages.vue`,
`pages/admin/products.vue`, `pages/admin/offers.vue`, `pages/admin/wolt-menu.vue`.

**Six files that used to vanish silently now appear** (their scripts were wholly indented):
`pages/offer/index.vue`, `pages/om-okam.vue`, `pages/om-okam-admin.vue`, `pages/kom-i-gang.vue`,
`pages/brosjyre-tilbud.vue`, `pages/rask-vei-til-egen-nettbutikk.vue`.
`components/molecules/PriceTable.vue` and `components/atoms/CloseButton.vue` remain absent for a
different and correct reason: **they have no `<script>` block at all.**

**The eight `lang="ts"` SFCs behave.** They compile TS → babel with the TS map as input, and all
eight gained statements (1 → 3-16). None regressed.

## 5. Per-module `.vue` coverage, re-measured

Same command both sides — `jest --ci --coverageReporters=json-summary` — and the **same** roll-up
classifier, so the two tables are comparable to each other. The module split is this lane's
path-keyword classifier and differs by a few files from the one in
`docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md` §3B; the totals (762/1166, 65.4%) reproduce
that document exactly.

### Before — `vue-jest` as shipped (the published figures)

| module | .vue files | stmts cov/total | stmt % | branch % | func % | line % |
|---|---:|---:|---:|---:|---:|---:|
| Core/POS | 78 | 125/258 | **48.4** | 45.3 | 38.6 | 48.2 |
| Workforce | 34 | 141/177 | **79.7** | 61.5 | 61.5 | 79.7 |
| Margin | 16 | 103/103 | **100.0** | 100.0 | 100.0 | 100.0 |
| Meals | 13 | 55/63 | **87.3** | 87.5 | 87.5 | 87.3 |
| Events | 9 | 50/54 | **92.6** | 80.0 | 90.9 | 92.6 |
| Training | 12 | 45/60 | **75.0** | 85.7 | 85.7 | 75.0 |
| Growth | 7 | 31/36 | **86.1** | 40.0 | 66.7 | 86.1 |
| Shared / unassigned | 132 | 212/415 | **51.1** | 40.7 | 48.0 | 50.9 |
| **TOTAL** | 301 | 762/1166 | **65.4** | 49.7 | 54.5 | 65.4 |

### After — column-accurate map (what is actually covered)

| module | .vue files | stmts cov/total | stmt % | branch % | func % | line % | loaded by a test |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Core/POS** | 78 | 459/5662 | **8.1** | 7.2 | 9.5 | 8.5 | 36/78 |
| Workforce | 34 | 1467/2148 | **68.3** | 56.8 | 75.6 | 72.5 | 26/34 |
| Margin | 16 | 1084/1330 | **81.5** | 67.9 | 81.7 | 87.0 | 16/16 |
| Meals | 13 | 482/700 | **68.9** | 63.6 | 77.9 | 73.7 | 11/13 |
| Events | 10 | 493/656 | **75.2** | 62.1 | 78.2 | 78.5 | 8/10 |
| Training | 12 | 385/574 | **67.1** | 57.6 | 69.4 | 70.7 | 10/12 |
| Growth | 7 | 252/657 | **38.4** | 33.4 | 47.7 | 40.8 | 6/7 |
| Shared / unassigned | 137 | 1503/6430 | **23.4** | 20.9 | 24.9 | 24.0 | 51/137 |
| **TOTAL** | 307 | 6125/18157 | **33.7** | 31.2 | 37.7 | 35.1 | 164/307 |

**Every module is worse than it was published as, and Margin's 100.0% was the emptiest claim in the
estate** — 103 statements, all of them import lists, now 1,330 statements at 81.5%.

The brief predicted Core/POS would be the row where the gap lives on both sides at once. It is:
**8.1%** on the `.vue` side against 40.7% on the `.js`/`.ts` side, 5,203 uncovered statements in
78 files. Growth reads 38.4% for one reason — `poweruser-growth.vue`, 372 statements, 0%.

Files named in the review, before → after:

| file | stmts before | stmts after | stmt % after |
|---|---:|---:|---:|
| `pages/admin/margin-recipes.vue` | 14 (100%) | **247** | 80.2 |
| `components/admin/pos/SellScreen.vue` | 15 | **651** | 3.5 |
| `components/admin/pos/PosShell.vue` | 13 | **497** | 0.0 |
| `components/admin/floorplan/FloorPlanEditor.vue` | 12 | **550** | 0.0 |
| `pages/admin/poweruser-growth.vue` | 5 | **372** | 0.0 |
| `components/organisms/AdminPageHeader.vue` | 4 | **151** | 53.6 |
| `pages/admin/events-pipeline.vue` | 10 | **285** | 84.2 |
| `pages/admin/workforce-schedule.vue` | 16 | **276** | 74.3 |
| `pages/admin/category-editor.vue` | 12 | **317** | 0.0 |
| `components/admin/pos/PaymentScreen.vue` | 11 | **368** | 3.3 |
| `pages/admin/orders.vue` | 5 | **250** | 29.6 |
| `pages/admin/margin-statements.vue` | 18 | **263** | 85.9 |

### The largest uncovered `.vue` files per module, now that they can be seen

| module | file | uncovered / total stmts |
|---|---|---:|
| Core/POS | `components/admin/pos/SellScreen.vue` | 628/651 |
| | `components/admin/floorplan/FloorPlanEditor.vue` | 550/550 |
| | `components/admin/pos/PosShell.vue` | 497/497 |
| | `components/admin/pos/PaymentScreen.vue` | 356/368 |
| | `pages/admin/category-editor.vue` | 317/317 |
| Workforce | `pages/admin/workforce-timesheets.vue` | 114/114 |
| | `pages/admin/workforce-me.vue` | 89/232 |
| Margin | `pages/admin/margin-suppliers.vue` | 50/215 |
| | `components/admin/margin/MarginIngredientPanel.vue` | 46/51 |
| Meals | `pages/admin/meals-statements.vue` | **78/78** |
| | `components/admin/meals/MealsStatementLines.vue` | **21/21** |
| Events | `pages/offer/_code.vue` | 75/75 |
| | `pages/admin/events-pipeline.vue` | 45/285 |
| Training | `pages/admin/training-evidence.vue` | **71/71** |
| | `components/admin/training/TrainingEvidenceDocument.vue` | **60/60** |
| Growth | `pages/admin/poweruser-growth.vue` | 372/372 |
| Shared | `pages/admin/kravia-invoice.vue` | 243/250 |
| | `pages/admin/import.vue` | 238/238 |
| | `pages/admin/terminals.vue` | 180/180 |

The two documents the review's three instruments converged on — the **training evidence document**
and the **meals monthly statement** — are now visible as 0% on a real denominator on the `.vue` side
too, which is a fourth instrument agreeing rather than a new finding.

## 6. What this lane did **not** fix, stated rather than left

1. **`collectCoverageFrom` is still two globs.** `jest.config.js:41-46` collects only
   `components/**/*.vue` and `pages/**/*.vue`; `utils/`, `core/`, `store/`, `plugins/`,
   `middleware/`, `layouts/`, `modules/`, `server-middleware/` remain invisible in the repo's own
   report. That is a **one-line** change (review §7 item 1) and it moves the published headline, so
   it is left as an owner-facing call rather than folded in here silently.
2. **Five SFCs still fail to transform** (buble optional chaining) — unchanged, and a different
   defect.
3. **No `coverageThreshold`, and `.github/workflows/nuxtjs.yml` still never runs jest.** Ratcheting
   should wait until 1 lands, or it ratchets the wrong denominator.
4. **A number is not acceptance (C5).** Nothing here is evidence that any capability works; it is
   evidence that the instrument now measures. The 0% rows above are a reading list, not a defect
   list.

## 7. Residual risk of the fix itself

Seeding `require.cache` couples this repo to a dependency-internal module path. It is guarded three
ways: a shape assertion that throws at transform time if `generate-source-map` changes signature, a
`getCacheKey` that invalidates on edits to the transform, and the probe, which reds if either the
config line or the mechanism is undone. If `vue-jest` is ever genuinely upgradable, the wrapper
should be re-evaluated — and the probe is what tells you whether the upgrade actually fixed
anything, which is precisely the question `L-VUE-JEST-UPGRADE-MEASURED` could not answer.

## 8. Reproduce

```sh
git worktree add --detach /somewhere/Web-modules lane/vue-coverage-instrument
cd /somewhere/Web-modules
ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules   # never npm ci / npm install
git -c protocol.file.allow=always submodule update --init core
git -C core fetch /Users/svendaneel/okam/Web/.git/worktrees/Web-modules/modules/core \
    wip/session-2026-08-06-all-work && git -C core checkout 9626a561

node node_modules/.bin/jest --ci --coverageReporters=json-summary --coverageReporters=text-summary \
  --coverageDirectory=/tmp/cov-after                       # 151/3568/0, 33.73% (6125/18157), ~9 s

# red proof: revert jest.config.js:45 to 'vue-jest', then
node node_modules/.bin/jest --ci --no-coverage test/vue-coverage-instrumentation.test.js
```

## 9. Files

| file | change |
|---|---|
| `jest.config.js` | `.vue` transform → `<rootDir>/test/support/vue-sfc-transform.js` (+ why) |
| `test/support/vue-sfc-transform.js` | new — `vue-jest` with a column-accurate source map |
| `test/vue-coverage-instrumentation.test.js` | new — the probe, 5 tests |
| `test/fixtures/coverage-probe.vue` | new — the marked fixture |
| `lanes/L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS/evidence.md` | this file |

`eslint --ext .js,.vue` is clean on all four.
