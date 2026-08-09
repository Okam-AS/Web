# WB3 and TR-B4 — built from the specification (2026-08-09)

Lane: L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE. Backend tip `6d5328004`, built in a
detached worktree (the coordinator's uncommitted competency-seam files live in the main checkout, not
here, so this worktree is `6d5328004` + the one new WB3 test). The `:5091` demo API was not touched.

## WB3 — daily-rest boundary and DST cases: **BUILT**

New file `WebApi.Tests/Workforce/DailyRestBoundaryAndDstTests.cs` — four unit arms driving the public
`WorkforceRuleEvaluator.Evaluate(...)` directly with hand-built `WorkforceShiftAssignment`s: no host, no
database, minute-precise (the 10h59m edge cannot be expressed by the integer-hour schedule fixture the
existing tests use).

| arm | shifts (UTC) | asserts | measured |
|---|---|---|---|
| `Exactly_eleven_hours_of_rest_is_allowed_the_boundary_is_inclusive` | 22:00 → next 09:00 = 11.0h | `pass`/`info` — the boundary is inclusive | pass |
| `One_minute_short_of_eleven_hours_is_warned` | 22:00 → next 08:59 = 10h59m | `warn`/`advice` | pass |
| `Rest_is_measured_across_midnight_not_reset_by_the_calendar_day` | 23:30 → next 09:30 = 10h | `warn`, `minRestHours=10` | pass |
| `Eleven_local_hours_across_the_spring_forward_is_ten_actual_hours_and_is_warned` | 28 Mar 22:00Z (23:00 Oslo CET) → 29 Mar 08:00Z (10:00 Oslo CEST) | `warn`, `minRestHours=10` — **the rule measures actual rest, not wall-clock** | pass |

The DST arm is the one worth the lane: eleven *local* hours across Oslo's 29 March spring-forward is only
**ten actual hours** (an hour is skipped), and the rule warns on the ten a worker was truly off — the
difference between a compliance check and a clock display.

**Evidence, named from a trx with executed counts:**
- Baseline `wb3-baseline.trx`: total 4 / executed 4 / **passed 4 / failed 0**.
- Named redding mutation — `worst.Value >= thresholdHours.Value` → `>` at
  `WorkforceRuleEvaluator.cs:151` (the DailyRest `pass` line; the brief said :152) — `wb3-mutated.trx`:
  total 4 / **executed 4** / passed 3 / **failed 1**, the one failure being
  `Exactly_eleven_hours_of_rest_is_allowed_the_boundary_is_inclusive` and nothing else. Executed count
  unchanged at 4, so it is a kill and not a void run. Restored byte-equal to HEAD; re-run 4/4 green.

## TR-B4 — read-only evidence pack: **already built (premise moved)**

The brief's premise ("the audit ledger has no read path at all") is false at `6d5328004`. My earlier
"TR-B4 open" was a false negative — I grepped a non-existent path glob (`Controllers/Training/*.cs`)
rather than `Controllers/TrainingController.cs`. At the tip the whole row exists:
- **Endpoint**: `TrainingController.cs:383` `[HttpGet("evidence")]`, requires `personRef`, calls
  `_evidence.GetEvidenceAsync(User, storeId, personRef, …)`.
- **Projection**: `Services/Training/TrainingEvidenceService.cs` + `TrainingEvidenceProjection.cs`, the
  latter carrying the chain-verification result (`ClassifyContentHashLinkage` → Intact/Broken/Unresolvable,
  `CombineContentHashLinkage`).
- **Golden**: `WebApi.Tests/Training/TrainingInspectorEvidencePackTests.cs:66`
  (`Evidence_pack_golden_for_a_person_trained_through_the_production_write_paths`) — a full golden string
  including a `chain-verification:` block with a `verdict`.
- Landed by `e8f06833f` "Training: the verdict is the server's, and an expiry is a date" (the same commit
  that moved TR-B1 and TR-B3).

**A finding that outranks the row, because the brief's redding mutation assumes the opposite of the
shipped design.** The brief says: "extend `TrainingAppendOnlyGuardTests` so a tampered audit row is caught
by the chain-verification result — mutate the verifier to accept a broken chain and the pin reds." But
the pack already has that pin, and it asserts the **reverse**:
`TrainingInspectorEvidencePackTests.cs:354` `A_tamper_that_bypasses_the_append_only_guard_leaves_no_trace_in_the_pack`
— the pack **shows the tampered number** and the golden's own verdict is `NOT-VERIFIABLE`, with the
projection commenting that content-hash linkage "is the one tamper the evidence read can detect on its
own." The deliberate design is that **the database's append-only guard, not the pack's chain check, is the
defense against a tampered row** — so a mutation making the pack "catch" that tamper would contradict the
shipped, tested behaviour. Building it would break a green pin, not add one. **fail-spec for TR-B4.**

C6: TR-B4 is read-only and names `bokføringsforskriften`/internkontroll only where the endpoint produces
the pack the provision requires; the existing tests cover that. Inspector acceptance is a later human
sign-off and is not claimed here.

## Tier at the composed tip

<!-- TIER -->

## Verdict

WB3 built to the full standard (an arm that reds under an applied-and-restored named mutation, from a trx
with an executed count). TR-B4's premise has moved — the row is already built, and its tamper-detection
pin asserts the opposite of the brief's mutation, so building against it would break green tests. The lane
delivers WB3 and records TR-B4 as moved.
