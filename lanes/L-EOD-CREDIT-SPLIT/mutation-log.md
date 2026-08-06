# L-EOD-CREDIT-SPLIT - mutation log

The Dagsoppgjor separates kredittsal from the day's takings, pinned by tests that red if a
company-account payment returns to the `default` arm. Every claim below was watched RED against a
deliberate mutation and watched GREEN again after restore. No mutant survived.

**The defect.** `EodService.ProjectPaymentTotalsAsync` bucketed by payment medium with a `default:`
arm, and `PaymentType.CompanyAccount` is neither `Cash` nor a terminal, so a company-account payment
fell into `OtherTotal` and printed as **"Annet"**. The day settlement therefore reported **a
receivable as money received** - on the same close where the X and Z now correctly separate
`KREDITTSALG` from `Sum mottatt`. Two documents from one close, disagreeing about whether the venue
was paid, and the operator reads the one that is wrong.

## Where

| | value |
|---|---|
| branch | `lane/eod-credit-split` (created by this lane) |
| worktree | `/Users/svendaneel/okam/wt-eodcredit` (created by this lane) |
| base | `9cbe2b93` = `lane/xz-printed-defects` |
| commit | `f028c0a8` |
| ancestry | `f028c0a8` is a descendant of `9bdfc267` **and** `569887a5` **and** `ca2570ac` **and** `9cbe2b93`, each verified with `git merge-base --is-ancestor` |

The base was **verified, not assumed**: `lane/xz-printed-defects` was found at `9cbe2b93` exactly as
the brief claimed, the three claimed ancestors all confirmed, and the defect confirmed present at
`EodService.cs:230-247` before anything was edited. `integration/mig-stack-land` was not used and not
read.

**A separate worktree and a separate branch were used** rather than committing in
`/Users/svendaneel/okam/wt-xzprinted`, so that no shared ref moved. `lane/xz-printed-defects` is
still at `9cbe2b93` after this lane finished.

Container-free tier only (`--filter "Database!=SqlServer"`, never `FullyQualifiedName!~SqlServer`).
No container was started, none was touched. No migration authored. Nothing pushed. Nothing under
`docs/plan/**` edited except the RETURN. `/Users/svendaneel/okam/OkamAPI-modules` was never read or
entered.

`artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied by the full-tier run as the brief
predicted, and restored - back to `9051c6eb…` and `ae90f37f…`, the same baseline hashes the sibling
lane recorded. Not committed.

## What changed

| file | what |
|---|---|
| `Services/Kassa/KassaCreditSale.cs` | `IsCreditLine(JournalPaymentLine)` added; `CreditPortionOf` re-defined on it |
| `Services/Kassa/EodService.cs` | credit routed out of the `default` arm via `KassaCreditSale`; `Sum mottatt` and the credit row printed |
| `Models/Kassa/EodModels.cs` | `CreditTotal`, `ReceivedTotal` |
| `WebApi.Tests/Kassa/EodServiceTests.cs` | two new pins; reverse-direction assertions on the existing live-summary test; the fake email service now retains the body |

## The predicate rule, and how it was honoured

`KassaCreditSale` owns "which lines are credit". The rival on `lane/meals-xz-credit @ 25586d86` was
**read and not taken**: its finding is here, its branch is not. Its fix asked
`line.PaymentType.IsCompanyAccount()` at the call site - precisely the equivalence that grew a second
definition of kredittsal the estate then spent a merge lane composing away. That branch is also
*older* than this base: diffing `9cbe2b93 -> 25586d86` shows `KassaCreditSale.cs` as **deleted**, so
landing it would have removed the single predicate outright.

`CreditPortionOf` partitions payment lines but returns ore, not the lines. The day settlement needs
both halves - the credit ore *and* which lines to keep out of `Annet` - so the line rule was named
**inside the owner** and `CreditPortionOf` re-defined on it:

    var credit = entry.PaymentLines.Where(IsCreditLine).ToList();

That keeps the class comment's promise literally true - there is still exactly one place that decides
which payment lines are credit - while `IsCreditSale`, `CreditPortionOf` and the new settlement
reader are all defined on that one rule and cannot drift. The Dagsoppgjor's credit total and the Z's
`CreditSalesAmount` are now the same sum of the same lines by construction.

`PaymentType.IsCompanyAccount()` is composed **inside** `KassaCreditSale` and appears in `EodService`
only in a comment saying why it is not called there.

### Production readers, enumerated per item

`KassaCreditSale.` in production code after the change - the seven pre-existing readers plus this
lane's eighth, all through the one type:

    Models/Kassa/XZReportModels.cs:51                          (comment)
    Services/Kassa/EodService.cs:242                           IsCreditLine        <- new
    Services/Kassa/FinalizeService.cs:237                      IsCreditSale
    Services/Kassa/FinalizeService.cs:304                      IsCreditSale
    Services/Kassa/PosReceiptService.cs:131                    IsCreditSale
    Services/Kassa/PosReceiptService.cs:386                    IsCreditSale
    Services/Kassa/SaftCashRegisterExportService.MasterData.cs:112    IsCreditSale
    Services/Kassa/SaftCashRegisterExportService.Transactions.cs:251  IsCreditSale
    Services/Kassa/XZReportService.cs:973                      CreditPortionOf

`.IsCompanyAccount()` in production code after the change:

    Services/CartService.cs:573                    pre-existing, cart/order path
    Services/CartService.cs:582                    pre-existing, cart/order path
    Services/CartService.cs:699                    pre-existing, cart/order path
    Services/Kassa/EodService.cs:240               COMMENT only - says why it is not called here
    Services/Kassa/EscPosXZReportBuilder.cs:111    pre-existing, PaymentMeansTotal
    Services/Kassa/EscPosXZReportBuilder.cs:112    pre-existing, PaymentMeansTotal
    Services/Kassa/KassaCreditSale.cs:62           COMMENT
    Services/Kassa/KassaCreditSale.cs:67           the primitive, composed inside the owner
    Services/Kassa/PosSettlementService.cs:392     pre-existing, settlement request
    Services/Kassa/XZReportService.cs:927          pre-existing, PaymentMeansTotal
    Services/PaymentService.cs:400                 pre-existing, payable

**Observation, not touched:** `XZReportService.cs:927` and `EscPosXZReportBuilder.cs:111-112` bucket a
`PaymentMeansTotal` - a medium plus an amount, with no journal entry and no payment line behind it -
so the entry-level owner cannot be applied to them as it stands. They are base state from the X/Z
lane, outside this brief, and changing them would move a sibling's pinned document. Recorded here
rather than silently left.

## The world the pins are built in

Every figure is **distinct**, so no assertion can be satisfied by the wrong bucket:

| medium | seeded | nets to |
|---|---|---|
| cash sale | 15000 | `CashTotal` 15000 |
| card sale / card return | 30000 / 5000 | `CardTotal` 25000 |
| giftcard sale | 7000 | `OtherTotal` 7000 |
| company account sale / return | 41000 / 6000 | `CreditTotal` 35000 |
| | | `ReceivedTotal` 47000 |

The credit figure `35000` is shared by no other figure in the fixture, so an assertion on it can only
be reporting the credit bucket. The values the **defect** produces - `42000` in "Annet" and `82000`
received - occur nowhere else either, so they cannot be mistaken for a correct reading.

The printed test uses a second world (no credit return, so credit is `41000`, received `47000`),
which is why the two mutants below report different actuals for the same assertion: model `82000`,
paper `88000`. Amounts are read **off the rendered rows**, entity-decoded before the digits are taken,
because the nb-NO currency format carries a non-breaking space that `HtmlEncode` writes as `&#160;` -
digits a naive strip would fold into the figure.

## Baselines

| run | result |
|---|---|
| `Kassa.EodServiceTests` after the change | **13/13 pass** |
| whole container-free tier | **4717 passed, 0 failed, 12 skipped**, 6 m 02 s |

## Mutations

Every measurement rebuilt. **`--no-build` was never used.** The mutations are all in **production**
code, so each moves `bin/Debug/net8.0/WebApi.dll` - not `WebApi.Tests.dll` - and the hash is recorded
each time. The tree that was mutated is the tree that was measured: one worktree,
`/Users/svendaneel/okam/wt-eodcredit`, edited and tested in place.

**Audited by direction.** A wrong-tree mutation yields green mutants; a stale binary yields red
restores. The run alternates G-R-G-R-G-R-G and every restore returns `WebApi.dll` to the byte-identical
pre-mutant hash `719b3243…`, which rules out both.

| # | state | `WebApi.dll` | result |
|---|---|---|---|
| 0 | baseline | `719b3243…` | **GREEN** 13/13 |
| 1 | mutant A | `f8ca370b…` | **RED** 2 |
| 2 | restore | `719b3243…` | **GREEN** 13/13 |
| 3 | mutant B | `b0ef10be…` | **RED** 2 |
| 4 | restore | `719b3243…` | **GREEN** 13/13 |
| 5 | mutant C | `21b3c8ac…` | **RED** 2 |
| 6 | restore | `719b3243…` | **GREEN** 13/13 |

### Mutant A - the company account returns to the `default` arm

This is the reported defect, reinstated:

    -   if (KassaCreditSale.IsCreditLine(line.Line))
    +   if (false && KassaCreditSale.IsCreditLine(line.Line))

**RED, 2 failed.**

    GetSummary_CompanyAccount_IsStatedAsCredit_AndKeptOutOfTakings
        Expected: 35000   Actual: 0        (CreditTotal)
    EndDay_Receipt_PrintsCreditOutsideSumMottatt
        Expected: 41000   Actual: 0        (printed "Kredittsalg (ikke mottatt)")

### Mutant B - counted as credit AND left in takings

Mutant A reds on the *first* assertion in each test, so it cannot reach the takings assertions behind
it. A test whose later assertions are unreachable is a test that has not been shown to fail, so the
"and **not** in takings" half is proved by its own mutant - the `continue` removed, leaving the credit
counted correctly and *also* falling through into `Annet`:

    -   credit += signed;
    -   continue;
    +   credit += signed;

**RED, 2 failed** - and note the credit assertions now PASS, so it is the takings half being measured:

    GetSummary_CompanyAccount_IsStatedAsCredit_AndKeptOutOfTakings
        Expected: 7000    Actual: 42000    (OtherTotal = giftcard + receivable)
    EndDay_Receipt_PrintsCreditOutsideSumMottatt
        Expected: 7000    Actual: 48000    (printed "Annet")

### Mutant C - `Sum mottatt` absorbs the receivable

The brief requires `Sum mottatt` to be asserted **directly**, not inferred from the credit row being
present. Mutants A and B both red before reaching it, so it gets its own - credit and takings both
bucketed correctly, only the sum wrong:

    -   summary.ReceivedTotal = cash + card + other;
    +   summary.ReceivedTotal = cash + card + other + credit;

**RED, 2 failed** - `CreditTotal`, `CashTotal`, `CardTotal` and `OtherTotal` all still pass, so the
sum alone is what reds:

    GetSummary_CompanyAccount_IsStatedAsCredit_AndKeptOutOfTakings
        Expected: 47000   Actual: 82000    (ReceivedTotal, world 1: 47000 + 35000)
    EndDay_Receipt_PrintsCreditOutsideSumMottatt
        Expected: 47000   Actual: 88000    (printed "Sum mottatt", world 2: 47000 + 41000)

### Both directions

The reverse direction - a card or cash payment still lands in takings and **not** in credit - is
asserted on the existing live-summary test, in a world with no company account at all:
`CreditTotal == 0` and `ReceivedTotal == 40000` beside the pre-existing `CashTotal == 15000` and
`CardTotal == 25000`. A predicate that classified too widely reds there. One case would have pinned
nothing; the credit bucket is pinned non-empty in one world and empty in another.

## Constraints

- **C4** - this change is a **report, not a money-path write**. `ProjectPaymentTotalsAsync` reads the
  journal and fills a response model; no row is inserted, updated or deleted by it. The projection was
  additionally made `AsNoTracking()`, so the append-only `JournalPaymentLine` entities it now
  materialises are not tracked and cannot be written back through this path.
- **C6** - no statutory naming widened and **no section reference added**. The printed labels are
  `Kontant`, `Kort`, `Annet`, `Sum mottatt`, `Kredittsalg (ikke mottatt)`. `Kontant`, `Kort` and
  `Sum mottatt` are lifted verbatim from the Z report the same close cuts, so the two documents read
  in one vocabulary. `Kredittsalg` is the word already printed in the Z's `KREDITTSALG` section, whose
  artifact this close produces. `(ikke mottatt)` is a statement about this document, not a claim about
  an invoice being issued. Nothing here claims an artifact the change does not produce.
- **C1** - no append-only table backfilled, repaired or purged; nothing is written at all.
- **C2** - no migration authored, no `OnModelCreating` change. `CreditTotal` and `ReceivedTotal` are
  response-model properties, not mapped columns.
- **C3** - reachable on landing: both new properties ride the existing `CashDrawerController` route
  that already returns `EodSummaryModel`, and both are rendered on the EOD receipt the close emails.
  No new service, DI registration or route is introduced, so none is missing.
- **C5** - a person completing the close is the gate. **The suite result below is not acceptance.**
  What Sven should walk: close a day on which a company-account sale was settled, and read the
  Dagsoppgjor against the Z from the same close - `Kredittsalg` must carry the same ore as
  `KREDITTSALG`, and `Sum mottatt` must agree between the two documents.

## Nothing failed to reproduce

No failure was observed that did not reproduce, and no proof harness misbehaved. There is nothing to
name under that heading.
