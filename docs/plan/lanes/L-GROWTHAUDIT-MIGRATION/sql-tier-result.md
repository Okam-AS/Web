# The SQL tier at the composed stack, with MIG-29 — 22 failures to 1

```
BASELINE  integration/mig-stack-merge @ 24cd4ead   565 passed /  22 failed / 587   51 m 25 s
LANE      7f8945dc + 20260806125642_Growth_AuditLedger
                                                    593 passed /   1 failed / 594   40 m 54 s
```

- baseline trx: `lanes/L-MIG-STACK-MERGE/trx/24cd4ead-sql-tier.trx` (committed by the merge lane)
- lane trx: `docs/plan/lanes/L-GROWTHAUDIT-MIGRATION/trx/lane-mig29-sql-tier.trx`
- selector, both runs: `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database=SqlServer"`, never
  `--no-build`

The two trx files were diffed test-by-test, not compared by their counters.

## Cured: 21 — every one of them, and nothing else

| group | count |
| --- | --- |
| `Has_no_pending_model_changes` / `…_is_on_the_certified_chain_and_has_no_pending_changes` — the forked-parent detector, Events ×3, Growth ×2, Margin ×1, Meals ×3, Training ×2, Workforce ×4 | **15** |
| `System.InvalidOperationException : Sequence contains no elements` from `GrowthDispatchService.CreateOrGetRunAsync` — GrowthDispatchLinearization ×2, GrowthDispatchRetryStrategy ×2, GrowthProviderClientKeyIdempotency ×2 | **6** |

## Still failing: 1 — and it is not this lane's

```
WebApi.Tests.Workforce.SchedulePublishSqlServerTests
    .Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically
    Assert.Equal() Failure   Expected: 1   Actual: 2
```

One publish writes two `WorkforceNotificationOutbox` rows while the publication, recipient and inbox
assertions above it all pass. That is `L-PUBLISH-WRITES-ONE-OUTBOX-ROW`'s, was not touched here, and is
byte-identical to `feature/restaurant-modules`.

## Newly failing: 0

## The count moved from 587 to 594, and here is every unit of the difference

| delta | test | outcome |
| --- | --- | --- |
| **+7** | `GrowthAuditLedgerAppendOnlySqlServerTests` — the chain-built catalog read and the layer-2 refusal probes | **all 7 passed** |
| +1 / −1 | `GrowthDispatchMigrationLineageTests.All_eleven_growth_w2_tables_are_created_and_the_full_growth_surface_is_…` renamed `nineteen_tables` → `twenty_tables` | passed before, passes now |

`587 + 7 = 594`. No test was deleted, disabled, skipped or moved out of the tier; `Skipped` is 0 in both
runs.

## The correction this measurement settles

The exit as first written expected **2** survivors. Measured, it is **1**, and the reason is arithmetic
rather than luck. The merge lane's summary read "15 `HasPendingModelChanges` + 5 dispatch = 20 of 22", which
undercounts the dispatch group; parsing every `Failed` result out of the baseline trx gives **15 + 6 + 1 =
22**, so the absent table caused **21** and the outbox row is the only other cause. All six dispatch reds
are cured by the table existing, because the `DbUpdateException` their `catch` block was swallowing is the
one the missing table raised.

**That does not retire `L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE`; it sharpens it.** The untyped
`catch (DbUpdateException)` in `GrowthDispatchService.CreateOrGetRunAsync` and
`GrowthConsentTextService.PublishAsync` is still there and will still misreport any future
`DbUpdateException` that is not the unique-key race it assumes. What changed is that **after this migration
no test in the tier points at it any more** — the defect went from loudly red to silent. A lane whose
evidence was "these six are red" now has to argue from the code.
