# L-ESCPOS-COMPANYACCOUNT-LABEL — what the ESC/POS fiscal receipt prints for every PaymentType

**Class: analysis.** Nothing was edited, committed, pushed or run. No container, no SQL, no migration.
No file outside `lanes/L-ESCPOS-COMPANYACCOUNT-LABEL/` and my RETURN was touched.

## The ref, named before anything is claimed

Every line quoted below was read with `git show <ref>:<path>` at

```
ref: feature/restaurant-modules @ 8e2b57de8442a389a9b5f8025312c9750614c85e
     (2026-08-04 12:00:29 +0200, "L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing")
repo: /Users/svendaneel/okam/OkamAPI-modules
```

`8e2b57de` is the **integration tip**: `git rev-parse feature/restaurant-modules` resolves to it, and
`git merge-base --is-ancestor 8e2b57de feature/restaurant-modules` succeeds. It is the same ref
`L-MEALS-LEVER-WITHHOLD` verified as the tip (0 ahead / 0 behind) on 2026-08-04, and the same one
`L-RECEIPT-PAYER-LINE-LOCATE` and `L-PAYMENT-LABEL-UKJENT` measured at.

**The working directory was NOT read.** `/Users/svendaneel/okam/OkamAPI-modules` is checked out on
`lane/meals-grace-pins`, which is not the tip; reading `Services/Kassa/EscPosReceiptBuilder.cs` off
disk would have answered a question about a lane branch.

## The population: 17 members, read by object, not by grep

`8e2b57de:Enums/PaymentType.cs` declares exactly seventeen, all values distinct — so
`paymentType.ToString()` returns the **member identifier** for every one of them, never a number.
(A number would only appear if an undefined int were cast in; see the RETREC path below.)

```
NotSet = 0            Stripe = 200          DinteroKravia = 440    Surfboard = 600
Giftcard = 75         Vipps = 300           DinteroTerminal = 450  SurfboardVipps = 610
PayInStore = 100      Dintero = 400         WoltMarketplace = 500  SurfboardTerminal = 650
Cash = 110            DinteroVipps = 410
CompanyAccount = 120  DinteroBillie = 420
                      DinteroKlarna = 430
```

`CompanyAccount = 120` carries its own comment: *"Additive, code-only — no migration… A CompanyAccount
order is authorized by a Meals funding reservation, never a payment rail."* It was added to the enum
after the label ladder was written, and the ladder was not revisited. That is the whole mechanism.

## The ladder, verbatim

`8e2b57de:Services/Kassa/EscPosReceiptBuilder.cs:315-329`

```csharp
private static string PaymentLabel(PaymentType paymentType)
{
    switch (paymentType)
    {
        case PaymentType.Cash:
            return "Kontant";
        case PaymentType.SurfboardTerminal:
        case PaymentType.DinteroTerminal:
            return "Kort";
        case PaymentType.Giftcard:
            return "Gavekort";
        default:
            return paymentType.ToString();
    }
}
```

Its single call site is `:157`, inside `Build`:

```csharp
foreach (var payment in receipt.Payments ?? new List<PosReceiptPaymentLineModel>())
{
    Line(job, Row(PaymentLabel(payment.PaymentType), Money(payment.Amount)));
}
```

`Row` right-aligns the amount in a 32-column line, so what lands on the roll is literally

```
CompanyAccount              125,00
```

## Member by member: what the ESC/POS receipt prints for each of the 17

Four arms are labelled. Thirteen fall to `default` and print the C# identifier. 4 + 13 = 17.

| # | Member | Value | Printed on the roll | Norwegian? | Reachable on a **sale/delivery/copy** receipt | Reachable on a **return** receipt |
|---|--------|-------|---------------------|-----------|---|---|
| 1 | `NotSet` | 0 | `NotSet` | no — programmer's word | no (see §NotSet below) | **yes** — request default |
| 2 | `Giftcard` | 75 | `Gavekort` | yes | no | yes |
| 3 | `PayInStore` | 100 | `PayInStore` | no — English | no | **yes** |
| 4 | `Cash` | 110 | `Kontant` | yes | yes | yes |
| 5 | **`CompanyAccount`** | **120** | **`CompanyAccount`** | **no — English** | **YES — the defect** | **yes** |
| 6 | `Stripe` | 200 | `Stripe` | brand, not a tender | no | **yes** |
| 7 | `Vipps` | 300 | `Vipps` | brand — acceptable | no | **yes** |
| 8 | `Dintero` | 400 | `Dintero` | acquirer, not a tender | no | **yes** |
| 9 | `DinteroVipps` | 410 | `DinteroVipps` | no — CamelCase identifier | no | **yes** |
| 10 | `DinteroBillie` | 420 | `DinteroBillie` | no — CamelCase identifier | no | **yes** |
| 11 | `DinteroKlarna` | 430 | `DinteroKlarna` | no — CamelCase identifier | no | **yes** |
| 12 | `DinteroKravia` | 440 | `DinteroKravia` | no — CamelCase identifier | no | **yes** |
| 13 | `DinteroTerminal` | 450 | `Kort` | yes | yes | yes |
| 14 | `WoltMarketplace` | 500 | `WoltMarketplace` | no — English | no | **yes** |
| 15 | `Surfboard` | 600 | `Surfboard` | vendor, not a tender | no | **yes** |
| 16 | `SurfboardVipps` | 610 | `SurfboardVipps` | no — CamelCase identifier | no | **yes** |
| 17 | `SurfboardTerminal` | 650 | `Kort` | yes | yes | yes |

**The thirteen that render a raw enum name**, named explicitly as the exit criterion requires:
`NotSet`, `PayInStore`, `CompanyAccount`, `Stripe`, `Vipps`, `Dintero`, `DinteroVipps`,
`DinteroBillie`, `DinteroKlarna`, `DinteroKravia`, `WoltMarketplace`, `Surfboard`, `SurfboardVipps`.

Of those thirteen, **nine are CamelCase C# identifiers no Norwegian reader has a word for**
(`NotSet`, `PayInStore`, `CompanyAccount`, `DinteroVipps`, `DinteroBillie`, `DinteroKlarna`,
`DinteroKravia`, `WoltMarketplace`, `SurfboardVipps`) and four are brand or acquirer names that are
readable but name the *provider* rather than the *tender* (`Stripe`, `Vipps`, `Dintero`, `Surfboard`).
I report both classes rather than collapsing them: `Vipps` on a receipt is defensible, `Dintero` is a
back-office name the customer never chose, and `DinteroKravia` is neither.

A member outside the seventeen — an undefined int bound from a request — prints the **number**, e.g.
`999`, because `Enum.ToString()` falls back to the numeric form. That is not a hypothetical: see below.

## Why `CompanyAccount` is the sharp one and not merely the noticed one

`PosSettlementService` admits **exactly four tenders** into a settlement allocation, and throws on
everything else at `:454` (`"Unsupported payment type for a settlement allocation."`):

- `:294` `request.PaymentType == PaymentType.Cash`
- `:351` `request.PaymentType.IsTerminalPayment()` → `DinteroTerminal` or `SurfboardTerminal`
  (`8e2b57de:Helpers/PaymentTypeExtensions.cs:80-83`)
- `:392` `request.PaymentType.IsCompanyAccount()` → `CompanyAccount`
  (`:445` then builds `PaymentType = PaymentType.CompanyAccount` with `Status = Confirmed`)

The confirmed `OrderPayment`s become `JournalPaymentLine`s at
`8e2b57de:Services/Kassa/FinalizeService.cs:222`, and `PosReceiptService.cs:317` copies those onto
`model.Payments`, which is what `Build` loops over.

So the ladder covers **precisely three of the four tenders the register can allocate**, and misses the
fourth. `Cash`, `DinteroTerminal` and `SurfboardTerminal` are labelled; `CompanyAccount` is not.
**`CompanyAccount` is the only unlabelled member reachable onto an ordinary sale receipt.** This is
not a ladder that fell behind in general — it is a ladder that was exactly right for the world before
`CompanyAccount = 120` was added and was never widened when it was.

## The document it lands on is the one the regulation mandates — C6

A `CompanyAccount` sale does not hand over a sales receipt at all. `FinalizeService.cs:231-238`:

> *"Kassasystemforskrifta § 2-8-7: a sale settled against a customer account is a credit sale
> (kredittsal) invoiced later, so the register must hand over an utleveringskvittering instead of a
> proof of purchase."*

and `PosReceiptService.BuildDeliveryReceipt` (`:502-506`) states in its own comment why the payer line
is on that document:

> *"The payment lines are kept — **they name the company account that will be invoiced** — but the
> marking says plainly that this is not a receipt for a purchase."*

So the payer line is not incidental decoration on the utleveringskvittering; it is the line the
document exists to carry, and it carries it as `CompanyAccount`. `BuildDeliveryReceipt` calls
`BuildReceipt(sale, …)` first, so the sale's payment lines flow onto the delivery document unchanged.

**C6 engages, and its violation clause is met in the narrow sense that matters.** The code path names
§ 2-8-7 and does produce the artifact — so this is not the RF-1313 shape of an unbacked claim. It is
the adjacent one: the artifact is produced, and the statutorily-required content on it
(*"kva slags varer og tenester som er levert"* plus who is to be invoiced) is rendered in the
programmer's language rather than the reader's. An inspector reading a Norwegian
utleveringskvittering finds an English CamelCase token where the tender belongs.

## Reachable today, and already inside a passing test's own bytes

`Services/Surfboard/SurfboardReceiptPrintService.cs:37` is the production caller:
`PrintAsync(EscPosReceiptBuilder.Build(receipt), cashPointId)`, reached from the POS controller's
`PrintReceipt`. Two suites already build a real ESC/POS job from a real `CompanyAccount` settlement:

- `WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs:95` — through `PosController.PrintReceipt`
  with a capturing printer, described in its own comment as *"What actually reaches the roll, so the
  pin cannot be satisfied by a model nobody renders."*
- `WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs:263` and `:279`.

Neither asserts the payer line. `CreditSaleDocumentRoutingTests` asserts `Utleveringskvittering`,
`Utlevering nr` and `DoesNotContain("Salgskvittering")`. `DeliveryReceiptComplianceTests` asserts
`Utleveringskvittering`, `Utlevering nr`, `Kaffe`, `IKKJE`, `KJØP`, `125,00`.
**The string `CompanyAccount` is in the byte array those green tests hold, and nothing looks at it.**

And the builder's own suite never exercises an unlabelled arm: `EscPosReceiptBuilderTests.cs:49` is
the single fixture with a payment line and it uses `PaymentType.SurfboardTerminal` — one of the four
that work. A grep over the whole tree at the tip for a test asserting a raw enum name on a job
(`"CompanyAccount"`, `"PayInStore"`, `"WoltMarketplace"`, `"NotSet"` as literals) returns exactly one
hit, and it is `MealsW1MigrationLineageTests.cs:42` checking a table name — not a receipt.

This is the shape the brief predicted. The sibling emitter blanks the line, and a blank is
conspicuous. **This one always prints something, and a reviewer checks that something is there.**

## `NotSet`, checked rather than assumed — and it does *not* behave here as it does on the PDF

On the sibling PDF, `NotSet` was the sharpest miss because a 100 %-comped order keeps
`order.PaymentType = NotSet` and `ReceiptService` reads that field directly. **On the ESC/POS receipt
the same order prints no payer line at all**, and I checked rather than carried the finding across.

`PosSettlementService.cs:576-580`:

> *"A fully comped order (100% discount, FinalAmount 0) that actually carries lines legitimately
> settles with no tender at all — the SALREC then **has no payment lines** and order.PaymentType stays
> NotSet (there was no tender to classify)."*

`Build:155` loops over `receipt.Payments`; an empty collection prints nothing. So on this emitter a
comped sale yields **silence, not the word `NotSet`** — which is correct behaviour, and I record it as
such rather than importing the sibling's conclusion. `NotSet` reaches the roll only by the return path
below.

## The second, unguarded door: return receipts take the type from the client

`FinalizeService.cs:501` and `:637` do not derive the payment type from an allocation. They copy it
straight off the request DTO:

```csharp
entry.PaymentLines.Add(new JournalPaymentLine
{
    PaymentType = request.PaymentType,   // FinalizeReturnRequest.cs:31 / UnreferencedReturnModels.cs:103
    ...
});
```

There is no membership guard on those two paths (the only `NotSet` test in the file is at `:68-69`, on
a different flow). An `int`-backed enum property binds any numeric value, so **all thirteen unlabelled
members — and any undefined integer, which prints as a bare number — can reach a printed RETREC payer
line.** That is why the reachability column above splits sale from return: on a sale only
`CompanyAccount` is exposed, on a return all thirteen are, plus the numeric case.

Whether that unguarded binding is itself a defect is a different question from this lane's; it is
recorded here because it is what makes the other twelve reachable rather than theoretical.

## Three adjacent facts the next reader needs

1. **The X/Z report carries a byte-identical copy of the same ladder.**
   `8e2b57de:Services/Kassa/EscPosXZReportBuilder.cs:341-354` is character-for-character the same
   switch — same four arms, same `default: return paymentType.ToString()` — called at `:105` and
   reachable in production via `SurfboardReceiptPrintService.cs:47`. The X and Z reports are the
   daily fiscal summaries, so **a Z report whose day contained a company credit sale prints a
   `CompanyAccount` tender-total line.** Fixing only the receipt fixes half the paper. The two files
   share no code, so nothing links them: this is a copy, not a call.

2. **SAF-T and the emailed PDF both already name it; only the printed document does not.**
   - `Services/Kassa/SaftCashRegisterExportService.MasterData.cs:232` maps `CompanyAccount` to
     `CUSTACCT` / predefined `12006` / *"Customer account (kundekonto)"*, with a comment explaining
     the choice over the residual `12999`.
   - `Services/ReceiptService.cs:171-175` returns **`"Betalt med bedriftskonto"`**, with a comment
     saying the arm exists precisely so the payer line does not *"fall to the empty default, which
     would print a receipt with a blank payer."*

   So three artifacts describe the same tender and **two of the three name it**. The Norwegian string
   the receipt needs already exists in this codebase, twenty lines into a sibling service. The PDF
   author foresaw exactly this failure and guarded their own emitter against it.

3. **The two emitters have complementary holes, which is why neither review caught the other.**
   `ReceiptService.PaymentTypeLabel` (PDF) defaults to `string.Empty` and blanks six —
   `NotSet`, `Giftcard`, `PayInStore`, `Cash`, `DinteroTerminal`, `WoltMarketplace` — but **has**
   `CompanyAccount`. `EscPosReceiptBuilder.PaymentLabel` (roll) **has** `Cash`, `Giftcard` and
   `DinteroTerminal`, and lacks `CompanyAccount`. Each covers the other's gap. A reader who fixed one
   and glanced at the other would see the missing member already handled.

   A fourth ladder exists at `Services/Analytics/Tools/AnalyticsToolRunner.cs:1087`, a `switch`
   expression with `_ => "Ikke satt"`, so **`CompanyAccount` revenue is reported in analytics as
   "Ikke satt"** — wrong, but not a fiscal document, so out of scope here and recorded only.

## What a fix would have to do (not done — this lane is class `analysis`)

Adding one `case PaymentType.CompanyAccount: return "Bedriftskonto";` to
`EscPosReceiptBuilder.cs:315` closes the named defect and nothing else. It would leave:
the identical ladder in `EscPosXZReportBuilder.cs:341`; the twelve other members still reachable onto
a RETREC payer line; and the `default:` arm still returning `paymentType.ToString()`, which is the
mechanism that will silently swallow the *next* enum member added, exactly as it swallowed this one.
A `default:` that returned a stable Norwegian residual (the shape `AnalyticsToolRunner` already uses)
would fail loudly-in-Norwegian rather than quietly-in-English. That is a design call, not mine to make.

## Constraints

C1 not engaged — nothing written, no append-only table read or touched.
C2 not engaged — no migration authored, no model changed.
C3 not engaged — no capability added.
C4 not engaged — no money-path write.
**C6 engaged and reported above** — the § 2-8-7 utleveringskvittering is produced, but the payer line
the provision requires it to carry is rendered as an English identifier.
C7 not engaged — no log or telemetry call added or read.
