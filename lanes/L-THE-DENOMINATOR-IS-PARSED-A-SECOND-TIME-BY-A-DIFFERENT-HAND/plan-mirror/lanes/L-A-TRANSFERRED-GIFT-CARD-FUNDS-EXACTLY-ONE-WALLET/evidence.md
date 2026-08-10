# Evidence — L-A-TRANSFERRED-GIFT-CARD-FUNDS-EXACTLY-ONE-WALLET

Backend worktree `/Users/svendaneel/okam/wt-gcxfer`, branch `lane/giftcard-transfer-one-wallet`
**off `lane/pos-coverage-opened` @ `b368d930e`**, not off the trunk — that is where the failing pin lives.

## 1. The premise, checked at the ref before anything was edited

The brief says a failing pin exists at `b368d930e`. It does, and it was run there with the tree
unmodified (`git stash`, run, `git stash pop`):

```
FullyQualifiedName~GiftcardBalanceTests at b368d930e, nothing applied:
  Failed: 1, Passed: 3, Total: 4
  [FAIL] GiftcardBalanceTests.Passing_a_gift_card_on_moves_the_money_instead_of_copying_it
```

The pin is the one named, and it is the only red. Premise confirmed rather than assumed.

## 2. What the code did

`GiftcardService.TransferGiftcard` handed a card on by writing a **second** `GiftcardTransaction`
against the same `GiftcardId` and never reversing the holder's own. Because giftcard-to-transaction is
one-to-one on that column, the second row does not sit beside the first: EF's fixup **NULLs the first
row's `GiftcardId`** so the newcomer can own the card. The displaced row keeps its `Purchased` type and
its holder, and `GetBalance` counts `Purchased` regardless of any card. Measured, both wallets read
50000 after one 500,00 kr card was passed on, and the duplicate was attached to no gift card at all.

**Both branches did it**, and only one was under test:

| branch | before | after |
|---|---|---|
| receiver has an account | second `Purchased` row for the new holder; giver keeps a spendable orphan | the card's single row is re-owned by the new holder |
| receiver has no account yet | second `AwaitingReceiver` row for the buyer; **giver keeps a spendable orphan** | the card's single row becomes `AwaitingReceiver` |

## 3. The change

`Services/GiftcardService.cs`, one new private method and two call sites:

* `MoveGiftcardValueTo(giftcard, clientTheme, type, userId)` re-owns the transaction the card already
  has — type and holder — instead of inserting a second one. It falls back to creating a row only when
  a card carries none at all.
* Both branches of `TransferGiftcard` now call it.
* The handover copy (`CreateGiftcardCopy`) moved **above** the receiver reassignment. It reads the
  receiver fields off the live card, so taken afterwards the giver's own record of the card named the
  person they gave it to. It now also runs on the no-account branch, which never kept a record at all.

Re-owning a row rather than appending one is what `ProcessPendingTransactions` and
`PaymentService.RefundGiftcard` already do to this table. **C1 checked, not assumed**:
`GuardAppendOnly` (`Helpers/ApplicationDbContext.cs:1468`) covers journal entries, journal lines, tax
and payment lines, Z reports, the journal access log, and the Workforce audit/idempotency/publication
families. `GiftcardTransaction` is not among them and carries no deny-trigger.

**The amount is deliberately not rewritten** from `FinalAmount`. A handover moves what was paid;
restating it would paper over a divergence rather than surface it.

**One line was deleted rather than decorated.** The first draft also set `held.ClientTheme`. Every card's
transaction is created from the same hub the transfer recomputes the theme from, so no world this
product can produce makes that assignment change an outcome — and the only way to red it would have
been a fixture the product cannot build. It is gone.

## 4. Tests

`WebApi.Tests/GiftcardBalanceTests.cs`, 4 tests to 7. The existing pin now passes because the code
changed; three are new:

* `A_card_passed_to_someone_without_an_account_stops_being_spendable_by_the_giver` — the branch nothing
  had ever executed.
* `A_card_claimed_after_the_receiver_signs_up_funds_the_claimant_and_nobody_else` — parked card,
  receiver signs up, `ProcessPendingTransactions` claims it. This is the whole journey the parked card
  exists for, and the point at which the duplicate used to become spendable.
* `The_giver_keeps_a_record_naming_the_card_as_theirs` — pins the copy ordering.

**A fixture correction the new branch forced.** The seeded card's buyer was the string `"buyer"`, which
is not an account. `GiftcardTransaction.UserId` is a foreign key, and the no-account branch is the first
code in the estate that ever writes a transaction for the buyer — so the first honest run of it failed
on `SQLite Error 19: FOREIGN KEY constraint failed`, not on an assertion. The world now creates a real
buyer account. That is a test defect, not a product one: `InitiatePurchase` always sets `BuyerUserId`
from an authenticated user.

## 5. Mutation results, judged on what ran rather than on exit status

Runner: **the canonical `test/support/mutate.js`**, taken from `lane/mutation-runner-cannot-delete-work`
@ `c65b19c` by checking that ref out into its own worktree (`/Users/svendaneel/okam/wt-gcxfer-runner`) —
**not copied into a lane directory**, which is how the deleting-restore defect spread. This repository
has no `package.json`, so the runner cannot root itself in it; it is rooted in its own frontend worktree
and reaches the backend tree through `../wt-gcxfer/…`, and `MUTATE_TEST_COMMAND` points at
`lane/dotnet-suite.sh`.

**The runner printed `RED (0)` for all five, and `(0)` is exactly the shape a false result prints.** Its
reddened-name counter reads jest's `✕` lines, which xunit never emits, so that column is meaningless
here and was not used. Every judgement below comes from `lane/suite-runs.log`, one line per invocation.

| mutation | tests run | failed | the test that caught it |
|---|---:|---:|---|
| the moved row keeps its old holder | 7 | 1 | `Passing_a_gift_card_on_moves_the_money_instead_of_copying_it` |
| the moved row keeps its old type | 7 | 1 | `A_card_passed_to_someone_without_an_account…` |
| a known receiver gets a second row again | 7 | 1 | `Passing_a_gift_card_on_moves_the_money_instead_of_copying_it` |
| an unknown receiver gets a second row again | 7 | 2 | `A_card_claimed_after_the_receiver_signs_up…`, `A_card_passed_to_someone_without_an_account…` |
| the handover copy is taken after the reassignment | 7 | 1 | `The_giver_keeps_a_record_naming_the_card_as_theirs` |

Baseline **7**, non-zero, and **every mutation run executed 7**. `lane/verify-mutations.py` asserts that
and refuses the sweep otherwise.

### 5.1 The instrument was proven in both directions before its results were believed

The coordinator's warning is that a suite judged by exit status alone reports false greens *and* false
reds. Both shapes were produced deliberately against this wrapper:

| control | what was done | result |
|---|---|---|
| false **green** | a filter matching no test | wrapper exit **7**, logged `ZERO`; the canonical runner would have read exit 0 as *survived* |
| false **red** | `held.UserId = ;` — a mutant that does not compile | wrapper exit **9**, logged `BUILD`; the canonical runner would have read a non-zero exit as *killed* |

`verify-mutations.py` refused a sweep containing either, naming both lines. In .NET the compile *is* the
parse check the coordinator asked for, and it is reported separately from a test failure rather than
collapsed into one exit status. Source restored byte-identical after the control (`cmp -s`).

## 6. Not fixed, and it wants an owner

**`GiftcardController.TransferGiftcard` has no ownership check.** The class carries a bare `[Authorize]`,
so **any authenticated user can transfer any gift card** whose id they know, to any phone number they
like. `CancelPurchase`, the action immediately above it, is `[Authorize(Roles = PowerUserRole)]` — the
adjacent destructive action was gated and this one was not.

It is left alone deliberately: the service takes no actor at all, so the check cannot be expressed
without changing the method's signature and its caller, which is a different change from this one and
should not ride along inside a money fix. It is also a standing **C4** gap — a money-path write
reachable from a path carrying no resolved actor. This change neither widens nor narrows it.

Related and cosmetic, now fixed as part of §3 rather than left: the handover copy used to record the
new receiver on the old holder's own copy of the card.

## 7. Where the measurements are, and one more ignore rule

`measurements/` beside this file. **`suite-runs.log` and `negative-controls.log` are the load-bearing
evidence** — every judgement in §5 comes from them rather than from the runner's own verdict — and both
are caught by `.gitignore:5`, a bare `*.log`. They were force-added and confirmed with
`git ls-files --error-unmatch`. That is the second ignore rule this pair of lanes has hit silently; the
first was the bare `artifacts/` at `.gitignore:111`. **Anything a lane writes as evidence should be
checked with `git check-ignore -v` before it is called committed.**

| file | what it is |
|---|---|
| `suite-runs.log` | one line per suite invocation: tests run, tests failed, and which ones |
| `negative-controls.log` | the deliberate `ZERO` and `BUILD` runs from §5.1 |
| `mut.json`, `mut.results.json` | the mutation spec and the canonical runner's own output |
| `dotnet-suite.sh` | the suite command, and the three refusals that keep exit status honest |
| `verify-mutations.py` | the judge: baseline count, equal counts, no run that skipped the tests |
| `final-tier-summary.txt` | 4959 passed / 1 failed / 10 skipped of 4970 |
