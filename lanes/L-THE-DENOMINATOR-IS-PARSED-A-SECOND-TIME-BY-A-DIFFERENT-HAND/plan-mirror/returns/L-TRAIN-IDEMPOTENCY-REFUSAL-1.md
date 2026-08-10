```
RETURN: L-TRAIN-IDEMPOTENCY-REFUSAL
brief: d7047988
verdict: built
evidence: lanes/L-TRAIN-IDEMPOTENCY-REFUSAL/mutation-log.md
log:
Base 8e2b57de = the tip the brief named, verified; mig-stack-land DIVERGED 59/34, zero Training drift.
No discriminator there, so not fail-spec. Worktree OkamAPI-trainidemref, commit 01cd5eee, 7 files by
pathspec, NOT pushed, no shared ref moved, no container started. C5 owed - nobody has walked the UI.
Container-free: 4663/0/12 vs my own 4638/0/12 baseline at clean 8e2b57de; delta +25 = exactly the facts
added, skipped 12 in both runs. No unreproducible failure to name.
16 backstops COUNTED: 13 staging throws + 1 shared lookup 404 + 2 onConcurrency arms; two are invisible
to a grep for "throw TrainingProblemException". All 16 funnel through ONE composition, so the recording
lives in 2 places, not 16. Mutants 6/6 RED, 0 survivors, run twice; verbatim "Expected:
training.not-found / Actual: training.idempotency-in-progress" - the instrument prints the defect.
SURVIVOR REPORTED THEN KILLED: round 1 left M04 (the replay rethrow) green - without it a Refused
reservation RE-EXECUTES the callback and, world unchanged, refuses again with the same code. Lesson the
siblings lack: same-code-on-retry does NOT prove a replay. Fixed by a test that repairs the precondition
between the calls and counts rows. NOT PROVEN: that SQL Server's rowversion CAS raises the arm.
NO MIGRATION (Status nvarchar(32), no CHECK; DDL+model+converter checked); C1 clear. In-flight guard
intact; no shared fixture touched. Disclosure verified: hash precedes outcome; tenant-bound by StoreId.
END RETURN
```
