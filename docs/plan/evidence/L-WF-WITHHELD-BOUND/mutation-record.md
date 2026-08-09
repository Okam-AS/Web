# L-WF-WITHHELD-BOUND — the four-state mutation record, written down

**Reason shape: (1) missing write-up** — the run happened and nobody wrote it down. The six `.trx` existed
and `mutation_check.py` existed, but a `.trx` states no mutation and a runner carries no outcome, and both
lived only inside `/Users/svendaneel/okam/wt-wfwithheld`. This file is the record; the five `.trx` beside it
are the same files, rescued to a durable path. **No new run was needed and none was made** — the state this
records is already the trunk's.

## The evidence line as the lane recorded it, preserved before `plan verify` overwrites it

```
evidence: /Users/svendaneel/okam/wt-wfwithheld @ 74405b34 (lane/wf-withheld-bound off feature/restaurant-modules 569887a5); pin WebApi.Tests/Workforce/WorkforceNotificationBacklogBoundTests.cs; four-state record lanes/L-WF-WITHHELD-BOUND/mutation_check.py + trx/
```

## The exit, and where each clause is discharged

> a superseded publication's outbox rows reach a terminal state and a withheld row whose week has ended
> stops being re-polled, **pinned by a test that reds if either transition is removed**

One test carries both transitions and reds under either mutation — which is literally what "a test that reds
if **either** transition is removed" asks for:
`WebApi.Tests.Workforce.WorkforceNotificationBacklogBoundTests.Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires`.

## The record measures the trunk, not a branch

The lane branch `lane/wf-withheld-bound` (`74405b34d`) **is an ancestor of the backend trunk `6d5328004`** —
measured, not assumed (`git merge-base --is-ancestor` → 0). Two further checks were made so this record cannot
be about a tree that no longer exists:

- **The pin file is byte-identical at both.** `74405b34d:WebApi.Tests/Workforce/WorkforceNotificationBacklogBoundTests.cs`
  and `6d5328004:...` are the **same blob, `289c10e2c9d632010e718e549c356350a7bf34c1`**. So the `line 79` and
  `line 106` in the failure stack traces below index the trunk's own file.
- **Both mutated production blocks are verbatim at the trunk.** The supersede-cancel block is at
  `Services/Workforce/WorkforceSchedulePublishService.cs:395-409` (`command.Status = WorkforceNotificationOutboxStatus.Superseded;`
  at `:407`), and the age-out block at `Services/Workforce/WorkforceNotificationDispatcher.cs:251-260`
  (`WithheldExpiredReason = "WithheldWeekEnded"` at `:72`, `outcome.WithheldExpired++` at `:259`).

## Which mutation, which assertion went red, what the message said

`mutation_check.py` applies each mutation as an **exact string replace of a named production block**, runs
`--filter "Database!=SqlServer&FullyQualifiedName~WorkforceNotificationBacklogBoundTests"` with `--logger trx`,
restores, and runs again. Five states, per-test outcome recorded in every one:

| state | trx | counters | `Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires` | `A_withheld_command_whose_week_is_still_ahead_is_kept_and_still_re_polled` |
|---|---|---|---|---|
| baseline | `baseline.trx` | total 2 · executed 2 · **passed 2 · failed 0** | Passed | Passed |
| **M1** supersede-cancel block deleted from `WorkforceSchedulePublishService.cs` | `M1-supersede-cancel-removed.trx` | total 2 · executed 2 · passed 1 · **failed 1** | **Failed** | Passed |
| M1 restored | `M1-supersede-cancel-removed-restored.trx` | total 2 · executed 2 · **passed 2 · failed 0** | Passed | Passed |
| **M2** withheld age-out block deleted from `WorkforceNotificationDispatcher.cs` | `M2-withheld-age-out-removed.trx` | total 2 · executed 2 · passed 1 · **failed 1** | **Failed** | Passed |
| M2 restored | `M2-withheld-age-out-removed-restored.trx` | total 2 · executed 2 · **passed 2 · failed 0** | Passed | Passed |

**What the messages said**, verbatim from the trx `<Message>` and `<StackTrace>`:

**M1 — transition 1 removed.** The predecessor's undelivered command never becomes terminal:

```
Assert.Equal() Failure
Expected: Superseded
Actual:   Withheld
   at ...BacklogBoundTests.Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires()
      in .../WorkforceNotificationBacklogBoundTests.cs:line 79
```

Line 79 is the assertion under the comment `// TRANSITION 1: the predecessor's non-terminal command is
terminal, and only the predecessor's.` — `Assert.Equal(WorkforceNotificationOutboxStatus.Superseded, await
PushStatusAsync(harness, first.PublicationId))`. The actual value, `Withheld`, is the accreting row the lane
exists to bound.

**M2 — transition 2 removed.** The row whose week is over is not retired:

```
Assert.Equal() Failure
Expected: 1
Actual:   0
   at ...BacklogBoundTests.Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires()
      in .../WorkforceNotificationBacklogBoundTests.cs:line 106
```

Line 106 is under `// TRANSITION 2: the held command retires instead of being held for a week already over.` —
`Assert.Equal(1, expired.WithheldExpired)`. Zero expired is the unbounded re-poll continuing.

**Non-vacuity.** `executed="2"` in all five states, so no run silently executed nothing; and the sibling test
`A_withheld_command_whose_week_is_still_ahead_is_kept_and_still_re_polled` **passed in every state including
both reds** — each mutation reds exactly the transition it removed and nothing else, and the control that
pins the *opposite* outcome (a week still ahead stays `Withheld`, 0 attempts, null `DeadLetteredAtUtc`) is
never disturbed. Restoration returns 2/2 both times.

## What this record does NOT close, carried forward rather than hidden

**The lane's second `Withheld` site is unfalsified by its own two tests.** This is not my finding — it is
`L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK`'s, made while landing this very branch, and it belongs beside
this record rather than in a different lane's RETURN:

> `wf-withheld-bound +2; mutating the re-poll guard reds 1/2. Its **SECOND Withheld site, the expiry sweep,
> reds NOTHING under mutation** — that arm is unfalsified by its own two tests.`

The exit's two named transitions are both pinned; a third code path that also writes `Withheld` is not, and a
reader should not infer from this record that every `Withheld` write is covered.

**C5 stands.** Nothing here is an operator walking a screen. This is a backlog bound proven at the service
tier; no surface was opened and no person has seen a `Superseded` or aged-out row on the failures page.
