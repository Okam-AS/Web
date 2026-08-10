# L-GR-DISPATCH-ACTOR — declined again, and why the exit must not be built toward

**Reason shape: (4) the exit names something that is not in the estate**, compounded by (5) one of three
parts shown. **This lane is not closed and must not be.** It needs an owner ruling, not an artifact and not
a rewritten exit.

## The evidence line as the lane recorded it, preserved before anything overwrites it

```
evidence: lane/gr-dispatch-actor@a1e2655f (worktree /Users/svendaneel/okam/wt-gr-dispatch-actor); detail in lanes/L-GR-DISPATCH-ACTOR/detail.md
```

## The exit, split into its three named subjects

> **the newsletter dispatch**, **the margin statement and its spend entries**, and **a push publication
> record** each resolve and record the actor that caused them, asserted by value at the wire tier

| subject | verdict | measured at |
|---|---|---|
| newsletter dispatch | **PROVEN — at the wire, by value** | `WebApi.Tests/Wire/GrowthDispatchActorWireTests.cs` |
| margin statement + its spend entries | **THE ACTOR IS NOT IN THE ESTATE** | `Entities/Margin/*`, `Services/Margin/MarginStatementService.cs`, `Controllers/MarginStatementsController.cs` |
| push publication record | **RESOLVED AND RECORDED, BUT PINNED NOWHERE AT THE WIRE** | `Services/Workforce/WorkforceSchedulePublishService.cs:299` |

Everything below is measured against the backend trunk `6d5328004` by `git show`/`git grep` **at that
revision**, never against the working tree — a sibling agent holds uncommitted work in that checkout.

## Subject 1 — the newsletter dispatch: genuinely done

`lanes/L-GR-DISPATCH-ACTOR/detail.md` is thorough and it is about this and only this: five mutations, three
principals, by-value assertions. Its wire facts are
`The_ledger_names_the_administrator_who_dispatched_and_not_the_one_who_approved` (`:67`),
`A_second_administrator_re_requesting_the_same_send_is_recorded_under_their_own_name` (`:110`),
`A_dispatch_refused_for_want_of_an_approval_names_nobody_because_nothing_was_sent` (`:147`),
`An_unnameable_caller_is_stopped_by_the_bearer_handler_before_the_module_is_reached` (`:180`). M4 —
the controller passing a constant instead of `RequireUserId()` — reds 2, which is what makes "by value"
mean something. The strings `Margin`, `statement`, `spend`, `publication`, `push` and `Workforce` **do not
occur anywhere in that file**, nor in the RETURN.

The lane's single commit `a1e2655f3` touches 19 files: the Growth controller, `GrowthDispatchService`,
`GrowthAuditAllowlist`, `GrowthAuditEventTypes`, eleven Growth tests, `ModuleActorStampPin.cs`,
`GrowthDispatchActorWireTests.cs`, `GrowthWireSeed.cs` and a ledger doc. **No file under `Entities/Margin`,
`Services/Margin`, `Entities/Workforce`, `Services/Workforce`, `WebApi.Tests/Margin` or
`WebApi.Tests/Workforce`.** One subject of three was built, and the lane never claimed otherwise.

## Subject 2 — the margin statement: the exit asks for a column that does not exist

This is the finding, and it is why an artifact cannot close this lane.

- `Entities/Margin/MarginPeriodStatement.cs` — 22 columns, enumerated: `StatementId, StoreId, PeriodStart,
  PeriodEnd, RevisionNumber, PreviousStatementId, State, NetFoodSalesMinor,
  TheoreticalIngredientCostMinor, ActualPurchaseSpendMinor, OpeningStockValueMinor,
  ClosingStockValueMinor, TheoreticalFoodCostPercent, ActualFoodCostPercent, GapPercentagePoints,
  CoveragePercent, ProjectionWatermark, InputReceiptJson, CalculationTimestampUtc, FinalizedAtUtc,
  ConcurrencyVersion, CreatedAtUtc`. **No actor column of any kind.** `FinalizedAtUtc` records *when* a
  statement was finalized; nothing records *who*.
- `Entities/Margin/MarginPurchaseSpendEntry.cs` — `Id, StoreId, StatementId, SpendDate, SupplierId,
  AmountMinor, Currency, Note, ConcurrencyVersion, CreatedAtUtc`. **No actor column.**
- `Services/Margin/MarginStatementService.cs` — the tokens `userId`, `UserId`, `CreatedBy`, `PerformedBy`,
  `actor` and `Actor` return **zero hits in the whole file**. `CreateAsync` (`:173`), `SetInputsAsync`
  (`:232`), `RecalculateAsync` (`:295`) and `FinalizeAsync` take **no caller parameter at all**.
- `Controllers/MarginStatementsController.cs` — the four mutating actions at `:54`, `:62`, `:66`, `:70`
  pass only `(storeId, …, ifMatch, ct)`. The gate at `:120` `EnsureStatementsAccessibleAsync` checks module
  and stage flags and StoreAdmin membership **and then discards the principal**. The caller's identity is
  never resolved on this surface.
- **There is no Margin audit ledger**: `git grep -l "MarginAudit" 6d5328004` returns nothing. Growth's
  subject was closable because `GrowthAudit*` existed to write into; Margin has no such thing.
- The spend entries are **delete-and-reinsert on every edit** (`MarginStatementService.cs:267`
  `RemoveRange(existing)`, reinsert at `:271-284`), so even `CreatedAtUtc` is not stable per-line
  provenance.
- The estate states this as *deliberate*, not as an oversight — `WebApi.Tests/Modules/ModuleActorStampPin.cs:182-192`:

  > `/// Margin's whole human-attribution surface is one column: who uploaded the price-import batch that`
  > `/// rewrote a store's cost prices.`
  > `Stamps: new[] { new ActorStamp("MarginPriceImportBatch", "UploadedByReference") },`

  Margin's only two actor columns anywhere are `MarginPriceImportBatch.UploadedByReference` /
  `ApprovedByReference` and `MarginWasteEntry.RecordedByActorReference` — **neither on the statement path**.

**There is nothing on disk that a wire test could assert by value.** Closing this subject is not writing a
test; it is a schema change plus a write path plus, on any real database, **a migration** — which puts it
squarely under **C2** (one migration author at a time, the chain is the truth) and outside a verification
lane's boundary. Building toward the exit here would mean authoring the attribution and then asserting it,
which is the failure this program exists to prevent.

**This also makes the exit's own premise questionable and that belongs to the owner.** The lane body says
the weekly margin figure "an accountant books from has no attributable author" — true — but **C4** names the
money-path writes it governs (deposit, capture, refund, settlement or statement line, funded order,
timesheet cost). Whether a Margin *period statement* is a C4 money-path write, or an internal management
figure that is not, is a ruling, and the answer decides whether this subject is a defect to fix or a scope
error in the exit. **It is not mine to make.**

## Subject 3 — the push publication record: real, resolved, and unasserted

Unlike subject 2, the code here is already correct — it is only unpinned:

- `Entities/Workforce/WorkforceSchedulePublication.cs:38` — `public string PublishedByActorReference { get; set; }`.
- Written at `Services/Workforce/WorkforceSchedulePublishService.cs:299` —
  `PublishedByActorReference = caller.StaffMemberId.ToString(),`.
- Resolved, not ambient: `Controllers/WorkforceSchedulesController.cs:192` passes `CurrentUserId()` into
  `PublishAsync`, which at `:75` calls `RequireWriteCapabilityAsync(userId, storeId, WorkforceManager, …)`
  to obtain `caller`. The audit twin is at `:414-417` (`ActorReference`, `Action = "schedule.publish"`).
- **But no wire test drives the publish route at all.** `git grep -i "publish" 6d5328004 --
  WebApi.Tests/Wire/WorkforceWireTests.cs` returns nothing; the four occurrences of
  `PublishedByActorReference` under `WebApi.Tests/**` are **seed literals**
  (`ScheduleExternalCommitmentsTests.cs:209,522`, `WorkAssignmentOverlapInvariantTests.cs:327`,
  `WorkforceScheduleConvergenceTests.cs:231`), never assertions. `"schedule.publish"` is asserted only as a
  name and a count at the fast and SQL tiers (`ScheduleAuditLedgerTests.cs:43,47`,
  `SchedulePublishSqlServerTests.cs:61,93`).
- One nuance a reader should carry: the row the push actually travels on,
  `Entities/Workforce/WorkforceNotificationOutbox.cs`, carries **no actor column** — the actor is reachable
  only by joining back to the publication. And
  `Entities/Workforce/WorkforceSchedulePublicationReceipt.cs` carries `StaffMemberId`, which is the
  **recipient**, not the causing actor. So "a push publication record names its actor" is true of the
  publication and false of the outbox row, and the exit does not say which it means.

This subject is closable by a wire test against existing code. Subject 2 is not.

## What is owed, and to whom

1. **An owner ruling** on whether the Margin period statement and its spend entries are inside C4 at all.
   If yes, this is a build lane (schema + write path + migration under C2), not a verification lane.
2. If the ruling is that they are, **the exit should be split**, because one exit that conjoins a done
   subject, a test-only subject and a not-yet-built subject can never be honestly verified as a whole.
3. Until then `L-GR-DISPATCH-ACTOR` stays `built-unverified`. **One of three subjects is proven** — which is
   real work, correctly recorded in `lanes/L-GR-DISPATCH-ACTOR/detail.md`, and should not be lost when the
   exit is re-ruled.
