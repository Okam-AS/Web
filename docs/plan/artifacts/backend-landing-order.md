# The backend landing order, computed

**Backend trunk `057c390ad` · frontend trunk `3807e90` · 2026-08-08 · lane L-THE-BACKEND-LANDING-ORDER-IS-COMPUTED**

Two halves: a **measured** landing order for the five branches built since 2026-08-06, and a
**classified count** of every other unlanded lane branch so the scale stops being invisible.

Every composition below was run, not predicted. Each step is a real merge on a detached HEAD in a
throwaway worktree, followed by the backend tier from `WebApi.Tests/` with
`--filter "Database!=SqlServer"`, checked for an abort line above the summary and for the test dll's
mtime actually moving. No trunk was moved and nothing was pushed.

## The scale

| | |
|---|---|
| `lane/*` branches in the backend | **376** |
| unlanded at `057c390ad` | **217** |
| landed | 159 |

Measured two independent ways that agree: per-branch `git merge-base --is-ancestor <branch> 057c390ad`,
and `git branch --no-merged 057c390ad --list 'lane/*'`.

## THE FINDING: `lane/pos-coverage-opened` cannot land alone

It is a **failing-test-first coverage lane**. It adds three test files — all three absent from its own
base `81d06c10a` — and two of them are **red against the trunk on purpose**, because they document
money defects its sibling lanes fix. Landing it by itself puts the backend trunk red.

The tier says so at every step:

| step | HEAD | tier | failures |
|---|---|---|---|
| 0 · trunk `057c390ad` | `057c390ad` | 4949 passed / 0 failed / 11 skipped / 4960 total | — |
| 1 · `+ lane/pos-coverage-opened` | `bdf574310` | 4967 / **2 failed** / 11 / 4980 | `GiftcardBalanceTests.Passing_a_gift_card_on_moves_the_money_instead_of_copying_it` (expected 0, actual **50000**) · `InvoiceDocumentTests.Every_order_is_listed_once_on_an_invoice_that_spans_more_than_a_year` (expected 4, actual **8**) |
| 2 · `+ lane/giftcard-transfer-one-wallet` | `bc07d346a` | 4971 / **1 failed** / 11 / 4983 | the invoice one only — the giftcard defect is now fixed |
| 3 · `+ lane/an-invoice-lists-each-order-once` | `fdc7cdfbe` | 4974 / **0 failed** / 11 / 4985 | none |
| 4 · `+ lane/mail-revocation-lever` | `c6f97d83a` | 4980 / **0 failed** / 11 / 4991 | none |

Each step: merge exit 0, zero abort/error lines above the summary, dll mtime moved
(`1786128983 → 1786129388 → 1786129743 → 1786130085 → 1786130426`), worktree clean after restoring
the tracked `artifacts/journeys/ev-dietary/run-sheet.json` the non-SQL tier rewrites.

**So the recommendation is a tranche, not a sequence.** If every trunk commit must be green, these
three land as **one** tranche — `pos-coverage-opened`, then `giftcard-transfer-one-wallet`, then
`an-invoice-lists-each-order-once` — because steps 1 and 2 are red *by design*. Landing them one at a
time leaves the trunk red for two commits. `lane/mail-revocation-lever` is independent and may land
before, after, or inside the tranche.

The reverse inner order (`pos → invoice → giftcard`) was **not measured** and is not claimed.

## The coupling is a carried tail, not a file conflict

The prediction was that the giftcard and invoice branches "collide on the same files". **They do
not.** Their own contributions are disjoint: giftcard changes `GiftcardBalanceTests.cs`, invoice
changes `InvoiceDocumentTests.cs`. What actually couples them is that **both fork from `b368d930e`
and carry `lane/pos-coverage-opened`'s entire commit as an unlanded tail** — the stacked-chain shape
`F-MIG-CHAIN-STACKED` names, not a conflict. Landing either sibling silently lands pos-coverage's
three new test files, and with them the two red tests.

Blob identity settles it — `git rev-parse ${ref}:${path}`, brace form, because an empty `git diff`
would prove nothing (two absent files also diff to zero):

| file | `81d06c10a` | `b368d930e` | giftcard | invoice |
|---|---|---|---|---|
| `WebApi.Tests/CartCheckoutRefusalTests.cs` | ABSENT | `41372def8` | `41372def8` | `41372def8` |
| `WebApi.Tests/GiftcardBalanceTests.cs` | ABSENT | `17f1218a4` | **`0c85bd38d`** | `17f1218a4` |
| `WebApi.Tests/InvoiceDocumentTests.cs` | ABSENT | `6d8fb9d96` | `6d8fb9d96` | **`619f2f122`** |

All three created by pos-coverage; each sibling modifies exactly one and carries the other two
unchanged.

**Re-measured, not inherited.** A sibling had composed `71ac73af1 + a9d408bfb` on one tree at
`8731755e6` and reported 4962 / 0 / 10. This lane composed independently and sequentially; step 3 is
the comparable state and reads 4974 / 0 / 11 = 4985. The 13-test difference between the two trees was
not chased and is not explained here — what is claimed is only what this lane ran.

## Blocked, and the gate covers two branches

| branch | at | state |
|---|---|---|
| `lane/a-module-off-names-the-module-be` (backend) | `8357c8a33` | **BLOCKED** on `D-SPEC-L-A-MODULE-OFF-NAMES-THE-MODULE`, unruled. Not ordered, not composed, not measured. |
| `lane/a-module-off-names-the-module` (frontend) | `2ce83f6` | the paired half under the **same** gate |

`plan.md:19968` and `:20425` both say *"Do not land **either**"*. **The gate has already been
half-honoured.** The frontend half is an ancestor of the frontend trunk — landed by `bb22728`,
"Land lane/a-module-off-names-the-module onto the restaurant-modules trunk" — while the backend half
is still held and is not an ancestor of `057c390ad`. So the contested exit is live on one side and
absent on the other, which is the state the gate existed to prevent. Naming only the backend branch
as blocked would leave that invisible.

## The other 212, classified

The question per branch: is it (a) superseded by trunk content, (b) carrying a change nothing
supersedes, or (c) unmeasurable without opening it.

| class | of the other 212 | of all 217 unlanded |
|---|---|---|
| a. superseded | **7** | 7 |
| b. carries a change nothing supersedes | **143** | 148 |
| c. unmeasurable | **62** | 62 |

Instrument: `git cherry 057c390ad <branch>`, which compares **patch ids** and marks a commit `-` when
an equivalent patch is already upstream however it got there.

- **a. superseded (7)** — every commit marks `-`:
  `lane/authclean`, `lane/cost-rollup`, `lane/events-settlement-reads`, `lane/menu-margin-read`,
  `lane/pinfix`, `lane/w0-businessdate`, `lane/wf-invite-list-revoke`.
- **b. carries a change nothing supersedes (143)** — at least one `+` commit and **≤20** of them
  (median **1**; 136 of the 143 have an August tip date).
- **c. unmeasurable (62)** — more than 20 `+` commits against a merge-base dated mostly 2026-07.
  Patch identity cannot discriminate across the trunk rebuild that sits in between, so these are
  counted as unmeasurable rather than assigned a class that was not measured.

**A discarded instrument, recorded so it is not rebuilt.** The first attempt compared each branch's
contributed files to the trunk by **blob equality**. It classified **all 217 branches into one
bucket** — "carries content" — because a branch whose merge-base is old differs from the trunk on
almost any file it touches. A classification with one class measures nothing. `git cherry` is the
tool built for the question and it discriminates; blob equality is the wrong instrument for
supersession and should not be tried again.

## Why this file is tracked despite `.gitignore`

A bare `artifacts/` rule catches `docs/plan/artifacts/` at any depth, so a plain `git add` silently
does nothing. Added with **`git add -f`** and confirmed with `git ls-files --error-unmatch`. The rule
sits at `.gitignore:119` at this tip and `:111` on `wip/session-2026-08-06-all-work` — the same rule,
different line, because that branch carries eight fewer comment lines. A sibling `*.log` rule at
`.gitignore:5` swallows tier logs the same way; the tier logs behind this artifact live in the lane
directory and were force-added for that reason.
