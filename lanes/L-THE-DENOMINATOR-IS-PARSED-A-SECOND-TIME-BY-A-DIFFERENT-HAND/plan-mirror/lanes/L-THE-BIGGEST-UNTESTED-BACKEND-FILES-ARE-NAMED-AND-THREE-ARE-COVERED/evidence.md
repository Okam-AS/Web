# Evidence — L-THE-BIGGEST-UNTESTED-BACKEND-FILES-ARE-NAMED-AND-THREE-ARE-COVERED

Backend worktree `/Users/svendaneel/okam/wt-posunc20`, branch `lane/pos-coverage-opened` off
`81d06c10a`. The census artifact is `docs/plan/artifacts/pos-uncovered-twenty.md`.

## 1. The trunk moved under the lane

The brief names the trunk `feature/restaurant-modules` at `81d06c10a`. At branch time it was already at
**`057c390ad`** ("Land lane/the-guest-exit-is-finished onto the restaurant-modules trunk"). The branch was
taken at `81d06c10a` anyway, deliberately, so the stated baseline of 4937 / 0 / 10 stays comparable.
Nothing was forced and nothing was rebased.

## 2. The coverage measurement

Command and caveats are in the artifact. Two things worth repeating here:

* **`Migrations/` excluded.** 275 files, 635,874 counted line-entries, 0 % — 86 % of the raw denominator.
  Coverlet prints 8.7 %; excluding migrations the backend is at **63.3 %**.
* **The instrumented run is red by construction.** 4936 passed / 1 failed / 10 skipped of 4947. The one
  red is `ConfirmationCodeEntropySourceTests.The_generator_draws_from_a_cryptographic_source_and_from_nothing_else`,
  which decodes the IL of the confirmation-code generator and refuses coverlet's injected
  `Interlocked.Increment`. Guard working. Uninstrumented the same tree is 4937 / 0 / 10.

Parser: `covrun/parse.py` in the worktree. It counts only class-level `<lines>` blocks and asserts the
sum reproduces the cobertura header (64766 / 738199 ✓). Validated first against the earlier census's own
report, where it reproduced that document's published top-ten row for row.

## 3. The three files covered

| file | rank by uncovered lines | why it was chosen |
|---|---:|---|
| `Services/CartService.cs` | 2 | money — the gate between a basket and a charged card |
| `Services/InvoiceService.cs` | 9 | money and statutory — the settlement invoice and credit note |
| `Services/GiftcardService.cs` | 20 | money — a gift-card balance is kroner already paid |

Test files added, all in `WebApi.Tests/`:

* `CartCheckoutRefusalTests.cs` — 9 tests
* `InvoiceDocumentTests.cs` — 7 tests
* `GiftcardBalanceTests.cs` — 4 tests

Nothing in the production tree was edited. The diff is three new test files.

## 4. Two defects, left failing

### 4.1 Passing a gift card on funds two wallets and orphans the first

`GiftcardBalanceTests.Passing_a_gift_card_on_moves_the_money_instead_of_copying_it`

`GiftcardService.TransferGiftcard` (`Services/GiftcardService.cs:418`) hands a completed card to a new
holder by writing a **fresh `Purchased` transaction against the same `GiftcardId`** (`:454`) and a
`Transferred` copy of the card for the old holder (`:455`). The old holder's own `Purchased` row is
never reversed or retyped, and `GetBalance` (`:113`) is `sum(Purchased) − sum(Redeemed)`; `Transferred`
is counted neither way.

**Measured**, transferring a 500,00 kr card from Alice to Bob. The three rows afterwards:

```
user=alice type=Purchased  amt=50000  card=NULL        <- still spendable, no card behind it
user=bob   type=Purchased  amt=50000  card=ORIGINAL
user=alice type=Transferred amt=50000 card=<the copy>  <- counted by nothing
```

`GetBalance(bob) == 50000` **and** `GetBalance(alice) == 50000`. One card, two wallets.

**The second half is worse than the first, and it is why nothing has caught this.** Giftcard-to-transaction
is a one-to-one keyed on `GiftcardTransaction.GiftcardId`
(`Helpers/ApplicationDbContext.cs:628-632`), and that column carries a UNIQUE filtered index in the
chain (`Migrations/20240517193802_GiftcardAndRewards.cs:323-328`, and the model snapshot at
`ApplicationDbContextModelSnapshot.cs:2376-2378`). EF resolves the conflict by **NULLing the old row's
`GiftcardId`** so the new row can own the card — so the unique index never fires, on any provider, and
the old holder is left with a `Purchased` row for 500,00 kr that no gift card explains and nothing can
trace back.

**Correction worth recording.** This lane first inferred from the unique index that SQL Server would
reject the second insert and the transfer would fail outright. **The test refuted that** — the count of
rows carrying the card's id is 1, not 2, because of the fixup above. The inference was wrong and only
running it showed so; the write-up now states the measured rows.

Reachable: `GiftcardController.TransferGiftcard` (`Controllers/GiftcardController.cs:233`). Both branches
of the transfer write against the card's id — the `AwaitingReceiver` branch at `:447` does the same.

Not fixed here, and the fix is a product call rather than a mechanical one. Moving the existing row to
the new holder (`GiftcardTransaction.UserId = receiverUser.Id` instead of a second insert) satisfies all
three assertions and is proven to green the whole class — mutation `MGFIX2` below — but a reversing
entry keeps a better audit trail, and these rows feed `PaymentTransaction`.

### 4.2 An invoice longer than a year lists every order twice

`InvoiceDocumentTests.Every_order_is_listed_once_on_an_invoice_that_spans_more_than_a_year`

`InvoiceService.GetInvoiceModel` fills each month section by matching
`line.Completed.Month == month.Month` (`Services/InvoiceService.cs:943` and `:956`) — **month with no
year**. The guard above it only throws past 24 months (`:932`), so any period of 13–24 months puts every
line into both occurrences of its calendar month.

Observed on a 14-month period with 4 lines: 8 order rows on the document. The monthly SUM rows are
double-added to the "Totalt" section too, so the month sums stop reconciling with the grand total, which
is computed separately over `entity.Lines` and stays correct.

Narrow but real: settlement periods are normally weeks or a month, so this needs a manual or a
back-dated invoice. It is a document a store books from, which is why it is written down rather than
shrugged off.

## 5. Mutation results

Driver: `covrun/mutate.py` + `covrun/mutations.json` in the worktree, raw output in
`covrun/mutation-results.txt`. Each row is a change **written into the production source**, a rebuild, a
filtered run, then a byte-identical restore, a second rebuild and a second run. Nothing was described
and not applied.

**Every one of the eighteen passing tests reds under its mutation and greens again on restore. No test
survived every mutation, so none was deleted.**

| id | file · change | test it aims at | mutated | restored |
|---|---|---|---|---|
| MI1 | InvoiceService — heading always "RAPPORT" | A_credit_note_says_KREDITNOTA… | **red** | green |
| MI2 | InvoiceService — credited invoice printed unconditionally | An_ordinary_settlement_report… | **red** | green |
| MI3 | InvoiceService — VAT grouped by a constant 25 | The_VAT_summary_totals_each_rate… | **red** | green |
| MI4 | InvoiceService — zero-rated amount left in the basis | The_basis_the_store_is_charged_on… | **red** | green |
| MI5 | InvoiceService — month section takes every line | A_month_the_settlement_never_touched… | **red** | green |
| MI6 | InvoiceService — period guard raised to 240 months | An_invoice_period_longer_than_two_years… | **red** | green |
| MG1 | GiftcardService — balance adds redemptions | A_guests_balance_is_what_they_were_given… | **red** | green |
| MG2 | GiftcardService — brand filter dropped from the balance | A_gift_card_bought_in_another_brands_app… | **red** | green |
| MG3b | GiftcardService — cancellations subtract | A_refunded_gift_card_stays_in_the_history… | **red** | green |
| MC1 | CartService — gift-card cover test becomes `<=` | A_gift_card_worth_exactly_the_bill… | **red** | green |
| MC2 | CartService — GiftcardBalanceTooLow hard-wired false | A_guest_paying_by_gift_card_is_stopped… | **red** | green |
| MC3 | CartService — price-differ inverted to `==` | A_guest_is_stopped_when_the_basket… | **red** | green |
| MC4 | CartService — stock test becomes `>=` | The_last_item_on_the_shelf… | **red** | green |
| MC5 | CartService — InventoryEnabled flag ignored | A_store_that_switched_inventory_off… | **red** | green |
| MC6 | CartService — stock threshold raised by 1000 | An_item_that_ran_out… | **red** | green |
| MC7 | CartService — gift-card exemption from the minimum removed | A_gift_card_may_pay_for_a_basket_below… | **red** | green |
| MC8 | CartService — PriceTooLowError hard-wired false | A_basket_below_the_stores_minimum… | **red** | green |
| MC9 | CartService — CartExists stops checking for items | An_empty_basket… | **red** | green |

And the converse, so the two failing tests are shown to be pins rather than broken tests:

| id | fix applied | result |
|---|---|---|
| MIFIX | `order.Completed.Year == month.Year` added to both month filters (`:943`, `:956`) | InvoiceDocumentTests **7/7 green**; reverted, back to 6/7 |
| MGFIX2 | the existing transaction moved to the new holder instead of a second insert (`:454`) | GiftcardBalanceTests **4/4 green**; reverted, back to 3/4 |

`MG3` and `MGFIX` in the raw log are the earlier forms of `MG3b`/`MGFIX2`, run before two gift-card
tests were corrected (see §7); their replacements are the rows above.

**The stale-build trap is closed, not hoped away.** `CLAUDE.md` warns that restoring a file with a
timestamp-preserving copy lets `--no-build` measure the previous binary, which defeats exactly this
red-then-green procedure. The driver writes the bytes and then calls `os.utime`, asserts the restored
file is byte-identical to the original, and asserts `bin/Debug/net8.0/WebApi.dll`'s mtime **moved**
across every build — a build that compiled nothing is reported as `STALE BUILD`, never as a result. No
row above hit that branch.

## 6. Two of this lane's own tests were wrong first

Both were caught by reading the production code they claimed to describe, not by a reviewer.

* The first version of the cancellation test seeded a `Purchased` row **and** a separate `Canceled` row
  for the same money. `PaymentService.RefundGiftcard:697` does not add a row — it **retypes** the single
  existing one. The test asserted over a world the product cannot produce, which is the decorated
  coverage this lane was told not to ship. Replaced with a seed of one live card and one refunded card.
* The first version of the transfer test named the wrong symptom (§4.1).

Recording this because the same trap is waiting in every one of the other seventeen files: on a surface
with no tests, there is nothing to tell you your fixture is impossible.

## 7. Housekeeping that bit, and would bite the next lane

`dotnet test` on the non-SQL tier **rewrites a tracked file**: `artifacts/journeys/ev-dietary/run-sheet.json`
is regenerated by `WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs` with fresh timestamps on every
run. A lane that commits with `git add -A` after running the tier sweeps that in. It was restored, not
committed.

**`docs/plan/artifacts/` is gitignored, and silently.** `.gitignore:111` is a bare `artifacts/`, which
matches a directory of that name at any depth, so the census this lane was told to commit was refused by
`git add` with no warning beyond the hint. It was force-added, which is exactly the escape hatch that
rule's own comment describes for records a lane's exit names. **The next document put under
`docs/plan/artifacts/` will be ignored the same way** — either force-add it or add one negation line
(`!docs/plan/artifacts/`) to `.gitignore`. That line was not added here because `.gitignore` is a shared
file and several lanes are working in this checkout; it is an owner's one-line call.

A third one, cheaper but it cost this lane a wrong decision: piping the mutation driver through
`| tail -50` withheld every line until the pipeline ended, so a driver that was running normally at ~35 s
a mutation looked stalled at five minutes. It was stopped and restarted on that false reading. `tail`
and `head` cannot line-buffer; a long-running script's progress has to go somewhere it can be read.

## 8. Where the raw measurements are

`measurements/` beside this file, copied out of the worktree before it was removed:

| file | what it is |
|---|---|
| `mutation-results.txt` | the driver's own output, all twenty rows, mutated and restored results |
| `core-pos-ranked-60.txt` | the parser output the artifact's tables were built from, sixty rows deep |
| `parse.py` | the cobertura parser, including its header self-check |
| `mutate.py` | the mutation driver, including the mtime assertion |
| `mutations.json`, `mutations2.json` | every mutation's exact anchor and replacement text |

The 98 MB `coverage.cobertura.xml` was **not** kept; the command that regenerates it is in the artifact.
