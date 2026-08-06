# L-MRG-PRICE-CORRECTION — full detail

Companion to `docs/plan/returns/L-MRG-PRICE-CORRECTION-1.md`.

Backend worktree: `/Users/svendaneel/okam/wt-mrgprice`, branch `lane/margin-price-correction`, cut from
`feature/restaurant-modules` at `3579bbbc`. Two commits: `a371bffd` (the tests) and `6368427b` (the run
receipt + trx). Local only, not pushed. **No migration authored** — `Migrations/` and the model snapshot are
byte-identical to the base.

## Why not the chain tip

The brief is right that the chain tip is not on `feature/restaurant-modules`. Established rather than
assumed: `lane/margin-waste` (`afcfddbc`) holds MIG-23, `lane/wf-w5-timesheet` (`9e82b286`) is the only
descendant of it and holds MIG-24, and **neither is an ancestor of `feature/restaurant-modules` nor it of
them** (24 commits live only on the feature branch, including the merged starter-library lane).

That divergence only bites a migration author, and this lane authors none. What it needs instead is the
most *mergeable* base, so it took the feature branch — after checking that every file it touches or reasons
about is **byte-identical** across both: `MarginStatementService.cs`, `MarginSupplierItemPriceService.cs`,
`MarginPriceResolver.cs`, `MarginSuppliersController.cs`, `MarginStatementProblems.cs`. The finalize-
immutability layer-1 guard is present on the feature branch too, so the freeze the correction is built
around is real in every world these tests run in.

## The brief's finding, executed rather than read

Every claim below is a test in `WebApi.Tests/Margin/MarginFrozenWeekRepricingTests.cs`, run against the
golden statement world. The line references in the brief were checked one by one and all five are correct.

| brief's claim | verdict | how |
| --- | --- | --- |
| the correction path works — `MarginStatementService.cs:173-208` opens the next revision as Open | **TRUE** | `CreateAsync` returns RevisionNumber 2, `PreviousStatementId` = the frozen one, state Open; it recomputes and finalizes |
| `pages/admin/margin-statements.vue:155-169` renders a correct control on the latest finalized revision | **TRUE** | `data-test="create-correction"`, `v-if="canCorrect"`, calls `createStatement(statement.periodStart)` |
| a revision recomputes at each business day's midnight — `MarginStatementService.cs:722-723` | **TRUE** | `ToInstant(date)` is `date.Date` at offset zero; `ResolveVersionCostAsync` prices the version there |
| prices are supersede-forward only — `MarginSupplierItemPriceService.cs:120-124` | **TRUE** | mutating that guard away is what makes the two hole tests red |
| once a later price exists, **every** instant covering the frozen week is refused | **TRUE, with a correction** | all seven of the week's midnights refuse — but by **two different refusals**, see below |
| the correction revision then reproduces the identical wrong cost forever | **TRUE** | 10860 in, 10860 out, against a control in the same file that moves the same arithmetic to 7980 |
| a wrong price at exactly Monday midnight cannot be re-priced at that instant (`:107-118`) | **TRUE** | and re-keying the *same* price there is an accepted no-op, so the refusal is about the money, not the instant |
| the earliest correction is one minute later, leaving Monday on the wrong price silently | **TRUE** | accepted, revision finalizes, figure does not move |

### Three corrections to the finding

1. **Two refusals, not one.** The seven midnights inside the week refuse as *backdating*
   (`"...cannot be backdated..."`). The wrong row's **own** effective instant refuses as an *overlap*
   (`"A different price already exists at this effective instant"`). Both are uncoded `AppException`s, so the
   admin client renders the server's English prose — `utils/margin/failure.js` has no key for either and
   `statement-client.js` documents the uncoded-refusal gap in its own source. A chef meets two different
   sentences for one wall.
2. **The "second, bounded case" is not a corner — it is the ordinary case.** A weekly price list is keyed
   effective from a Monday, and a statement week starts on a Monday. Whenever those coincide, the wrong row's
   `EffectiveFrom` *is* the week's only pricing instant, so the exact-instant refusal fires first and the
   backdating refusal never even gets a turn. The golden world only avoids it because its price change lands
   mid-week on 2026-07-01.
3. **The frozen predecessor is genuinely safe.** Asserted, not assumed: after a successful correction
   revision, revision 1 is still Finalized at 10860. Nothing in this lane weakens the freeze.

## The judgement

### Chosen: an operator-only backdated correction that closes into the timeline

A bounded row: `EffectiveFrom` at the instant the operator names, `EffectiveTo` at the **next existing
row's** `EffectiveFrom`, the predecessor closed at the new instant. Three properties make it defensible:

- **No row's money is ever edited.** The only UPDATE is a predecessor's `EffectiveTo`, which is precisely the
  operation the ordinary forward path already performs and which the entity documents as its append path.
  `MarginSupplierItemPrices` carries neither an append-only deny-trigger nor a `GuardAppendOnly` arm —
  checked, not assumed.
- **A correction can never become the open row.** It is bounded by construction, so the price the venue pays
  *today* is never changed by a correction. Its blast radius is strictly smaller than the existing,
  unattributed manual-price endpoint's.
- **The timeline says which it was.** `MarginPriceSource.Correction` distinguishes "the price changed on
  the 6th" from "we corrected a typo on the 6th", which is the distinction a truncated interval otherwise
  loses. That enum value costs **nothing**: `Source` persists through `EnumToStringConverter` at
  `HasMaxLength(16)` and `"Correction"` is ten characters.

### Rejected: a per-statement price override on the correction revision

It changes only what one statement computed, which sounds cheaper and is not:

- a whole new table (statement FK carrying StoreId, the priced target, money + currency, actor, reason) with
  its own uniqueness, **plus** an override map threaded through `MarginRecipeCostCalculator`,
  `MarginPriceResolver` and the `(RecipeId, Date)` memo key in `ComputeSalesFiguresAsync`;
- it does not fix the price book, so the *next* correction revision needs the override re-entered, and
  `MarginMenuMarginService`, the cost preview and the coverage panel's price-freshness read all keep quoting
  the wrong number;
- a second week frozen over the same typo needs its own override;
- and it inverts the provenance story: a statement's figures would then rest on a row that is not in the
  price history at all, so `InputReceiptJson` no longer reconstructs from the timeline it names.

The two shapes are not equivalent, and the cheaper-looking one is the larger migration.

## Why this returned `blocked`

**The chosen shape needs exactly one column, and it is an actor.**

A backdated correction is the write that most obviously has to be explicable — it changes what the record
says a supplier charged in a week somebody has already booked. `MarginSupplierItemPrice` has nowhere to put
that: `Id, StoreId, SupplierItemId, EffectiveFrom, EffectiveTo, PriceMinor, Currency, Source, ImportBatchId,
CreatedAtUtc` and no free text.

The module already holds itself to this bar in the one place it can. `MarginErrorCodes.Unattributed` is a
**401** on price-import approval, and its own words are:

> Margin's price history is append-only with no retraction path — a wrong price is superseded forward, never
> withdrawn — so an application that cannot name who approved it is refused rather than recorded.

A backdated correction **is** a retraction path. It removes the premise that sentence rests on, which makes
attribution more load-bearing here than on the import it already gates, not less. Shipping a *manual,
unattributed* retraction while an *approved, attributed* import is refused for lack of a name inverts the
module's own standard.

### What it needs, exactly

| | |
| --- | --- |
| column | `MarginSupplierItemPrices.CorrectedByReference` `nvarchar(256)` NULL |
| mirrors | `MarginPriceImportBatch.UploadedByReference` / `ApprovedByReference` — same width, same `Truncate` discipline, and the same blank-after-truncation guard `MarginPriceApprovalAttributionTests` already pins |
| optional companion | `CorrectionReason` `nvarchar(256)` NULL — wanted, not required |
| index changes | **none** — the correction row is always bounded and always at a fresh instant, so the unique `(SupplierItemId, EffectiveFrom)` and the filtered unique open-row index both survive untouched |
| new tables | none |
| enum | `MarginPriceSource.Correction = 3` — **no migration**, string-converted at width 16 |

### Why no existing table can carry it

- **`MarginSupplierItemPrice`** — no actor column, no free text. Its `CreatedAtUtc` says *when* but never
  *who*, and `CreatedAtUtc > EffectiveFrom` is not even a reliable marker of backdating: the ordinary
  forward path already permits a past `EffectiveFrom` whenever no later row exists.
- **`MarginPriceImportBatch`** — it does carry both actor references, and a price row reaches it through
  `ImportBatchId`, so routing corrections through the import path would attribute them with no schema
  change. It is not usable: a batch requires `FileName`, `BlobReference` and `FileSha256`, and the table
  carries a **unique index on the file hash per store**, so a fileless correction either collides or stores
  a fabricated SHA. It would also make a chef upload a CSV to fix a typo, and would conflate "the supplier
  sent a price list" with "we mis-keyed one".
- **A Margin audit ledger** — does not exist. Workforce, Meals and Training each have one;
  `D-GROWTH-AUDIT-LEDGER` is the same question already open for Growth. If the answer there is "every module
  gets a ledger", Margin's is a second consumer of that decision rather than a separate one, and the actor
  could live there instead of on the price row. That is precisely why this is a ruling and not a guess.

## A separate finding, recorded not fixed

**A margin statement names nobody.** `MarginPeriodStatement` and `MarginPurchaseSpendEntry` carry no actor
column, and `MarginStatementsController` resolves no user id on any action. So the weekly food-cost figure an
accountant books from — created, spend-entered, recalculated and **frozen** — has no attributable author
anywhere on disk. Same shape as `F-GR-DISPATCH-UNATTRIBUTED`, on a money surface. Pre-existing, outside this
lane's exit, and it should not be folded into the price-correction ruling: it is a wider question about the
statement surface.

## Suites

- Base, measured rather than inherited (same worktree, new test file moved aside): **4369 / 0 failed / 12
  skipped**.
- Lane at `a371bffd`: **4374 / 0 failed / 12 skipped** — **+5 added, 0 removed**.
- Trait filter `Database!=SqlServer` throughout. **No container started, none touched.** This lane held no
  SQL slot, and the three that are up were left alone.
- Receipt and trx committed at `6368427b`:
  `artifacts/tests/a371bffdba6d576caff51e432958f4feefff4bc4/RUN.md` and
  `artifacts/tests/a371bffd-fast-tier.trx`.
- Falsification raw output: `mutation-M1-same-price.txt`, `mutation-M3-guard-removed.txt` in this directory.

## Not done

- **Nothing was walked in a browser** (C5). The correction control exists and the backend path behind it is
  executed by tests; that is evidence the code behaves, not that the capability exists. The capability the
  exit criterion names does not exist at all.
- **The frontend is untouched.** A correction control would land on
  `components/admin/margin/MarginPriceTimelinePanel.vue` (form at lines 67–101, payload at 288–292),
  `pages/admin/margin-suppliers.vue` (`addPrice` at 625–634), `utils/margin/supplier-client.js`
  (`AddManualPrice` at 132) and ~6 new `mrg_price_*` keys in each of `no.ts` / `en.ts` / `de.ts`. Building it
  before the shape is ruled would be work thrown away.
- **Neither refusal carries a `margin.*` code.** Both are `AppException`. Worth closing whichever way the
  ruling goes, since the client can only quote prose today.
