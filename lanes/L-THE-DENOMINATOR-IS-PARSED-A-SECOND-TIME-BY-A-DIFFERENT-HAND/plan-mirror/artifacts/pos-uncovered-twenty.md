# The twenty largest uncovered Core/POS backend files

Measured, not estimated. One row of the coverage census — **Core/POS + shared** — holds almost the whole
backend gap, and an aggregate that large is not a work list. This turns it into twenty named files with
the figure each one contributes.

## How these numbers were produced

```sh
git worktree add -b lane/pos-coverage-opened /Users/svendaneel/okam/wt-posunc20 81d06c10a
cd /Users/svendaneel/okam/wt-posunc20
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" \
  --collect:"XPlat Code Coverage" \
  --results-directory ./covrun --logger "trx;LogFileName=cov.trx"
python3 covrun/parse.py covrun/<guid>/coverage.cobertura.xml 20
```

| | |
|---|---|
| repository | `OkamAPI-modules`, backend |
| commit | **`81d06c10a`** (the trunk baseline; `feature/restaurant-modules` had already moved to `057c390ad` when this ran) |
| tier | **non-SQL only** — `--filter "Database!=SqlServer"`. The ~32-minute SQL tier did **not** run |
| run | 4936 passed / **1 failed** / 10 skipped of 4947, `TESTEXIT=1`, wall clock 5 m 59 s of test plus ~13 min of report generation, 98 MB cobertura |
| the one red | `ConfirmationCodeEntropySourceTests.The_generator_draws_from_a_cryptographic_source_and_from_nothing_else` — the IL entropy pin correctly refusing coverlet's injected `Interlocked.Increment`. Red **by construction under instrumentation**, not a defect and not a flake |

**`Migrations/` is excluded, and saying so is the point.** 275 generated migration files carry 635,874
counted line-entries at 0 % covered — **86 % of the raw denominator**. Coverlet's own header therefore
prints **8.7 %** for a backend that is really at **63.3 %** excluding migrations. Any figure quoted from
this tree without that exclusion is wrong by a factor of seven.

**Parser self-check.** Cobertura emits every `<line>` twice, once under `<method>` and once in the
class-level `<lines>` block; a naive sum doubles every figure. The parser counts only the class-level
block and asserts its totals reproduce the report header exactly — 64766 / 738199 ✓. Per-file figures
are then de-duplicated by file *and* line number, so partial classes and nested types cannot inflate a
row. Treat lines as authoritative and branches as comparison only.

**Attribution rule.** A file belongs to a module when a path segment or its file name begins with
`Workforce`, `Meals`, `Events`, `Margin`, `Growth` or `Training`; `Migrations/` is its own row;
everything else is Core/POS + shared. That is a slightly wider net for the modules than the earlier
census used, which is why Core/POS holds 765 files here against the census's 850. The estate totals are
close but not identical — 37,559 uncovered non-migration lines here against the census's 37,537 — because
the two runs are at different commits, not because either parse is wrong. Where the two overlap the
figures match exactly: this parser was pointed at the census's own report first and reproduced its
published top-ten row for row.

## Where the gap sits

| module | files | lines cov/total | line % | uncovered lines |
|---|---:|---:|---:|---:|
| **Core/POS + shared** | 765 | 30037/63447 | **47.3** | **33,410** |
| Workforce | 160 | 12540/13721 | 91.4 | 1,181 |
| Meals | 81 | 5092/5922 | 86.0 | 830 |
| Events | 73 | 4373/5268 | 83.0 | 895 |
| Margin | 90 | 5570/6076 | 91.7 | 506 |
| Growth | 110 | 4987/5478 | 91.0 | 491 |
| Training | 48 | 2167/2413 | 89.8 | 246 |
| Migrations (generated, **excluded**) | 275 | 0/635874 | 0.0 | — |
| **total excl. migrations** | 1327 | 64766/102325 | **63.3** | 37,559 |

**Core/POS + shared holds 33,410 of the 37,559 uncovered non-migration lines — 89 % of the whole backend
gap in one row.** The twenty files below hold **12,544** of those 33,410 — 37 % of the row is twenty files.

## The twenty

Ranked by uncovered lines. **money** marks a file on a path where kroner move; **statutory** marks one that
produces a document a Norwegian inspector can demand.

| # | file | uncov. lines | of total | line % | uncov. branches | what it is |
|--:|---|---:|---:|---:|---:|---|
| 1 | `Services/StoreService.cs` | **1238** | 1288 | 3.9 | 533 | The store record an operator edits — approval and publishing, opening hours, delivery and payment configuration, cache invalidation. |
| 2 | `Services/CartService.cs` | **960** | 1276 | 24.8 | **643** | **money** — the basket: build it, price it, refuse it at checkout, promote it to an order. The largest single branch gap on the backend. |
| 3 | `Controllers/StoresController.cs` | **932** | 973 | 4.2 | 241 | The store HTTP surface: consumer lookup by id and slug, Brreg and VAT lookup, publish, feedback, admin settings. |
| 4 | `Mcp/Services/McpShoppingService.cs` | **886** | 1159 | 23.6 | 308 | **money** — the shopping tools an MCP agent drives: list stores and menu, configure a product, build a cart, check out. |
| 5 | `Services/WoltMenuSyncService.cs` | **834** | 834 | **0.0** | 256 | Menu synchronisation with Wolt — initial create, import, pending-change sync. Not one line is executed by any test. |
| 6 | `Services/OrderService.cs` | **715** | 957 | 25.3 | 430 | **money** — orders: authorisation, status transitions, completion, the notifications that follow them. |
| 7 | `Services/WoltService.cs` | **676** | 942 | 28.2 | **475** | **money** — Wolt delivery and marketplace: shipment promises, delivery fees, deliveries and their callbacks. |
| 8 | `Controllers/DinteroController.cs` | **661** | 731 | 9.6 | 151 | **money** — the card-payment surface: `initiate`, `capture`, `refund`, `void`, session and transaction reads. |
| 9 | `Services/InvoiceService.cs` | **651** | 1088 | 40.2 | 293 | **money · statutory** — the settlement invoice and credit note a store receives, built from Vipps, Stripe, Dintero and Okam payouts. |
| 10 | `Services/ProductService.cs` | **626** | 626 | **0.0** | 226 | **money** — the product catalogue including its price and VAT fields: create, update, bulk import, barcode and cross-store search. Zero coverage. |
| 11 | `Services/StatisticsService.cs` | **544** | 843 | 35.5 | 263 | **money** — turnover statistics, the pending-settlement report, the Wolt Drive invoice report and its PDF, heatmaps. |
| 12 | `Services/CategoryService.cs` | **505** | 526 | 4.0 | 246 | Menu categories and their images, including the global image selection. |
| 13 | `Services/PaymentService.cs` | **477** | 638 | 25.2 | **325** | **money** — which payment methods a guest is offered, and capture, cancel and refund across Stripe, Vipps, Dintero and Surfboard. |
| 14 | `Services/Analytics/GeminiClient.cs` | **461** | 461 | **0.0** | 52 | The Gemini HTTP client behind natural-language analytics — tool selection and answer composition. Zero coverage. |
| 15 | `Services/UserService.cs` | **436** | 566 | 23.0 | 200 | Accounts: profile and address, email confirmation codes, favourites, reward cards. |
| 16 | `Controllers/PosController.cs` | **432** | 669 | 35.4 | 105 | **money · statutory** — the POS surface: cash payment, the catalogue, and receipt read, print and copy by journal entry. |
| 17 | `Controllers/WoltController.cs` | **393** | 501 | 21.6 | 129 | **money** — Wolt webhooks, shipment promises, delivery-fee quotes and delivery creation. |
| 18 | `Controllers/WoltMenuController.cs` | **377** | 377 | **0.0** | 58 | The Wolt menu endpoints — import, create-initial, sync, delete. Zero coverage. |
| 19 | `ModelBuilders/CartModelBuilder.cs` | **372** | 499 | 25.5 | 161 | **money** — assembles the priced view of a basket: discounts, rewards, gift card, delivery and service fees. |
| 20 | `Services/GiftcardService.cs` | **368** | 421 | 12.6 | 136 | **money** — gift cards: purchase, completion, balance, redemption and transfer between holders. |

Four of the twenty are at **0.0 %** — `WoltMenuSyncService`, `ProductService`, `GeminiClient`,
`WoltMenuController` — 2,298 lines that no test executes at all.

### The next twenty, for whoever asks "and after that?"

Same run, same rules. **Ten of these twenty are at 0.0 %** — half of the second rank is code no test
has ever executed.

| # | file | uncov. | of total | line % | uncov. br. |
|--:|---|---:|---:|---:|---:|
| 21 | `Services/RewardService.cs` | 366 | 409 | 10.5 | 158 |
| 22 | `Services/AIService.cs` | 358 | 358 | **0.0** | 100 |
| 23 | `Controllers/OAuthLoginController.cs` | 349 | 349 | **0.0** | 50 |
| 24 | `Services/StripeService.cs` | 326 | 350 | 6.9 | 159 |
| 25 | `Services/Surfboard/SurfboardOnboardingService.cs` | 324 | 528 | 38.6 | 134 |
| 26 | `Controllers/OrdersController.cs` | 314 | 371 | 15.4 | 72 |
| 27 | `Services/OfferProposalService.cs` | 312 | 520 | 40.0 | 155 |
| 28 | `Services/WoltMenuService.cs` | 311 | 311 | **0.0** | 86 |
| 29 | `Services/DinteroService.Settlements.cs` | 298 | 298 | **0.0** | 76 |
| 30 | `Services/Analytics/ChatOrchestrator.cs` | 296 | 296 | **0.0** | 242 |
| 31 | `Services/DineHomeService.cs` | 294 | 311 | 5.5 | 66 |
| 32 | `Services/VippsService.cs` | 291 | 511 | 43.1 | 114 |
| 33 | `Services/WoltAuthService.cs` | 289 | 327 | 11.6 | 47 |
| 34 | `Controllers/VippsController.cs` | 288 | 342 | 15.8 | 108 |
| 35 | `Services/Mcp/ClientIdMetadataDocumentService.cs` | 280 | 280 | **0.0** | 110 |
| 36 | `Controllers/OpenCheckController.cs` | 277 | 277 | **0.0** | 12 |
| 37 | `Services/PlacesService.cs` | 255 | 255 | **0.0** | 70 |
| 38 | `Services/ProductVariantService.cs` | 249 | 249 | **0.0** | 188 |
| 39 | `Services/DinteroService.cs` | 244 | 329 | 25.8 | 89 |
| 40 | `Controllers/OAuthAuthorizationController.cs` | 239 | 239 | **0.0** | 62 |

`Services/StripeService.cs` at 6.9 and `Services/DinteroService.Settlements.cs` at 0.0 are the two that
should be uncomfortable: both move money, and the settlements file is where a payout is reconciled.

### Read this before quoting any row

The SQL tier did not run. Code reached only by `[Trait("Database","SqlServer")]` tests reads as
uncovered here, which most plausibly understates hosted services, projection and reconciliation workers
and the `*DbViolations.cs` guard mappers. **No row above should be quoted as "file X is only N % covered"
without that sentence.**

Second: several of these files are thin. `StoresController` and `WoltMenuController` are mostly route
plumbing, and a line count overstates the thinking in them. The risk that *is* real in a thin wrapper is
the blank-payer-line class — a mis-built query, a mis-parsed response, a field that silently comes back
empty on a document.

## What this lane covered, and why those three

Three files were taken, chosen for money or statutory weight rather than for being cheap:

| file | rank | why | tests added |
|---|---:|---|---:|
| `Services/CartService.cs` | 2 | The gate between a basket and a charged card. | 9 |
| `Services/InvoiceService.cs` | 9 | The settlement invoice and credit note — a salgsdokument an accountant books from. | 7 |
| `Services/GiftcardService.cs` | 20 | A gift-card balance is money already paid for. | 4 |

Eighteen of the twenty tests pass and **each one reds under a mutation that was written into the
production source, watched fail, and reverted** — twenty mutations in all, the last two being fixes
applied to prove the failing pins are pins. No production file was edited; the diff is three test files
on `lane/pos-coverage-opened` in the backend repo.

**Two are left failing and are defects, not test bugs.** The full write-up, the mutation table and the
raw driver output are in
`docs/plan/lanes/L-THE-BIGGEST-UNTESTED-BACKEND-FILES-ARE-NAMED-AND-THREE-ARE-COVERED/`.

* `GiftcardService.TransferGiftcard` funds two wallets from one card and leaves the first holder's
  `Purchased` row with a NULL `GiftcardId` — spendable money that no gift card explains.
* `InvoiceService.GetInvoiceModel` matches month sections on `Completed.Month` with no year, so an
  invoice period of 13–24 months (the guard permits 24) lists every order twice.

## If somebody picks this up next

Ranked by what a person would notice, not by line count:

1. **`ProductService.cs` at 0 %** (#10) — 626 lines carrying price and VAT fields, executed by nothing.
2. **`PaymentService.cs`** (#13) — 325 uncovered branches deciding what a guest is offered and what gets
   captured, cancelled or refunded.
3. **`CartModelBuilder.cs`** (#19) — the priced view of the basket; uncovered on the frontend side at the
   same time (`core/services/cart-service.ts` 4.3 %, `core/models/cart/cart.ts` 6.3 %).
4. **`InvoiceService.cs`'s remaining 90 %** (#9) — this lane covered the document shape and the VAT
   summary; the Vipps, Stripe and Okam payout branches and `CreateInvoice` are untouched.
5. **The four zero-coverage files** — `WoltMenuSyncService`, `GeminiClient`, `WoltMenuController` and
   `ProductService` — before any of them is changed, not after.

**Two things worth carrying past this lane.**

Both defects were found by writing the *first* test their file had ever had, and both are in the part of
the file a line count would have called ordinary.

And a warning about how this work goes wrong. While writing the gift-card test this lane inferred, from a
UNIQUE index in the migration chain, that the transfer would fail outright on SQL Server, and started
writing that down as a finding. **Running it refuted the inference** — EF's one-to-one fixup nulls the
old row's foreign key, so the index never fires and the real symptom is a money row nobody can trace.
Reading a schema is not the same as running against it. If a claim about an uncovered file is not
executed, it belongs in a question, not in a finding.

An honest 70 beats a decorated 95: a test that cannot fail turns an unmeasured surface into a falsely
measured one, and the next person believes it. Every test written against this list should be shown to
red under a mutation actually applied to the code it claims to guard.
