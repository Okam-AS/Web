# The six unlanded branches — the record, with the count of each stated

**Reason shape: (1) missing write-up.** The landings happened and were checkable; **the refusal, its reason
and the counts existed only as prose inside the lane's own RETURN**, which is the lane's account of itself,
not an instrument. `lanes/L-SIXLAND/` exists and is **empty**. This is that record.

**Every ancestry claim below was re-measured today** with `git merge-base --is-ancestor` against the
current trunks, not taken from the RETURN.

## The evidence line as the lane recorded it, preserved before `plan verify` overwrites it

```
evidence: backend feature/restaurant-modules 7bf975572 -> d30c1c4d4 (4 merges, tier 5037/5048 green at the tip); frontend feature/restaurant-modules 914e593 -> de5e68c (184 suites/4484 green)
```

## The counts

| outcome | count |
|---|---:|
| **landed** | **5** |
| **recorded unlandable, with the reason** | **1** |
| total | **6** |

The six are the `needs-landing` class of `docs/plan/artifacts/twenty-three-branches.md` — not re-derived
here, as that artifact's own instruction says.

## Landed — 5

Four backend branches, composed one at a time onto `feature/restaurant-modules`, and one frontend branch.
**All five are ancestors of their trunk today.**

| # | lane | branch | tip | landing merge | ancestor of trunk? |
|---|---|---|---|---|---|
| 1 | `L-VIPPS-REDACT-404` | `lane/vipps-redact-404` | `cb18cab48` | `a776d5d2d` *Land lane/vipps-redact-404: the route redactor stops failing open on unbound routes* | **yes** |
| 2 | `L-WF-WITHHELD-BOUND` | `lane/wf-withheld-bound` | `74405b34d` | `0b2d17296` *Land lane/wf-withheld-bound: bound the notification backlog a store with no push credential builds* | **yes** |
| 3 | `L-CENSUS-FLOORS-DERIVED` | `lane/census-floors-derived` | `75dcc2ff6` | `d375f5479` *Land lane/census-floors-derived: the module actor census counts its own coverage* | **yes** |
| 4 | `L-WF-IDEMPOTENCY-REFUSAL-REST` | `lane/wf-idempotency-refusal-rest` | `02684ecc1` | `d30c1c4d4` *Land lane/wf-idempotency-refusal-rest: a refused write is an outcome, so it stops poisoning its own key* | **yes** |
| 5 | `L-STATUTE-EVIDENCE-WORLD` (frontend) | `lane/statute-evidence-world` | `2ee3fd76` | `de5e68cd` *Land lane/statute-evidence-world: the personalliste stops printing rows it says it cannot record* | **yes** |

- Backend: `git log --oneline --merges 7bf975572..d30c1c4d4` returns **exactly those four merges** and the
  range holds 9 commits. `d30c1c4d4` is an ancestor of the current trunk `6d5328004`.
- Frontend: `de5e68cd` is an ancestor of `feature/restaurant-modules` (`5296dca8`), and so is
  `lane/statute-evidence-world` itself. The range `914e593..de5e68c` holds 5 commits and 2 merges — the
  second being `129f9d63` (`lane/print-host`), a prerequisite the landing lane pulled in because the
  personalliste's print stylesheet had to actually apply before any sentence added to it could be verified
  on paper.
- **`8357c8a33` is correctly NOT an ancestor** of the trunk — it is the gated commit the brief said must
  not land, and it did not.
- A correction the landing lane made to its own earlier artifact, worth preserving: **`L-STATUTE-EVIDENCE-WORLD`
  is a FRONTEND branch** and had been filed backend by keyword; and only **one** of the five was SQL-tier,
  not three.

### The tier at the composed tip

`tier-run.md` and `composed-tip-fast-tier.trx` in this directory: the fast tier
(`--filter "Database!=SqlServer"`, from `WebApi.Tests/`) **run today at the composed tip `d30c1c4d4`**,
because the original claim was a bare pair of counts with no run artifact anywhere — `git ls-tree` at the
trunk finds **no receipt under `artifacts/tests/` keyed to `a776d5d2`, `0b2d1729`, `d375f547`, `d30c1c4d`
or `7bf97557`**.

**Result: `total="5048" executed="5037" passed="5037" failed="0"`, exit 0, 7 m 33 s** — which reproduces the
evidence line's *"5037/5048 green at the tip"* exactly, now with a run behind it. Asserted by name rather
than by the green line: `CapabilityRouteTelemetryTests` **15/15 Passed** (the vipps-redact lane's `+15`) and
`WorkforceNotificationBacklogBoundTests` **2/2 Passed** (the withheld-bound lane's `+2`), both counts
matching the per-lane deltas the RETURN recorded.

**The frontend tier is NOT re-measured here.** Its `184 suites / 4484 green` remains the RETURN's number
with no artifact behind it — stated so a reader is not misled into thinking both halves carry the same
weight.

## Recorded unlandable — 1

### `L-WF-DEMO-PRESENCE` — `lane/wf-demo-presence` @ `8a9080c85`, refused

`git merge-base --is-ancestor lane/wf-demo-presence 6d5328004` → **exit 1. Not an ancestor, deliberately.**

The branch's single commit is *"The demo's personalliste is written by the clock, not by the fixture"*: the
demo world seeded `WorkforceClockEvents` and `WorkforceClockSessions` with raw SQL, so the statutory
§ 8-5-6 register — written only as a side effect of the clock ingest — printed blank on the one world
anybody could look at it in. It moves the punches onto `POST /workforce/pos/clock-events`. **The problem it
names is real.** It is refused for four reasons, each measured rather than asserted:

1. **It is seed scripts only, and no test can see them.** `git diff` against its merge base
   (`de1e5c5e9`) is **two files**: `Scripts/demo/RUNBOOK.md` (+43) and `Scripts/demo/seed-workforce-demo.sh`
   (+208/−49). **It adds no test file at all**, so no tier at any tip could report on it either way.
2. **ADOPT mode reached the trunk after the fork.** Occurrences of `adopt` in
   `Scripts/demo/seed-workforce-demo.sh`: **merge-base `de1e5c5e9` = 0 · branch `8a9080c85` = 0 · trunk
   `6d5328004` = 27.** The whole adopt path was written on the trunk side after this branch forked, so the
   branch has no idea it exists. Merging would mean **authoring what adopt does**, not merging what the
   branch wrote.
3. **It would falsify a line the trunk prints to the operator.** `seed-workforce-demo.sh:558-561` at the
   trunk says, on screen: *"SKIPPED. Adopt mode writes no SQL, and `POST /workforce/pos/clock-events` — the
   only HTTP … adopted world carries NO clock punches: attendance shows planned minutes with no actuals."*
   The branch's entire change is to send punches through exactly that endpoint. Landing it makes the trunk's
   own printed sentence untrue.
4. **It does not merge cleanly.** `git merge-tree` over merge-base / branch / trunk reports **4
   changed-in-both regions** on the one shared file.

There is also a frontend arm the landing lane recorded and did not attempt: the branch **declares
`bodyAttrs.class` as a joined string where the trunk now requires an array.**

**This is the good outcome the brief allowed for**: *"A branch may be stale, may conflict, may duplicate
work that arrived by another route, or may reveal on reading that it should not land at all. Any of those
is a good outcome if you name it."* The defect it describes — the demo personalliste printing blank —
**remains open and is not fixed by this refusal.** It needs re-doing against the adopt-aware trunk, not
merging.

## Two premises the landing corrected, which belong in the record

**The class was named for three missing statutory suites, and two of them were already present.**
`MealsDeliveryReceiptSqlServerTests` (3 tests) and `DeliveryReceiptComplianceTests` (11) **are on the
backend trunk**, having arrived via `lane/meals-utlkvit`, which is an ancestor. Only
**`MealsXZCreditSaleTests` is genuinely absent**, sitting on `lane/meals-xz-credit` `25586d86b`, unlanded,
with its lane recorded `verified`. That branch is **outside these six** and was left alone — it is
`L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK`'s subject.

**Five further branches in the same class no longer exist at all** and are somebody else's problem, per the
lane's instruction not to chase them.

## What each landing found on the way, preserved because a merge that is only "green" hides it

- **`vipps-redact-404` +15 tests**, including the exit's trailing-dot deposit link; mutating the unrouted
  branch back to fail-open **reds 6 of 15**.
- **`wf-withheld-bound` +2**; mutating the re-poll guard reds 1 of 2. **Its second `Withheld` site, the
  expiry sweep, reds NOTHING under mutation — that arm is unfalsified by its own two tests.** (Carried into
  `docs/plan/evidence/L-WF-WITHHELD-BOUND/mutation-record.md` so it sits beside the pin it qualifies.)
- **`census-floors-derived` +6**; mutating the derived census to lose one site reds 1 of 44. **Its cleanly
  merged part broke the build**: `GrowthAudit`, added to the trunk after the fork, still passed the
  `KnownFiles` list and three floors the branch deletes — *"verbatim the rot the branch's own comment
  predicts: lanes editing different modules merge without git objecting."* Four counts were removed to fix
  it. The conflict git *did* raise was only stale prose.
- **`wf-idempotency-refusal-rest` +8**; four test conflicts, each side adding different tests around one
  shared method tail, resolved as unions with the tail duplicated. Mutation reds 4. Its
  `WorkforceD1RaceSqlServerTests` passed **2/2, asserted by name from a trx**, Testcontainers building and
  disposing its own container — one SQL lane of the two allowed.

## Method, and what it does not claim

Landed **one at a time**; each `git branch -f` **re-read the trunk in the same command** and refused unless
it still equalled the merge base — reading it at lane start is what had failed before, when two concurrent
backend landings clobbered each other and one merge ended up reachable from no ref. Every branch was checked
against the open decisions before merging. Nothing was pushed.

**No claim here is that any capability is accepted.** These are landings and a refusal. **C5 stands over all
five**: a branch reaching a trunk is not a person completing a journey, and none of the five has been walked.
