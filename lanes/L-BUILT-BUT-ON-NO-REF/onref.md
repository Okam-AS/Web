# Reported work that is on no ref

L-BUILT-BUT-ON-NO-REF. Read-only. Nothing committed, stashed, restored, cleaned or pushed in either
repo; no container started; no file outside this lane directory written.

## As-of and denominators

| quantity | value | moment |
|---|---|---|
| returns in `docs/plan/returns/` | 334 → **335** (classified) → 336 | 04:30Z → 04:34Z → 04:46Z |
| FE refs enumerated | **141** = heads 116 + lanes 9 + salvage 8 + remotes 8 | stable 04:30Z–04:46Z |
| BE refs enumerated | **332** = heads 317 + lanes 0 + salvage 0 + remotes 15 | stable 04:30Z–04:46Z |
| worktrees scanned | **450** = FE 113 + BE 337 | 04:33Z–04:41Z |
| FE tip `feature/restaurant-modules` | `e34977ac` | unmoved across the pass |
| BE tip `feature/restaurant-modules` | `8e2b57de` | unmoved across the pass |

The returns count moved twice inside sixteen minutes (334 → 336). Every path statement below is exact
at its stated moment and must be re-derived before anyone acts on it.

## How "reports built work" was separated from "is a census"

Mechanically, not by reading. Each of the 335 returns was parsed for repo-relative source paths under
either repo's real top-level directories (`components|pages|utils|test|translations|store|plugins|…`
and `Controllers|Services|Entities|Migrations|WebApi.Tests|Scripts|…`), excluding `lanes/**`.

- **195** name at least one such path → treated as reporting built work.
- **140** name none → census / audit / receipt, whose deliverable is a document. Not in scope.
- verdicts across all 335: built 292, fail-spec 20, blocked 23.

This return-text direction is **weak and was not trusted alone**. Of the 14 returns it flagged, **7
were false positives**: `translations/sv.ts` (named as a file that does not exist),
`utils/firebase.ts` and `pages/checkout.vue` (a third repo, ConsumerWeb), `Helpers/Events/
EventsGuestLinks.cs` (a hazard L-EV-VIPPS-FALLBACK warns *would* be added), `test/e2e/journey-
artifact-store.test.js` (the return itself says its brief mis-named the file), plus two prose
manglings. A return naming a path is not a return claiming it.

So the load-bearing instrument is the **inverse**: enumerate every file in every worktree whose
content is on no ref, then attribute each to the lane that built it.

## Instrument, and the two traps the brief named

Containment is keyed on **(path, blob)**, never on path. `git hash-object` the working file, then
compare against `git rev-parse "${REF}:${PATH}"` across all four namespaces.

- `git log --all` / `git for-each-ref --all` would have missed `refs/lanes` (9) and `refs/salvage`
  (8). All enumeration is an explicit four-namespace `for-each-ref`.
- Every negative was preceded by a positive control on the same instrument. `package.json` resolves
  on **141/141** FE refs; a bogus ref exits **128** with `fatal:` and is never swallowed;
  `git cat-file --batch-check` input and output line counts were asserted equal (61 420 = 61 420)
  before any join. The empty-string md5 `d41d8cd9…` was recorded up front so a silent-empty read
  could not be mistaken for a match.
- One control failed first pass (`OkamAPI.sln`, which simply does not exist — the BE repo root *is*
  the project). The negative was not reported until the control was replaced with a real file and
  passed. `"${REF}:${PATH}"` was quoted throughout.

## The four states, kept apart

### State 4 — untracked in the shared checkout, on no ref at all

All in `/Users/svendaneel/okam/Web-modules` (FE) on `feature/restaurant-modules` `e34977ac`.
**15 paths sit on 0 of 141 refs.** Each lane's own return states the condition; none is a surprise
to its author, and none is visible to anyone who clones or checks out.

**L-WF-FAILURES-SURFACE — 7 paths, the whole feature.** Return: `verdict: built`, "Nothing
committed, nothing pushed."

    pages/admin/workforce-delivery.vue
    components/admin/workforce/WorkforceDeliveryPanel.vue
    components/admin/workforce/WorkforceDeliveryGroup.vue
    utils/workforce/delivery-failures.js
    test/workforce-delivery-failures.test.js
    test/e2e/fixture/workforce-delivery.js
    test/e2e/journeys/workforce-delivery-failures.spec.js

Plus its nav entry, `STORE_ADMIN_PATHS` pin and no/en/de keys, which live as uncommitted
modifications to `AdminPageHeader.vue` and `translations/{no,en,de}.ts` in the same checkout.
The lane reports a passing three-tier browser journey and 40 green jest tests against code that a
clone cannot obtain.

**L-WF-PUNCH-UI — the register's clock.** Return: `verdict: built`, "NOTHING COMMITTED (shared
branch)". 5 paths on 0 refs:

    utils/workforce/pos-clock-state.js       <- the named defect-avoidance module
    test/workforce-pos-clock.test.js
    test/pos-clock-reserved-key.test.js
    test/e2e/fixture/workforce-punch.js
    test/e2e/journeys/workforce-pos-punch.spec.js

`pos-clock-state.js` is the file the return says "makes clockSessionId authoritative" — the guard
against a clock-out with nothing open answering 200 and flipping the till to *clocked in* as the
worker walks away, with no end time recorded. That guard is on zero refs.

Two more are the sharper case — **the path is on refs, the content is on none**:
`components/admin/pos/ClockScreen.vue` and `utils/workforce/pos-clock-client.js` each exist on
**4** refs (`lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`,
`lane/fe-wf-oplink`) at a **different blob**. Measured vocabulary split, the till's 25 keys:

    translations/no.ts  working tree (shared checkout)   posclk_=25  wfclock_=0
    translations/no.ts  lane/fe-pos-clock                posclk_=0   wfclock_=47
    translations/no.ts  candidate/fe-compose-2026-08-05  posclk_=0   wfclock_=0

Two disjoint implementations of the same screen, and the composition candidate carries neither.
`PosShell.vue` and `PosTopBar.vue` (the z-index repair that made the clock reachable at all) are
likewise modified-on-no-ref in the shared checkout.

**L-GUARD-DEMO — 1 path.** `scripts/drift-demo/demo.sh`, on 0 refs. `plan.md:17371` calls it
"finished, committed work". It is committed nowhere. Already named by L-SHARED-DIRT-CENSUS-2;
re-measured here and still true at 04:41Z.

**L-GUARD-W0 — 2 paths + 2 in the backend.** `world.config` and `scripts/worldstamp` (FE),
`world.config`, `Scripts/worldstamp` and `artifacts/world/WORLD.json` (BE), all on 0 refs. These are
generated world state and a compiled binary, so the class is different: nothing is lost by a clean,
but the guard that reads them degrades to "unknown" without them.

### State 3 — in a worktree only, backend

L-SHARED-DIRT-CENSUS measured the FE shared checkout. **The backend repo and the other 449 worktrees
were not covered by it.** Three findings there, all new:

**`lane/growth-sql-catch-typed` — the cheap check fires.** The branch resolves to `8e2b57de`,
**exactly the BE tip: it carries nothing.** Its return is `verdict: built`, with a two-line typed-
catch fix quoted at exact sites and a five-arm matched-pair mutation proof. The work is in
`/Users/svendaneel/okam/OkamAPI-modules/../wt-grsqlcatch` only:

    Services/Growth/GrowthConsentTextService.cs   modified, content on 0 of 332 refs
    Services/Growth/GrowthDispatchService.cs      modified, content on 0 of 332 refs
    WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs   untracked, path on 0 refs

The return says "nothing pushed" and never claims a commit. A 4643/0/12 regression tier was run
against a tree no other process can reconstruct.

**`lane/train-demo-seed` — resolves exactly to the BE tip, and has no return.**
`/Users/svendaneel/okam/OkamAPI-traindemoseed` holds `Scripts/demo/RUNBOOK.md` and
`Scripts/demo/seed-training-demo.sh` modified, content on 0 refs. No file in `docs/plan/returns/`
reports this lane. Outside the exit criterion (no return reports it) but named because it is the
same shape with no paper trail at all.

**`lane/adminaudit` — no return either.** `/Users/svendaneel/okam/wt-adminaudit` holds
`WebApi.Tests/TestSourceText.cs` and `WebApi.Tests/TestSourceTextTests.cs`, both untracked, both on
0 of 332 refs. No return names `TestSourceText`.

Two older, pre-existing WIP lanes, recorded so they are not read as tonight's:
`OkamAPI-utc` (`lane/order-created-utc`) carries **19** modified service files on no ref — the
Order.Created→UTC lane; and `OkamAPI` on `feature/swiss` carries `Validation/CartSelectionValidator.cs`
+ its tests on 0 refs, which the estate's own record marks superseded.

### State 2 — on a lane ref only, not on the shared branch and not in the composition

These survive a `git clean`. They do not survive a merge that never names them.
`candidate/fe-compose-2026-08-05` (`9f7d8df`, **103** commits ahead of the tip, 01:20 local) is the
live consumer. Ancestry checked directly:

    NOT in candidate  lane/wf-timesheet-ui        1 ahead   10 paths, on exactly 1 ref
    NOT in candidate  lane/wf-pubhist             1 ahead    8 paths, on exactly 1 ref
    NOT in candidate  lane/fe-pos-clock           1 ahead    rival ClockScreen + 47 wfclock_ keys
    NOT in candidate  lane/vat-keys-monolingual   1 ahead    3 paths

`lane/vat-keys-monolingual` is the brief's own first instance and it has **changed state since the
brief was written**: it now carries `686e3c5` — `translations/de.ts`, `translations/en.ts`,
`test/vat-goods-group-locales.test.js`. The lane committed. It is no longer worktree-only; it is
lane-ref-only, and it is not in the candidate. The brief's premise for that lane no longer holds.

What the candidate *did* pick up, for contrast: `pages/admin/workforce-roles.vue`,
`components/admin/meals/MealsStatementLines.vue`,
`components/admin/training/TrainingEvidenceDocument.vue`, `test/world-stamp-windows.test.js`.
So the composition is not systematically dropping work — it is dropping exactly the work whose lane
never made a ref, plus four lane refs nobody merged.

### State 1 — on a shared branch

Not enumerated; it is the 101 of 132 FE dirty source files whose working content matches a ref, and
the majority of both repos. Recorded only so the other three states are read against it.

## Two branches that carry a commit which is not a fix

The brief's widening: a branch can resolve past the tip and still hold nothing that changes the
product. **Six FE branches are 1–2 commits ahead and touch only `lanes/**` or `docs/plan/**`**:
`lane/collected-paths`, `lane/ev-guestlink-one-composer`, `lane/exit-instrument-census`,
`lane/fe-journey-meals`, `lane/fixture-divergence-receipt`, `lane/mrg-revise-land`.

Five are censuses whose deliverable *is* the document — correct. **`lane/mrg-revise-land` reads as a
landing and is not one**, but it is not a defect either: L-MRG-REVISE-LAND landed the code onto
`lane/mrg-recipe-revise-ui` (10 files, 1742 insertions, confirmed present) and kept only its evidence
on its own branch. Checked because the name invites the wrong count, not because it produced one.

**`refs/salvage/dangling-8550f5e0` is an empty commit.** Message: *"The consent lifecycle is walked
from join to withdrawal, and the test-send refusal is made falsifiable."* `git diff-tree -r` against
its parent `5ad0ca00` returns **zero paths**. It is reachable from no head, no lane ref and no
remote. No return in the corpus names it. A commit shaped like a landed journey that holds nothing.

## Calibration — three false-positive classes, so the cheap check is not over-read

1. **A branch resolving exactly to the tip is not automatically a finding.** FE
   `lane/wf-invite-surface` resolves to `e34977ac` with a *clean* worktree — correctly, because
   L-WF-INVITE-SURFACE returned `fail-spec`: the surface already existed at baseline and there was
   nothing to build. Two of the three exact-tip branches tonight are real (`growth-sql-catch-typed`,
   `train-demo-seed`); one is not.
2. **Untracked in the shared checkout ≠ on no ref.** `pages/admin/workforce-roles.vue` is untracked
   in `Web-modules` yet byte-identical to the copy on 6 refs including the candidate. 44 of the 59
   untracked source paths are like it.
3. **`artifacts/**` and `.runout/**` are gitignored by the repo's own rule.** ~40 journey JSONs and
   screenshots read as orphaned and are not — they are regenerated evidence, excluded throughout.

## Not covered

- Blob-level reachability from *dangling* objects the salvage refs do not name; only the 473 refs
  were used as roots. L-SHARED-DIRT-CENSUS additionally rooted 8 detached worktree HEADs.
- Whether each orphaned file *works*. Containment only.
- The BE `Migrations/20260720*` pairs in `OkamAPI-w4`, `OkamAPI-meals-w1`, `OkamAPI-events-verify` and
  `OkamAPI-growth-w1-pin` (8 files, 0 refs) are dated 2026-07-20 and belong to the July W1/W4 wave,
  not to this plan; left unattributed rather than guessed at.
- No commit was made on any lane's behalf, and no lane's file was moved, added or touched.
