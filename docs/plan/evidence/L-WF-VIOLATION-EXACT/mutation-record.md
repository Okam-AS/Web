# L-WF-VIOLATION-EXACT — the red produced at the trunk, and why the lane still cannot be verified

**Reason shapes: (1) missing write-up → produced**, and then, on measuring what the pin actually pins,
**(4) the exit names a write and a refusal that are not the ones the estate wires together.**

**The red demanded by the exit now exists and is committed here.** The lane is nonetheless **left
`built-unverified`**, because the exit's two nouns describe a different code path from the one the landed
pin measures, and this program has already ruled that an exit rewritten to fit its evidence proves nothing.
The mismatch is a finding for an owner, recorded in the last section.

## The evidence line as the lane recorded it, preserved before anything overwrites it

```
evidence: /Users/svendaneel/okam/wt-wfviolexact @ cdb4c66c (lane/wf-violation-exact, parent 569887a5, unpushed)
```

## What was missing, and what was done about it

The prior pass ruled: *"the RETURN's evidence line is `/Users/svendaneel/okam/wt-wfviolexact @ cdb4c66c` and
nothing else: no `evidence.md`, no mutation log, no receipt. The red/green cycle … exists only as RETURN
prose."* The fix and its pin had meanwhile **landed** (by `L-VIOLATION-EXACT-LAND`), so the run could be
made again — **against the trunk rather than the lane branch**, which is a stronger claim than the original.

**Measured at `6d5328004` in a private detached worktree** (`git worktree add --detach`), never in
`/Users/svendaneel/okam/OkamAPI-modules` itself — that checkout carries another agent's uncommitted work and
a run there would have measured their tree.

**Why the trunk and not the branch.** The pin file is byte-identical at both
(`WebApi.Tests/Workforce/WorkforceConstraintViolationExactnessTests.cs` = blob
`250a50d298b0286ec3f8fbd4f8312346b763ac4f` at `cdb4c66c` **and** at `6d5328004`). The production file is
**not**: `Services/Workforce/WorkforceDbViolations.cs` is `b517a59d` on the branch and `e9299863` at the
trunk. The difference is **purely additive** — the trunk has gained
`IsPublicationReceiptViolation` and the MIG-25 one-succeeded-export discriminator, both of which
**delegate to the same `IsUniqueViolation` predicate**. So the loose disjunct is *more* load-bearing at the
trunk than it was on the branch, and the branch's run would have understated it.

## Which mutation

The single production predicate, `Services/Workforce/WorkforceDbViolations.cs:57-60`, whose own doc comment
states the rule the mutation breaks:

> *SQLite's PRIMARY result code `SQLITE_CONSTRAINT` (19) is deliberately NOT accepted: it covers the whole
> constraint family — NOT NULL (1299), CHECK (275) and FOREIGN KEY (787) — and a NOT NULL failure names its
> table in the message exactly as a UNIQUE one does, so the by-table discriminators built on this predicate
> cannot separate them. Accepting the bare 19 turned a programming error into a retryable "someone beat you"
> 409 that no retry can fix.*

The mutation puts the bare code back — one line inserted ahead of the clean disjunction:

```csharp
return sqlite.SqliteErrorCode == 19             // MUTATION: bare SQLITE_CONSTRAINT back
    || sqlite.SqliteExtendedErrorCode == 2067   // SQLITE_CONSTRAINT_UNIQUE
    || sqlite.SqliteExtendedErrorCode == 1555   // SQLITE_CONSTRAINT_PRIMARYKEY
    || (sqlite.Message != null && sqlite.Message.IndexOf("UNIQUE constraint failed", …) >= 0);
```

Applied as an exact string replace with the anchor asserted to occur **exactly once**; restored with
`git checkout --`, leaving `git status --porcelain` on that path at **0 modified** both times.

## Which assertion went red, and what the message said

Filter `Database!=SqlServer&FullyQualifiedName~WorkforceConstraintViolationExactnessTests`, `--logger trx`,
never `--no-build`.

| state | trx | counters | reds |
|---|---|---|---|
| baseline | `baseline.trx` | total 4 · executed 4 · **passed 4 · failed 0** | — |
| **mutant** | `mutant.trx` | total 4 · executed 4 · passed 2 · **failed 2** | the two NOT-NULL facts |
| restored | `restored.trx` | total 4 · executed 4 · **passed 4 · failed 0** | — |
| **mutant (repeat)** | `mutant2.trx` | **failed 2 · passed 2** | identical |
| restored (repeat) | `restored2.trx` | **passed 4 · failed 0** | — |

**The two that red, by name, with their verbatim messages:**

`A_not_null_failure_on_the_exchange_table_does_not_classify_as_the_one_award_violation` —

```
Assert.False() Failure
Expected: False
Actual:   True
```

(`WorkforceDbViolations.IsUniqueViolation(wrapped)` returning `True` for a NOT NULL failure.)

`An_award_whose_write_hits_a_not_null_failure_is_never_answered_as_award_taken` —

```
Assert.NotEqual() Failure
Expected: Not "workforce.award-taken"
Actual:   "workforce.award-taken"
```

**That second message is the defect itself, on the wire:** a NOT NULL failure — a programming error — comes
back to the caller as the module's "someone beat you to it" 409.

**The two that stay green are the control**, and they must:
`A_uniqueness_clash_on_the_exchange_table_classifies_as_the_one_award_violation` (a genuine clash still
classifies) and `An_award_beaten_by_a_committed_rival_answers_award_taken` (the real race still answers
correctly). The mutation **widens** the classifier, so a correct classification cannot break — a pin that
reddened all four would have been measuring something else.

## Non-vacuity, and that the mutant was really what ran

- `executed="4"` in **all five** runs. No run silently executed nothing.
- **The production assembly moved and came back**, captured in `mtime-probe.txt` on
  `bin/Debug/net8.0/WebApi.dll`:

  | point | mtime | sha256 (first 16) |
  |---|---|---|
  | before mutation | `2026-08-09T17:43:05` | `58ecc33a321d8195` |
  | after mutant build | `2026-08-09T17:45:24` | `a1a776266bd65d45` |
  | after restore build | `2026-08-09T17:45:45` | **`58ecc33a321d8195`** |

  The mtime moves at every step and the restored assembly is **byte-identical to the clean one**, so the
  red was measured on a binary that really contained the mutant and the green on one that really did not.
- Source digest round-trips exactly: `d5bee423bcaf1522` → `36af368053e73f90` → `d5bee423bcaf1522`.
- The cycle was run **twice**, independently, with the same two reds both times.

## The finding: the exit's nouns are not the estate's

> exit: *a non-uniqueness constraint failure on **a revision-numbering write** is not mapped to **the
> retryable publish-your-successor refusal**, shown by a fast-tier test*

What is pinned is a non-uniqueness constraint failure on **the shift-exchange award write**
(`WorkforceShiftExchangeRequests`) not being mapped to **`workforce.award-taken`**. Three measurements say
those are not the same thing:

1. **`workforce.award-taken` is not retryable.** `Helpers/Workforce/WorkforceProblemException.cs:137-146`
   builds it with `["conflictKind"] = "award-taken"` and **`["retryable"] = false`**.
2. **The publish-your-successor refusal is a different refusal, from a different check.**
   `Services/Workforce/WorkforceScheduleProblems.cs:96-100` — *"The revision is published and immutable;
   create a successor draft to make changes."* It is raised by a state check, not by the uniqueness
   classifier, and nothing routes it through `IsUniqueViolation`.
3. **The revision-numbering write is not classified at all.** The unique index exists —
   `Helpers/ApplicationDbContext.cs:2939`, `HasIndex(x => new { x.StoreId, x.RangeStartUtc, x.RangeEndUtc,
   x.RevisionNumber }).IsUnique()` — but `Services/Workforce/WorkforceScheduleService.cs`, the only writer
   of `RevisionNumber` (`:133`, `:196`), contains **no `DbUpdateException` catch and no `IsUniqueViolation`
   call whatsoever**. A constraint failure there propagates as a fault. It was never mapped to any refusal,
   so on the path the exit names, the exit's sentence was **already true, vacuously, before the lane ran**.

The lane body explains how the two got conflated: it opens on the revision-number column
(*"near-unreachable today"*) and then says the predicate is *"newly load-bearing because the shift-exchange
race now depends on that mapping."* The lane fixed **the shared predicate** and pinned it on the path that
is actually load-bearing — the right engineering call. The exit kept the opening sentence's nouns.

**So this is not a citation gap and not a work gap; it is a wording gap that only an owner may close.**
Verifying on this red would attach `verified` to a sentence about a write and a refusal the pin does not
touch. The obvious edit — renaming the exit to the award write and `workforce.award-taken` — is exactly the
rewrite-to-fit-the-evidence this program forbids.

**What is owed:** a re-ruling of the exit's subject. The substance behind it is discharged and is in this
directory: the shared classifier is exact, and a non-uniqueness failure reaching it reds two named facts
with the messages quoted above.

## Carried forward, not fixed here

The lane's own RETURN records two residues that remain open and are not touched by this record:

- **`Services/Meals/MealsDbViolations.cs:94` has the identical loose disjunct** (another module, its own
  lane). Events and `Helpers/DbExceptionHelper` are exact.
- **The SQL Server arm is unmeasured by this run**, which is fast-tier only. A SQL Server run must still
  show 515 (NOT NULL) and 547 (FK/CHECK) escaping as faults on this table while 2601 still maps.
