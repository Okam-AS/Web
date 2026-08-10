# Review — the two money fixes

Under review: `71ac73af1` (`lane/giftcard-transfer-one-wallet`) and `a9d408bfb`
(`lane/an-invoice-lists-each-order-once`), both off `lane/pos-coverage-opened` `b368d930e` in
`OkamAPI-modules`. Reviewer: agent:L-READ-THE-TWO-MONEY-FIXES · 2026-08-07 · read-only; one
throwaway worktree (`OkamAPI-money-review`, removed).

## Verdict

**Both fixes are correct and both should land — with one finding that outranks either of them and
belongs in the same tranche as a Flag, not a silent carry-over.**

- **Gift card `71ac73af1`: APPROVE.** The completeness claim survives the third-path hunt: the two
  transfer branches were the only unguarded second-write sites, and I found no third. The C1 claim
  is true, the handover-copy move is right and I would keep it.
- **Invoice `a9d408bfb`: APPROVE, including the heading.** The inverted-risk argument holds — I
  verified the closure at source, and the fix is safe rather than merely incomplete. The
  `WrappedService` non-defect is confirmed.
- **The finding that outranks both:** `GiftcardController.TransferGiftcard`
  (`Controllers/GiftcardController.cs:232-233`) carries only the class-level `[Authorize]`
  (`:13`), and `GiftcardService.TransferGiftcard(giftcardId, phone)` takes **no caller identity at
  all**. Any signed-in user can hand any card whose GUID they know to any phone number. The gift
  card lane disclosed this and did not fix it — correctly, it is out of its scope — but the fix it
  *did* make is what makes this the last remaining hole on the path: before `71ac73af1` a transfer
  minted money for everyone; after it, a transfer moves one wallet's money to whoever asks. **The
  exact change: resolve the caller and require `giftcard.ReceiverUserId == callerId` (the holder is
  the only party who can pass a card on), and record the actor on the write.** Until then this is
  also a standing **C4** breach — a money-path write reachable with no resolved actor — pre-existing,
  not introduced, and not cleared.

## 1. Gift card — is there a third path?

**The mechanism, confirmed.** `Giftcard`↔`GiftcardTransaction` is one-to-one on
`GiftcardTransaction.GiftcardId`; writing a second row for the same card makes EF's fixup NULL the
first row's `GiftcardId` so the newcomer can own the card. The displaced row keeps `Purchased` and
its old holder, and `GetBalance` (`Services/GiftcardService.cs:113-128`) sums
`Purchased − Redeemed` **by `UserId` only** — it never joins the card. So an orphaned row is
spendable money that no card explains. That is exactly why the unique index never fires, and it is
why the lane's own aborted "SQL Server would reject this" paragraph was right to be abandoned.

**I hunted the third path and did not find one.** Every site that writes a `GiftcardTransaction`
against an *existing* card id:

| site | second write possible? |
|---|---|
| `GiftcardService.cs:298` / `:304` (CompletePurchase) | **No** — guarded by `if (giftcard.Status != GiftcardStatus.Initiated) return;` plus a capture-status re-entry guard, so a repeat call cannot reach the write |
| `:440-460` TransferGiftcard, receiver-exists branch | **fixed here** (re-owns) |
| `:440-460` TransferGiftcard, no-account branch | **fixed here** (re-owns) — the path nothing had ever executed |
| `:561` inside `CreateGiftcardCopy` | **No** — the copy is a fresh `Guid.NewGuid()` card with `GiftcardTransactionId = null`; one card, one row |
| `ProcessPendingTransactions` `:379-404` | **No** — retypes the held row (`Type = Transferred`) and gives the claimant value via a fresh copy card |
| `PaymentService.cs:697` `RefundGiftcard` | **No** — retypes to `Canceled` in place |

Two adjacent behaviours I checked because they *look* like leaks and are not: a **re-transfer**
(status stays `Completed` after a receiver-exists transfer, so a card can be passed on again) still
re-owns the same single row each time and mints nothing; and the **copies** accumulated by each hop
carry `GiftcardTransactionType.Transferred`, which `GetBalance` does not count. Balance arithmetic
is closed under both.

**`MoveGiftcardValueTo`'s `held == null` fallback** (`:499-504`) creates a row where none exists.
That is not a duplicate (there is nothing to displace) and it preserves the pre-fix behaviour for a
card whose transaction is missing. Correct, and worth keeping.

**C1 verified, both halves.** `GuardAppendOnly` (`Helpers/ApplicationDbContext.cs:1468`) covers the
journal family (`JournalEntry`, `JournalLine`, `JournalTaxLine`, `JournalPaymentLine`, `ZReport`,
`JournalAccessLog`), the Workforce audit/idempotency/publication/receipt families and
`MealsAuditEvent` — **`Giftcard`/`GiftcardTransaction` appear nowhere in it** (zero matches across
the whole guard body). And `RefundGiftcard` does retype these rows in place
(`PaymentService.cs:697`, plus `:638`). So re-typing a `GiftcardTransaction` is neither a C1
violation nor a novel practice on this table.

**The handover-copy move — keep it.** It is a behaviour change beyond the pin, and it is the right
one: `CreateGiftcardCopy` reads `ReceiverUserId`/`ReceiverPhoneNumber` off the live card
(`:485-486` of that method), so taken after the reassignment the giver's own record named the person
they gave the card to — a record that is wrong about its own subject. Taken before, it names the
holder the card left. It now also runs on the no-account branch, which previously kept **no record
at all**; that is a gap being closed, not scope creep. The copy carries `Transferred`, so it adds no
balance. Pinned by `The_giver_keeps_a_record_naming_the_card_as_theirs`, which asserts the copy's
`ReceiverUserId`/`ReceiverPhoneNumber` are the giver's — i.e. it reds if the move is reverted.

## 2. Invoice — the heading belongs, and the inverted risk is genuinely closed

**Keying: correct.** `Completed.Month == month.Month` with a period the guard allows to run to 24
months listed every order under **both** occurrences of its calendar month; the per-month sums then
disagreed with the payout beneath them. `:952` now keys `Year && Month`, and the two identical
`Where` clauses collapsed to one materialised list — the right shape, since the membership rule
was the thing that was wrong and a second copy beside the sums is how a corrected one drifts back.

**The heading belongs in this fix.** Two sections headed `1.–31. mai` in one document are
arithmetically correct and unreconcilable against a store's own books — the reader cannot tell which
May a line belongs to, which is the same defect one layer up from the sums. A fix that leaves the
document unreconcilable has not finished the job it started, and it is pinned separately (M3 reds
when the year leaves the heading), so it is not an unmeasured rider. **Keep it.**

**The inverted risk — verified closed at source, so the fix is safe.** Under year+month keying a
line whose `Completed` falls outside every iterated section would vanish from all sections while
still counting in the total. I verified the closure end to end rather than accepting it:
lines are built by `x.Completed >= model.From && x.Completed <= model.To`
(`Services/InvoiceService.cs:719-720`, and the same bound at `:754-755`), and the invoice entity
takes **those same two values** — `InvoicePeriodFrom = model.From`, `InvoicePeriodTo = model.To`
(`:812-813`). The section loop runs `numberOfMonths` from `InvoicePeriodFrom` (`:929-941`), i.e.
every calendar month from From's month through To's month inclusive — a **superset** of the
interval the lines were filtered on. So every line's `(Year, Month)` necessarily hits exactly one
section. The argument holds, and the fix is strictly safer than what it replaces.

One adjacent shape, pre-existing and not this lane's: `entity.InvoicePeriodFrom.Value` (`:929`)
throws if the period is null, so a null-period invoice fails before the loop rather than producing a
sectionless document. Worth knowing; not introduced here.

**`WrappedService.cs:189,199` confirmed NOT a defect.** Its orders are fetched between
`new DateTime(2025,1,1)` and `new DateTime(2025,12,31,23,59,59)` (`:59-62`), a single calendar
year, so month-only matching is unambiguous by construction. Recorded here so nobody "fixes" it.

## 3. Instruments — credited exactly as far as each was proven

The gift card lane proved its runner in **both** directions (a no-match filter exits 7 `ZERO`; a
non-compiling mutant exits 9 `BUILD`), so its "all five mutations killed, each having executed the
full baseline of 7" is fully backed.

The invoice lane **did not run the `ZERO` control and said so**, and I do not credit it with one.
But its four REDs are not void, for a reason its disclosure understates: its own
`mutation-runs.log` records **`total:9` on every run** alongside `failed:` counts
(baseline `total:9 failed:0`, then `failed:2/3/1/1`) and an **mtime move per run**. An executed-test
count *is* the fact a `ZERO` control exists to establish, and it is present per-run in the evidence.
So: the control was not run, the fact it protects was nevertheless recorded, and the four kills
stand. The `"reddened": 0` fields in `mutations.results.json` are the jest-marker artifact on an
xunit suite — cosmetic, and superseded by the log's `failed:` counts. **The exact change (record,
not code): state in that lane's evidence that per-run `total`/`failed` is what backs the kills,
since a reader who sees only `reddened: 0` has been given the signature of a void run.**

## 4. Composition and tier

The two branches share base `b368d930e` and **merge clean in either order** (disjoint files:
`Services/GiftcardService.cs` + `WebApi.Tests/GiftcardBalanceTests.cs` versus
`Services/InvoiceService.cs` + its own tests and lane evidence). Composed tier, from `WebApi.Tests/`
with `--filter "Database!=SqlServer"`:

**4962 passed / 0 failed / 10 skipped (4972 total), duration 6 m 9 s, exit 0, no abort line above
the summary.** The tier dirtied the tracked `artifacts/journeys/ev-dietary/run-sheet.json` exactly
as the trap predicts; restored with `git checkout --` before teardown.

One landing-shape note: the composed tree stands on `b368d930e`, which is itself unlanded — both
branches carry `lane/pos-coverage-opened`'s commit as their tail, each modifying exactly one of the
three test files that commit creates. Landing either fix therefore lands pos-coverage-opened too;
this is a stacked chain, not a conflict, and the green composed tier covers all three commits.

The known red rides as briefed: `GiftcardBalanceTests.Passing_a_gift_card_on…` is the pin
`71ac73af1` turns green, so **the invoice branch must not land alone** — a tier taken on it without
the gift card fix is red by design. Landing both together, or the gift card fix first, is the only
safe order.

## 5. Constraints

C1: verified above — this table is outside the guard, and re-typing is its established practice.
C2: no migrations in either diff. C3: no new capability. **C4: the standing breach named in the
verdict — `TransferGiftcard` moves value with no resolved actor; pre-existing, disclosed, not
cleared.** C5: nothing here is acceptance. C6: no statutory claim. C7: no secret in any added log
line (`GiftcardController` logs `ex.Message` from `AppException` only).

## Hygiene

Worktree `OkamAPI-money-review` created at `b368d930e`, both branches merged there, removed with
`rm -rf` + `git worktree prune`. No commit, merge to any trunk, rebase, push or branch move; both
branch tips and `lane/pos-coverage-opened` exactly where found. Load gated separately before the
tier (held at 13.94, ran at 10.11). No container, no port, nothing installed.
