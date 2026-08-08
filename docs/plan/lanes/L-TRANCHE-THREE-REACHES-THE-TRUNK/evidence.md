# L-TRANCHE-THREE-REACHES-THE-TRUNK — evidence

Trunk **`c6c04c7` → `bb22728`**, tier **179 / 4318 / 0**. Two merges in the required order, zero
conflicts. Nothing pushed. T4 and T5 confirmed still off the trunk.

## The order, verified by ancestry before merging

| check | result |
|---|---|
| `aff616d` an ancestor of the trunk? | **no** |
| `aff616d` inside `8d4d1b0`? | **yes** |
| `8d4d1b0` / `2ce83f6` on the trunk? | no / no |

So `8d4d1b0` carries **both** halves — the 96 coverage tests and the three-state flag fix — and one
merge brings them together. There is no reachable intermediate state carrying only `aff616d`, which is
why the tier after step 1 is already the meaningful composed one and is green.

## The deliberate red went green by changing the code, not the assertion

The brief's claim, checked with the strongest instrument available rather than by reading the diff:

```
git diff --numstat aff616d 8d4d1b0 -- test/workforce-timesheets-page.test.js
  59 added   0 removed
```

**Zero deleted lines in that file.** The pinned assertion — *does not tell a manager the export flag is
off when the flag was never read* — is untouched; `8d4d1b0` only appends to the file. What changed is
`pages/admin/workforce-timesheets.vue` and `utils/workforce/timesheet.js`. Run by name at the composed
tip, that arm passes.

## SEAM-2, re-measured rather than inherited

The refutation was reproduced from scratch, and its premise checked first so the pass could not be
vacuous:

- **Premise real:** `8d4d1b0` and `2ce83f6` both change `pages/admin/workforce-timesheets.vue`.
- **Merge:** `Auto-merging pages/admin/workforce-timesheets.vue` — **no conflict**.
- **Both intents survive**, verified by reading the merged file rather than trusting the tier:
  - `2ce83f6`'s — the refusal routes through `contextRefusalKey(e, { noCapability: … })`, so it names
    the module rather than the reader.
  - `8d4d1b0`'s — `exportEnabled ()` still returns **`null`** when `listResult` is absent and the
    template still gates on `=== false`, so an unread flag does not render as "off". A merge that took
    either side wholesale would have destroyed one of these; it took each in its own region.

Dictionaries auto-merged on both steps with **no duplicate keys** in `no.ts`/`en.ts`/`de.ts`.

## The tier, measured at each step

`npx jest --ci`, exit 0, no `FAIL` line, `core` pinned to `9626a561`.

| step | merged | suites | tests | delta |
|---|---|---|---|---|
| base | `c6c04c7` | 173 | 4200 | — |
| 1 | `8d4d1b0` | 178 | 4306 | **+5 / +106** |
| 2 | `2ce83f6` | 179 | 4318 | **+1 / +12** |

**Every test accounted for**, and both deltas match the landing plan's re-measured figures exactly
(`8d4d1b0` "composed +106: exact"; `2ce83f6` "re-measured composed: +12, 0 new red").

`2ce83f6`'s *own reported* tier of 165 / 3886 / 0 is against base `00d84d7` and is not reconcilable
against this trunk — the landing plan already recorded it as unreconcilable-as-reported, and the +12
composed delta is the number that holds.

The equality is the point rather than the arithmetic, as in both previous tranches: predicting
`4200 + 106 + 12` assumes these branches' file sets are disjoint from tranche one's and tranche two's.
The two branches here demonstrably are **not** disjoint from each other — they share the timesheets
page — so measuring is the only thing that establishes the composition, and it did.

## The backend half — **knowingly led**, and the promise gap is nothing in production

`2ce83f6`'s return names OkamAPI `lane/a-module-off-names-the-module-be` @ **`8357c8a33`** (off
`9fb057d00`). Measured against the backend repo rather than taken from the return:

- **Not landed:** `8357c8a33` is **not** an ancestor of the backend trunk `057c390ad`.
- **The contract the frontend depends on is already there.** `workforce.module-disabled` is defined at
  `Helpers/Workforce/WorkforceErrorCodes.cs:56` on the backend trunk and documented on
  `IWorkforceModuleGate` as the 403 code. The frontend's ability to tell the two 403s apart rests on
  production code that has already landed. `2ce83f6`'s own return says the same — *"no backend change
  was needed"* — and that now has a measurement behind it.
- **What is unlanded is demo-seed only.** `git diff 9fb057d00 8357c8a33` touches exactly two files:
  `Scripts/demo/seed-workforce-demo.sh` and `WebApi.Tests/Workforce/WorkforceDemoSeedFlagTests.cs`.
  **No production code.**

**So: the trunk promises nothing the backend does not deliver.** The single consequence of leading is
that **the demo world diverges** until `8357c8a33` lands — the workforce demo seed still writes a
withheld flag key that the catalog refuses, so anyone walking the module-off path in the demo may see
it behave unlike production. That is a demo-fidelity gap, not a contract gap, and it is the backend
lane's to close.

## Arity sweep on the final tree

Modules changed: `utils/workforce/context-refusal.js`, `utils/workforce/timesheet.js`.

```
named imports resolved : 33
call sites checked     : 81
raw flags              : 0
```

## A coverage gap in the runner guard, found while checking this landing

The guard landed in tranche two asserts *"no mutation runner anywhere under `docs/plan/lanes/` restores
from git"*, and its `SWEEP_ROOTS` are `test/support` and `docs/plan/lanes`. Its own sweep line at this
tip reads:

```
[sweep] 2 mutation script(s): test/support/mutate.js,
        docs/plan/lanes/L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN/mutate.js
```

But the trunk carries a **second, larger** collection at **repo-root `lanes/`** — `8d4d1b0` adds
`lanes/mutate.js` to it — and the guard cannot see any of it. **Fourteen** executable mutation drivers
live there (`.js`, `.py`, `.sh`).

Applying the guard's own rule to all fourteen by hand — comment lines stripped, then matched for
`git checkout --`, `git restore`, `git stash` — **every one is clean**. So this is a coverage gap
rather than a live defect: nothing is hiding in it today, and this landing introduces no offender. But
the guard's protection does not extend to the directory where most of this estate's runners actually
live, so a future broken copy under `lanes/` would not be caught. That belongs to the runner's owner,
not to a landing lane.

## Teardown

`Web-modules-wt/L-T3-LAND` detached in place, then `rm -rf` plus `git worktree prune`. No worktree
holds `feature/restaurant-modules` — free for tranche four. `web-livewalk` untouched, no container
started, nothing pushed.

**Nothing beyond tranche three touched**, asserted: `6d43520`, `6670619`, `fddb06c`, `40ab62d` and
`52a93c5` are all still absent from the trunk.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules c6c04c7
```
