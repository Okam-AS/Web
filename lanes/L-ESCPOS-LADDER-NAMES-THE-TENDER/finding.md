# L-ESCPOS-LADDER-NAMES-THE-TENDER — both printed ladders name the tender

**Class: suite.** Built and committed to my own lane branch only. Nothing pushed, no shared branch
touched, no container started, no SQL tier, no migration, no production system.

## Refs, named before anything is claimed

Every line of the *pre-existing* code quoted here was read with `git show <ref>:<path>` at

```
ref:  feature/restaurant-modules @ 8e2b57de8442a389a9b5f8025312c9750614c85e
repo: /Users/svendaneel/okam/OkamAPI-modules
```

`8e2b57de` is the integration tip: `git rev-parse feature/restaurant-modules` resolves to it and
`git merge-base --is-ancestor 8e2b57de feature/restaurant-modules` succeeds. The shared checkout at
`/Users/svendaneel/okam/OkamAPI-modules` sits on `lane/meals-grace-pins` and **was never read**.

The work is in a worktree of my own, created off that exact commit:

```
worktree: /Users/svendaneel/okam/wt-escposladder
branch:   lane/escpos-ladder-tender   (created off 8e2b57de, NOT pushed)
commit:   9990b4bb
```

## What was wrong

`8e2b57de:Services/Kassa/EscPosReceiptBuilder.cs:315-329` labelled four of `PaymentType`'s seventeen
members — `Cash`→Kontant, `DinteroTerminal`+`SurfboardTerminal`→Kort, `Giftcard`→Gavekort — and
`default:` at :327 returned `paymentType.ToString()`. **Thirteen members printed a raw C#
identifier** on a Norwegian fiscal document: `NotSet`, `PayInStore`, `CompanyAccount`, `Stripe`,
`Vipps`, `Dintero`, `DinteroVipps`, `DinteroBillie`, `DinteroKlarna`, `DinteroKravia`,
`WoltMarketplace`, `Surfboard`, `SurfboardVipps`.

`8e2b57de:Services/Kassa/EscPosXZReportBuilder.cs:341-354` was a **character-identical private copy**
of the same switch, reached from `SurfboardReceiptPrintService.cs:47`, so the daily X/Z summary
printed the same identifier and **fixing one file would not have touched the other**.

C6 is what makes it matter. A `CompanyAccount` sale hands over a § 2-8-7 utleveringskvittering
(`FinalizeService.cs:231-238`), and `PosReceiptService.BuildDeliveryReceipt:502-506` keeps the
payment lines on it precisely because *"they name the company account that will be invoiced"*. That
line printed `CompanyAccount              125,00`.

## The fix: one table, not two ladders and not one more `case`

New `Services/Kassa/KassaPaymentLabels.cs` (`internal static string Tender(PaymentType)`), called by
both builders; both private copies deleted, and the now-unused `using WebApi.Enums;` dropped from
each. Every declared member has an arm of its own. The `default` is reachable **only** for a value
that is not a declared member — `FinalizeService.cs:501/:637` copy `PaymentType` straight off the
return DTO with no membership guard, and an int-backed enum property binds any number — and it names
that fact as `Ukjent` rather than printing the bare number `Enum.ToString()` produces.

Sharing the table is the load-bearing half: the copy is *how* `CompanyAccount = 120`, added to the
enum "additive, code-only", was swallowed. A one-line `case` in one file would have left twelve
members, the second document, and the same mechanism waiting for the next member.

## No wording invented — every word already named that tender in this codebase

| member | prints | taken from |
|---|---|---|
| `NotSet` | Ingen betaling | admin order list "Ingen betaling registrert", shortened to the 32-column line |
| `Giftcard` | Gavekort | the ladder's own existing arm |
| `PayInStore` | Betal i butikk | `WrappedService.cs:241` |
| `Cash` | Kontant | existing arm |
| `CompanyAccount` | **Bedriftskonto** | `ReceiptService.cs:171` "Betalt med bedriftskonto"; SAF-T `MasterData.cs:232` CUSTACCT / 12006 / kundekonto |
| `Stripe`, `Dintero`, `Surfboard` | Kort | `WrappedService.cs:242/245/251`, agreeing with `ReceiptService.cs:161-164` |
| `Vipps`, `DinteroVipps`, `SurfboardVipps` | Vipps | `WrappedService.cs:243/246/252`, `ReceiptService.cs:157-159` |
| `DinteroBillie` | Billie | `WrappedService.cs:247`, `ReceiptService.cs:168` |
| `DinteroKlarna` | Klarna | `WrappedService.cs:248`, `ReceiptService.cs:166` |
| `DinteroKravia` | Kravia | `WrappedService.cs:249`, `ReceiptService.cs:170` |
| `DinteroTerminal`, `SurfboardTerminal` | Kort | existing arms |
| `WoltMarketplace` | Wolt | `WrappedService.cs:250` |
| *(not a declared member)* | Ukjent | `CartService.cs:1644`; the admin list's `orders_paymentUnknown` |

`WrappedService.GetPaymentTypeName` is the closest existing ladder in the roll's own noun register
and it **agrees with the PDF's `ReceiptService.PaymentTypeLabel` on every member both of them name**,
so taking it is not a third answer. The two sources' registers differ only in form: "Betalt med
kort" is the PDF sentence, "Kort" is the 32-column noun the roll has always used.

## The test, and the red it was shown to produce

`WebApi.Tests/Kassa/EscPosPaymentLabelTests.cs`, 22 cases, spanning **both** builders in every one.
It goes through `EscPosReceiptBuilder.Build` / `EscPosXZReportBuilder.Build` and the printed bytes,
reading the payer label back off the decoded roll; **it never names `KassaPaymentLabels`**, which is
what let it run unchanged against the unmodified tree.

- `Both_printed_ladders_name_the_tender_in_Norwegian` — 17 theory cases, expectations written
  longhand rather than resolved through the production table (a table checked against itself cannot
  tell a MISSING arm from a WRONG one; both sides move together on every input).
- `No_declared_member_prints_a_raw_csharp_identifier`.
- `Every_declared_member_is_labelled_by_its_own_arm` — a member with no arm falls to `Ukjent` and
  reds here. **This is the guard that makes the next enum addition loud.**
- `The_expected_tenders_cover_exactly_the_declared_members` — and this is the half that reds until
  somebody states the Norwegian word the new member must print.
- `An_undefined_payment_type_prints_the_residual_word_not_a_number` — `(PaymentType)9999`.
- `The_receipt_and_the_XZ_report_name_a_tender_identically` — the copies' shared property, now a pin.

**Negative control is a run, not a claim** (`negative-control.txt`): the same test file in this
worktree with **only the two builder edits stashed** — i.e. against the tip's ladders —
**14 failed / 8 passed / 22**. The twelve theory failures name
`CompanyAccount`→`Bedriftskonto`/`CompanyAccount`, `NotSet`, `PayInStore`, `Stripe`, `Dintero`,
`DinteroVipps`, `DinteroBillie`, `DinteroKlarna`, `DinteroKravia`, `WoltMarketplace`, `Surfboard`,
`SurfboardVipps`; plus the identifier fact and `Expected: Ukjent / Actual: 9999`.
With the fix restored: **22/22** (`lane-test-after.txt`).

### The thirteenth member, stated rather than hidden

**Twelve of the thirteen red; `Vipps` does not.** Its correct Norwegian tender name is byte-identical
to its C# identifier — `Vipps` is what the PDF, `WrappedService` and the admin list all print — so
**no output-level assertion can separate "labelled" from "fell through" for that one value**, and
inventing a fourth wording to make a test go red would be a fourth answer to one question. It is
named in `TenderNameEqualsIdentifier` so a future rename cannot quietly join it, and its arm is
proven by `Every_declared_member_is_labelled_by_its_own_arm`, which reds if the value ever reaches
the residual. That assertion is the exhaustiveness proof for all seventeen from here on.

## Suite

Container-free tier, both runs in this worktree, `dotnet test --filter "Database!=SqlServer"`:

| | Failed | Passed | Skipped | Total |
|---|---|---|---|---|
| base 8e2b57de, pristine (`suite-base.txt`) | 0 | 4638 | 12 | 4650 |
| mine 9990b4bb (`suite-after.txt`) | 0 | 4660 | 12 | 4672 |

Delta is exactly the 22 new tests. No SQL tier: no container was started, and none belonging to
anyone else was touched. Every run built; `--no-build` was never used.

`EventsDietaryRunSheetWireTests` rewrites `artifacts/journeys/ev-dietary/run-sheet.{json,md}` on
every suite run — a known unpinned dated-output defect on an unmerged branch, not this lane's. Those
files were restored and are **not** in my commit.

## What a person can read (C5)

`roll.txt` is the decoded paper for a company credit sale, rendered from the real builders through a
temporary dump that was **deleted before the commit** and is not in the tree:

```
Utleveringskvittering
Utleveringskvitt / ering – IKKJE / KVITTERING FOR / KJØP
Kvittering nr               1824
Utlevering nr                  7
TOTALT NOK                125,00
Bedriftskonto             125,00        <- was: CompanyAccount             125,00

Z-RAPPORT #12 ... MOTTATT BETALING
Kontant (1)               125,00
Bedriftskonto (1)         125,00
Wolt (1)                  125,00        <- was: WoltMarketplace (1)        125,00
```

A .trx is not acceptance; this is the artifact to put in front of @sven.

## Named, not fixed — three ladders outside this lane's scope

1. `Services/ReceiptService.cs:152` (the emailed PDF) still `default: return string.Empty`, so
   `NotSet`, `Giftcard`, `PayInStore`, `Cash`, `DinteroTerminal`, `WoltMarketplace` print a **blank**
   payer line. Different document, located by `L-RECEIPT-PAYER-LINE-LOCATE`. `KassaPaymentLabels` is
   internal to the same assembly and is the obvious table for it to adopt.
2. `Services/Analytics/Tools/AnalyticsToolRunner.cs:1087` `_ => "Ikke satt"` — `CompanyAccount`
   revenue is reported as "Ikke satt". Not a fiscal document.
3. `Services/StatisticsService.cs:1031` `_ => paymentType.ToString()` — same shape, admin figures.

And the reason the other twelve are reachable at all: `FinalizeService.cs:501/:637` bind
`request.PaymentType` off the DTO with no membership guard (`L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED`).
This lane makes an out-of-range value print `Ukjent` instead of `9999`; it does not close the door.

## Constraints

- **C1** not engaged — no append-only table read, written, backfilled or purged; no SQL at all.
- **C2** not engaged — no migration, no `OnModelCreating` change, no snapshot.
- **C3** satisfied — `KassaPaymentLabels.Tender` has two callers in the same change, both already
  reachable in production (`SurfboardReceiptPrintService.cs:37/:47` ← `PosController.PrintReceipt`).
  Nothing was added that no caller reaches.
- **C4** not engaged — no money-path write; this changes rendering only, and no amount, allocation
  or journal row is touched.
- **C5** honoured as far as a backend lane can: the printed roll above is the artifact for @sven;
  the suite counts are stated as evidence that code behaves, never that a capability exists.
- **C6 engaged and improved.** The § 2-8-7 utleveringskvittering is produced by the same code path
  that names the provision, and the content the provision requires it to carry — who is to be
  invoiced — now reads `Bedriftskonto` instead of an English identifier. No new statutory claim was
  printed anywhere.
- **C7** not engaged — no log or telemetry call added, changed or read.
