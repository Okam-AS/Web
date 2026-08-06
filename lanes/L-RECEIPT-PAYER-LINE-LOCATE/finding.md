# L-RECEIPT-PAYER-LINE-LOCATE — the blank payer line, located

**Verdict: CONFIRMED, with three corrections.** The blank payer line is real, it is reachable, and it is
produced by ordinary sales. But it is **six** payment types, not five; it is **not** on a
kassasystemforskrifta artifact; and the payment-label lane's own citation **was correct** — the
unresolvable path was introduced downstream of it.

Everything below is measured at **`feature/restaurant-modules` @ `8e2b57de8442a389a9b5f8025312c9750614c85e`**
(2026-08-04 12:00:29 +0200, "L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing"),
which is the integration tip this program names. Every file was read with `git show <that ref>:<path>`, never
from a working tree — `OkamAPI-modules` is checked out on `lane/meals-grace-pins` @ `34c6c103` and was not
read. No suite was run, no container started, nothing written outside this lane directory.

---

## 1. The site, at a path that resolves

| | |
|---|---|
| **File** | `Services/ReceiptService.cs` |
| **Method** | `internal static string PaymentTypeLabel(PaymentType type)` — **line 152** |
| **The blank** | `default: return string.Empty;` — **lines 176–177** |
| **Ref** | `feature/restaurant-modules` @ `8e2b57de` |

```
152:        internal static string PaymentTypeLabel(PaymentType type)
...
176:                default:
177:                    return string.Empty;
```

Two call sites, both in the same file, both feeding the same field:

- `Services/ReceiptService.cs:83` — `PayedWith = PaymentTypeLabel(orderModel.PaymentType)` (order receipt)
- `Services/ReceiptService.cs:124` — `PayedWith = PaymentTypeLabel(giftcard.PaymentType)` (giftcard receipt)

`PayedWith` is `Models/Receipt/ReceiptOrderModel.cs:17-18`, serialized as `"payedWith"` and POSTed to an
external renderer — `Services/OkamFunctionsDocumentRenderer.cs:37-47`, `POST .../api/GetReceipt`. The PDF
template itself lives in the `okamnodefunctions` Azure Function, **outside this repo**, so what an empty
string renders as on the page cannot be read here. What *can* be read is the shape of the value: the sample
payload at `Bruno/Okam API/invoice/GetReceipt.bru:26` is `"payedWith": "Betalt med Vipps"` — the entire
sentence, verb included, is carried in the value. So an empty value is not "Betalt med: ␣"; it is a line
with nothing in it at all.

### Correction 1 — the citation that "did not resolve" was not the lane's

The flag record (`docs/plan/plan.md:20648`) and this lane's brief both state that the payment-label lane
named `Services/Kassa/ReceiptService.cs`. It did not. Its artifact
(`lanes/L-PAYMENT-LABEL-UKJENT/mutation-log.md:173`) reads:

> `Services/ReceiptService.cs:152`

— the correct path, and the correct line, landing exactly on the method signature. Its RETURN block
(`docs/plan/returns/L-PAYMENT-LABEL-UKJENT-1.md`) abbreviated this to bare `ReceiptService.cs:152` with no
directory. The `Services/Kassa/` prefix appears nowhere in the lane's output; it first appears in the flag
record itself. **The lane was verifiable all along**; the transcription between its artifact and the flag is
what was not. Worth recording, because the estate has now spent a lane re-deriving a fact that was already
correctly cited in a file on disk.

---

## 2. Every payment type, and whether its line is blank

The enum at `Enums/PaymentType.cs` @ `8e2b57de` has **17** members. `PaymentTypeLabel` handles 11 and drops
**6** to the empty default.

| # | PaymentType | Value | Payer line | Producible on this receipt? |
|---|---|---|---|---|
| 1 | `NotSet` | 0 | **BLANK** | **YES — including on a completed sale.** See below. |
| 2 | `Giftcard` | 75 | **BLANK** | **YES** — offered in the consumer payment-method list, `Services/PaymentService.cs:229`. |
| 3 | `PayInStore` | 100 | **BLANK** | **YES** — `Services/PaymentService.cs:217`, plus the legacy waiter-order fallback. |
| 4 | `Cash` | 110 | **BLANK** | **YES** — every POS cash sale. |
| 5 | `CompanyAccount` | 120 | "Betalt med bedriftskonto" | yes (`Services/Kassa/PosSettlementService.cs:445`) |
| 6 | `Stripe` | 200 | "Betalt med kort" | yes |
| 7 | `Vipps` | 300 | "Betalt med Vipps" | yes |
| 8 | `Dintero` | 400 | "Betalt med kort" | yes |
| 9 | `DinteroVipps` | 410 | "Betalt med Vipps" | yes |
| 10 | `DinteroBillie` | 420 | "Betalt med Billie" | yes |
| 11 | `DinteroKlarna` | 430 | "Betalt med Klarna" | yes |
| 12 | `DinteroKravia` | 440 | "Betalt med Kravia" | yes |
| 13 | `DinteroTerminal` | 450 | **BLANK** | **YES** — terminal card sale, Dintero provider. |
| 14 | `WoltMarketplace` | 500 | **BLANK** | **YES** — `Services/WoltService.cs:861,887`. |
| 15 | `Surfboard` | 600 | "Betalt med kort" | yes |
| 16 | `SurfboardVipps` | 610 | "Betalt med Vipps" | yes |
| 17 | `SurfboardTerminal` | 650 | "Betalt med kort" | yes |

### Correction 2 — six, not five

The payment-label lane named five: Cash, PayInStore, Giftcard, DinteroTerminal, WoltMarketplace. It omitted
**`NotSet`**, which also falls through. `NotSet` is not a harmless placeholder here (see below), so the
undercount matters.

### None of the six is a deliberate blank

The brief invited the refutation "the blanks are deliberate for types with no payer". They are not. Each of
the six names a real tender or a real state, and the repo already says so in its own words — the test at
`WebApi.Tests/Meals/CompanyAccountClassificationTests.cs:41-57` was written when `CompanyAccount` was added
to the switch, and its comment reads:

> the point of the case: an unmapped tender falls to the switch default and renders an EMPTY payer line.
> That is what CompanyAccount did before, and what it must never do again.

So the empty default is a **known** defect that was closed for exactly one value and left open for six.
That test is also the only assertion anywhere over `PaymentTypeLabel` — `git grep` over `WebApi.Tests/**`
returns five hits, all in that one file, all about `CompanyAccount`. No test pins any of the six.

---

## 3. Reachability, traced per blank type

`GetReceiptModel(int orderId)` (`Services/ReceiptService.cs:55-100`) reads `order.PaymentType` through
`IOrderModelBuilder`. `GetReceiptModel(Guid giftcardId)` (`:102-147`) reads `giftcard.PaymentType`. Both are
reachable from routed, authenticated endpoints:

- `Controllers/OrdersController.cs:154` `GET receipt/{orderCode}` (owner or authorized staff, guard at `:160-164`)
- `Controllers/OrdersController.cs:188` `GET receipt/{orderCode}/email` → `SendReceipt` → PDF mailed to the customer
- `Controllers/OrdersController.cs:217` `GET receipt/{orderCode}/force`
- `Controllers/GiftcardController.cs:95` / `:124` `GET receipt/{giftcardId}`, `.../force`
- DI: `Program.cs:554` `services.AddScoped<IReceiptService, ReceiptService>()`

**Cash (110).** `Services/Kassa/PosSettlementService.cs:726` — `order.PaymentType = DominantPaymentType(confirmed)`.
`DominantPaymentType` (`:974-980`) returns the `PaymentType` of the largest confirmed `OrderPayment`. A cash
allocation creates `new OrderPayment { PaymentType = PaymentType.Cash }` at `:316-321`. An ordinary POS cash
sale therefore stamps the order `Cash`, and its emailed receipt has no payer line.

**DinteroTerminal (450).** The terminal branch at `:351` gates on `request.PaymentType.IsTerminalPayment()`,
and `Helpers/PaymentTypeExtensions.cs:80-83` defines that as `DinteroTerminal || SurfboardTerminal`. The
`OrderPayment` is built with `PaymentType = request.PaymentType` at `:386`. So the same physical card sale
prints **"Betalt med kort"** on a Surfboard terminal and **nothing at all** on a Dintero terminal. That
asymmetry is the strongest single argument that the blanks are accidental rather than designed. Also written
directly at `Services/DinteroTerminalService.Initiate.cs:73,228`.

**PayInStore (100) and Giftcard (75).** Both are offered to the consumer client by
`Services/PaymentService.GetPaymentMethods` (`:217` and `:229`). `Services/CartService.cs:615` builds
`new Order()` and `:645` sets `PaymentType = cart.GetPaymentTypeWithFallbackToLegecy()`, which returns the
cart's own type — or, on the legacy path, `PayInStore` for any `IsWaiterOrder`
(`Helpers/PaymentTypeExtensions.cs:106,118`). Ordinary consumer checkout, no POS involved.

**WoltMarketplace (500).** `Services/WoltService.cs:861` `new Order` with `PaymentType = PaymentType.WoltMarketplace`
at `:887`. Every Wolt marketplace order.

**NotSet (0) — the one the prior lane missed, and the sharpest of the six.** Orders are created with
`NotSet` at `Services/Kassa/OpenCheckService.cs:98,106` (every open check) and
`Services/Kassa/CheckSplitService.cs:462,473` (every split part). Those are transient. What is not transient
is `Services/Kassa/PosSettlementService.cs:576-578`, whose own comment reads:

> A fully comped order (100% discount, FinalAmount 0) that actually carries lines legitimately settles with
> no tender at all — the SALREC then has no payment lines and **order.PaymentType stays NotSet** (there was
> no tender to classify).

So a comped sale is **journalled, completed, and permanently `NotSet`**, and its receipt prints a blank payer
line forever. This is not an unsaved draft; it is a finished fiscal event.

**Giftcard receipt path.** `giftcard.PaymentType` is client-supplied at `Services/GiftcardService.cs:190`
(`giftcard.PaymentType = model.PaymentType`), then overridden to `Vipps` by `Controllers/VippsController.cs:418`
or `Stripe` by `Services/StripeService.cs:238` on completion — both labelled. `GiftcardService.cs:356` treats
anything other than `Vipps`/`Stripe`/`NotSet` as `PaymentTypeError`, so in practice the giftcard receipt is
labelled. The exposure here is narrow: `Controllers/GiftcardController.cs:95-114` has no status guard, so a
receipt pulled for a giftcard still `Initiated` (`PaymentType` never overridden, still `NotSet`) renders
blank. Lower severity than the order path, but the same root cause.

---

## 4. Correction 3 — this is not on a kassasystemforskrifta artifact

The flag and the brief both frame this as "arriving on a kassasystemforskrifta artifact rather than an admin
list". That framing is wrong, and it changes the severity.

There are **two independent payer-line emitters** on this tip, and they do not share code:

| | PDF receipt | Kassa receipt |
|---|---|---|
| Label fn | `Services/ReceiptService.cs:152` `PaymentTypeLabel` | `Services/Kassa/EscPosReceiptBuilder.cs:315` `PaymentLabel` |
| Default | `return string.Empty` (:177) — **blanks** | `return paymentType.ToString()` (:327) — **never blank** |
| Emitted by | `ReceiptService` → external Azure Function → PDF | `PosReceiptService` + `EscPosReceiptBuilder` → printer / public link |
| Reached by | order + giftcard receipt endpoints | `Controllers/PosController.cs:363,396` `SendReceipt`/`SendReceiptSms` |

The kassa receipt — the one the forskrift governs, the one the inspector reads — prints its payment lines at
`EscPosReceiptBuilder.cs:155-157` from the journal entry's `PaymentLines`, and its label function falls back
to the enum name rather than to empty. **The kassa receipt never prints a blank payer line.** The electronic
receipt sent from the POS (`PosReceiptService.cs:639-720`) is a link to that same journal-backed document,
not to `ReceiptService`'s PDF — the two paths never meet.

So the defect is on the **customer-facing PDF receipt** (emailed and downloaded, for orders and giftcards),
which is a commercial document, not the fiscal one. That is a real defect worth fixing — an emailed receipt
for a cash sale that does not say how it was paid — but it is **not** live statutory exposure, and C6 is not
breached by it.

**One genuine kassa-side observation, named not fixed.** `EscPosReceiptBuilder.PaymentLabel` maps only
`Cash` → "Kontant", `SurfboardTerminal`/`DinteroTerminal` → "Kort", `Giftcard` → "Gavekort". Journal payment
lines can also carry `CompanyAccount` (`PosSettlementService.cs:445`), which is not in that switch — so a
company credit sale prints the raw English identifier **`CompanyAccount`** on a Norwegian fiscal receipt. Not
blank, so not this flag, and legible enough that an inspector could follow it; but it is the same switch
drifting behind the same enum, and it is on the artifact that actually matters.

---

## 5. What clears the flag

`F-RECEIPT-BLANK-PAYER-LINE` clears when "no receipt prints an empty payer line for a payment type the
product can produce, or each blank is recorded as deliberate". Neither holds today: six types blank, all six
producible, none deliberate. The fix is six `case` arms at `Services/ReceiptService.cs:152-178` next to the
`CompanyAccount` arm already there, plus a decision on what `NotSet` should say — it is a *state*, not a
tender, and the sibling client lane chose "Ingen betaling registrert" for exactly this value, which reads
correctly on a comped sale. **Not fixed here: this lane is class `analysis` and locates only.**

Adjacent, same root cause, outside this flag: `EscPosReceiptBuilder.cs:315` needs a `CompanyAccount` arm.
