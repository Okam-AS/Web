# L-A-FISCAL-LINE-CANNOT-PRINT-AN-UNDEFINED-TENDER — evidence

**Nothing built, nothing landed, nothing pushed.** The exit criterion is **already met at the trunk**,
measured rather than read. `bd77cd6b0` is untouched and still unlanded.

**Base measured against: `976489141`.** The trunk moved to `c4326402c` under me mid-lane (the landing
lane re-landing `24c95aa94`, the credit-note fix dropped in yesterday's race). Every file this lane
measured is **byte-identical** across that move — `PaymentTenderLabels.cs`, `FinalizeService.cs`,
`PrintedTenderNameTests.cs`, `EscPosPaymentLabelTests.cs`, `Enums/PaymentType.cs` — so the findings
hold at the current trunk as stated.

## The exit criterion is already satisfied

> *no undefined PaymentType value can reach a printed fiscal line*

At the trunk it cannot. All three emitters — `EscPosReceiptBuilder`, `EscPosXZReportBuilder` and
`ReceiptService` — route through `Services/PaymentTenderLabels.cs`, whose `default:` returns the
residual word **"Ukjent"**. Not the number, not blank.

Two test classes already pin exactly the undefined case, and they pass at the trunk:

```
--filter "FullyQualifiedName~PrintedTenderNameTests|FullyQualifiedName~EscPosPaymentLabelTests"
Passed! - Failed: 0, Passed: 44, Skipped: 0, Total: 44
```

Both assert `(PaymentType)9999` (`PrintedTenderNameTests.cs:164`, `EscPosPaymentLabelTests.cs:136`).

## Why the brief believed otherwise — and it is nobody's error

`PaymentTenderLabels.cs` **did not exist** at `bd77cd6b0`'s base `8e2b57de8`. It landed afterwards, in
`bcc8bd179` *"The printed receipt names its tender on both emitters"*.

So the branch's own header comment —

> `(PaymentType)999` rendered `"999                       125,00"`

— is a **true statement about its base and a false one about the trunk**. The ranking lane read the
branch from its diff against that base, which is precisely the failure mode the brief warned about:
a diff establishes what a branch changes, not that the defect is still live.

## What IS still open, and it is a different exposure

The **journal write** is unguarded. Applying the branch's own test file to the trunk's `FinalizeService`:

```
--filter "FullyQualifiedName~FinalizeDefinedTenderTests"
Failed! - Failed: 6, Passed: 1, Total: 7
```

**Five of those six are genuine behaviour**; the sixth is not, and the difference matters to whoever
lands this. `CardSale_WithNotSet_IsStillRefused` fails only on wording:

```
Not found: requires the payment type
In value:  A card finalize requires the provider payment type.
```

The trunk **already refuses** `NotSet` on that path — the branch merely rephrases the message, and its
assertion is written against the new phrasing. That arm is a message coupling, not a defect.

The real exposure is narrower than the brief's and worth stating exactly: `JournalPaymentLine` is
**append-only** and its `PaymentType` is persisted through `EnumToStringConverter`
(`ApplicationDbContext.cs:4323`), so an undefined value would be stored as the bare string `"999"` in a
row that can never be repaired — while the *printed* line for the same sale correctly says "Ukjent".
The document and the record would disagree.

## Boundary or printer — the answer the brief asked for

**The trunk refuses at the printer; the branch guards at the journal writer; neither is the HTTP bind,
and after tracing it, the HTTP bind is not where this needs guarding.**

The printer's choice is deliberate and documented in `PaymentTenderLabels.cs`, and it argues *against*
the brief's instruction with a reason I think is right: by the time a tender reaches a receipt the sale
is settled and journalled, so refusing to render *"would not un-sell it. It would instead make a
legally required document unproducible at the moment it is demanded"* — the wrong side of C6. `"Ukjent
42,37"` discloses the amount and admits the tender is unknown; a receipt that fails to print discloses
nothing. **A visible residual is not a silent default**, which is the harm the brief names.

The branch guards the three `new JournalPaymentLine` sites — the whole class, verified by counting
them at the trunk (`FinalizeService.cs:222`, `:501`, `:637`) against the branch's four
`RequireDefinedTender` call sites. **No "one of four" gap.**

Its rationale for not guarding the request DTOs is **correct, and I checked rather than accepted it**:
`FinalizeReturnRequest` appears in `PosController` twice, which looks like binding — but both are
`new FinalizeReturnRequest { … }` constructions. The controller binds its *own* types
(`CashRefundRequest`, `CompanyAccountRefundRequest`, `UnreferencedCashReturnRequest`) and maps across.
No model binder ever fills the finalize DTOs, so a guard there would gate nothing.

## Reachability: defence-in-depth, not a live exploit

Traced every caller of the guarded sites:

| caller | tender passed |
|---|---|
| `PosController:713` referenced return | `PaymentType.Cash` — literal |
| `PosController:800` company-account return | `PaymentType.CompanyAccount` — literal |
| `PosController:868` unreferenced return | `PaymentType.Cash` — literal |
| `PosSettlementService:386` | `request.PaymentType`, gated by `IsTerminalPayment()` |
| `TerminalPaymentOrchestrator:1093/:1142` | `tx.PaymentType` from a persisted transaction |

`IsTerminalPayment()` is `== DinteroTerminal \|\| == SurfboardTerminal` — two defined members — so an
undefined value fails the gate and never reaches that write.

**So no current HTTP path can deliver an undefined tender to a journal line.** The branch is
defence-in-depth on an append-only, legally significant write, not a repair of a live leak. That is a
good reason to land it and a bad reason to call it urgent, and the difference should be recorded rather
than blurred.

## What else takes the same cast unguarded

Named as the brief asked. Neither is a fiscal document, so neither is this lane's objective:

- `Controllers/DinteroController.cs:729` — `order.PaymentType.ToString()` into a provider payload; an
  undefined value would serialise as `"999"` to Dintero.
- The `EnumToStringConverter` mapping itself — any entity carrying a `PaymentType` persists an
  undefined value as its decimal string.

## Recommendation

**`bd77cd6b0` is still worth landing, on a corrected rationale**: not *"an undefined tender reaches a
printed fiscal line"* (it does not, and has not since `bcc8bd179`), but *"an undefined tender can be
journalled into an append-only row that no later repair can reach"*. It does **not** touch
`PaymentTenderLabels`, so unlike the sibling case it would not break the deliberate "Ukjent" decision —
I checked its diff for that specifically.

Whoever lands it must reconcile one arm: `CardSale_WithNotSet_IsStillRefused` asserts a message the
trunk does not use. Either keep the branch's rephrasing (the message changes, the behaviour does not)
or relax the assertion.

## Decision check

Made before touching anything, via each open decision's `blocks:` field. Sixteen are open; none names
this lane, `FinalizeService`, or the tender-label surface.

## Teardown

One throwaway worktree, created with `git worktree add --detach` and removed with `rm -rf` plus
`git worktree prune`. Both tier-rewritten artifacts restored. No worktree holds any trunk; no trunk was
moved; `bd77cd6b0` is untouched and unlanded; nothing pushed.
