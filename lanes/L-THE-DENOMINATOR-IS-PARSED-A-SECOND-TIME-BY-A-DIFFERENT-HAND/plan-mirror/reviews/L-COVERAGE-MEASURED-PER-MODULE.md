# L-COVERAGE-MEASURED-PER-MODULE — what is actually covered, per module, in both repositories

Measured 2026-08-07. Frontend `Web-modules` at trunk **`a63c30f`**, `core` submodule pinned at
**`9626a561`** (254 files, clean). Backend `OkamAPI-modules` at trunk **`a1c1a6dff`**.
Both measured in throwaway worktrees; neither owner checkout was touched.

Every figure below names the command that produced it. Nothing here is an estimate.

---

## 0. The one-paragraph answer

**The frontend's published coverage number is 65.4%, and it is not a coverage number.**
`jest.config.js:41-46` collects coverage from `components/**/*.vue` and `pages/**/*.vue` — and
`vue-jest@3.0.7` instruments **nothing inside a `.vue` file that is indented**. Across all 304 `.vue`
files in the report, 1169 of 1169 instrumented statements start at column 0 of their source line, and
**zero** start on an indented line. Every `data()`, every `computed`, every `methods` body in every
component and page in the repository is outside the denominator. 47,081 physical lines of `<script>`
produce 1,169 measured statements. The configured coverage target measures the import lists.

The code that *is* honestly measured is the `.js`/`.ts` layer, which the config does not collect at
all. Measured there, the six modules are in good shape (Margin 97.7%, Growth 97.9%, Workforce 96.0%,
Events 93.4%, Meals 87.8%, Training 81.6%) and **Core/POS is at 40.7% statements and 12.3%
functions** — 2,360 uncovered statements, and it is where the money lives.

**Where the afternoon goes.** Coverage, reachability and falsifiability are three different
instruments, and on this branch they point at the same two files. **`utils/training/evidence.js`** —
0% of 31 statements with **101 uncovered branches**, whose only two consumers
(`pages/admin/training-evidence.vue`, `TrainingEvidenceDocument.vue`) are the *only* two Training
`.vue` files no test ever loads, and whose journey step contains no `expect` at all. And
**`utils/meals/statement-client.js`** — 0%, whose only two consumers are the *only* two Meals `.vue`
files no test ever loads, and whose journey "asserts no amount, no total, no currency anywhere". Both
are **documents**: the training evidence record and the monthly meals bill. See §3C.

**The backend has coverlet but nobody has ever pointed it at anything.** `coverlet.collector 6.0.0` is
already a `PackageReference` in `WebApi.Tests/WebApi.Tests.csproj:29`; there is no `.runsettings`
anywhere in the repository, no `--collect` in any script, doc or workflow, and the CI job
(`.github/workflows/azure-webapps-dotnet-core.yml:68-69`) runs `dotnet test` with no coverage flag.
Turning it on cost **one flag and no code change** — the figures in §4 are the first the backend has
had. And it tells **the same story, independently**: modules at 81.7–92.0% (Growth 92.0, Margin 91.0,
Workforce 90.7, Training 89.0, Meals 85.3, Events 81.7) and **Core/POS + shared at 49.4%**, holding
**89% of the backend's entire uncovered non-migration surface**. Coverlet's own headline reads 8.7%
only because **86% of its denominator is generated EF migration code**; excluding migrations the
backend is at 63.1%. Two caveats that must travel with those figures: the run is the **non-SQL tier
only**, and **one test fails under instrumentation** — correctly, because coverlet injects
`Interlocked.Increment` into a method an IL-level entropy pin is guarding (§4.1).

---

## 1. Exactly how to re-run this

### Frontend

```sh
# worktree whose BASENAME IS `Web-modules` — trunk lacks the basename pin (lane/worktree-basename-pin,
# 0cea96a, is NOT an ancestor of a63c30f), so any other directory name reds 2 suites in
# test/journey-artifact-store.test.js for reasons that have nothing to do with coverage.
git worktree add --detach /somewhere/Web-modules a63c30f
cd /somewhere/Web-modules
ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules     # never npm ci / npm install
git -c protocol.file.allow=always submodule update --init core
git -c protocol.file.allow=always -C core \
    fetch /Users/svendaneel/okam/Web/.git/worktrees/Web-modules/modules/core 9626a561
git -C core checkout 9626a561          # a fresh worktree leaves core EMPTY; 15 suites then fail to
                                       # RESOLVE while jest still exits 0

# (a) the number the repo publishes today — identical to `npm test`
node node_modules/.bin/jest --ci \
  --coverageReporters=json-summary --coverageReporters=text-summary \
  --coverageDirectory=/tmp/run1

# (b) the honest number — widened to the .js/.ts the config never collects
node node_modules/.bin/jest --ci \
  --collectCoverageFrom='{components,pages,layouts,middleware,plugins,utils,store,modules,core,server-middleware}/**/*.{vue,js,ts}' \
  --coverageReporters=json --coverageReporters=json-summary --coverageReporters=text-summary \
  --coverageDirectory=/tmp/run2
```

| run | wall clock | result |
|---|---:|---|
| (a) as configured | **13 s** | 150 suites / 3563 tests / 0 failed — the clerk's counts reproduced exactly |
| (b) widened | **10 s** | 150 / 3563 / 0; 641 files in the report |

No container, no port, no `pkill`. The suite is 13 seconds; there is no reason anyone should be
guessing at these numbers.

### Backend

```sh
git worktree add --detach /somewhere/wt-cov-api a1c1a6dff
cd /somewhere/wt-cov-api
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug                  # 19 s, 0 errors, 769 warnings
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" \
  --collect:"XPlat Code Coverage" \
  --results-directory /tmp/api-cov \
  --logger "trx;LogFileName=cov.trx"
# → /tmp/api-cov/<guid>/coverage.cobertura.xml
```

| step | wall clock | result |
|---|---:|---|
| build | **19 s** | 0 errors, 769 warnings |
| non-SQL tier **with** coverage | **1135 s (18 m 55 s)** | 4831 passed / **1 failed** / 10 skipped of 4842; `TESTEXIT=1`; 98 MB cobertura |
| (same tier without coverage, from `artifacts/tests/*/RUN.md`) | ~7 min | 4304/4304, exit 0 |

**No SQL container was taken and none is needed.** `--filter "Database!=SqlServer"` is the recorded
non-SQL tier (`artifacts/tests/*/RUN.md`), which is where almost all the tests are. The ~32-minute SQL
tier was not run and coverage does not require it — with the consequence stated honestly in §4.2.
The single failure is explained in §4.1(b) and is **caused by the instrumentation**, not by the trunk.

---

## 2. The frontend defect that makes the published number meaningless

### 2.1 What the config collects

```js
// jest.config.js:41-46
collectCoverage: true,
collectCoverageFrom: [
  '<rootDir>/components/**/*.vue',
  '<rootDir>/pages/**/*.vue'
]
```

Two globs. Not collected, and therefore invisible in every coverage report this repo has ever
produced: `utils/` (85 files — every module's client, view-model and money formatter),
`core/` (254 files — the entire POS/commerce service layer), `store/`, `plugins/`, `middleware/`,
`layouts/`, `modules/`, `server-middleware/`. There is **no `coverageThreshold`** in `jest.config.js`
or `package.json`, so nothing is gated on the number either, and
`.github/workflows/nuxtjs.yml` never runs jest at all — it installs and runs `generate`.

### 2.2 What it actually measures

`pages/admin/margin-recipes.vue` has a `<script>` block spanning lines 395–1070 — 675 lines. Its
instrumented statement lines are, in full:

```
[396, 397, 398, 399, 400, 401, 418, 419, 420, 422, 423, 424, 456, 477]
```

Line 477 is `export default {`. **Nothing after it is measured.** The page's entire `data`, `computed`
and `methods` — the recipe and costing surface — contribute nothing to the denominator, so they cannot
show up as uncovered. The file reports 14 statements at 100%.

This is universal, not a bad file:

| check | result |
|---|---|
| `.vue` files in the coverage report | 304 |
| …with a top-level `export default` | 304 |
| …**with zero instrumented statements after it** | **304** |
| instrumented `.vue` statements starting on a **column-0** source line | **1169** |
| instrumented `.vue` statements starting on an **indented** source line | **0** |
| total `<script>` physical lines across those files | **47,081** |
| total instrumented statements across those files | **1,169** |

### 2.3 Proved, not inferred

A synthetic probe distinguishes "scope" from "indentation" — an indented statement at *module* scope
is dropped exactly like a method body:

```vue
<template><div>{{ label }}</div></template>
<script>
const A = 1;                                    // line 3
const B = 2;                                    // line 4
if (A < B) {                                    // line 5
  console.log('indented-module-scope');         // line 6   ← INDENTED, module scope
}
export default {
  data () { return { label: 'x' }; },
  methods: { neverCalled () { const q = 1; return q + 1; } }
};
</script>
```

```
statement start lines : [3, 4, 5, 7]
fn decl lines         : []            ← data() and neverCalled() produce NO function entries at all
branch lines          : [5]
```

Line 6 is at module scope and is dropped. It is indentation.

### 2.4 The mechanism, named

`node_modules/vue-jest/lib/generate-source-map.js:14`:

```js
var originalLine = inputMapConsumer
  ? inputMapConsumer.originalPositionFor({ line: ln, column: 0 }).line
  : ln
if (originalLine) { map.addMapping({ ... }) }
```

vue-jest asks babel's output map for a mapping **at column 0 only**, once per line, and *skips the
line entirely* when there is none. Indented statements have no column-0 mapping, so their lines carry
no mapping, and `babel-plugin-istanbul` — which jest runs over vue-jest's output with that map as
`inputSourceMap` — drops every statement it cannot place. Module-scope `import`, `const` and
`export default` start at column 0 and survive. Everything else does not.

This is a *different* defect from the one L-VUE-JEST-UPGRADE-MEASURED closed. That lane proved
vue-jest 3→4 changes no suite counts and that four templates fail to transform through the buble fork.
It measured suite counts, not instrumentation, and the column-0 map is untouched by the version bump.

### 2.5 Thirteen `.vue` files are not in the report at all

Five are hard transform failures (`Failed to collect coverage from`, the buble `?.` fault):

`components/molecules/ReceiptModal.vue` · `components/onboarding/OnboardingProductImages.vue` ·
`pages/admin/products.vue` · `pages/admin/offers.vue` · `pages/admin/wolt-menu.vue`

Eight more vanish **silently, with no error printed**, because their script is empty or wholly
indented: `components/molecules/PriceTable.vue`, `components/atoms/CloseButton.vue`,
`pages/offer/index.vue`, `pages/om-okam.vue`, `pages/om-okam-admin.vue`, `pages/kom-i-gang.vue`,
`pages/brosjyre-tilbud.vue`, `pages/rask-vei-til-egen-nettbutikk.vue`.

The receipt modal and the price table — a document and a money surface — are two of them.

### 2.6 Ten `core/pinia/*.ts` files cannot be instrumented at all

```
Failed to collect coverage from core/pinia/cart.ts
ERROR: core/pinia/cart.ts:1:29 - error TS2307: Cannot find module 'pinia' or its corresponding type declarations.
```

`pinia` is not a dependency of this repo. `cart, category, checkout, order, services, settings, store,
theme, translation, user` — the whole till state layer — are absent from every denominator. Only
`core/pinia/index.ts` is present.

---

## 3. Frontend coverage, per module

### 3A. Trustworthy — `.js` / `.ts` only, properly instrumented

Command: run (b) above; roll-up by path.

| module | files | stmts cov/total | **stmt %** | branch % | func % | line % |
|---|---:|---:|---:|---:|---:|---:|
| **Core/POS** | 245 | 1619/3979 | **40.7** | 26.3 | **12.3** | 37.5 |
| Workforce | 29 | 1649/1718 | **96.0** | 88.9 | 98.1 | 97.2 |
| Margin | 20 | 508/520 | **97.7** | 85.1 | 98.6 | 99.1 |
| Meals | 8 | 231/263 | **87.8** | 86.0 | 89.4 | 90.3 |
| Events | 4 | 297/318 | **93.4** | 92.4 | 90.9 | 93.9 |
| Training | 4 | 164/201 | **81.6** | 65.3 | 89.1 | 83.8 |
| Growth | 8 | 285/291 | **97.9** | 89.0 | 97.0 | 98.9 |
| Shared / unassigned | 19 | 96/239 | **40.2** | 47.6 | 24.8 | 39.2 |
| **TOTAL** | 337 | 4849/7529 | **64.4** | 71.5 | 45.7 | 63.3 |

**Read this table and ignore the one below it.** The six modules are genuinely well covered. The
estate-wide 64.4% is entirely produced by Core/POS and the shared layer; every module built in the
last month is above 81%.

### 3B. Hollow — `.vue` files (denominator is the import list)

| module | .vue files | stmts cov/total | reported stmt % |
|---|---:|---:|---:|
| Core/POS | 71 | 134/230 | 58.3 |
| Workforce | 34 | 141/177 | 79.7 |
| Margin | 16 | 103/103 | **100.0** |
| Meals | 13 | 55/63 | 87.3 |
| Events | 8 | 49/53 | 92.5 |
| Training | 12 | 45/60 | 75.0 |
| Growth | 11 | 65/70 | 92.9 |
| Shared / unassigned | 139 | 170/413 | 41.2 |
| **TOTAL** | 304 | 762/1169 | 65.2 |

Margin's `.vue` files report **100%**. Margin's `.vue` files contain, among others,
`pages/admin/margin-recipes.vue` with 674 unmeasured script lines. 100% here means "every import
statement was executed".

**Do not read this table as "components are untested".** They are exercised; they are just not
*measurable*. 55 of the 150 test files call `mount()`, and 114 distinct `.vue` modules are imported by
name (73 components + 41 pages). The one thing the report *can* still tell us is which files were
loaded at all:

| | |
|---|---:|
| `.vue` files with at least one executed statement (so: loaded at runtime) | **164** of 304 |
| `.vue` files never loaded by any jest test | **140** of 304 |
| `.vue` files absent from the report entirely (§2.5) | 13 |

So of the 314 `components/` + `pages/` SFCs on trunk, **at least 153 are never loaded by the suite at
all** — and for the 164 that are, the report says nothing beyond "the file was reached". That
loaded/not-loaded split is the only honest signal available from `.vue` coverage today, and it is
worth more than the percentages above it.

The biggest unmeasured screens, by `<script>` size — this is the real frontend gap, and no coverage
tool in this repo can currently see any of it:

| file | script lines | instrumented stmts | measured after `export default` |
|---|---:|---:|---:|
| `components/admin/pos/SellScreen.vue` | 1264 | 15 | 0 |
| `components/admin/pos/PosShell.vue` | 961 | 13 | 0 |
| `components/admin/floorplan/FloorPlanEditor.vue` | 830 | 12 | 0 |
| `pages/admin/poweruser-growth.vue` | 778 | 5 | 0 |
| `components/organisms/AdminPageHeader.vue` | 732 | 4 | 0 |
| `pages/admin/events-pipeline.vue` | 723 | 10 | 0 |
| `pages/admin/workforce-schedule.vue` | 719 | 16 | 0 |
| `pages/admin/category-editor.vue` | 705 | 12 | 0 |
| `components/admin/pos/PaymentScreen.vue` | 704 | 11 | 0 |
| `pages/admin/margin-recipes.vue` | 674 | 14 | 0 |
| `pages/admin/orders.vue` | 662 | 5 | 0 |
| `pages/admin/margin-statements.vue` | 618 | 18 | 0 |

`SellScreen.vue` and `PaymentScreen.vue` are the till. `orders.vue` and `margin-statements.vue` are
money documents. Nothing in any of them is in any denominator.

### 3C. The `.vue` figure that *is* usable: never loaded at all, per module

Since a `.vue` file's *body* is unmeasurable but its module-scope statements are not, `covered > 0`
reliably answers one question: **was this file ever loaded by the suite?** That is the honest UI-layer
coverage figure, and unlike §3B it cannot be inflated.

| module | .vue files | loaded by a test | **never loaded** | unmeasured script lines in the never-loaded ones |
|---|---:|---:|---:|---:|
| **Core/POS** | 71 | 42 | **29** | **3,761** |
| Workforce | 34 | 26 | 8 | 710 |
| Margin | 16 | 16 | **0** | 0 |
| Meals | 13 | 11 | 2 | 264 |
| Events | 8 | 7 | 1 | 216 |
| Training | 12 | 10 | 2 | 415 |
| Growth | 11 | 10 | 1 | 778 |
| Shared / unassigned | 139 | 42 | **97** | **10,135** |

**This table agrees with §3A and §5 without being derived from them, which is why it is worth trusting.**
Margin — the best-covered module by `.js` statements (97.7%) — is the one module where *every* `.vue`
file is loaded. Core/POS — the worst (40.7%) — leaves 29 files and 3,761 script lines never loaded.

The largest never-loaded files, per module:

| module | never-loaded `.vue`, largest first |
|---|---|
| **Core/POS** | `admin/pos/PosShell.vue` (961) · `admin/floorplan/FloorPlanEditor.vue` (830) · `admin/pos/ReceiptsView.vue` (284) · `pages/admin/pos-reports.vue` (210) · `admin/pos/BoardView.vue` (208) · `admin/pos-settings/CashPointsTab.vue` (152) · `admin/pos/DayFlow.vue` (142) · `admin/pos/PinPadModal.vue` (129) · `admin/pos/PosStatusChip.vue` (129) · `admin/pos/OperatorLoginScreen.vue` (119) |
| **Workforce** | `pages/admin/workforce-timesheets.vue` (278) · `workforce-publications.vue` (144) · `workforce-delivery.vue` (105) · `WorkforcePublicationList.vue` (51) · `WorkforceDeliveryGroup.vue` (48) · `WorkforcePublicationReceiptGroup.vue` (38) · `WorkforcePublicationRecipients.vue` (29) · `WorkforceDeliveryPanel.vue` (17) |
| **Training** | `pages/admin/training-evidence.vue` (219) · `TrainingEvidenceDocument.vue` (196) — **and nothing else** |
| **Meals** | `pages/admin/meals-statements.vue` (190) · `MealsStatementLines.vue` (74) — **and nothing else** |
| **Growth** | `pages/admin/poweruser-growth.vue` (778) |
| **Events** | `pages/offer/_code.vue` (216) |
| **Margin** | — none |
| Shared | `pages/admin/category-editor.vue` (705) · `pages/admin/import.vue` (508) · `pages/index.vue` (402) … |

**Three instruments converge on the same two holes.** Training's *only* two never-loaded files are the
evidence page and the evidence document — exactly the two consumers of `utils/training/evidence.js`,
which is at 0% with 101 uncovered branches (§5.1), and exactly the journey whose "DEFECT CHECK" step
contains no `expect` (§6.1). Meals's *only* two never-loaded files are the statements page and its line
component — exactly the two consumers of `utils/meals/statement-client.js`, at 0% (§5.1), and exactly
the journey that "asserts no amount, no total, no currency anywhere" (§6.1).

Coverage, reachability and falsifiability are three different instruments and they are pointing at the
same two documents: **the training evidence document and the meals monthly statement.**

---

## 4. Backend coverage, per module

### 4.0 The tooling verdict the brief asked for

| question | answer |
|---|---|
| `coverlet` present? | **yes** — `coverlet.collector` 6.0.0, `WebApi.Tests/WebApi.Tests.csproj:29` |
| a `.runsettings`? | **no** — none anywhere in the repository |
| `--collect:"XPlat Code Coverage"` anywhere? | **no** — not in any script, doc, `RUN.md`, or workflow |
| does CI collect coverage? | **no** — `.github/workflows/azure-webapps-dotnet-core.yml:68-69` runs `dotnet test` bare |
| cost to turn on | **one flag.** No package to add, no code to change. |

**The figures below are the first coverage numbers this backend has ever produced.**

### 4.1 Three things that happened when it was switched on

**(a) It costs about 3× wall clock.** 1,135 s (18 min 55 s) end to end for a tier that takes ~7 min
uninstrumented; `dotnet test` itself reported `Duration: 5 m 42 s`, the rest is instrumentation and
writing a **98 MB** `coverage.cobertura.xml`. The cause is identifiable: `WebApi.Tests/Kassa/` holds
**8 CsCheck property-based money-invariant tests** (`Prop_SplitConservesTotalsAndVat`,
`Prop_JournalChainVerifiesGapFree`, `Prop_CashRoundingAndCoverageExact`, …) which generate thousands
of cases each, and `xunit.runner.json` sets `parallelizeTestCollections: false`. If coverage is ever
wired into CI, budget for that.

**(b) One test fails under coverage and does not fail without it — and it is right to.**

```
WebApi.Tests.Services.ConfirmationCodeEntropySourceTests
  .The_generator_draws_from_a_cryptographic_source_and_from_nothing_else

The confirmation code is drawn through something this pin does not recognise as unable to
originate a value. … : System.Threading.Interlocked.Increment
  (in Coverlet.Core.Instrumentation.Tracker.WebApi_9b80c25b-….RecordHit)
Expected: True   Actual: False
```

That test decodes the IL of the confirmation-code generator (`WebApi.Tests/CompiledMethodBody.cs`) and
refuses any call that is neither cryptographic nor a pure computation over its arguments. Coverlet
injects its hit-counter — `Interlocked.Increment` — into the method body, and the pin refuses it. **This
is the guard working, not a flake and not a product defect.** But it means the suite is
**red-by-construction under coverage**: `TESTEXIT=1`, 4831 passed / 1 failed / 10 skipped of 4842.
Anyone wiring coverage into CI must first teach that pin to allowlist
`Coverlet.Core.Instrumentation.Tracker.*`, or CI goes red on day one.

**(c) The headline number coverlet prints is meaningless, for the mirror-image reason the frontend's is.**
The report says **8.7%** (`lines-covered="64269" lines-valid="737680"`). **86% of that denominator is
generated EF migration code** — 275 files, 665,228 physical lines, 635,874 counted line-entries, 0%
covered and rightly so. Excluding migrations the backend is at **63.1%**.

### 4.2 Per module

Command: §1. Roll-up by path, parsed from `coverage.cobertura.xml`.

> **Parser self-check.** Cobertura emits every `<line>` twice — once under `<method>`, once in the
> class-level `<lines>` block — and a naive sum doubles every figure. The parser counts only the
> class-level block and **asserts that its line totals reproduce the report header exactly**
> (64269/737680 ✓). The branch column is reconstructed from per-line `condition-coverage` and totals
> 13027/27512 against the header's 13461/28357 — about 3% short, because coverlet's header counts some
> branch points it does not emit per line. **Treat lines as authoritative and branches as
> module-to-module comparison only.**

| module | files | lines cov/total | **line %** | branches cov/total | branch % |
|---|---:|---:|---:|---:|---:|
| **Core/POS + shared** | 850 | 32766/66301 | **49.4** | 6383/18472 | 34.6 |
| Workforce | 130 | 11090/12228 | **90.7** | 2184/2859 | 76.4 |
| Margin | 75 | 5082/5586 | **91.0** | 1242/1569 | 79.2 |
| Meals | 72 | 4822/5652 | **85.3** | 892/1303 | 68.5 |
| Events | 60 | 3963/4849 | **81.7** | 1027/1594 | 64.4 |
| Training | 41 | 1996/2242 | **89.0** | 283/364 | 77.7 |
| Growth | 96 | 4550/4948 | **92.0** | 1016/1351 | 75.2 |
| Migrations (generated) | 275 | 0/635874 | **0.0** | — | — |
| **TOTAL excl. migrations** | 1324 | 64269/101806 | **63.1** | 13027/27512 | 47.4 |
| **TOTAL as coverlet prints it** | 1599 | 64269/737680 | **8.7** | 13027/27512 | 47.4 |

**The backend tells the same story as the frontend, independently.** The six modules are 81.7–92.0%.
Core/POS + shared is at 49.4% lines and 34.6% branches, and holds 33,535 of the estate's 37,537
uncovered non-migration lines — **89% of the whole backend gap sits in one row**, the same row the
frontend's gap sits in.

**Caveat, stated rather than hidden.** This is the **non-SQL tier only** (`--filter "Database!=SqlServer"`).
The SQL tier — gated by `[Trait("Database", "SqlServer")]`, 101 declaration sites across 160 test files
— was **not run**, and takes ~32 minutes. Code reached only by SQL-tier tests reads as uncovered here.
That most plausibly depresses the hosted services, the projection/reconciliation workers and the
`*DbViolations.cs` guard mappers, several of which appear below at 0–45%. A full-tier figure would be
higher; **nothing in §4 should be quoted as "module X is only N% covered" without this sentence.**

---

## 5. The ten largest uncovered paths per module, weighted by what a person would notice

Ranked by uncovered statements, then re-ordered by consequence. **Uncovered money and document code
outranks uncovered plumbing** — a service accessor that returns a singleton and a function that formats
the payer line are not the same risk, whatever the line counts say.

### 5.1 Frontend

Only `.js`/`.ts` appears here, because §2 established that no `.vue` file's body is measurable at all.
The `.vue` gap is a separate, larger list and it is in §3B.

#### Core/POS — the module that needs the afternoon

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches | what it is |
|--:|---|---:|---:|---:|---:|---:|---|
| 1 | `store/index.js` | **97** | 97 | **0%** | 43 | 61 | **The Vuex root store.** Holds `carts`, `orders`, `currentUser`, `stores`; mutations include cart creation and `lineItem` insertion. **No jest test imports it at all.** |
| 2 | `core/services/surfboard-service.ts` | 163 | 165 | 1.2% | 37 | 42 | onboarding/application wire |
| 3 | `core/services/store-service.ts` | 162 | 188 | 13.8% | 45 | 23 | store config wire |
| 4 | `core/services/open-check-service.ts` | 122 | 124 | 1.6% | 26 | 26 | **open checks — an unsettled bill** |
| 5 | `core/services/pos-service.ts` | 120 | 122 | 1.6% | 26 | 25 | **cash sale, card initiate/capture/void/refund, settlement, receipt send** |
| 6 | `core/services/order-service.ts` | 95 | 97 | 2.1% | 20 | 37 | **orders** |
| 7 | `core/services/user-service.ts` | 93 | 105 | 11.4% | 16 | 32 | identity |
| 8 | `core/services/request-service.ts` | 69 | 111 | 37.8% | 20 | 54 | **every wire call goes through it** — 54 uncovered branches |
| 9 | `core/services/tripletex-service.ts` | 59 | 61 | 3.3% | 13 | 21 | **accounting export** |
| 10 | `core/services/offer-proposal-service.ts` | 51 | 53 | 3.8% | 11 | 13 | offer/proposal money |

Below the top ten but worth naming because of what they are, all at 1–15%:
`cart-service.ts` (4.3%), `giftcard-service.ts` (6.1%), `journal-service.ts` (6.1%, **the append-only
kassa journal**), `dintero-service.ts` (4.0%), `vipps-service.ts` (4.8%), `cash-drawer-service.ts`
(5.0%), `discount-service.ts` (11.8%), `payment-service.ts` (15.4%), `accounting-service.ts` (18.2%),
`saft-service.ts` (11.8%), `payout-service.ts` (9.5%), `report-service.ts` (5.7%),
`core/models/cart/cart.ts` (6.3%).

**Honest weighting.** These `core/services/*.ts` are thin HTTP wrappers: build a path, call
`RequestService`, parse or throw. They are not dense business logic, so 3,979 statements overstates the
thinking involved. But the risk that *is* there is precisely the "blank payer line" class — a
mis-built query string silently returns the wrong window of the journal, a mis-parsed response yields
an empty field on a document. The repo already knows this: `test/core-request-path-shape.test.js`
exists and does exactly that job for a handful of paths. Extending it is cheap, mechanical, and covers
the highest-consequence part of these 2,360 statements.

`plugins/global-mixin.js` (24.8%, 54 uncovered functions) sits in "Shared" but belongs here: it exports
`paymentTypeLabel` — **the payer line** — plus `priceLabel`, `wholeAmount`, `fractionAmount`,
`orderStatusLabel`. Eighteen tests import it, mostly for its exported dictionaries. Of the 54 uncovered
functions roughly forty are `_xxxService` lazy accessors (plumbing, low value); the label and money
formatters are the part worth covering, and `core/helpers/tools.ts`, where `priceLabel` and
`fractionAmount` actually live, is at 70%.

#### Training — small module, and the document is the hole

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/training/evidence.js` | **31** | 31 | **0%** | 6 | **101** |
| 2 | `utils/training/journey.js` | 3 | 98 | 96.9% | 0 | 16 |
| 3 | `utils/training/disclosure.js` | 2 | 27 | 92.6% | 0 | 6 |
| 4 | `utils/training/training-client.js` | 1 | 45 | 97.8% | 1 | 0 |

**`utils/training/evidence.js` is the single most alarming row in this document.** 259 lines, **101
uncovered branches**, zero coverage. It is imported only by `components/admin/training/TrainingEvidenceDocument.vue`
and `pages/admin/training-evidence.vue` — and the five training test files import nine other training
components and never that one. So the evidence **document** — the artifact a Norwegian inspector may
ask for — has no jest test, and its two consumers are `.vue` files that coverage cannot see either.

Two independent instruments agree here: `L-WHICH-JOURNEYS-ARE-REAL` found that
`training-evidence-document`'s "DEFECT CHECK" step **contains no `expect` at all** and reads the
disclosure ledger from a `/__fixture/` route no live backend serves. Coverage and falsifiability point
at the same file. This is where an afternoon buys the most.

#### Meals — the monthly bill client has no test

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/meals/statement-client.js` | **25** | 25 | **0%** | 5 | 20 |
| 2 | `utils/meals/claim-client.js` | 2 | 2 | **0%** | 2 | 0 |
| 3 | `utils/meals/refusal-copy.js` | 2 | 55 | 96.4% | 0 | 5 |
| 4 | `utils/meals/statement-view.js` | 2 | 41 | 95.1% | 0 | 4 |
| 5 | `utils/meals/store-view.js` | 1 | 47 | 97.9% | 0 | 6 |

`utils/meals/statement-client.js` (124 lines) is imported only by `pages/admin/meals-statements.vue`;
**no jest test references it.** Again a second instrument agrees: the `meals-statement-month` journey
is "a monthly bill journey that asserts no amount, no total, no currency anywhere". The money document
of the Meals module is untested from both ends. Meals also carries the estate's **highest weak-assertion
share (33.6%, §6.2)**.

#### Events

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/events/events-guest-client.js` | **13** | 13 | **0%** | 7 | 7 |
| 2 | `utils/events/guest.js` | 5 | 127 | 96.1% | 0 | 8 |
| 3 | `utils/events/journey.js` | 2 | 118 | 98.3% | 0 | 4 |
| 4 | `utils/events/events-client.js` | 1 | 60 | 98.3% | 0 | 3 |

`events-guest-client.js` reads 0% for a specific and defensible reason: the only test that references
it, `test/events-guest-pages.test.js:15`, **`jest.mock`s it**. That is a legitimate choice for a page
test, but it leaves the guest-facing wire client with no test of its own. `utils/public-store-client.js`
(0%, 8 statements) is mocked in the same file for the same reason.

#### Workforce

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/workforce/requests-inbox.js` | 24 | 169 | 85.8% | 1 | 35 |
| 2 | `utils/workforce-me/self-requests.js` | 20 | 133 | 85.0% | 1 | 29 |
| 3 | `utils/workforce/week-grid.js` | 8 | 385 | 97.9% | 0 | 43 |
| 4 | `utils/workforce/personnel-list.js` | 4 | 90 | 95.6% | 0 | 12 |
| 5 | `utils/workforce/schedule-client.js` | 3 | 14 | 78.6% | 3 | 1 |
| 6 | `utils/workforce/roster-client.js` | 2 | 18 | 88.9% | 2 | 0 |
| 7 | `utils/workforce/roster.js` | 2 | 103 | 98.1% | 0 | 15 |
| 8 | `utils/workforce-me/shift-view.js` | 2 | 88 | 97.7% | 0 | 5 |
| 9 | `utils/workforce/api-client.js` | 1 | 65 | 98.5% | 0 | 3 |
| 10 | `utils/workforce/timesheet.js` | 1 | 59 | 98.3% | 0 | 5 |

96.0% statements, 98.1% functions. **There is no coverage work to do in Workforce.** The uncovered
residue is branch-level: 43 uncovered branches in `week-grid.js` and 35 in `requests-inbox.js` are the
only entries worth a look, and the payroll-minutes risk the owner cares about lives in
`timesheet.js` — which is at 98.3% with 5 uncovered branches.

#### Margin

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/margin/api-client.js` | 5 | 82 | 93.9% | 0 | 5 |
| 2 | `utils/margin/cost-preview.js` | 2 | 62 | 96.8% | 0 | **20** |
| 3 | `utils/margin/recipe-client.js` | 1 | 18 | 94.4% | 1 | 0 |
| 4 | `utils/margin/spend-amount.js` | 1 | 31 | 96.8% | 0 | 1 |
| 5 | `utils/margin/statement-client.js` | 1 | 48 | 97.9% | 0 | 5 |
| 6 | `utils/margin/statement-view.js` | 1 | 56 | 98.2% | 0 | **28** |
| 7 | `utils/margin/waste-client.js` | 1 | 10 | 90.0% | 1 | 4 |

97.7% statements, 98.6% functions — the best-covered module. The only entries worth a second look are
**branch** gaps in the two files that decide what a figure means: `cost-preview.js` (20) and
`statement-view.js` (28). `statement-view.js` is also where `L-WHICH-JOURNEYS-ARE-REAL` found the one
Margin money hole — a `gap` assertion that passes on `15,00`, `25,00`, `35,00` and `-5,00`. Coverage
will not find that; only a sharper assertion will.

#### Growth

| # | file | uncovered stmts | of total | stmt % | uncov fns | uncov branches |
|--:|---|---:|---:|---:|---:|---:|
| 1 | `utils/growth/guest.js` | 3 | 81 | 96.3% | 0 | 6 |
| 2 | `utils/growth/growth-client.js` | 2 | 23 | 91.3% | 2 | 0 |
| 3 | `utils/growth/send-gate.js` | 1 | 119 | 99.2% | 0 | **21** |

97.9%. Nothing to do. `send-gate.js` has 21 uncovered branches on a 119-statement file whose whole job
is to refuse a send — the reasons list is exactly what a branch test would exercise.

#### Shared / unassigned

| # | file | uncovered stmts | of total | stmt % | uncov fns |
|--:|---|---:|---:|---:|---:|
| 1 | `plugins/global-mixin.js` | 79 | 105 | 24.8% | 54 |
| 2 | `plugins/admin-core-services.js` | 30 | 37 | 18.9% | 17 |
| 3 | `utils/public-store-client.js` | 8 | 8 | 0% | 2 |
| 4 | `utils/guid.js` | 7 | 9 | 22.2% | 1 |
| 5 | `utils/i18n.js` | 6 | 16 | 62.5% | 0 |
| 6 | `plugins/market-mixin.js` | 3 | 3 | 0% | 2 |
| 7 | `server-middleware/okam-api-proxy.js` | 2 | 2 | 0% | 0 |
| 8–10 | `middleware/{om-okam,om-okam-admin,redirect-brosjyre-tilbud}.js` | 1 each | 1 | 0% | 1 |

Items 3–10 are one- and two-statement redirects and shims — genuine plumbing, and the cheapest possible
percentage points. **Do not spend the afternoon here**; they would move the estate number and buy
nothing. `utils/price.js` and `utils/cross-currency.js` are both at 100%.

### 5.2 Backend

Ranked by uncovered lines. Remember the §4.2 caveat: the SQL tier did not run, so workers, hosted
services and DB-violation mappers are the entries most likely to be understated.

#### Core/POS + shared — 33,535 uncovered lines, 89% of the backend's whole gap

| # | file | uncovered lines | of total | line % | uncov branches | what it is |
|--:|---|---:|---:|---:|---:|---|
| 1 | `Services/StoreService.cs` | **1238** | 1288 | 3.9% | 533 | store configuration |
| 2 | `Services/CartService.cs` | **966** | 1276 | 24.3% | **681** | **the cart — the largest single branch gap in either repository** |
| 3 | `Controllers/StoresController.cs` | **932** | 973 | 4.2% | 241 | |
| 4 | `Mcp/Services/McpShoppingService.cs` | **886** | 1159 | 23.6% | 308 | MCP shopping tools |
| 5 | `Services/WoltMenuSyncService.cs` | **834** | 834 | **0.0%** | 256 | menu sync to Wolt |
| 6 | `Services/OrderService.cs` | **715** | 957 | 25.3% | 430 | **orders** |
| 7 | `Services/WoltService.cs` | **676** | 942 | 28.2% | 475 | **Wolt money + callbacks** |
| 8 | `Controllers/DinteroController.cs` | **661** | 731 | 9.6% | 151 | **card payments** |
| 9 | `Services/InvoiceService.cs` | **651** | 1088 | 40.2% | 293 | **invoices — a document** |
| 10 | `Services/ProductService.cs` | **626** | 626 | **0.0%** | 226 | products/pricing |

**`CartService.cs` is where the afternoon goes on the backend.** 681 uncovered branches on the object
that decides what a customer is charged, and the frontend's `core/services/cart-service.ts` (4.3%) and
`core/models/cart/cart.ts` (6.3%) and `store/index.js` cart mutations (0%) are uncovered on the other
side of the same wire. The cart is uncovered end to end in both repositories.
`OrderService`, `InvoiceService`, `DinteroController` and `WoltService` are the same class of risk.

#### Events — the widest module gap, on the deposit and proposal path

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Services/Events/EventsProposalService.cs` | **129** | 437 | 70.5% | **91** |
| 2 | `Services/Events/EventsAmendmentService.cs` | **104** | 194 | **46.4%** | 35 |
| 3 | `Services/Events/EventsDepositService.cs` | **98** | 491 | 80.0% | **67** |
| 4 | `Controllers/EventsController.cs` | **86** | 190 | **54.7%** | 20 |
| 5 | `Services/Events/EventsSettlementService.cs` | **58** | 495 | 88.3% | 39 |
| 6 | `Controllers/EventsSettingsController.cs` | **42** | 60 | **30.0%** | 17 |
| 7 | `Services/Events/EventsDepositPaymentPortAdapter.cs` | **37** | 251 | 85.3% | 49 |
| 8 | `Services/Events/EventsDepositCompletionSink.cs` | **36** | 178 | 79.8% | 31 |
| 9 | `Services/Events/EventsNotificationDispatchHostedService.cs` | **31** | 31 | **0.0%** | 2 |
| 10 | `Services/Events/EventsInquiryService.cs` | **30** | 186 | 83.9% | 20 |

81.7% — the lowest of the six, and the uncovered part is the money: proposals, amendments, deposits,
settlement. This agrees with `L-WHICH-JOURNEYS-ARE-REAL`, which calls the Events coordinator stages
"the widest gap in this plan between *built* and *shown working*" and found the settlement journey's
`Linjesum 35800,00` to be an echo of a figure the journey itself typed. Both instruments put Events'
money path at the top of the list.

#### Meals

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Services/Meals/MealsReconciliationWorker.cs` | **129** | 235 | **45.1%** | 32 |
| 2 | `Services/Meals/MealsMembershipService.cs` | 75 | 537 | 86.0% | 39 |
| 3 | `Services/Meals/MealsProgramService.cs` | 73 | 492 | 85.2% | 33 |
| 4 | `Services/Meals/MealsProjectionWorker.cs` | **67** | 211 | **68.2%** | 15 |
| 5 | `Services/Meals/MealsCompanyService.cs` | 60 | 391 | 84.7% | 29 |
| 6 | `Services/Meals/MealsFundingAuthority.cs` | 55 | 320 | 82.8% | 31 |
| 7 | `Services/Meals/MealsDbViolations.cs` | **47** | 84 | **44.0%** | 42 |
| 8 | `Services/Meals/MealsQuoteService.cs` | 46 | 455 | 89.9% | 27 |
| 9 | `Services/Meals/MealsStatementService.cs` | 42 | 520 | 91.9% | 35 |
| 10 | `Services/Meals/MealsFundingLedgerService.cs` | 31 | 315 | 90.2% | 19 |

The reconciliation worker (45.1%) and the projection worker (68.2%) are the weak entries, and both are
the kind of code the SQL tier exercises — so read them with the §4.2 caveat. Note that
`MealsStatementService.cs` is at **91.9%** on the backend while the frontend's
`utils/meals/statement-client.js` is at **0%**: the monthly bill is computed by a well-covered service
and rendered by an untested client into a page no test loads.

#### Training

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Controllers/TrainingController.cs` | **90** | 199 | **54.8%** | 17 |
| 2 | `Services/Training/TrainingCertificateService.cs` | 26 | 275 | 90.5% | 14 |
| 3 | `Services/Training/TrainingIdempotency.cs` | 17 | 82 | 79.3% | 7 |
| 4 | `Controllers/TrainingControllerBase.cs` | 14 | 53 | 73.6% | 8 |
| 5 | `Entities/Training/TrainingChecklistItemResult.cs` | 13 | 13 | **0.0%** | 0 |
| 6 | `Entities/Training/TrainingChecklistTemplateItem.cs` | 12 | 12 | **0.0%** | 0 |
| 7 | `Services/Training/TrainingAuditWriter.cs` | 11 | 53 | 79.2% | 3 |
| 8 | `Entities/Training/TrainingChecklistRun.cs` | 11 | 11 | **0.0%** | 0 |
| 9 | `Entities/Training/TrainingChecklistTemplate.cs` | 11 | 11 | **0.0%** | 0 |
| 10 | `Services/Training/TrainingAssignmentService.cs` | 10 | 222 | 95.5% | 7 |

**Four `TrainingChecklist*` entities at exactly 0.0%, every line, with no branches.** An entity type
whose every line is unexecuted is the signature C3 warns about — a shape that exists in the model and
that nothing constructs. Worth a reachability check rather than a coverage push: if nothing writes a
checklist run, adding a test that constructs one would raise the number and change nothing real.
`TrainingController.cs` at 54.8% is the other half of the Training evidence story from §5.1.

#### Workforce

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Services/Workforce/WorkforceDbViolations.cs` | 74 | 102 | **27.5%** | **65** |
| 2 | `Services/Workforce/WorkforceStaffService.cs` | 71 | 637 | 88.9% | 36 |
| 3 | `Services/Workforce/WorkforceShiftExchangeService.cs` | 58 | 562 | 89.7% | 48 |
| 4 | `Services/Workforce/WorkforceTimesheetService.cs` | 56 | 746 | **92.5%** | 18 |
| 5 | `Controllers/WorkforceMeController.cs` | 55 | 161 | **65.8%** | 20 |
| 6 | `Services/Workforce/WorkforceSelfService.cs` | 40 | 371 | 89.2% | 23 |
| 7 | `Services/Workforce/WorkforceSchedulePublishService.cs` | 36 | 458 | 92.1% | 23 |
| 8 | `Services/Workforce/WorkforceRuleEvaluator.cs` | 34 | 415 | 91.8% | **60** |
| 9 | `Services/Workforce/WorkforceScheduleService.cs` | 33 | 490 | 93.3% | 20 |
| 10 | `Services/Workforce/WorkforceNotificationDispatchHostedService.cs` | 31 | 31 | **0.0%** | 2 |

90.7%. `WorkforceTimesheetService.cs` — where payroll minutes are computed — is at **92.5%** with only
18 uncovered branches, which is the reassuring answer to the "payroll minutes doubling" concern.
`WorkforceDbViolations.cs` (27.5%, 65 uncovered branches) is the append-only guard's violation mapper:
low because the deny-trigger paths it maps are SQL-tier behaviour (C1, §4.2 caveat).
`WorkforceMeController.cs` at 65.8% is the genuine gap — the self-service surface.

#### Margin

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Services/Margin/MarginEhfInvoiceParser.cs` | **100** | 552 | 81.9% | **63** |
| 2 | `Services/Margin/MarginPriceImportService.cs` | 59 | 487 | 87.9% | 39 |
| 3 | `Services/Margin/MarginRecipeService.cs` | 44 | 441 | 90.0% | 22 |
| 4 | `Services/Margin/MarginSalesProjector.cs` | **35** | 94 | **62.8%** | 4 |
| 5 | `Services/Margin/MarginRecipeCostCalculator.cs` | 33 | 264 | 87.5% | 16 |
| 6 | `Controllers/MarginSuppliersController.cs` | 23 | 93 | 75.3% | 7 |
| 7 | `Services/Margin/MarginRecipeSupport.cs` | 21 | 59 | 64.4% | **66** |
| 8 | `Services/Margin/MarginSupplierItemService.cs` | 20 | 138 | 85.5% | 9 |
| 9 | `Controllers/MarginPriceImportsController.cs` | 20 | 104 | 80.8% | 3 |
| 10 | `Services/Margin/MarginStatementService.cs` | 18 | 502 | **96.4%** | 13 |

91.0%. Two entries deserve a look despite the good headline: **`MarginEhfInvoiceParser.cs`** (63
uncovered branches — parsing a supplier's EHF invoice is document ingestion, and a mis-parsed line
becomes a wrong plate cost), and **`MarginSalesProjector.cs` at 62.8%** — the projector behind
F-MRG-FINALIZE-LAG, the freeze-while-behind defect that `L-WHICH-JOURNEYS-ARE-REAL` records as
"invisible by construction in fixture mode". Coverage and the journey census agree that the projector
is the unproven part of Margin.

#### Growth

| # | file | uncovered lines | of total | line % | uncov branches |
|--:|---|---:|---:|---:|---:|
| 1 | `Services/Growth/GrowthDispatchClaim.cs` | 40 | 69 | **42.0%** | 13 |
| 2 | `Services/Growth/GrowthPostmarkMailProvider.cs` | 31 | 194 | 84.0% | 33 |
| 3 | `Services/Growth/GrowthDispatchService.cs` | 25 | 407 | 93.9% | 19 |
| 4 | `Controllers/GrowthPreferenceController.cs` | 19 | 102 | 81.4% | 8 |
| 5 | `Services/Growth/GrowthTimelineProjector.cs` | 18 | 67 | 73.1% | 2 |
| 6 | `Services/Growth/GrowthNewsletterService.cs` | 17 | 376 | 95.5% | 18 |
| 7 | `Services/Growth/GrowthPreferenceCentreLink.cs` | 17 | 28 | **39.3%** | 4 |
| 8 | `Services/Growth/GrowthWebhookIngestionService.cs` | 17 | 194 | 91.2% | 16 |
| 9 | `Services/Growth/GrowthSubscriptionService.cs` | 16 | 169 | 90.5% | 15 |
| 10 | `Services/Growth/GrowthAddressProtector.cs` | 15 | 129 | 88.4% | 10 |

92.0% — the best-covered backend module. `GrowthDispatchClaim.cs` (42.0%) is the claim/lease around
sending, and `GrowthPreferenceCentreLink.cs` (39.3%) mints the link a recipient uses to withdraw
consent — small files, but the second one is consent machinery and worth the twenty minutes.

---

## 6. What these numbers do not mean

### 6.1 Line coverage does not measure whether an assertion can fail

`docs/plan/reviews/L-WHICH-JOURNEYS-ARE-REAL.md` read all 39 journeys assertion by assertion and found
**4 with proven falsifiability** — journeys that have actually been made to go red. The rest are
readings. That review names, among others: a Margin statement `gap` assertion that passes on `15,00`,
`25,00`, `35,00` and `-5,00` when the answer is `5,00`; a Meals monthly-bill journey that asserts no
amount, no total and no currency anywhere; an Events settlement journey whose `Linjesum 35800,00` is
the figure the journey itself typed; a Training "DEFECT CHECK" step containing no `expect` at all.

Every one of those files would count as covered.

### 6.2 A cheap assertion-strength census

Command:

```sh
node <the classifier in this lane's scratchpad> Web-modules/test
```

Each matcher occurrence is classified exactly once by a single non-overlapping scan over a closed
matcher vocabulary. **Weak** = any `.not.` form (passes when the thing is simply absent — the estate's
documented vacuity shape), presence-only (`toBeTruthy`/`toBeDefined`/`toBeVisible`), or loose
containment (`toContain`/`toMatch`). **Sharp** = `toBe`/`toEqual`/`toHaveLength`/
`toHaveBeenCalledWith`/`toThrow`/… This is a textual census, not a proof of falsifiability: it says
where to look, and it is 30 seconds of work.

| module | test files | blocks | assertions | per block | weak | **weak share** | negated | presence-only | loose |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Core/POS | 27 | 380 | 914 | 2.4 | 234 | **25.6%** | 91 | 14 | 129 |
| Workforce | 48 | 1006 | 2449 | 2.4 | 400 | **16.3%** | 131 | 59 | 210 |
| Margin | 24 | 497 | 1240 | 2.5 | 196 | **15.8%** | 70 | 29 | 97 |
| Meals | 11 | 222 | 580 | 2.6 | 195 | **33.6%** | 59 | 31 | 105 |
| Events | 6 | 235 | 578 | 2.5 | 156 | **27.0%** | 56 | 6 | 94 |
| Training | 5 | 204 | 477 | 2.3 | 63 | **13.2%** | 22 | 16 | 25 |
| Growth | 9 | 219 | 609 | 2.8 | 140 | **23.0%** | 35 | 18 | 87 |
| Shared / unassigned | 20 | 329 | 734 | 2.2 | 195 | **26.6%** | 86 | 11 | 98 |
| **TOTAL** | 150 | 3092 | 7581 | 2.5 | 1579 | **20.8%** | 550 | 184 | 845 |

Only 2 of 3,092 test blocks contain no `expect` at all, which is genuinely good. The signal is the
**combination**: high reported coverage *and* a high weak share is where a green number is buying the
least.

| file | module | assertions | weak share | read manually — verdict |
|---|---|---:|---:|---|
| `test/workforce-personnel-list-components.test.js` | Workforce | 43 | **88%** | **stands** — 32 of 43 are `toContain` on rendered text |
| `test/events-surface.test.js` | Events | 99 | **77%** | **stands, weakest in the list** — mounts real components, then 49 loose + 26 negated on rendered text; the contract is "some string appears" |
| `test/store-market-card.component.test.js` | Core/POS | 66 | **74%** | **stands** — 39 loose on a market/price card |
| `test/meals-admin-client.test.js` | Meals | 31 | **65%** | **stands** — a wire client whose shapes are asserted by containment |
| `test/meals-components.test.js` | Meals | 63 | **59%** | stands |
| `test/meals-claim-page.test.js` | Meals | 94 | **55%** | stands |
| `test/price-gate-shadow.test.js` | Core/POS | 29 | **55%** | **OVERSTATED — discount this row.** Its negations are `expect(scan(source)).not.toContain('priceLabel')` against *literal control strings the test supplies*, with positive controls beside them. That is a scanner self-test, not a vacuity. |
| `test/margin-cost-panel.component.test.js` | Margin | 43 | **53%** | stands |
| `test/margin-supplier-panels.component.test.js` | Margin | 48 | **52%** | stands |
| `test/price-bypass-legacy.test.js` | Core/POS | 74 | **49%** | **partly overstated.** Its negations name a *specific wrong value* — `not.toBe(row.basis)`, `not.toContain(UNKNOWN_AMOUNT)`, `not.toContain('NaN')` — which is far stronger than a bare `not.toHaveText`. |

**The limitation of this column, stated plainly.** A textual classifier cannot tell a vacuous negation
from a negation that names the wrong value it is excluding. Two of the ten flagged files were read by
hand and one of them should be discounted outright. Treat the column as a *reading list*, never as a
verdict — and never as a target: driving the weak share down by rewriting matchers would be the same
mistake as driving line coverage up.

With that correction, the honest reading is: **Meals** carries the highest weak share of any module
(33.6%) *and* the lowest module coverage after Core/POS and Training — it is the module where a green
suite is buying the least. **Events** has the single weakest file. The two Core/POS price files are
fine.

### 6.2b Twenty test files never execute the code they guard

`grep -l readFileSync test/*.test.js` returns **20 of 150 files**. These read *source text* and assert
properties of it — route-path shapes, the absence of a legacy price bypass, scroll-lock discipline,
admin nav-access lists — without importing or running the module.

This cuts the other way from everything else in this section: **coverage understates the assurance on
exactly those properties.** `test/core-request-path-shape.test.js` is the clearest case. It exists
because `core/services/user-service.ts` posted `/user/confirm-email/` with a trailing slash that ASP.NET
matched either way, so production never noticed while the strict fixture 404'd — and thirteen paths
across seven services carried the same fault. That guard covers `core/services/*.ts` route shapes
**and contributes zero to their 1–15% coverage figure**, because a guard that reads a file does not
execute it.

So the Core/POS number in §3A is real, but it is not the whole picture: the highest-frequency defect
class in those thin wrappers is already guarded statically. What is *not* guarded is response parsing
and the throw paths — which is where the effort belongs.

### 6.3 Three more things the numbers cannot say

- **Reachability.** C3 exists because on 2026-07-29 four of five module journeys stopped at a missing
  wire while the suite was green. A service with no controller is 100% coverable and 0% reachable.
  Coverage cannot see it.
- **Acceptance.** C5: a suite result is never evidence that a capability exists. Nothing in this
  document is acceptance evidence, and none of it should be quoted as such.
- **The backend's SQL tier.** The §4 figures come from the non-SQL tier only. Code exercised solely by
  SQL-tier tests reads as uncovered here. That is stated, not hidden — see §4.

---

## 7. What raising the number would cost

| # | action | cost | what it buys |
|--:|---|---|---|
| 1 | Widen `collectCoverageFrom` to include `utils`, `core`, `store`, `plugins`, `middleware`, `modules`, `server-middleware` | **one line** in `jest.config.js`; run is 10 s | The 3,979-statement Core/POS gap becomes visible instead of invisible. Today the config reports on 1,166 statements and hides 7,529. |
| 2 | Wire `--collect:"XPlat Code Coverage"` into the backend's recorded test recipe | **one flag**; coverlet is already referenced. But two real costs, both measured: **~3× wall clock** (1,135 s vs ~7 min, driven by the 8 CsCheck property tests and `parallelizeTestCollections: false`), and a 98 MB report. | §4 becomes a number anyone can re-run instead of a one-off. |
| 2b | Before any of that reaches CI: teach `ConfirmationCodeEntropySourceTests` to allowlist `Coverlet.Core.Instrumentation.Tracker.*` | one allowlist entry | Without it, coverage in CI is **red on day one** — the IL entropy pin correctly refuses coverlet's injected `Interlocked.Increment` (§4.1b). Do not "fix" this by weakening the pin. |
| 2c | Exclude `Migrations/` from the backend denominator (`ExcludeByFile` in a `.runsettings`) | one file | Stops the headline reading 8.7% when the real figure is 63.1%. 86% of the current denominator is generated code nobody will ever test. |
| 3 | Fix `.vue` instrumentation | **not a config change**, and not costed here. What is *verified*: `vue-jest@3.0.7`'s `generate-source-map.js:14` is the cause. What is **not** verified: whether vue-jest 4 or `@vue/vue2-jest` fixed that specific line — this lane did not install or read them, and L-VUE-JEST-UPGRADE-MEASURED tested **suite counts**, not instrumentation, so its "4.0.1 changes nothing" does not transfer. Someone should check before assuming an upgrade helps. The two candidate routes are a local patch of that one function, or moving component logic out of SFCs into `utils/`. | The 47,081 unmeasured script lines. The estate is **already** doing the second: `pages/admin/margin-recipes.vue`'s own docblock says "NOTHING ON THIS PAGE ADDS MONEY UP OR TAKES IT AWAY … see `utils/margin/cost-preview.js`". That is exactly why module `utils/` coverage is 81–98% while the pages are unmeasurable. Continuing it is cheaper than patching a transform. |
| 4 | Add a `coverageThreshold` and run jest in CI | small | `.github/workflows/nuxtjs.yml` does not run jest at all today; the 13-second suite is not a CI cost. Do this **after** 1 and 3, never before — a threshold over the current narrow list would ratchet in the wrong denominator. |

**Do not start by writing tests for the biggest uncovered files.** Start with item 1, because until it
lands nobody can tell which files those are; and note that the six modules do not need a coverage
push at all — they need falsifiable assertions (§6.2) and a person walking the journey (C5).

### 7.1 If somebody has one afternoon, in order

1. **`utils/training/evidence.js`** — 0%, 101 uncovered branches, and its only two consumers are the
   only two Training `.vue` files no test ever loads, and its journey step has no `expect`. Three
   instruments, one file, and it produces a **document** (§0, §3C, §5.1, §6.1).
2. **`utils/meals/statement-client.js`** — 0%, same three-way agreement, and it renders **the monthly
   bill**. The backend computes it at 91.9%; only the rendering is untested (§5.1, §5.2).
3. **The cart, end to end** — `Services/CartService.cs` at 24.3% with **681 uncovered branches**, and
   on the other side of the wire `core/services/cart-service.ts` (4.3%), `core/models/cart/cart.ts`
   (6.3%) and `store/index.js` cart mutations (0%, imported by no test). It is uncovered in both
   repositories simultaneously (§5.1, §5.2).
4. **Events' money path** — the lowest backend module (81.7%) and its gap is exactly proposals,
   amendments, deposits and settlement, which the journey census independently calls the widest
   built-vs-shown-working gap in the plan (§5.2).
5. **Extend `test/core-request-path-shape.test.js`** to the rest of `core/services/*.ts`. Mechanical,
   cheap, and it targets the defect class those 2,360 statements actually carry (§6.2b).

Two things that look like work and are not: the `TrainingChecklist*` entities at 0.0% want a
**reachability** check, not a test (§5.2); and the one-statement `middleware/*.js` redirects would move
the estate percentage and buy nothing (§5.1).
