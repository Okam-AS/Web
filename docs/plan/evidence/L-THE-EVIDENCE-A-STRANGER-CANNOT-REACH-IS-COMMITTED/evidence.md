# L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED — the universe, derived afresh

**Exit:** *every artifact named by a built-unverified lane and currently committed nowhere is either
committed and its lane accepted by `plan verify`, or recorded as unrecoverable with the reason, with the
count of each stated.*

**Reason shape hit: (3) the evidence proves LESS than the exit claims.** Batch 2 of
`instrumentless-exits.md` declined it because the RETURN says *"Input was my own prior artifacts and
`lanes/L-WHY-469/`; tracked-ness was not re-derived"* — twenty-one is an **inherited list, not a derived
universe**. The brief's option for this shape is *measure the missing case*. **The measurement is below.
It does not close the lane, and it says why.**

**The `evidence:` line as it stood** (kept here because `plan verify` overwrites it):
`docs/plan/artifacts/twenty-one-proofs-committed.md`

## Method

`derive-census.py` beside this file parses `docs/plan/plan.md` for every lane whose `state:` is
`built-unverified`, pulls every file-shaped token out of its `evidence:` line (a token containing `/` and
ending in a real extension), resolves it against every root a reader would plausibly try — the plan repo,
`docs/plan/`, the backend repo, or an absolute path — and then asks git the one question that matters: is
it committed to any ref, at HEAD or otherwise. Raw output: `census-2026-08-09.md`.

## What it found, 2026-08-09

**64 built-unverified lanes** (not 91 — siblings have been verifying all day, and the population is a
moving target, which is itself the argument against an inherited list). **59 file-shaped tokens** across
40 of them.

| status | tokens |
|---|---|
| committed, tracked at HEAD | 47 |
| committed, on another ref | 5 |
| **on disk, committed nowhere** | **4** (after manual resolution — see below) |
| **on disk, outside any repository** | **1** |
| committed, but the citation as written resolves nowhere | 2 |

**The five that are committed nowhere, named individually:**

| lane | artifact | why it is not committed |
|---|---|---|
| `L-WF-ROLES-UI` | `artifacts/journeys/workforce-role-catalogue.playwright.json` | swallowed by the bare `artifacts/` rule at `.gitignore:111`; `git log --all` over the path returns nothing |
| `L-WF-OPLINK` | `lanes/L-WF-OPLINK/artifacts/journeys/wf-operator-import-clock.playwright.json` | same rule, one level deeper — `git check-ignore -v` names `.gitignore:111`. **The census script first reported this token as resolving nowhere**, because the evidence line writes it as `artifacts/journeys/…` while it lives under `lanes/L-WF-OPLINK/`; found with `find` |
| `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK` | `lanes/…/asserting-tests.txt` | not ignored, simply never added — `git status` shows `??`. Already named by Batch 6 |
| `L-THE-LIVE-WORLD-RUNS-THE-BRANCH` | `/Users/svendaneel/okam/web-livewalk/artifacts/journeys/WALK-RECORD.md` | **standing prohibition — do not touch `web-livewalk`.** This is the third-bucket case Batch 2 named |
| `L-WF-DEMO-PRESENCE` | `…/scratchpad/final-run.txt` | outside any repository **and gone**: a sibling lane wrote its own run to the same shared scratch path. **Unrecoverable, and the reason is a boundary violation, not a disk failure** |

**Two citations point at a committed artifact and still cannot be followed** — a different defect from an
uncommitted one, and one no tracked-ness sweep detects:

- `L-TRAIN-EVID-LAND` cites `OkamAPI-modules/artifacts/tests/f8b3a30f…/RUN.md`. There is no such path from
  any root; the file is tracked in the backend repo at `artifacts/tests/f8b3a30f…/RUN.md`. One extra path
  segment.
- `L-GR-CONFIRMED-PIN-FIX` cites `.../3cf288fb.../RUN.md` — **an ellipsis, literally, in `plan.md`**. The
  file is tracked at `artifacts/tests/3cf288fb9b5465472dd0a50d50d949dbce8f4d19/RUN.md`. A stranger cannot
  expand it; a reader who already knows the answer can.

## The finding that decides the lane

**Twenty-four of the sixty-four built-unverified lanes name no file-shaped token at all.** Their evidence
lines are branches, SHAs, worktree directories and suite counts: `L-WF-CLOCK-WIRE`, `L-WF-VIOLATION-EXACT`,
`L-GR-APPROVAL-STATE`, `L-WF-BOOTSTRAP`, `L-WF-ADJUST-ADDRESS`, `L-PRICE-BYPASS-FIVE`,
`L-GR-TESTSEND-RECORD`, `L-EV-OUTBOX-FLAKE`, `L-WF-IDEMPOTENCY-REFUSAL-REST`,
`L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR`, `L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN`,
`L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK`, and twelve more (full list in `census-2026-08-09.md`).

**The exit's universal cannot see them.** *"Every artifact named by a built-unverified lane"* has, for
these twenty-four, an empty domain — there is no artifact to commit and none to record unrecoverable, so
the lane could report 100 % coverage of an exit while the largest single group of unreachable lanes goes
unmentioned. **Five artifacts are committed nowhere; twenty-four lanes named none in the first place.**
That is the shape of the reachability problem today, and it is not the shape the exit describes.

**Second limit, stated because it bounds this census too:** `plan verify` **overwrites** the `evidence:`
line with the one path it is passed. So this sweep sees only what the *current* evidence line names — an
artifact a RETURN names but the evidence line has since lost is invisible to it, and every lane a sibling
verified today has had its original citation replaced. A complete universe would have to be derived from
`docs/plan/returns/` as well, which is a larger job than one batch.

## Why this lane is not closed here, and what an owner has to rule

Of the five, exactly one can be discharged inside this batch: `L-WF-DEMO-PRESENCE`'s `final-run.txt` is
**recorded unrecoverable, with the reason**, in `docs/plan/evidence/L-WF-DEMO-PRESENCE/finding.md` — that
lane is in this batch. The other four are not:

- `web-livewalk` is under a standing prohibition, so its artifact is neither committable nor honestly
  callable unrecoverable — **Batch 2's third-bucket objection stands and needs a ruling, not a relabel**;
- the remaining three belong to lanes outside this batch, and the exit does not stop at *committed*: it
  says *"committed **and its lane accepted by `plan verify`**"*. Running `plan verify` against another
  agent's lane is exactly the touching this batch is forbidden.

**So the exit is unmet, and now it is unmet with a number rather than an impression: 5 committed nowhere,
1 of them unrecoverable, 1 under prohibition, 3 blocked on other lanes, plus 2 unfollowable citations and
24 lanes naming nothing.** The count that cannot be closed is the deliverable.
