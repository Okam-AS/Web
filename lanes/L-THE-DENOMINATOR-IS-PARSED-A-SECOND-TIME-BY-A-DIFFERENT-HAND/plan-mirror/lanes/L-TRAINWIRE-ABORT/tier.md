# The four measurements

Every run: OkamAPI, own worktree `/Users/svendaneel/okam/wt-trainwire-abort`, `--filter Database!=SqlServer`
(plus `FullyQualifiedName~TrainingWireTests` on the targeted ones). No container started, stopped or
entered. One suite at a time.

| # | tree (OkamAPI) | binary built | scope | result |
| --- | --- | --- | --- | --- |
| 1 | `06b8b582` clean | 15:27:43 | TrainingWireTests | **15 of 26 recorded, then Test Run Aborted** |
| 2 | `06b8b582` clean | 15:27:43 | whole non-SQL tier | **3155 / 0 / 10 = 3165 counted, then Test Run Aborted** (4 m 21 s) |
| 3 | `06b8b582` + change A | 15:35:06 | TrainingWireTests | 26 counted — **25 passed / 1 FAILED**, no abort |
| 4 | `06b8b582` + A and B | 15:37:32 | TrainingWireTests | 26 / 0 / 0 |
| 5 | `06b8b582` + A and B | 15:37:32 | whole non-SQL tier | **4381 / 0 / 12 = 4393 counted, completes** (5 m 31 s) |
| 6 | `f4407595` (the merge) + A and B | 15:45:00 | whole non-SQL tier | see below |

Every run after a source change was preceded by a rebuild and the assembly mtime was read before and
after; no `--no-build` measured a pre-mutation binary.

## Abort is not failure — what runs 1 and 2 actually show

Run 1: the class declares **26 `[Fact]`s**; the trx holds **15**. Run 2: the trx holds **3165** results, all
of them `Passed` or `NotExecuted`, **zero `Failed`** — and then the host is gone. Roughly **1,200+ tests in
the tier never ran**, and nothing in the counters says which, or why. The last result recorded in run 2 is
`TripletexMappingTests.OreToKroner_ConvertsExactly(...)` — a test with no relationship to the cause, which
is exactly the problem with reading an abort's counters as if they located something.

`3165` is not `4100`. `L-TRAIN-DISCLOSURE-LAND` measured `4100` on the **merged** tree; this is a clean
`06b8b582`, a smaller tier, and the point at which a crash truncates a run is wherever the doomed class
happens to fall in that run's order. The reproducible fact is the abort and its stack, not the counter — a
counter produced by a dead host is an artifact of scheduling.

## Run 3 is the finding the abort was hiding

Change A alone makes the class finish, and finishing immediately turns up a **second red test that had
simply never been reached**:

```
Failed  An_evidence_read_records_who_asked_attributed_to_the_token_the_bearer_handler_resolved
Assert.All() Failure: 1 out of 3 items in the collection did not pass.
[1]: Xunit.Sdk.EqualException: Expected: wire-admin-a / Actual: wire-admin-b
     at TrainingWireTests.cs:line 1031
```

Same root cause as line 1096 — an **all-rows claim over a shared fixture** — one method earlier. Line 1031
claimed every `evidence.read` row for `TrainingPersonRef` was written by `AdminA`, while
`The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons` deliberately has
**`AdminB` read that same person in `StoreB`** (lines 1066-1068) to prove the store predicate filters it.

**The product is right and the assertion over-claimed.** Recording an `AdminB` read as an `AdminB` read is
the ledger behaving correctly; nothing was silenced to make this green. It is a test defect of the identical
shape, and it is red at `06b8b582` today — invisible only because the abort killed the host before it ran.

This is why change B exists and why it is a **third** change beyond the two the brief named: the brief's two
changes leave the tier *counted but red*, which unblocks nothing. It is a separable hunk
(`fix.patch`) if the reviewer would rather rule on it on its own.

## The 4650

The exit criterion asks for "a trx enumerating all 4650 tests" at a checkout of `06b8b582`. **A clean
`06b8b582` does not contain 4650 tests** — measured, it contains 4393 under this filter (run 5). 4650 is a
property of the *other* side: `L-TRAIN-DISCLOSURE-LAND` took it as a baseline on `8e2b57de`, the backend
tip, which is **59 commits ahead** of the lane (`git rev-list --left-right --count 06b8b582...8e2b57de` →
`1 59`). Those 59 commits carry tests the lane commit's own tree has never had.

So the criterion's substance — *completes with a counted pass/fail/skip triple rather than Test Run
Aborted, with nothing left unrun* — is met at `06b8b582` by run 5, and the 4650-class number is measured
where it actually lives, on the merge, by run 6.

Run 6 is possible at all because `WebApi.Tests/Wire/TrainingWireTests.cs` is **byte-identical** at the lane
commit and at the merge — blob `a64c8a0bfe9f0b28c0f58c3615e839b1bb0bb19c` at both `06b8b582` and
`f4407595`, and a different blob at `8e2b57de`. The fix therefore applies to the merge verbatim, with no
re-resolution.

`f4407595` is `L-TRAIN-DISCLOSURE-LAND`'s merge on the private local branch `local/train-disclosure-land`.
This lane checked it out **detached in its own worktree** and did not commit, push, or touch that branch or
`wt-traindiscland-m`.
