# Twenty-three lanes whose only proof was a branch and a green suite

The question per lane was: **what could a stranger open that shows this capability is real?** Not how to
make the tool say yes. No `--override`, no `plan accept`.

## Counts

| | count |
|---|---:|
| accepted | 2 |
| needs-landing | 6 |
| ref-gone | 5 |
| needs-artifact | 9 |
| browser-blocked | 1 |

**Two accepted, twenty-one recorded with what is missing.** Lane `verified` 401 → 403.

## The finding that reframes the class

**This is not uniformly "needs an artifact produced". Most of it needs the work LANDED first.**

- **6** name a branch that exists but is **not an ancestor of its trunk**. Their code is not on
  `feature/restaurant-modules`. An artifact produced from those branches would attest to a capability the
  trunk does not have — which is worse than no artifact, not better.
- **5** name a branch that **no longer exists at all**. The worktree path they record still exists for
  some, so the work may be recoverable, but the ref is gone and nothing can be produced from it as recorded.

Measured, not inferred: `git merge-base --is-ancestor <branch> feature/restaurant-modules` per lane. The
three statutory receipt suites the class is named for — `MealsDeliveryReceiptSqlServerTests`,
`DeliveryReceiptComplianceTests`, `MealsXZCreditSaleTests` — are **absent from the backend trunk**.

## The two that were accepted, and why they are not a C5 breach

Both exits are *about falsifiability itself*, so a plant-or-mutant proof **is** the document a stranger
opens — it is not a green suite standing in for a feature:

- `L-PRICE-SHADOW-GUARD` — exit: *a component defining its own price label is caught by a check that reds*.
  `lanes/L-PRICE-SHADOW-GUARD/DETAIL.md` plus a five-state plant proof: **state A clean PASSES, state B with
  a shadow planted FAILS**, and the file covers the two existing shadows the exit's second half names.
- `L-LIVE-ASSERTION-FLOORS` — exit: *each of the four named assertions reds against the wrong answer it
  currently accepts*. `guard-proof.txt` lists every arm with its mutant (M1–M3) going green again when the
  guard is disabled — the assertion's falsifiability, shown.

## Two I refused that looked ready

- `L-EV-JOURNEY-TIMEBOMB` has committed consecutive-run captures, but they are **`@fixture` Playwright
  runs** and the exit demands a *live* run. That is **blocked on `D-RESTART-THE-WALK-WORLD-API`**, named
  rather than attempted.
- `L-UTLKVIT-REPRINT-KIND` has a mutation receipt, but it is **a list of failed test names** — exactly what
  C5 excludes. What it lacks is a rendered handover document; its exit is about the document being handed
  over, and no artifact shows one.

## What each remaining lane needs


**land the branch, then produce the artifact** (6)

- `L-VIPPS-REDACT-404`
- `L-STATUTE-EVIDENCE-WORLD`
- `L-WF-DEMO-PRESENCE`
- `L-CENSUS-FLOORS-DERIVED`
- `L-WF-IDEMPOTENCY-REFUSAL-REST`
- `L-WF-WITHHELD-BOUND`

**recover or redo — the branch it names is gone** (5)

- `L-WF-VIOLATION-EXACT` — worktree still on disk
- `L-GR-TESTSEND-RATELIMIT` — worktree still on disk
- `L-GR-CONFIRMED-PIN-FIX` — worktree still on disk
- `L-CONFIRM-POSTMERGE-PIN` — worktree still on disk
- `L-UTLKVIT-REPRINT-KIND` — worktree still on disk

**produce the document or wire capture its exit describes** (9)

- `L-MEALS-UTLKVIT`
- `L-GR-TESTSEND-GUARD`
- `L-UTLKVIT-SALE-ROW`
- `L-GR-CONFIRMED-EMAIL`
- `L-MEALS-FOURWAY-TIER`
- `L-CONFIRM-SERVER-HALVES`
- `L-COMPOSITION-ROOT-CHECK`
- `L-CRYPTO-PIN-BYFORM`
- `L-INVOICE-AUTHORIZE`

**blocked on D-RESTART-THE-WALK-WORLD-API** (1)

- `L-EV-JOURNEY-TIMEBOMB`