# `lane/meals-xz-credit` is unlandable — the record, with the reason

Reason-shape hit: **(1) the run happened and nobody wrote it down.** The exit is a disjunction —
*"`MealsXZCreditSaleTests` is present on `feature/restaurant-modules` and green … **or** the branch is
recorded unlandable with the reason"*. The first disjunct is false. The second was **true but existed only as
prose inside the lane's RETURN**, which is not a record a stranger can open. This file is the record, and
every claim below was **re-measured at the current backend trunk `6d5328004`**, not copied from the RETURN —
one of them came back different, and it is stated as such.

## The `evidence:` line this lane carried, preserved verbatim

    /Users/svendaneel/okam/Web-modules/lanes/L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK/asserting-tests.txt (34 trunk tests asserting the capability, all passing, extracted by name from trunk-non-sql-tier.trx beside it)

## The branch

| | |
|---|---|
| branch | `lane/meals-xz-credit` @ **`25586d86bb079d87e5ba0caa60c06c806dee8a66`** — *"feat(kassa): state kredittsalg apart from kontantsalg on X and Z"* |
| forked at | `24dec838d125292ea16e548c58a9638e836249fa` (= `git merge-base lane/meals-xz-credit 6d5328004`) |
| size | 8 files, +716 / −50 |
| trunk today | `6d5328004`, **not moved by this pass** |

## Disjunct 1 is false, and it is false in the strong sense: the suite cannot compile there

`git ls-tree -r 6d5328004 | grep -i MealsXZCreditSale` returns **nothing**. The file exists only on the branch
(`WebApi.Tests/Meals/MealsXZCreditSaleTests.cs`, 337 lines) together with its golden fixture
`WebApi.Tests/Meals/Fixtures/zreport-kredittsalg.txt`.

Landing the test file alone would not compile. It reads model members the branch introduces in
`Models/Kassa/XZReportModels.cs` and the trunk does not have — measured on the trunk blob, each count **0**:

    CashSalesCount  CashSalesAmount  CreditSalesCount  CreditSalesAmount
    CreditReturnsCount  CreditReturnsAmount  CreditTotal   (on XZReport)

(The only occurrence of `CreditSalesCount` anywhere at `6d5328004` is in prose, `docs/plans/pos-open-decisions.md`.)
So the suite is not portable without the production half, and the production half is what the two conflicts
below are about.

## Reason 1 — superseded on X/Z: the trunk already prints the section

The branch's purpose was to state credit sales apart on the X/Z roll. The trunk does that now, under a
different design:

    6d5328004:Services/Kassa/EscPosXZReportBuilder.cs:127   Section(job, "KREDITTSALG (IKKJE MOTTATT)");
    6d5328004:Services/Kassa/EscPosXZReportBuilder.cs:134   Line(job, Row("Sum kredittsalg", …));

with the received-money rule at the model (`PaymentTypeExtensions.IsReceived`) rather than as an
X/Z-report-private count, which is why the trunk needs none of the seven new members.

## Reason 2 — CONFLICT 1: the branch re-privatises a label table the trunk deliberately shares, and the words differ

The trunk has one tender vocabulary, `Services/PaymentTenderLabels.cs`, consumed by
`EscPosReceiptBuilder.cs`, `EscPosXZReportBuilder.cs` and `ReceiptService.cs`. The branch adds a
**builder-private** `Dictionary<PaymentType, string> PaymentLabels` inside `EscPosXZReportBuilder` plus its own
`PaymentLabel(...)`. Three entries print different Norwegian on a fiscal document:

| `PaymentType` | trunk `PaymentTenderLabels.Tender` | branch's private table |
|---|---|---|
| `NotSet` | `Ingen betaling` | `Ukjent betalingsmiddel` |
| `PayInStore` | `Betal i butikk` | `Betales i butikk` |
| `Dintero` | `Kort` | `Dintero` |

The trunk pin that exists to stop exactly this is
`WebApi.Tests/Kassa/EscPosPaymentLabelTests.cs:145` —
**`The_receipt_and_the_XZ_report_name_a_tender_identically`**. Landing the branch reds it, and the observable
consequence is that a receipt and the Z report for the same day would name the same tender with two different
words. **That is a change to printed fiscal text, not a merge decision**, which is why it belongs to an owner.

## Reason 3 — CONFLICT 2: a day with no credit sale, and it is a reading of the forskrift

The trunk prints the `KREDITTSALG` section only when there is something to print. The branch prints the line
unconditionally:

    +  Line(job, Row("  herav kredittsalg (" + report.CreditSalesCount … , Money(report.CreditSalesAmount)));

so a day with zero credit sales gets `herav kredittsalg (0)` on paper. **Both sides argue their choice in
comments.** Whether a zero line must appear is a reading of § 2-8-2, and a merge cannot settle it. Recorded as
an owner question, not resolved here.

## Reason 4 — it reaches a surface the split did not

The branch also touches `Services/Kassa/EodService.cs` (+30), `Models/Kassa/EodModels.cs` (+5) and
`WebApi.Tests/Kassa/EodServiceTests.cs` (+25) — the end-of-day close, which is outside the X/Z scope the lane
was cut for. Landing it would carry an unreviewed EOD change in on the back of a report change.

## **Correction to the RETURN — the one claim that came back different**

The RETURN closed with a "NOT SUPERSEDED" finding: *"EodService buckets `PaymentType.CompanyAccount` into its
default arm, so the end-of-day close counts a credit sale as takings and prints it under 'Annet'"*, and
recommended a new lane for it.

**That is no longer true. The trunk closed it.** `6d5328004:Services/Kassa/EodService.cs:237` now tests the
credit case *before* the medium switch, and `EodModels.cs:69` carries `CreditTotal`:

```csharp
// A credit sale is checked BEFORE the medium switch, because it is not a medium: nothing
// arrived at the register and the company is invoiced later. It used to fall through to
// `default` and land in "Annet", so the close counted a receivable as money in hand while
// the X/Z report for the same day stated it apart under KREDITTSALG. Same rule as that
// report reads — see PaymentTypeExtensions.IsReceived — so the two cannot drift again.
if (!line.PaymentType.IsReceived()) { credit += signed; continue; }
```

and the close prints `Kredittsalg (faktureres)` at `EodService.cs:306`. **The recommended follow-up lane is
already done**, by the received-money rule the RETURN itself noticed landing (`57865601b`). Anyone reading the
RETURN's last three lines should read this paragraph with them.

## The capability itself is asserted at the trunk — 34 tests, and the count is honest about its epoch

`asserting-tests.txt` beside this file lists them all by name, extracted from `trunk-non-sql-tier.trx`:
**`EscPosXZCreditSaleTests` 5 · `EscPosXZReportBuilderTests` 4 · `EscPosPaymentLabelTests` 22 ·
`CompanyAccountClassificationTests` 3 = 34**, every one `Passed`. Counts re-derived from the trx here, not
taken from the header.

Two qualifications a reader needs and the evidence line does not give:

1. **That trx was taken at `d30c1c4d4`, an earlier trunk, not at `6d5328004`.** Its `ResultSummary` reads
   `total=5048 executed=5037 passed=5037 failed=0` (the 11 difference is skips, `outcome="Completed"`). All
   four classes still exist at `6d5328004`, so the fact survives the move, but the numbers are that commit's.
2. **`EscPosXZCreditSaleTests` is not a file.** It is a *second class* at
   `WebApi.Tests/Kassa/EscPosXZReportBuilderTests.cs:98`. A file-name search says it is missing; the trx says
   it is there. The trx is right — the RETURN records nearly filing a false absence on this, and it is worth
   carrying as a lesson about name-versus-file searches.

`trunk-non-sql-tier.trx` is **deliberately not copied into this directory**: it is 7 MB and carries the
checksum-valid fødselsnummer `01010112377` that `evidence-recovered-to-the-trunk.md` holds pending a ruling.
Its counters are quoted above instead. (See `forty-seven-remainder.md` — 22 of the 89 tracked `.trx` in this
repo already carry that value, which is a contradiction an owner should settle.)

## The ruling this asks for

Nothing here proposes landing the branch. The two conflicts are **owner decisions about printed fiscal text**
— a shared tender vocabulary versus a builder-private one, and whether a zero credit-sale line must be printed
under § 2-8-2. Until those are ruled, `lane/meals-xz-credit @ 25586d86b` stays unlanded, and this file is the
reason, written down.
