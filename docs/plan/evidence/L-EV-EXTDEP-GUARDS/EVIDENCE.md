# L-EV-EXTDEP-GUARDS — evidence

Lane branch `lane/ev-extdep-guards`, worktree `/Users/svendaneel/okam/wt-evextguards`.

**Base deviation, stated up front.** The brief says "worktree off `feature/restaurant-modules`". The
code these residuals are about does not exist there: `lane/ev-extdep` (7e9c38bf) is unmerged, and
`feature/restaurant-modules` (24dec838) has no `RecordExternalAsync` and no external-deposit route.
This lane is therefore branched off `lane/ev-extdep`, which is itself off `feature/restaurant-modules`
at d458e1cf. Committed locally, not pushed. No SQL tier run; no container touched.

## 1. A deposit stamped with a date nobody chose

`RecordExternalAsync` refused a FUTURE received date and nothing else, and
`EventsExternalDepositRecordRequest.ReceivedAtUtc` was a non-nullable `DateTime` — so a body omitting
the field bound to `default` and the row was written with **0001-01-01** as `PaidAtUtc`, on an
append-only, uncorrectable money row.

The defect, observed rather than argued (throwaway probe, deleted after the run):

```
Failed WebApi.Tests.Events.TempEpochProbe.What_a_body_omitting_the_received_date_stamps_today
  Assert.NotEqual() Failure
  Expected: Not 0001-01-01T00:00:00.0000000
  Actual:   0001-01-01T00:00:00.0000000
```

**Fix.** `ReceivedAtUtc` is now `DateTime?`, so an omitted field is distinguishable from a stated one,
and the service refuses null *and* the .NET epoch before any read. Not defaulted to `now`: the
attestation is about when the money arrived, and substituting submission time invents the figure this
route refuses to invent everywhere else.

**A floor at the event's own creation was considered and rejected.** It would catch every foreign
epoch (a client sending `1970-01-01`) rather than only .NET's, which is a real gain. It was rejected
because it refuses a real case with no other route: a venue that agrees a booking by phone, takes the
transfer, and enters the whole booking afterwards would be permanently unable to record its own
deposit — `EventsEvent.CreatedAtUtc` is not something staff can backdate. And that date, wrong-looking
as it is, was *chosen* by a person the receipt names, which is exactly the property the epoch lacks
and the only one this guard can honestly test for. Residual, stated: a malformed client sending Unix
epoch still writes a nonsense-but-chosen instant. Distinguishing "nobody chose a date" from "somebody
chose a wrong one" is mechanically possible; distinguishing the second from a legitimate backdate is
not.

Red (before the fix), driven through the real Newtonsoft binding rather than a C# default, because the
defect *is* the wire behaviour:

```
Failed EventsExternalDepositTests.A_body_that_states_no_received_date_is_refused_rather_than_stamped_with_the_epoch
  (both InlineData cases: omitted field, and an explicit "0001-01-01T00:00:00")
  Assert.Throws() Failure
```

Green after: 2/2.

## 2. The rail partition, below the reading of it

`EventsPaymentLedger.GuardTruthSource` is the only thing that keeps attestation receipts off rail
deposits and provider-truth receipts off external ones. Nothing under the application enforces it —
there is no CHECK constraint tying `Kind` to `PaymentType` — so the partition holds exactly as far as
"every receipt goes through `Record`" holds. `ModuleActorStampPin` explicitly leaves this uncovered:
its single `ActorWriter` is `EventsStateTransition`, and its own remark says the receipt's choke point
"is held by its own tests" — which did not exist.

New: `WebApi.Tests/Events/EventsPaymentReceiptWriterCallSiteTests.cs`, four facts, scope **derived**
(every production file mentioning `EventsPaymentReceipt`) in the idiom of
`Kassa/QueryFilterCallSiteTests` and `Modules/ModuleAuditActorCallSiteTests` — never a path list.

| Fact | Rule |
| --- | --- |
| `Only_the_ledger_materializes_a_payment_receipt` | `new EventsPaymentReceipt` outside `EventsPaymentLedger.cs` |
| `Every_receipt_handed_to_the_context_is_one_the_ledger_authored` | an `EventsPaymentReceipts.Add(` whose argument is not `EventsPaymentLedger.Record(` — the ledger RETURNS its row for the caller to add, so the `Add` is the surface to constrain |
| `No_statement_writes_the_receipt_trail_around_the_change_tracker` | `FromSql`/`ExecuteSql`/`ExecuteUpdate`/`ExecuteDelete` naming the table — those bypass `Record`, `GuardAppendOnly` and the trigger alike |
| `The_derived_scope_still_reaches_every_writer_of_the_trail` | the scope has not rotted to nothing |

**Red-then-green.** One plant, `_context.EventsPaymentReceipts.Add(new EventsPaymentReceipt { … });`
in `EventsSettlementService`, trips both rules with the file and line:

```
Only Services/Events/EventsPaymentLedger.cs may construct an EventsPaymentReceipt. …
  Services/Events/EventsSettlementService.cs:443

A receipt added to EventsPaymentReceipts must be the row EventsPaymentLedger.Record returned. …
  Services/Events/EventsSettlementService.cs:443: EventsPaymentReceipts.Add(new EventsPaymentReceipt { DepositId = paidDeposit.Id }); …
```

Second mutation, rotting the scope marker to a name nothing mentions — the failure mode a derived
scope exists to remove:

```
Failed …The_derived_scope_still_reaches_every_writer_of_the_trail
  Only 0 production files mention EventsPaymentReceiptRenamed.
```

and the other three passed **vacuously** in that run, which is the whole reason the fourth fact is
there. Restored, 4/4 green.

## 3. The completion sink's empty-reference guard

`ResolveDepositAsync` compares the reference to four nullable columns, so EF compiles a null one into
`IS NULL` and a blank delivery matches every deposit carrying no provider reference — every externally
received row, and every rail row whose intent transaction committed before its provider object existed
(`ReserveProviderReference` mints one for Vipps only, so a Stripe/Dintero deposit sits `Requested`
with all four null; the world seeds exactly that row). The guard carried no comment at all; it now
states this.

**The trap the brief named, avoided.** A recorded deposit is `Paid` with an `ExternalRecorded` receipt,
and `EventsDepositPaid.PaidTruthKinds` counts that kind — so `HandleCompletedAsync`'s idempotent-replay
branch no-ops on it whether or not the guard exists, and `HandleProviderFailureAsync` returns early on
any non-collecting row. A pin asserting only "the external row is untouched" is green for the wrong
reason and proves nothing. The new test therefore also asserts the world's **collection-path** deposit
is untouched, and fixes the resolution order so which row a blank delivery would land on is not a
tie-break.

Mutation — the guard deleted:

```
Failed …A_delivery_that_names_no_provider_reference_resolves_no_deposit(providerReference: null)
  System.InvalidOperationException : The payment port's GetStatus was called on a path that must
  never reach a provider …
    at EventsDepositCompletionSink.CaptureIfNeededAsync
    at EventsDepositCompletionSink.PromoteAsync
    at EventsDepositCompletionSink.HandleCompletedAsync
```

i.e. a null delivery resolved a live collection-path deposit and began promoting it. Stated honestly:
the `""` case stayed GREEN under that mutation — an empty string compares as `= ''` and matches no
NULL column — so null is the case carrying the proof. Blank is pinned anyway, because a later
resolution normalising blank to null would inherit the null case's exposure with nothing else
noticing; the test says so.

## Suites

Fast tier only (`--filter "Database!=SqlServer"`), full test project:

```
Passed! - Failed: 0, Passed: 4324, Skipped: 10, Total: 4334, Duration: 5 m 20 s
```

Events + Modules subset after the fix: 636 passed, 2 skipped (pre-existing), 0 failed.
Every mutation ran against a freshly compiled assembly (no `--no-build` after an edit) and every
restore was a `cp` + `touch`, per the stale-binary trap in CLAUDE.md.

## Not done, deliberately

- **No migration.** `EventsPaymentReceipt`/`EventsDeposit` schema is untouched; `ReceivedAtUtc` is a
  request DTO property, not a column. `PaidAtUtc` was already `DateTime?`.
- **No SQL-tier run** — another lane holds the slot. Both new pins are provider-independent (source
  analysis, and SQLite behaviour that matches SQL Server's NULL semantics for the resolution).
- **No spec edit.** `40-events-spec.md:206` already documents the four body fields as "all required";
  that claim was false for `receivedAtUtc` and is now true.
