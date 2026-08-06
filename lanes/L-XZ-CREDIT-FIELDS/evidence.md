# L-XZ-CREDIT-FIELDS — evidence

Lane: `L-XZ-CREDIT-FIELDS` · brief `998f9f9c` · actor `agent:L-XZ-CREDIT-FIELDS`

**Exit:** the X and Z reports carry the count and amount of delivery receipts and a specified count
and amount of credit sales, and the systembeskrivelse describes what the code does.

---

## 1. Base, and why this is not `fail-spec`

| | |
|---|---|
| Worktree | `/Users/svendaneel/okam/wt-xzcreditfields` (created by this lane; never touched `OkamAPI-modules`) |
| Branch | `lane/xz-credit-fields` (local, **never pushed**; no shared ref moved) |
| Base | **`569887a5`** — the backend integration tip named in the brief |

**Base chosen deliberately.** Two candidates were measured before any code was written:

- `569887a5` — carries the utlkvit family land (`b9c95082` and `fb522bdd` are both ancestors), so
  `Services/Kassa/KassaCreditSale.cs` exists with **one predicate read by six call sites**
  (`FinalizeService` x2, `PosReceiptService` x2, `SaftCashRegisterExportService` x2). This is the
  predicate the brief forbids duplicating, and it is only on this base.
- `integration/mig-stack-land` — **diverged, not behind**: merge-base `3579bbbc`, 54 ahead / 34
  behind, not a fast-forward. Rejected.

**Verified before building.** The exit is genuinely unmet on both candidates:

- `569887a5:Models/Kassa/XZReportModels.cs` has **no** credit-sale, cash-sale or delivery-receipt
  fields.
- `569887a5:Services/Kassa/XZReportService.cs` has **no** `UTLEVREC` case and **no** `CompanyAccount`
  handling — the medium roll-up absorbs it into `OtherTotal`'s `default` arm (lines 638, 846).
- Chapter 5 of the systembeskrivelse says nothing about either element, while the receipt chapter
  asserts the § 2-8-2 credit specification "høyrer til X/Z-rapporten og er skildra der".

**The credit half already existed — on an unlanded sibling branch, not on any base.**
`lane/meals-xz-credit @ 25586d86` (lane `L-MEALS-XZ-CREDIT`, state `built-unverified`) built the
credit-sale half on 2026-08-01. It is **59 commits behind** `569887a5` (merge-base `24dec838`) and is
an ancestor of **neither** candidate base. It also does **not** cover delivery receipts and does not
touch the systembeskrivelse. So the exit is unreachable from anywhere the plan can see, which is
`build`, not `fail-spec`.

Its field names were adopted rather than reinvented (`CashSales*` / `CreditSales*` / `CreditReturns*`
/ `CreditTotal`), because `F-XZ-CREDIT-UNSPEC` records that a probe naming `KredittsalgTotal` instead
of `CreditSalesAmount` reported absence forever. Its `CreditPortionOf` was a **second** answer to
"which payment lines are credit", sitting beside `KassaCreditSale.IsCreditSale`; that collision was
not carried over — see §3.

---

## 2. What the reports now carry

`Models/Kassa/XZReportModels.cs` — nine fields, each documented with what is counted, what is
excluded, its type and its rounding rule:

| Field | Type | What is counted |
|---|---|---|
| `CashSalesCount` / `CashSalesAmount` | `long`, ore | Registered sales, the part **not** on a company account |
| `CreditSalesCount` / `CreditSalesAmount` | `long`, ore | Registered sales, the `CompanyAccount` allocation |
| `CreditReturnsCount` / `CreditReturnsAmount` | `long`, ore | Returns carrying a company-account line; stated positive, never netted into the sale figure |
| `DeliveryReceiptCount` / `DeliveryReceiptAmount` | `long`, ore | One per `UTLEVREC` event; amount is the **delivered sale's gross** |
| `CreditTotal` | `long`, ore | Company-account medium total, net of returns |

**Rounding rule, stated and pinned.** Nothing is rounded and nothing is divided: every figure is an
integer sum of ore already on the journal's payment lines. Pinned at a boundary in
`The_split_is_exact_to_the_ore_at_a_rounding_boundary` — a 100,01 sale split 33,33 / 66,68, plus a
sale whose entire credit part is **one ore**. A kroner rounding, a percentage apportionment or an
integer division anywhere in the path lands on a different answer.

**Exclusions that matter.** Training sales are outside both halves exactly as they are outside
`SalesCount` (`A_training_sale_on_a_company_account_stays_outside_both_halves`). Returns are not
sales in either half.

**A split sale counts in both counts** and contributes its two parts to the two amounts, so the counts
may exceed `SalesCount` while the amounts always sum to exactly `SalesAmount`.

**`Cash + Credit == Sales` is a property, not an identity.** Both halves are accumulated
independently from the entries. Deriving the cash half by subtracting the credit half — which the
sibling branch did — would make the reconciliation something the code cannot fail. Mutation **M5**
(below) proves it can.

**Printed document** (`Services/Kassa/EscPosXZReportBuilder.cs`): `herav kontantsalg (n)` and
`herav kredittsalg (n)` under `Salg`, printed **unconditionally** so a nought is visible; a
`KREDITTSALG` section carrying `Kredittsalg (n)`, `Kredittretur (n)`, `Utleveringskvitt. (n)`, the
company-account medium row and the line `Faktureres, ikke mottatt` — sitting **outside** `Sum mottatt`,
because a company-account allocation is a receivable and not money the register received.

**Reprint.** The `ZReport` row has no columns for these figures and this lane may not author a
migration, so both read paths (`GetZReportAsync`, `GetZHistoryAsync`) re-project them from the Z's own
journal window using the **same accumulator** the printed original ran — not a second query with its
own window arithmetic, and not an inference from the persisted payment-means blob (whose amounts are
netted against returns and which carries no delivery events at all). Description and code agree by
construction: one `ApplyCreditAndDeliveryTotals`, two callers.

---

## 3. Constraints

- **One predicate (no collision).** `KassaCreditSale` gained `CreditPortionOf`, and `IsCreditSale` is
  now *defined in terms of it*. There is exactly one place that decides which payment lines are
  credit; the report reads it, and so do the six existing call sites. No second predicate was written.
- **C1 append-only.** Nothing is backfilled or repaired. The reprint is a read-only re-projection over
  append-only rows. No `UPDATE`/`DELETE` anywhere in the diff.
- **C2 / no migration.** **No migration authored.** No `OnModelCreating` change, no index, no
  constraint. The missing `ZReport` columns are worked around by re-projection and the limitation is
  stated in the systembeskrivelse rather than hidden.
- **C3 reachability.** No new service, controller, page or flag: the fields ride the existing
  `/report/cashpoint/{id}/x|z`, `/report/z/{id}` and the existing print path.
  `MealsPosCreditTenderReportTests` drives the **production** settlement path (open → allocate
  `CompanyAccount` → finalize) and reads the report off rows production wrote.
- **C4 money-path actor.** No new money-path write. The Z is generated with the operator id and name
  it already carried, asserted by value in the production-tier test (`OperatorId 4712`,
  `"Till operator"`).
- **C6 statutory naming NOT widened.** The § references in play are the ones already there — § 2-8-2
  in chapter 5, § 2-8-7 in chapter 4. **No second § reference was added.** Every claim now printed is
  one the code produces, and the guard in §5 keeps it that way.
- **C7 secrets.** No log or telemetry call added. `Services/OkamFunctionsDocumentRenderer.cs` was
  never opened, read, printed or copied.

---

## 4. Non-vacuity: the worlds are built so the numbers differ

`A_period_with_a_split_tender_states_every_figure_apart` uses a cash sale of 100,00 plus a sale
settled 123,45 on a company account and 76,55 in the drawer:

```
SalesCount 2   SalesAmount 30000
CreditSalesCount 1   CreditSalesAmount 12345
CashSalesCount   2   CashSalesAmount   17655
DeliveryReceiptCount 1   DeliveryReceiptAmount 20000
CreditTotal 12345   CashTotal 17655   CardTotal 0   OtherTotal 0
```

Six distinct numbers, asserted **by value**, plus six explicit `NotEqual` assertions
(credit != delivery, credit != cash, credit != sales, cash != sales, delivery != sales,
credit count != cash count). A projection that assigned one figure to several fields cannot pass.

**A zero is a claim.** `A_period_with_no_credit_sales_states_a_computed_nought` is the same route over
the same code with one variable removed: the world still produces a sale, the cash half accounts for
the whole of it, and the paper still prints `herav kredittsalg (0)`. The production tier has the same
pair — `A_cash_day_reports_no_credit_and_no_delivery_receipt` settles a cash sale through the same
harness, store and settlement service.

**Why two tiers.** The projection tier builds the journal itself, which is the only way to reach a
split tender — `PosSettlementService` refuses a company part alongside another part, so at the till
the delivery amount and the credit amount are always equal and cannot be told apart. The production
tier is what proves the wiring: `DeliveryReceiptAmount` is resolved through `ReferencedReceiptNumber`
against the Sale series, and had `FinalizeService` linked the handover document another way, the
projection would read zero forever while every hand-built test stayed green.

---

## 5. The systembeskrivelse, and a guard so it cannot go stale

`docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md` chapter 5 now describes what the code does:
the field table above, the split rule for a mixed sale, the training exclusion, the ore/no-rounding
rule, the `ReferencedReceiptNumber`-against-SALREC resolution and why the count is not derived from
`CreditSalesCount`, the `CreditTotal` bucket and its exclusion from "Sum mottatt", the printed lines,
and — stated as an **Avgrensing**, not hidden — that the `ZReport` row has no columns for these
figures and they are re-projected on reprint. The chapter-4 cross-reference now points at chapter 5.

**The claim is now checked, not trusted.** New test
`SystemDescriptionFiscalClaimTests.SystemDescription_ChapterFive_DescribesExactlyTheCreditAndDeliveryFiguresTheReportEmits`
enforces both directions, **derived from the model rather than from a list of names**:

- every `XReportModel` property whose name carries `CashSales`, `Credit` or `DeliveryReceipt` must be
  named in chapter 5 (a figure added or renamed without being described reds);
- every such identifier chapter 5 names must be a property that exists (the RF-1313 direction — the
  document cannot describe a field the code does not emit);
- and chapter 5 must contain the words `kredittsal` and `utleveringskvitteringar`, so the chapter-4
  cross-reference is true.

Guarded against vacuity: the test asserts the model declares at least 9 such fields and that the
chapter declares a non-empty set.

---

## 6. Mutation round — 8 applied, 8 red, 8 restored green

Driver: `/private/tmp/.../scratchpad/xzcredit-mutate.py`. Every mutation applied by **rewriting the
file** (mtime updated, so MSBuild recompiles) and every run a full `dotnet test` — **never
`--no-build`**. Scoped filter (61 tests): `XZCreditAndDeliveryReportTests`,
`MealsPosCreditTenderReportTests`, `SystemDescriptionFiscalClaimTests`, `XZReportServiceTests`,
`EscPosXZReportBuilderTests`, `MealsPosCreditTenderReachabilityTests`,
`DeliveryReceiptComplianceTests`, `EodServiceTests`. Baseline 61/61 green.

| # | Mutation | Red | Tests that noticed |
|---|---|---|---|
| M1 | credit total ignores every **wholly**-credit sale | 4/61 | production tier; credit return; second-Z; ore boundary |
| M2 | credit total ignores every **partly**-credit sale | 4/61 | split tender; reprint parity; printed report; ore boundary |
| M3 | delivery amount taken from the `UTLEVREC` row's own gross (0) | 6/61 | production tier; series collision; split tender; reprint; printed; ore boundary |
| M4 | delivery lookup **not** restricted to the Sale series | 1/61 | series collision |
| M5 | credit sale counted twice (reconciliation must fail) | 6/61 | production tier; credit return; split tender; reprint; second-Z; ore boundary |
| M6 | reprint stops re-projecting from the Z's journal window | 3/61 | production tier; reprint parity; second-Z |
| M7 | `Sum mottatt` absorbs the company account again | 2/61 | production tier; printed report |
| M8 | systembeskrivelse stops naming `DeliveryReceiptAmount` | 1/61 | the chapter-5 guard |

Each mutation was restored and the scoped suite re-run **61/61 green** before the next was applied.

### M4 SURVIVED on the first pass — and that is the most useful thing in this file

`A_delivery_receipt_takes_its_amount_from_the_sale_series_not_a_colliding_return_number` was written
with the sale appended **before** the colliding return. The lookup takes the first entry per receipt
number, so the sale won regardless, and dropping the `SALREC` restriction changed nothing the test
could see. The test asserted the right value for the wrong reason.

Fixed by **changing the world, not the assertion**: the return is appended first, which is what an
ordinary day looks like when it opens with an unreferenced return before its first sale. Re-run of M4
against the corrected test: **1/61 red**, restored **61/61 green**. The ordering requirement is now
written into the test as the reason it exists.

---

## 7. Suite

Container-free tier, `dotnet test --filter "Database!=SqlServer"` (never
`FullyQualifiedName!~SqlServer`):

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Base `569887a5`, clean detached checkout `/Users/svendaneel/okam/wt-xzcredit-base` | 4641 | 4629 | **0** | 12 |
| `lane/xz-credit-fields` | 4656 | 4644 | **0** | 12 |

Delta is exactly the 15 tests this lane added (12 in `XZCreditAndDeliveryReportTests`, 2 in
`MealsPosCreditTenderReportTests`, 1 in `SystemDescriptionFiscalClaimTests`).

**Zero containers started, none touched.** `docker ps` before and after the full run showed the same
five foreign SQL containers (`okam-lvsp-sql`, `okam-lwr-sql`, `okam-lws-staff-sql`, `okam-lws-sql`,
`zen_pasteur`). No SQL tier was run.

### `F-FILTER-NOT-CONTAINERFREE` does not reproduce on this base — measured, not assumed

The brief and the flag both warn that `Database!=SqlServer` still starts Testcontainers because some
classes use the SQL fixture without carrying that word in their name. That was checked here rather
than trusted: **109** test files touch a SQL fixture; every **test-bearing** one carries
`[Trait("Database", "SqlServer")]`. The four apparent exceptions
(`EventsManualCreateAttributionTests`, `MarginModuleScaffoldTests`, `MarginPriceEffectiveDatingTests`,
`Modules/TriggerRefusalAttributionTests`) mention the fixture names only in **comments or in a regex
string** — the last is itself the guard that enforces the convention. The trait, not the filename, is
what the filter matches, so on this base the filter is genuinely container-free. Consistent with the
observed result: a full 4656-test run started no container.

---

## 8. Findings

1. **The tree does NOT stay clean after a full run.** The brief states a sibling fixed the dated-output
   writer and pinned it. A full container-free run still dirties
   `artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md` with fresh `capturedAtUtc` and
   fresh entity timestamps (content otherwise identical), written by
   `WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs`. `L-MEALS-XZ-CREDIT` reported the same churn
   on 2026-08-01, so it is not new and it is not fixed at `569887a5`. **Confirmed at the base
   independently**: the clean detached checkout `/Users/svendaneel/okam/wt-xzcredit-base`, created at
   `569887a5` and never edited, came out of its baseline run with exactly the same two files dirty. So
   this is the base's behaviour, not something this lane's change provokes. **Reverted, not
   committed**, in both trees.
2. **Printed § 2-8-2 figures were being truncated off the paper.** `Row` fits the label beside the
   amount inside 32 columns and truncates the **label**, so `Utleveringskvitteringer (1)` printed as
   `Utleveringskvitteringer … 200,00` — the count stated nowhere. Found by the guard test, not by
   reading. Labels shortened to the width budget the rest of the report already uses
   (`Utleveringskvitt.`, `herav kontantsalg`, `herav kredittsalg`, `Ukjent kode <n>`) and
   `No_kredittsalg_figure_is_truncated_off_the_paper` now fails on any `…` in the output at a
   999 999,99 amount.
3. **`PaymentLabel` fell back to the English enum identifier**, so a Norwegian fiscal document would
   print `CompanyAccount`. Now exhaustive over `PaymentType`; an unmapped value renders
   `Ukjent kode <n>` — a named refusal carrying a traceable code, never an invented tender. Enforced
   from `Enum.GetValues`, so the next tender added fails the build instead of reaching paper, with a
   companion test proving the refusal is reachable so the sweep is not vacuous.
4. **`lane/meals-xz-credit @ 25586d86` should not be landed as-is.** It duplicates this work from a
   59-commit-older base, and its `CreditPortionOf` is a second definition of the credit predicate
   beside `KassaCreditSale.IsCreditSale`, which did not exist on the base it was written against.
   Landing both would produce exactly the predicate collision `F-UTLKVIT-PREDICATE-COLLISION` records.

## 9. Out of scope, deliberately

- `Services/Kassa/EodService.cs` has the same `default`-arm defect on the "Dagsoppgjør" (a
  company-funded lunch is reported as part of the day's takings). It is a different document from the
  X/Z and outside this exit; **not** changed, and not a regression introduced here.
- `XReportView.vue` and the Core `report-models.ts` do not yet show the split. Core is a submodule on
  another lane's branch.

## 10. Hygiene

Nothing pushed. No shared ref moved. Branch `lane/xz-credit-fields` exists locally only.
`/Users/svendaneel/okam/OkamAPI-modules` was never entered. No `plan accept` / `plan decide` run;
nothing under `docs/plan/**` written except this lane directory and the RETURN.
