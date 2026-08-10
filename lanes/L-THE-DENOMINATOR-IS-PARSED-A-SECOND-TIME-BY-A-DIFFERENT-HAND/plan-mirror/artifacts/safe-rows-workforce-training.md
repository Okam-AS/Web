# Safe benchmark rows — premise verification at the tip, per row (2026-08-09)

Lane: L-THE-SAFE-BENCHMARK-ROWS-ARE-BUILT-WORKFORCE-AND-TRAINING. Backend tip `6d5328004`. The brief
warned "four have moved tonight"; verified at the tip, **exactly four of the six assigned rows have
moved** — their defects fixed or their features already built — and the triage
(`docs/plans/PROOF-BENCHMARKS.md`, dated Jul 30) is stale against the tip for those four. The two
genuinely open rows are named with their exact build and redding arm, unbuilt this pass (see the
verdict note). No production source was edited; the demo API on `:5091` was not touched.

## Per-row verification

| row | triage premise | at `6d5328004` | ruling |
|---|---|---|---|
| **TR-B1** (pin only) | VERIFIED-RED: `Passed = request.Passed` on an append-only table; threshold never compared | **FIXED**: `TrainingCompletionService.cs:202` = `Passed = TrainingGrading.IsPass(request.ScorePercent, version.PassThresholdPercent)` — derived server-side. Fixed by `e8f06833f` "Training: the verdict is the server's, and an expiry is a date", which also adds `TrainingGrading.cs` and `TrainingDerivedVerdictTests.cs` (325 lines). | **fail-spec** — a red pin of a verified defect is impossible when the defect is gone and already pinned green |
| **TR-B3** (pin only) | VERIFIED-RED: cert expiry compared against a bare **UTC** horizon, zero `IStoreTimeZoneResolver` usage; Oslo cert reported expired up to 2h early in summer | **FIXED**: `TrainingCertificateService.cs` now routes through the zone resolver — `KassaBusinessDate.ExpiryHorizonDate(now, withinDays, zone.TimeZone)` + `MidnightUtcOf(horizon.AddDays(1))`. Same commit `e8f06833f` (79-line rewrite) + `TrainingCertificateExpiryProjectionTests.cs`. | **fail-spec** — the timezone defect the controlled-clock pin would red no longer exists |
| **WB4** | Extend `WorkerProfileIsolationTests` with a cross-store opaque-404 pin | **BUILT** (and the triage itself corrected the premise to `ScheduleTenantIsolationTests`): that class exists **4/4**, incl. `Validating_another_stores_revision_is_the_same_answer_as_validating_an_absent_one` and `Publishing_another_stores_revision_is_refused_and_leaks_nothing` — the opaque-404/no-oracle pin | **fail-spec** — the pin this row asks for is already present |
| **WB5** (endpoints 39-42) | PARTIAL: `WorkforceMeController` has 10 routes; endpoints 39-42 (open-assignments, exchanges, award) missing and nothing calls them | **BUILT**: `WorkforceMeController.cs` now has 14 routes incl. `GET open-assignments` (:293), `POST open-assignments/{id}/requests` (:312), `POST exchanges` (:333), `POST exchanges/{id}/decisions` (:361) | **fail-spec (build part)** — the endpoints exist; see the residuals below |
| **WB3** | New boundary + DST cases on the green `DailyRest` evaluator | **OPEN**: `NorwayWorkTimePolicyTests` has 4 general arms; the specific 11:00-exact / 10:59 boundary and across-midnight / 23-hour-DST-day cases are absent | **open, unbuilt this pass** |
| **TR-B4** | Read-only evidence-pack endpoint `GET training/stores/{storeId}/evidence?personRef=` + golden | **OPEN**: `TrainingController` has no `evidence` route; the audit ledger has no read path | **open, unbuilt this pass** |

## The two genuinely open rows — exact build and redding arm (for the next pass)

**WB3 — boundary + DST cases on `WorkforceRuleEvaluator.DailyRest`.** The rule (`:115-157`) computes
`gap = (StartsUtc − prev.EndsUtc).TotalHours` and `pass = worst >= thresholdHours`. New unit arms on
that green evaluator, no host boot:
- threshold 11h, two shifts with an exactly-11h UTC gap → `Pass`/`info`; a 10h59m gap → `Warn`/`advice`.
- an across-midnight gap (ends 23:30Z, next starts 09:30Z = 10h) → `Warn` at threshold 11.
- a 23-hour-DST-day case fed as the UTC elapsed it truly is (11 local hours across spring-forward = 10
  actual hours) → `Warn`, pinning that the rule measures *actual* rest, not wall-clock.
- **redding arm**: mutate `worst.Value >= thresholdHours.Value` → `>` (`WorkforceRuleEvaluator.cs:152`);
  the exactly-11h arm flips `Pass`→`Warn` and reds. Applied-and-restored, named, from a trx.

**TR-B4 — read-only evidence-pack endpoint + golden.** `GET training/stores/{storeId}/evidence?personRef=`
returning per person: validated `PersonRef` + Workforce display name (caller-identity seam), completions
(`courseId`/title/`versionNo`/`ContentHash`/`PassThresholdPercent`/`ScorePercent`/`Passed`/`Source`/
recordedBy/recordedAt store-local), certificates, and the `TrainingAuditEvents` chain for those rows +
a chain-verification result. Read-only (safe). A committed golden fixture of the pack. **redding arm**:
extend `TrainingAppendOnlyGuardTests` — a tampered audit row is detected by the chain-verification result
(mutate the verifier to accept a broken chain → the pin reds). Inspector acceptance is a **later human
sign-off**, explicitly not claimable here.

## Verdict note

`fail-spec` for the lane: four of the six assigned rows have moved (evidenced above), which contradicts
the brief's framing of them as defective/unbuilt rows to build against. The two open rows (WB3, TR-B4)
are buildable but were **not** completed to the exit standard (an arm that reds under an
applied-and-restored mutation, from a trx with an executed count, non-SQL tier green) this pass: the
host was at load ~66 (tiers cannot run under the below-13 gate) and shipping an unexecuted assertion
would break the very rule this program has enforced all night. They are specified above so the next
pass is a direct build, not a re-triage.
