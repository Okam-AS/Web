# L-MIG-STACK-RECORD — how the stacked list was derived

**Derived 2026-08-05 by comparing branches in `/Users/svendaneel/okam/OkamAPI-modules`.** Nothing below was
read out of `PENDING-MIGRATIONS-LEDGER.md` or any other document; the ledger was consulted only *after* the
list existed, to check what it already said. Where the ledger supplied a fact the git history could not —
which lane authored a commit that no branch tip points at any more — it is marked as such.

Baseline: `INT = feature/restaurant-modules @ 8e2b57de`.

---

## 0. Instrument validation before any count

The brief named one positive case. It was reproduced first, so that a zero result later would mean
"nothing there" rather than "the check does not work":

```
git merge-base --is-ancestor afcfddbc 9e82b286   # lane/margin-waste -> lane/wf-w5-timesheet
=> exit 0  (IS ancestor)
```

Tree comparison against INT on the same pair returned 4 unmerged migrations for `lane/margin-waste` and 5 for
`lane/wf-w5-timesheet` — a strict superset plus one. The instrument answers positively on a known positive.

Two traps were live here and both were avoided:

- **Wrong repository.** The brief's operating notes place the ledger in `Web-modules`. It is not there:
  `find`, `git ls-files`, and a sweep of all 104 refs in that repo return nothing. It is in
  `OkamAPI-modules` at exactly the named path (`docs/plans/PENDING-MIGRATIONS-LEDGER.md`, 37,872 bytes,
  matching the brief's "37KB"). Only the repo attribution was wrong; the path was right.
- **Wrong ref.** The backend working tree has `lane/meals-grace-pins` checked out, 63 commits behind INT,
  and its copy of the ledger is **65 lines behind INT's**. Every fact below was resolved by object
  (`git show <sha>:<path>`, `git ls-tree <sha>`), never by reading that working tree.

## 1. Both ref namespaces enumerated

`git for-each-ref refs/heads refs/lanes` — backend: **271 refs** in `refs/heads`, **0** in `refs/lanes`.
(The frontend repo is the one that uses `refs/lanes`; it has 6 there. Neither `lane/margin-waste` nor
`lane/wf-w5-timesheet` exists in the frontend repo at all, so a sweep run there reports a clean world. That
is why this lane's measurement is backend-only.)

## 2. Unmerged migrations per ref, by tree comparison

For every ref: `git ls-tree -r --name-only <ref> -- Migrations`, filtered to `*.cs` minus `*.Designer.cs`
minus `ModelSnapshot`, `comm -13` against the same list for INT.

**79 refs carry at least one migration INT does not have.** That is not 79 stacked branches, and taking it
as one would have been the confident wrong answer. Splitting by `git merge-base <ref> INT`:

| merge-base date | refs | what they are |
| --- | --- | --- |
| 2026-06-21 … 2026-07-17 | **63** | pre-fork lineages — `rebrand`, `feature/swiss`, `feature/c5-push-prereqs`, the July W2/W3 lane branches, the `prep/*-landing` branches. Their extra migrations are a *different chain* (`20260630…`–`20260721…`), not this stack. Out of scope for this flag. |
| 2026-07-31 … 2026-08-02 | **16** | the live set |

## 3. Which commit introduced each live migration

Counting migration files per branch is not enough — a branch cut from another's tip inherits its files. So
for each of the 11 live migration ids: `git log --all --diff-filter=A -- Migrations/<id>.cs | tail -1`,
then `git branch --contains <intro sha>`.

This is what turned a file count into a chain. The introducing commits, in date order, walking
`968fd273..6fa2cbc3` with `--reverse` and annotating each commit with the tips pointing at it:

```
d6b0630f 2026-08-01T10:52  20260801084923_Margin_PeriodStatementFinalizedImmutable   TIPS[]
23f6bbeb 2026-08-01T12:35  20260801102621_Workforce_PublicationReceiptUniqueness     TIPS[]
8c479d99 2026-08-01T13:40  20260801113131_Training_W3_ChecklistsAndDeviations        TIPS[]
034ec87a 2026-08-01T15:52  20260801132512_Margin_WasteEntries                        TIPS[]        (afcfddbc = lane/margin-waste, 5 commits later)
bae24028 2026-08-01T20:51  20260801174639_Workforce_W5_Timesheets                    TIPS[]        (9e82b286 = lane/wf-w5-timesheet, 1 commit later)
3a4442a7 2026-08-02T13:15  20260802103646_Workforce_TimesheetExportSingleSucceeded   TIPS[lane/wf-export-duplicate]
cff1c005 2026-08-02T17:37  20260802151208_Workforce_TimesheetAdjustmentOrdinal       TIPS[lane/wf-adjustment-ordinal]
32c56fa4 2026-08-03T11:11  20260803090036_Meals_CompanyReceivableAccount             TIPS[lane/mig-company-receivable]
c606993a 2026-08-03T12:13  20260803093235_Kassa_AccountingSummaryDayUniqueIndex      TIPS[lane/acct-uidx]
6fa2cbc3 2026-08-03T17:04  20260803124302_Workforce_BootstrapFirstEngagement         TIPS[lane/wf-bootstrap-one-engagement]
```

Plus one off-chain: `a6a1174b` → `20260731203011_Margin_PeriodStatementFinalizedImmutable`, contained by
`lane/margin-finalize-lag` alone, and `git merge-base --is-ancestor a6a1174b 6fa2cbc3` returns **non-zero** —
it is a fork, not a link. Its own commit message on the regeneration (`d6b0630f`, "was a forked parent")
confirms what the ancestry test already showed.

The chain is **strictly linear**: every link's introducing commit is an ancestor of the next. There is no
branching within the stack.

Authorship of links 1–3 could not be recovered from git alone — no branch tip points at `d6b0630f`,
`23f6bbeb` or `8c479d99`. Those three attributions (`lane/margin-finalize-lag`, `lane/wf-cost-stability`,
lane `L-TRAIN-W3-SCHEMA`) are the only facts in the ledger entry taken from the ledger's own MIG-22 / MIG-21 /
MIG-13 prose rather than measured. Everything else is measured.

## 4. Ancestry test for every pair

Each of the 14 rows was confirmed, not inferred:

```
git merge-base --is-ancestor afcfddbc 1ed372bd   OK  lane/margin-waste          <= lane/margin-waste-500
git merge-base --is-ancestor afcfddbc 9e82b286   OK  lane/margin-waste          <= lane/wf-w5-timesheet
git merge-base --is-ancestor 9e82b286 4b911917   OK  lane/wf-w5-timesheet       <= lane/wf-digest-tautology
git merge-base --is-ancestor 9e82b286 da452fe2   OK  lane/wf-w5-timesheet       <= lane/wf-timesheet-wire
git merge-base --is-ancestor 9e82b286 3a4442a7   OK  lane/wf-w5-timesheet       <= lane/wf-export-duplicate
git merge-base --is-ancestor 3a4442a7 15a1d0b7   OK  lane/wf-export-duplicate   <= lane/review-residuals-rezone
git merge-base --is-ancestor 3a4442a7 cff1c005   OK  lane/wf-export-duplicate   <= lane/wf-adjustment-ordinal
git merge-base --is-ancestor cff1c005 32c56fa4   OK  lane/wf-adjustment-ordinal <= lane/mig-company-receivable
git merge-base --is-ancestor 32c56fa4 c606993a   OK  lane/mig-company-receivable<= lane/acct-uidx
git merge-base --is-ancestor c606993a 08309e39   OK  lane/acct-uidx             <= lane/ef-index-shadow-sweep
git merge-base --is-ancestor c606993a bc9c7e96   OK  lane/acct-uidx             <= lane/wf-timesheet-race
git merge-base --is-ancestor c606993a 4b37f81b   OK  lane/acct-uidx             <= integration/mig-stack-land
git merge-base --is-ancestor c606993a 6fa2cbc3   OK  lane/acct-uidx             <= lane/wf-bootstrap-one-engagement
```

`lane/margin-waste`'s own tail is link 3 (`8c479d99`), which no branch tip carries — so it is stacked on
another lane's migration even though no branch *name* can be pointed at as its parent.

---

## 5. The flag understated the problem, in three ways

`F-MIG-CHAIN-STACKED` was written from one observation (`margin-waste` → `wf-w5-timesheet`). Measured:

1. **14 branches, not 2**, and the chain is **10 links deep**, not 1.
2. **7 of the 14 author no migration of their own.** They are pure carriers — cut from a branch that had
   one. Their diffs contain no migration file at all, so a reviewer reading the diff cannot see that
   merging them lands ten schema changes. None of the seven is named anywhere in the ledger
   (`grep -c` returns 0 for each against the stack-tip copy).
3. **A fourth `margin-waste`-shaped hazard exists off the chain**: `lane/margin-finalize-lag` carries a
   superseded duplicate of link 1 under a different id.

## 6. The premise "nobody has written it" needed correcting — and the correction is the finding

The brief says the dependency is recorded nowhere. That is true of the copy the brief was written from and
**false of the copy on the stack**. Measured with `git diff --stat`:

```
8e2b57de:docs/plans/PENDING-MIGRATIONS-LEDGER.md -> 6fa2cbc3:...   739 insertions, 82 deletions
```

The stack-tip copy is 1,240 lines to INT's 582, runs to MIG-28, and already records the stacking **per
migration entry** inside MIG-24 through MIG-28, with `--is-ancestor` measurements. That is genuinely good
work and this lane did not duplicate it.

What is missing is not the fact — it is the **location**, and that is the whole point of the exit condition
("where a migration author will see it"):

- All of it lives **only on unmerged branches**. `feature/restaurant-modules` — the branch a new lane is cut
  from — carries none of it. Its ledger ends at `20260731220005` and MIG-22, and says nothing about ten
  further migrations.
- It is **scattered across seven MIG-nn prose sections**. There is no list. An author has to reconstruct the
  chain from seven paragraphs, and the seven carrier branches appear in none of them.

**The ledger is the right home** — that was checked, not assumed. All 11 live migration commits edit
`docs/plans/PENDING-MIGRATIONS-LEDGER.md` in the same commit as the migration (11/11). Migration authors here
demonstrably read and write this file. The wrong thing was the *copy*, not the document.

**Already cost a number.** `lane/growth-audit-ledger` @ `bd3a840f` allocated MIG-22 to `Growth_AuditLedger`
on 2026-08-03 and landed it on INT. MIG-22 had been taken by `Margin_PeriodStatementFinalizedImmutable` on
2026-08-01 (`d6b0630f`) — on the stack, invisible from INT. Verified:
`git merge-base --is-ancestor bd3a840f 6fa2cbc3` returns non-zero (the stack never had the Growth entry) and
`git merge-base --is-ancestor bd3a840f 8e2b57de` returns 0 (INT does). Two live entries numbered 22. The
ledger's own MIG-21/MIG-22 text says "two lanes claiming one MIG number is how this ledger stops being an
index" — it happened anyway, across the seam this lane exists to document.

## 7. Where the entry was written, and why there

Appended to **INT's copy** (`feature/restaurant-modules`), on branch `lane/mig-stack-record`, worktree
`/Users/svendaneel/okam/wt-migstackrecord`. That is the unwritten copy and the one the bitten author reads.
Nothing was committed to a shared branch and nothing was pushed.

Placed immediately after the existing `## ✅ STATUS UPDATE` block and before `## A.` — the position the
document already uses for dated, branch-and-sha-stamped status blocks. No existing line was edited; the
change is one new section. It was **not** appended at EOF: an author opens this file to find the chain tip,
and a warning that the chain tip is wrong is worthless 582 lines below the entries that state it.

`F-MIG-LEDGER-THROW-NUMBER-WRONG` (50073 vs 50060) was left alone deliberately — it has its own flag.

**The other arm is a landing decision and is not this lane's to take.** `integration/mig-stack-land`
@ `4b37f81b` already collects links 1–9, and `git merge-base --is-ancestor feature/restaurant-modules
4b37f81b` returns 0 — the stack strictly extends INT and forks nothing. When it lands, this section can go.
Until then it is the record. Note for whoever lands it: the stack's copy of this file has diverged by 739
lines, so this new section will need merging by hand rather than by `git merge`.
