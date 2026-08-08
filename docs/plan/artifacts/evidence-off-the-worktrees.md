# Evidence off the worktrees

21 evidence files copied out of ephemeral `wt-*` worktrees into the plan repo. **Copies, not moves: no
source was touched and no worktree was pruned.** Each source was asserted still present after its copy.
Committed at `fe85d27`. No exit was amended — recovery and admissibility are different jobs. No trunk moved.

## The convention, and why this one

> **`docs/plan/evidence/<LANE-ID>/<filename>`**

It is in the plan repo, beside `plan.md`, so an evidence line can name it **relative to the plan repo** —
which is the rule the sibling census recommended and which 547 lines will follow. That choice rules out the
three alternatives for concrete reasons:

- **not a worktree path** — the whole defect being repaired; it resolves until someone tidies

- **not an absolute path** — `/Users/svendaneel/...` opens on one machine, and its leading slash is the
  character that mis-sorted 104 lines

- **not the code repo** — evidence about a branch outlives the branch; the plan repo is where a stranger
  already is when they read the lane

The directory is not caught by the bare `artifacts/` ignore rule, but the copies were force-added and
confirmed with `git ls-files` regardless, because that rule has swallowed evidence twice.

## What the 48 references actually were

| | count |
|---|---:|
| worktree references in evidence lines | 48 |
| of those, a **file** that existed at copy time | **21** — all copied |
| a bare worktree **directory**, naming a location rather than a file | 27 |
| files already gone | 0 |
| held for a ruling | 0 |

**The 27 are not a rescue job and should not be counted as one.** They read like
`OkamAPI worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/x @ sha` — the evidence is the
*branch*, which git already holds durably; the worktree is only where somebody happened to stand. Copying a
directory reference would manufacture a file nobody wrote.

My earlier artifact said 53 lines and 48 live. Re-derived at copy time it is 48 references and 21 files:
the earlier count was of *lines mentioning a worktree*, not of *files to rescue*. Both numbers are right
about different things, and this one is the actionable one.

## Copied — 21

| lane | file |
|---|---|
| `L-MEALS-XZ-CREDIT` | `zreport-kredittsalg.txt` |
| `L-MRG-STARTER-150` | `evidence.md` |
| `L-MRG-WASTE` | `RUN.md` |
| `L-EV-EXTDEP-GUARDS` | `EVIDENCE.md` |
| `L-MEALS-REQUOTE-RELEASE` | `evidence.md` |
| `L-MRG-WASTE-500` | `RUN.md` |
| `L-WF-TIMESHEET-WIRE` | `evidence.md` |
| `L-MEALS-EIGHTH-PIN` | `evidence.md` |
| `L-MEALS-SUPERSEDE-SQL` | `evidence.md` |
| `L-MEALS-QUOTE-RETRY` | `evidence.md` |
| `L-CONFIRM-FAMILY-MERGE` | `RUN.md` |
| `L-MEALS-EIGHTH-READ` | `evidence-2.md` |
| `L-ROLLBACK-TRACKED-SWEEP` | `evidence.md` |
| `L-WF-OPERATOR-UNIQUE` | `evidence.md` |
| `L-CLOCKOUT-STATE-IS-NOT-OPEN` | `evidence.md` |
| `L-SUPERSEDE-RELEASE-IS-ATTRIBUTED` | `evidence.md` |
| `L-COMPOSE-AND-RUN-THE-STACK` | `compose-7ac6f2b2-sql-tier.trx` |
| `L-BACKEND-PATCHES-ARE-APPLIED` | `evidence.md` |
| `L-LAND-THE-BACKEND-ON-THE-TRUNK` | `evidence.md` |
| `L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY` | `L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY.md` |
| `L-THE-PRINTED-RECEIPT-NAMES-ITS-TENDER` | `PrintedTenderNameTests.cs` |

## Nothing was held

Every file was read for credentials and for eleven-digit identity numbers. **No credential, and no value
passing a date-aware MOD-11 check.** The date check matters: the previous lane's version accepted
`00000000000`, which satisfies the checksum arithmetic but encodes no real birth date. Adding the date test
removed that false positive without weakening the real one — the two `.trx` files still held on the
fødselsnummer ruling are in the backend repo and were not in scope here.

## What this does not fix

**The evidence lines still name the worktree paths.** A sweep run tomorrow will still read 48 references
into `wt-*` and still call the vanished ones destroyed; the files are now safe but the *citations* are not
repaired. Rewriting them is editing a RETURN, which a sibling lane established is not something to do to
suit a parser. So this lane makes the loss survivable, not invisible, and the citation question stays open.

Nothing here proves the copies are the same bytes a lane originally produced; they are the bytes present in
those worktrees today. If a worktree was edited after its lane returned, this preserves the edited file.
