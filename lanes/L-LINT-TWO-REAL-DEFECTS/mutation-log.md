# L-LINT-TWO-REAL-DEFECTS — mutation log

Two of the 678 lint errors were defects rather than style. Both are now fixed, and each fix is held
by a test proved to red when the defect is put back — not by a test that merely passes on the
corrected file.

Transcript: `mutation-run.txt` (76 lines, driver `mutate.sh`, run 2026-08-05T04:20:06Z).
Measured tree: worktree `/Users/svendaneel/okam/web-lint2defects` at `8ad3358` (`lane/lint-runnable`),
node v24.15.0, eslint 7.32.0, **vue 2.7.14** (package.json declares `^2.6.14`).

---

## Which tree each defect lived in

This was the first thing established, and the two answers differ.

| defect | file | where it lives |
|---|---|---|
| duplicate `storeOverview` | `pages/admin/overview.vue` | **tracked**, byte-identical (md5 `99d6334b…`) at `e34977a`, at `lane/lint-runnable`, and in the shared-checkout working tree |
| `_tick` in `data()` | `components/admin/pos/ClockScreen.vue` | **untracked — shared checkout only** |

`ClockScreen.vue` is uncommitted work in progress on the shared checkout, part of a cluster:
`ClockScreen.vue`, `utils/workforce/pos-clock-client.js`, `utils/workforce/pos-clock-state.js` and
`test/workforce-pos-clock.test.js` are all untracked; `PosShell.vue` (which renders it) and
`translations/{no,en,de}.ts` are modified. It is reachable: `PosShell.vue:29`.

A **different** `ClockScreen.vue` is committed at `7c3a1e1` (2026-08-01) on four lane branches —
`lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`.
It is 24366 bytes to the shared checkout's 17692, uses `pos-clock__*` classes and `wfclock_*`
translation keys, and **does not contain `_tick`**. The shared-checkout copy is the live one: the
working-tree translations carry **25 `posclk_` keys and zero `wfclock_`**, so the four lanes' copy
would throw `missing translation key` against today's dictionaries. Flagged, not resolved — see the
RETURN's `spec_gap`.

---

## Defect 1 — the watcher that was declared twice and never ran

`watch` declared `storeOverview` at :533 and again at :541. JavaScript keeps the **last** of two
identical keys, so the **first was discarded before Vue ever saw the options object**. Measured, not
assumed: `Object.keys({k:'FIRST', k:'SECOND'})` → `["k"]`, value `SECOND`.

**The bodies are not copies of each other.** The brief asked which, and for both quoted.

Dropped (:533–540) — recomputes the two header totals:

```js
storeOverview: {
  handler() {
    this.totalOrderCount = this.sortedStores.reduce((sum, s) => sum + (s.orderCount || 0), 0);
    this.totalAmountSum = this.sortedStores.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  },
  immediate: true,
  deep: true,
},
```

Surviving (:541–553) — normalises missing KAM ids so "Ingen" is selected:

```js
storeOverview: {
  handler(stores) {
    // Set empty KAM IDs to empty string to ensure "Ingen" is selected
    if (stores && stores.length) {
      stores.forEach((store) => {
        if (!store.kamUserId) {
          store.kamUserId = "";
        }
      });
    }
  },
  immediate: true,
},
```

**Why deleting the dropped body is safe, and why that is asserted rather than remembered.** The
sibling watcher on `sortedStores` (:525–532) performs the *same two reductions over the same array*,
also `immediate` and `deep`, and `sortedStores` is computed from `this.storeOverview` (:473). It is
strictly more complete: it also fires when a *filter* changes, which the dropped body would not have.
So the dropped body was inert — but that is a judgement about today's siblings, so it is now a test
(`the totals the dropped body recomputed are still recomputed by the sortedStores watcher`).

**The hazard this creates.** "De-duplicate it" had a right answer and a wrong one. Keeping the
*earlier* body silently removes the only KAM normalisation, and the linter cannot see it — mutation
M3 below is lint-clean and behaviourally broken.

---

## Defect 2 — the data key Vue silently ignores

`data()` returned `_tick: null` (:149). Vue 2 refuses to proxy a data key beginning with `_` or `$`
onto the instance, so the declaration could not be read back. Measured against the installed Vue:

```
vm._tick   = "INTERVAL_ID"   <- plain instance property, set in mounted()
$data._tick = null           <- the declaration, never updated
"_tick" proxied? = false     ("ok" proxied? = true)
warnings emitted = 0         <- Vue says NOTHING
```

Two different things under one name, and no warning at any level. The timer itself was never broken
— `mounted` (:176) and `beforeDestroy` (:179) both used the instance property — so removing the
declaration is behaviour-preserving. That is held by
`the ticker is still started on mount and cleared on destroy`, which also asserts there is no longer
a shadow `$data._tick`.

---

## The mutations

Each defect restored **one at a time**, so each test is shown tied to its own defect rather than one
red covering both. Full transcript in `mutation-run.txt`.

| run | mutation | result |
|---|---|---|
| baseline | both fixed | **8 passed, 8 total** |
| **M1** | duplicate `storeOverview` restored (2 keys in the literal) | **1 failed** — `the real page declares each watched key exactly once`; all 4 ClockScreen tests stay green |
| **M2** | `_tick: null` restored to `data()` | **3 failed** — the rule guard, the `data()` key guard, and the ticker test; both overview tests stay green |
| **M3** | de-duplicated the **wrong** way (kept the dropped body) | **1 failed** — `the watcher that survives is the one that normalises missing KAM ids`, while **eslint reports 0 `no-dupe-keys` errors** |
| restored | both fixed | **8 passed, 8 total** |

M3 is the reason the guard is not only the lint rule: the file the linter calls clean is the one that
stops normalising KAM ids.

Each rule guard is also proved live **inside the suite** against a fixture that still contains the
defect, so "the linter reports nothing" cannot pass because the linter was misconfigured or never
looked at the file. `lintFiles` returning zero results — an ignored or unmatched path, which reads
exactly like a clean file — is asserted against explicitly.

---

## What changed

| file | change |
|---|---|
| `pages/admin/overview.vue` | dropped watcher body deleted (−8 lines), replaced by a 5-line comment recording why |
| `components/admin/pos/ClockScreen.vue` | `_tick: null` deleted from `data()`; comments at the declaration site and at `mounted` |
| `test/overview-watch-duplicate.test.js` | new, 4 tests |
| `test/pos-clock-reserved-key.test.js` | new, 4 tests |

**Lint delta — exactly the two errors, nothing else.**

| file | before | after |
|---|---|---|
| `pages/admin/overview.vue` | 14 errors (1 × `no-dupe-keys`) | **13** — `quotes` 77, `space-before-function-paren` 26, `comma-dangle` 12 … all untouched |
| `components/admin/pos/ClockScreen.vue` | 1 error (`vue/no-reserved-keys`) | **0** |

The other 676 were not touched.

**Suites, on the shared checkout (the tree that matters): 3 passed, 29 tests, exit 0** — the two new
suites plus the pre-existing `test/workforce-pos-clock.test.js`, which is **21/21 both before and
after** the ClockScreen change (A/B in the same tree; see the RETURN).

---

## Two traps this lane hit, both of which produced a plausible wrong answer first

1. **zsh ate a `git` revision.** `git show "$r:components/admin/pos/ClockScreen.vue"` inside a loop
   resolved to `lane/fe-pos-clockomponents/...` — zsh applied `:c` as a parameter modifier. The
   command failed, `2>/dev/null` hid it, and the empty output hashed to the empty-string md5
   `d41d8cd9…`, so four branches looked like they contained an empty file. They do not. Use `${r}:path`.
2. **A grep matched its own fix.** `grep -c "_tick: null"` reported `1` on the *corrected* file —
   it was matching the new comment explaining the removal, not code. The honest check strips comments
   and reads the `data()` keys (`mutate.sh` does this).

Where the deliverables live is recorded in the RETURN, not here.
