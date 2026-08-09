# L-EV-OUTBOX-GUID-SUBSTRING — the record, moved somewhere a stranger can open it

Reason-shape hit: **(1) the run happened and the write-up existed, but at a citation that resolves nowhere.**
`instrumentless-exits.md` (Batch 0) measured it: `git ls-tree -r 79f9dd7d -- .lane` is **empty**, so the four
files the `evidence:` line named were never committed at the lane commit. **Re-measured here and confirmed:**
`lane/ev-outbox-guid-substring` is `79f9dd7d48ad7d53db3d43bb34788f4c4336a93a`, and the files live only in the
working tree of `/Users/svendaneel/okam/wt-evoutboxguid`, whose HEAD today is `76e6c5242` —
*"wip: rescue uncommitted work from wt-evoutboxguid, 2026-08-06"* on `wip/rescue-2026-08-06-wt-evoutboxguid`,
a different commit on a different branch in a different repository (`OkamAPI`, not `OkamAPI-modules`).

**Nothing about the work was in doubt.** The mutation record is genuine and was written at the time. What was
missing was a path the plan repo can reach. This directory is that path.

## The `evidence:` line this lane carried before `plan verify` overwrote it, preserved verbatim

    OkamAPI-modules lane/ev-outbox-guid-substring 79f9dd7d (worktree /Users/svendaneel/okam/wt-evoutboxguid, off feature/restaurant-modules 3579bbbc, local, unpushed); after 4383/0/12 vs base 4369/0/12 measured myself, filter "Database!=SqlServer", no container started; .lane/base-3579bbbc.trx, .lane/after-lane.trx, .lane/repeat-runs.txt, .lane/L-EV-OUTBOX-GUID-SUBSTRING-detail.md

## What is here, and that it is the same bytes

| file here | copied from | sha256 |
|---|---|---|
| `detail.md` | `/Users/svendaneel/okam/wt-evoutboxguid/.lane/L-EV-OUTBOX-GUID-SUBSTRING-detail.md` | `62213e7a205377125cd1153953901e62edac95987830a2edd5becdf53e7b5e17` |
| `repeat-runs.txt` | `/Users/svendaneel/okam/wt-evoutboxguid/.lane/repeat-runs.txt` | `92e73d87a73c8a056e22b578eaee6d40274dee69b156c4e1f2e49f62b409e0b4` |

Both hashes were taken on source and destination in the same command; they match, so this is a copy and not a
retelling.

## The two clauses the exit asks for, and where each is answered

**Clause 1 — *reds when the identifier-aware form is reverted*.** `detail.md` §3, Mutation 1 (scan the raw
`body` instead of `scanned`): `Failed: 6, Passed: 23, Total: 29`, **all six seeded-token cases red**. A second
mutation is recorded beside it (remove the two amount checks → `Failed: 4, Passed: 25, Total: 29`), which
closes the "make it deterministic by checking less" escape. The record states both mutations recompiled and
that the assembly mtime was checked against source mtime on each, with `--no-build` never used for a mutation
run — the exact trap this program keeps hitting.

**Clause 2 — *passes across repeated runs with seeded identifiers that contain the digits*.**
`repeat-runs.txt` is **40 consecutive runs of `EventsOutboxDeliveryTests`, every one `Failed: 0, Passed: 29,
Total: 29`** — runs 1 through 40 verbatim, no gaps. The seeded-identifier theory
(`A_link_token_that_spells_an_amount_is_not_read_as_a_leaked_amount`, 6 cases including the real token
`74ed9e07-f792-488f-9d1b-077a2ce7d250` drawn by the 200 000-body measurement) is inside that 29.

The defect's own rate is measured rather than asserted in §1: 200 000 real bodies, `hitEither=1012`, **1 in
197.6** — and the record corrects its own brief upward (*"the brief says roughly once in a hundred and thirty
runs; the measured rate is 1 in ~198"*), with the arithmetic that predicts it.

## The two `.trx` files are deliberately NOT copied here

`.lane/base-3579bbbc.trx` and `.lane/after-lane.trx` are ~6 MB each and both carry the checksum-valid
fødselsnummer `01010112377` (`grep -c` returns 2 on each), the value
`evidence-recovered-to-the-trunk.md` holds pending an owner ruling. **Their counters were read out of them
directly instead**, and they match the `evidence:` line exactly:

| trx | total | executed | passed | failed |
|---|---|---|---|---|
| `.lane/base-3579bbbc.trx` (base `3579bbbc`) | 4381 | 4369 | 4369 | 0 |
| `.lane/after-lane.trx` (lane head) | 4395 | 4383 | 4383 | 0 |

+14 executed, +14 passing, 0 failing — the 6 + 7 + 1 cases the change adds, and nothing else moved.

**A finding this raised, which is larger than this lane** — see `forty-seven-remainder.md`: the fødselsnummer
hold is already breached in the plan repo. **22 of the 89 tracked `.trx` files carry `01010112377` today.**
Withholding these two is consistent with the hold as written; it is not consistent with what the repository
already contains, and that contradiction is an owner's to resolve, not this lane's.
