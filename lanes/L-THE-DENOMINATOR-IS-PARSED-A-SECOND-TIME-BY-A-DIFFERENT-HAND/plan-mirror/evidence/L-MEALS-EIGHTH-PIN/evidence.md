# L-MEALS-EIGHTH-PIN — evidence

Brief `92959250`. Base `d5483cb3` (`lane/meals-requote-release`, the lane that introduced the eighth read).
Worktree `/Users/svendaneel/okam/wt-mealseighth`, branch `lane/meals-eighth-pin`. Local only, never pushed.

Test-only. **No production file changed** — `git diff` against `Services/`, `Models/`, `Controllers/`,
`Migrations/`, `Helpers/` is empty at the commit, and every mutant below was applied and then restored
byte-identical (verified with `git diff --stat`, not by reading).

## The finding, verified by injection before anything was built

The brief's claim is TRUE and was reproduced first, exactly as the module's own method requires.

Clamp mutant, per the brief: `SET ReservedMinor = 0` in `ReleaseSupersededReservationAsync`
(`Services/Meals/MealsQuoteService.cs`), `AND ReservedMinor - cap >= 0` floor dropped.

| State | `MealsRequoteSupersedeTests`, container-free |
| --- | --- |
| base `d5483cb3`, clean | 9/9 pass |
| base + clamp | **9/9 pass** — the release is a production decrement no assertion in the file can see |

The structural cause is confirmed and is stronger than "one test": across the whole suite, **only
`MealsRequoteSupersedeTests` ever reaches the release** — it is the only file that passes a third argument
to `MealsFundingTestKit.QuoteRequest`, i.e. the only caller that supplies a `SupersedesToken`. So the clamp
was invisible to all 4378 fast-tier tests, not merely to the nine.

## What was built

Three of the nine tests reach the decrement (`A_requote_naming_…`, `Replaying_a_requote_key_…`,
`Two_requotes_naming_one_token_…`). In each, the superseded reservation was the ONLY hold on the guard row,
so clamp-then-increment and decrement-then-increment landed on the same number. All three now hold an
uninvolved, unnamed quote across the supersede, via one helper (`HoldUninvolvedAsync`) so the reason is
stated once. The other six never enter the release and are unchanged.

Plus the refusal variant the brief named, as a tenth test:
`A_requote_that_fits_from_zero_but_not_over_a_live_hold_is_refused` — 5000 uninvolved + 15000 superseded
fills the 20000 week exactly, and the 19000 re-quote is measured at 5000 + 19000 = 24000 and refused. Under
a clamp it is measured at 0 + 19000 and **succeeds**. It reds by succeeding, which is the one failure mode a
guard-zero read cannot imitate.

## Mutation results — all measured, none reasoned

Container-free filter throughout: `FullyQualifiedName~MealsRequoteSupersedeTests&Database!=SqlServer`.
Every mutant was written into the file (fresh mtime) and rebuilt; no run used a stale binary.

| Mutant | Result | Values read |
| --- | --- | --- |
| none (clean) | 10/10 pass | — |
| **clamp** (`SET ReservedMinor = 0`, floor dropped) | **4 fail** | money pin 18000→**15000**; refusal pin **no exception thrown**; replay 8000→**6000**; free-once 14000→**10000** |
| **repeat decrement** (`State != Reserved` guard dropped, so a second re-quote frees an already-released cap) | 2 fail | free-once 14000→**9000**; `A_bound_reservation_is_never_released_by_a_requote` Bound→Released |
| **repeat decrement, floor ALSO dropped** (the UPDATE executed twice) | 5 fail | not a wrong number at all — `SqliteException 19: CHECK constraint failed: CK_MealsBudgetGuards_CapturedWithinReserved`, the row driven negative |
| **expiry check dropped** | 1 fail | `An_expired_predecessor_is_left_for_the_sweep_to_release` Reserved→Released |

### The mutation signature the brief demanded, and one correction to it

The brief asked that under a clamp the pin fail **reading zero, not the residual**, because a repeat
decrement would land on the residual instead. Reproduced, and the distinction holds — but not in the shape
the brief predicted, so it is recorded honestly:

- A **clamp** reads a number with **no trace of the residual in it**: 15000 in the money pin is the new cap
  alone, standing on a row that was zeroed under it.
- A **repeat decrement** leaves the residual standing and takes another cap's worth off instead: **9000**
  against a correct 14000 in the free-once pin — the residual survives, one cap too many is gone.
- The brief's literal prediction — that a repeat decrement would read the residual in the money pin — is
  **not reproducible**, and the reason is worth keeping: with the `>= 0` floor intact the second decrement
  matches zero rows and is a silent no-op there; with the floor dropped it drives the row negative and the
  database refuses it outright. **The floor is what turns a double release from a wrong number into an
  error**, which is a defence the four release lanes have not written down anywhere.

Both edge pins the brief said to keep meaningful were re-proved rather than assumed: the bound pin reds
under the state-guard mutant, the expired pin reds under the expiry-check mutant.

## Tiers, and what remains unproven

Base measured, not inherited — a clean run of `d5483cb3` in this worktree:

| Tier | Total | Passed | Failed | Skipped | Artifact |
| --- | --- | --- | --- | --- | --- |
| base `d5483cb3`, fast (`Database!=SqlServer`) | 4378 | 4366 | 0 | 12 | `base-fast-tier.trx` |
| this commit, fast | 4379 | 4367 | 0 | 12 | `eighth-pin-fast-tier.trx` |

Exactly +1: the new refusal pin. The final tier run was taken AFTER the last source edit, from a rebuilt
assembly whose mtime was checked, so the trx belongs to the commit rather than to a previous binary.

**Unproven at the SQL Server tier — all of it.** No slot was granted and none was taken. Everything above is
SQLite. Specifically still unproven on a real database: the four clamp-sensitive readings; that the
`>= 0` floor blocks a repeat decrement rather than the row going negative (SQL Server's CHECK constraint
behaviour was not exercised, only SQLite's); and the refusal pin's rollback, which on SQL Server runs under
the retrying execution strategy and the release's detach-and-re-read path that SQLite never reaches.
`L-MEALS-SUPERSEDE-SQL` owns that.

## Constraints

- **C1** — no append-only table touched; test-only diff.
- **C2** — **no migration authored**, no `OnModelCreating` change, no THROW number claimed. The chain was
  not touched and the tip is not on this branch.
- **C4** — every quote in the new and amended tests is created by `MealsWorld.EmployeeApplicationUserId`, a
  resolved caller. No null, ambient or hard-coded system actor is constructed anywhere in the diff. The
  uninvolved hold is deliberately the SAME employee — it has to sit on the same (Program, Membership,
  PeriodKey) guard row to be a residual at all, and a coworker's hold sits on a different row.
- **C5** — not claimed as acceptance. This is a suite result, and the journey was not re-run here.
- **C7** — no logging added; authorization tokens stay in local variables as before.

## Left deliberately untouched

- **No release site added, and no audit assertion added.** All four release sites still write no audit row
  and the pins still assert reason codes only. That gap belongs to the blocked actor lane and must stay
  visible; papering over it here would make it look closed.
- `F-MEALS-ACTOR-WORKLIST-STALE` is untouched — this lane adds no fifth site, so the worklist arithmetic
  (three named, four existing) is unchanged.
