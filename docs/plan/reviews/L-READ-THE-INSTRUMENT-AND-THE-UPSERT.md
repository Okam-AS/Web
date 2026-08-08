# L-READ-THE-INSTRUMENT-AND-THE-UPSERT — review of the two unlanded load-bearing lanes

Reviewer: agent:L-READ-THE-INSTRUMENT-AND-THE-UPSERT (did not write either lane). Read-only against
`lane/vue-coverage-instrument` @ `52dd348` (Web-modules, off trunk `a63c30f`) and
`lane/role-upsert-idempotent` @ `1f0bc9cc0` (OkamAPI-modules, off trunk `a1c1a6dff`).
Both named probes were re-run in throwaway detached worktrees (created and removed this session;
`node_modules` symlinked, no install; no container, no port, no full tier).

## Verdict

**Both lanes do what they claim. No change was found that does not do what it says.**
Four nits and three observations below; none blocks landing, none changes a number either lane
published. The one sentence the coverage lane still owes is the wall-clock one (finding F1).

---

## 1. `lane/vue-coverage-instrument` @ `52dd348` — CLEAN, claims verified

### 1.1 The diagnosis is correct at the mechanism

Read against `node_modules` as shared (the exact bits jest runs):

- `vue-jest@3.0.7` `lib/generate-source-map.js` is byte-for-byte the quoted defect: one
  `originalPositionFor({line: ln, column: 0})` probe per line, and **no mapping at all** for a line
  with no column-0 hit. `source-map@0.5.7` (vue-jest's nested copy) returns `{source: null}` for a
  candidate on another generated line, so every indented line is skipped. Verified in the file, not
  taken from the lane.
- The call site (`lib/process.js`) calls it with `output = ''`, so `generatedOffset` is 1 — the one
  `;(function(){` line. The wrapper reproduces the same arithmetic and shifts every babel mapping by
  exactly that 1. Verified.
- `parseComponent(src, { pad: true })` pads the extracted script one line per preceding source line
  (`vue-template-compiler/build.js:691-697`: `//\n` for plain script, `\n` when a `lang` attr is
  set), so babel/TS original lines are already `.vue` file lines and the wrapper's "nothing needs
  adjusting on the original side" is right. Verified.

### 1.2 The seam holds

The `require.cache` injection is sound for this dependency graph:

- `generate-source-map` is required by exactly one module (`lib/process.js`); the wrapper populates
  the cache entry, replaces `.exports`, then deletes `lib/process` and the `vue-jest` entry from the
  cache before re-requiring — so no module can retain the old binding. Nothing else in the repo
  requires `vue-jest` (the config no longer names it), and the seeding is per-worker-process, which
  is the granularity jest loads transforms at.
- The 5-argument shape assertion throws loudly on a future vue-jest change rather than silently
  restoring the old map, and `getCacheKey` folds in the wrapper's own content hash. vue-jest 3.0.7
  itself exports **no** `getCacheKey` (verified in `vue-jest.js`), so the wrapper's is strictly
  additive. Jest is 26.6.3 and its `ScriptTransformer` calls both `getCacheKey(fileData, filename,
  configString, {…instrument…})` and `process(content, filename, config, options)` in exactly the
  4-arg shapes the wrapper implements (verified at `@jest/transform/build/ScriptTransformer.js:256,464`).
- Version skew is benign: the wrapper's `source-map` resolves to the root 0.6.1 (synchronous
  consumer/generator, same API as vue-jest's nested 0.5.7); `process.js` only ever calls
  `map.toString()` and `addTemplateMapping` only `map.addMapping` + `_hashedFilename`, both of which
  the replacement provides.

**Per SFC shape** (survey of all `.vue` at `52dd348`): 8 `lang="ts"` files, 0 `<script setup>`, 0
`<script src=>`, 0 functional templates, 2 files with no `<script>` at all.

| shape | holds? | why |
|---|---|---|
| plain `<script>` | yes | babel map carried at real columns; the probe proves report-stage placement |
| `lang="ts"` | yes | repo `tsconfig.json` has `"sourceMap": true` (verified), so `transpileModule` emits a map that `compileBabel` passes as `inputSourceMap`; the merged babel map is what the wrapper carries. Pad char `\n` keeps alignment |
| no script / template-only | yes | `processScript(null)` → `''`, no input map → the wrapper's identity fallback is behaviourally identical to the original's no-consumer path; such files stay out of the report exactly as before (evidence says so of `PriceTable`/`CloseButton`, and that matches) |
| `<script setup>` | vacuous + unchanged | vue-jest 3.0.7 reads only `parts.script`; there are zero setup SFCs; the wrapper delegates `process()` unchanged so it can neither fix nor worsen this |
| `src=` block / functional / CSS modules | unchanged | `process.js` untouched; none present in the repo anyway (except CSS modules, which never reach the script map) |

### 1.3 The probe bites — re-run by this reviewer

Detached worktree at `52dd348`, `node_modules` symlinked, `core` not needed for this test:

- As committed: `jest --ci --no-coverage test/vue-coverage-instrumentation.test.js` → **5/5 pass**.
- Reverting **only** `jest.config.js` line 45 to `'vue-jest'` → **5/5 fail**, `exit=1`, with exactly
  the claimed shape: all five `PROBE(...)` markers in `missing`, `fnDeclLines` empty.
- Restored → 5/5 pass again. Worktree removed.

The test resolves the transform from `jest.config.js` on disk, so the guard is real, not decorative.

### 1.4 Claims audit

| claim | verdict |
|---|---|
| no existing test changed or edited | **true** — the commit touches exactly 5 files: `jest.config.js` (transform line + comment only), three new files under `test/`, and the lane evidence |
| 150/3563/0 → 151/3568/0; the +1/+5 is the probe | arithmetic and file-set consistent; trunk-side 150/3563 independently corroborated by `L-COVERAGE-MEASURED-PER-MODULE.md` §1 run (a). Full-tier re-run is outside this review's budget (sibling lanes hold the suite slots) |
| `test/support/vue-sfc-transform.js` is not itself collected as a suite | true — jest default `testMatch` requires `.test.`/`.spec.` or `__tests__/`, and the +1 suite count confirms |
| 762/1166 → 6125/18157 | the before figure reproduces the upstream run (a); the after figure is the lane's measured run. Spot-consistency: 6 wholly-indented pages that "used to vanish silently" re-appearing is exactly what the mechanism predicts |
| five buble transform failures identical either side | consistent with upstream §2.5 (same five files named); not independently re-run |
| fixture outside `collectCoverageFrom`, mounts nothing | true — `test/fixtures/` is outside both globs |

**No contradiction with `docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md`.** One apparent one,
resolved: the lane says its baseline "reproduces that document exactly" as **762/1166** (65.35 →
printed 65.4), while the upstream document's §2.2/§3B print **1,169 statements over 304 files**
(65.2). The 3-file/3-statement delta is `layouts/{default,empty,error}.vue`: the upstream's §2/§3B
figures come from its **widened** run (b), whose glob includes `layouts/`, while the lane measured
the repo's configured run (a) (`components/` + `pages/` only). Both are right about their own scope;
neither number is wrong. The upstream's own §0 headline (65.4) matches the lane's scope.

### 1.5 Findings (nits — none blocks)

- **F1 — the 12.0 s → 8.3 s wall clock is asserted, never explained.** The evidence says "wall clock
  did not regress", which dodges that it *improved* by a third while the report-stage remap now
  processes ~16× the mappings. Nothing in the fix plausibly makes the suite faster; the likely
  mechanism is jest transform-cache warmth (the 8.3 s run was the worktree's second-plus run, warm
  for `ts-jest`/`babel-jest` outputs, cold only for `.vue` under the new cache key). Correctness is
  unaffected and the probe is `--no-coverage` anyway, but the evidence owes that one sentence —
  as written, a reader could conclude the instrumentation is free-or-better, which a cold CI run
  will not reproduce. Named change: add the sentence; no code change.
- **F2 — the red-proof transcript's line numbers are stale.** Evidence §3 quotes
  `module-scope-indented (line 15)` … `method-body (line 33)`; the committed fixture has the markers
  at 17/23/27/33/35 (two comment lines were added after the capture). My re-run printed the 17/23/27
  shape. The marker-based assertions make this immaterial — noted so the next reader does not
  diff-hunt.
- **F3 — the commit message reuses the upstream's 304/1,169 figures beside its own 301/1,166 table**
  without the layouts reconciliation in §1.4 above. Same non-contradiction; one clause would fix it.

---

## 2. `lane/role-upsert-idempotent` @ `1f0bc9cc0` — CLEAN, claims verified

### 2.1 The exclusion is the right way round

The brief's exact worry — an off-by-one predicate on the retirement stamp — does not exist:

- `IndexLiveRoleName` returns without indexing when `role.EffectiveToUtc.HasValue` — any stamp,
  including future-dated, keeps a role out of the by-name index. `MatchLiveRoleByName` consults only
  that index. So the name path can **never** reach a stamped row, and the unconditional
  `role.EffectiveToUtc = item.EffectiveToUtc` on the update branch can only clear a stamp on a row
  the caller addressed **by id** — which is the documented, deliberate reinstate path
  (`workforce-roles.vue` `itemFor` restates every field for exactly this reason; verified in the
  page at trunk `a63c30f`).
- The index is built oldest-first (`CreatedAtUtc`, tie-broken `RoleId`), first-wins — pre-existing
  duplicates resolve to the row earlier links were written against, as claimed.
- Release/re-index around a rename is reference-equality-guarded, so a rename cannot evict a
  same-named row it does not own.
- Blank names are trimmed into one key ("" and " " collapse), consistent with the docstring.

### 2.2 The probe bites — re-run by this reviewer

Detached worktree at `1f0bc9cc0`; `dotnet build` 0 errors; `--filter FullyQualifiedName~UpsertRoles`:

- As committed: **6/6 pass** (the 4 new facts + 2 pre-existing).
- Mutant re-applied (the lane's mutant 1: `MatchLiveRoleByName(...)` → `null`), **rebuilt** (not
  `--no-build`): **exactly 2 fail** — `..._called_twice_..._leaves_one_row` and
  `..._collapses_two_items...` — precisely the rows the evidence's mutation table claims.
- Restored, rebuilt: 6/6 pass. Worktree removed.

The double-call test is sharp for the reasons its comment gives and I confirmed in the code: second
call carries a **different** `Idempotency-Key` (so `CommitAsync`'s replay path — verified at
`WorkforceStaffService.cs:773` — cannot satisfy it) and a **changed** station (so a dropped write
cannot), and it asserts row count **and** surviving-row id **and** the changed field from a fresh
`DbContext`.

### 2.3 Claims audit

| claim | verdict |
|---|---|
| both create-path callers have no id to repeat | **true** — `workforce-roles.vue` `submit()` omits `roleId` deliberately (":the absence IS the discriminator", verified at trunk); `seed-workforce-demo.sh` (branch `lane/every-module-has-data` @ `1f6487e92`, :271-287) never sends one and carries the GET-first workaround whose comment names this defect |
| the idempotency ledger does not cover a second seed run | true — `CommitAsync` replays only on the same key (read the implementation); a new key executes in full |
| unknown/cross-store id used to create under a different id | true in the old code (`else` branch reached with a discarded id); now the opaque 404 **before** the reservation, so an expected 4xx leaves no stuck reservation — ordering verified |
| no existing test changed | **true** — zero deleted lines in the test-file diff; the one other `UpsertRoles` caller (`WorkforceEndToEndJourneyTests:85`) uses the no-id create with a unique name, unaffected |
| fast tier 4836/0/10, delta +4 | the committed `lane-fast-tier.summary.txt` says exactly that; the +4 matches the four new facts; not independently re-run (no full tier in this review's budget) |

### 2.4 The not-done half: the argument is sound and the sequence is safe

**Leaving the two duplicate rows was the right call, and the recorded reasons check out against the
schema, not just against prose:**

- `WorkforceRole` is **not** in `GuardAppendOnly` (read the method at `ApplicationDbContext.cs:1468`:
  journal family, workforce audit + idempotency, publications — no role), and no migration puts a
  deny-trigger on it. So a retirement UPDATE through the endpoint is an ordinary write on a
  documented route; C1 is not in play for the role row itself.
- The three `Restrict` FKs to `(StoreId, RoleId)` exist as cited: `WorkforceStaffRole` (~:2701),
  `WorkforceRoleRateVersion` (~:2779), `WorkforceShiftAssignment` (~:2971). DELETE is therefore
  structurally blocked, and repointing a rate version or a published week's assignment would rewrite
  wage history / a published snapshot — the C1 shape. `WorkforceTimesheetLine` carries no `RoleId`
  (verified), so no payroll row names a role directly.
- **The recorded retire-not-delete sequence is safe to run as written.** Each step uses an existing
  endpoint (11 is a full replace — matches its test), the retire item restates every field (required,
  since assignment is unconditional — the page's own docblock says the same), the survivor default
  (oldest) is the row the new key converges on, and retiring a twin whose name the survivor shares
  is safe inside the fixed code path: the release helper only frees a key its own row owns.
  One property worth stating when it is run: the sequence is **id-addressed throughout**, so it
  would execute identically on the old code — nothing in it depends on the fix except step 5, the
  seed re-run that proves convergence.

### 2.5 Observations (not defects — the lane's claims stay true)

- **O1 — concurrency is not closed, and the lane says why.** Two *concurrent* no-id calls under
  different keys can still both miss the in-memory index and mint twins; the filtered unique index
  on `(StoreId, Name) WHERE EffectiveToUtc IS NULL` is the real invariant and is correctly deferred
  (C2 one-author rule, and it **cannot be created** while the store-1 twins are live — it would fail
  to build). The commit's claim is "a replay leaves one row", which is the sequential property, and
  that is the one it proves. Land the index in the same change that resolves the twins.
- **O2 — an id-addressed reinstate can still mint a live same-name pair** (reinstate retired "Kokk"
  by id while a live "Kokk" exists). By design the id path bypasses the name key; only O1's index
  would refuse it. Known consequence of the chosen semantics, not a broken claim.
- **O3 — on an already-duplicated store, a compound request that renames the older twin by id and
  then upserts the freed name creates a third row** rather than falling back to the shadowed newer
  twin (the one-owner index does not re-index the twin on release). Bounded to stores already in the
  defect state, consistent with the lane's own never-key-onto-the-newer-twin stance, and mooted once
  the recorded sequence retires the twins.
- **O4 (nit) — one stale citation:** the evidence points at `test/e2e/fixture/api-server.js:1472`;
  at trunk `a63c30f` the `PUT /roles` handler is at :1604. The substantive claim is right — the
  fixture keys on `roleId`-else-create, models neither the name key nor the 404, and will diverge
  from the backend on a double-submit journey until aligned. That divergence is real follow-up work
  the fixture's owner should get.

---

## 3. What this review did not do

No full suite or tier on either side (sibling lanes hold the slots; probes only, as briefed). No
container, no `okam-lwtwo-*`, no :3971/:5971. Both throwaway worktrees removed after use; both
repos' checked-out branches untouched. Suite-count and per-module coverage figures are accepted on
the arithmetic + upstream corroboration stated inline, not re-measured. Per C5, nothing here is
acceptance of any capability — it is a verdict that the instrument now measures and that the upsert
now keys.
