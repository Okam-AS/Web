```
RETURN: L-TRAIN-DISCLOSURE-LAND
brief: 3d734e95
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-TRAIN-DISCLOSURE-LAND/merge.md
log:
Premise re-measured with `git show <ref>:<path>` only, never a working tree. Both halves confirmed exactly as the brief states.
Route `GET training/stores/{storeId:int}/evidence/disclosures` lives at 06b8b582 and nowhere else: 332 local + 15 remote refs, two probes (route literal, ITrainingDisclosureService).
Backend tip 8e2b57de serves the pack read alone, and its TrainingEvidenceService already appends the rows, so the fact is captured and unserved.
Frontend tip e34977ac mounts TrainingDisclosurePanel on exactly two pages (training-courses.vue:96, workforce-me.vue:246); the 404 renders "The lookup did not answer."
Merge performed on a private local branch only: real merge (59/1 divergence, no fast-forward), ZERO conflicts, one auto-merged file Program.cs, one added DI line.
local/train-disclosure-land f4407595, tree ee8da6f6 equals the git merge-tree prediction; net diff vs 8e2b57de is exactly the lane commit, 16 files 8175/39.
The merge to the shared branch is UNPERFORMED and owed. Nothing was pushed; feature/restaurant-modules has no origin ref, so no push is owed either.
Baseline taken by me on a clean checkout of 8e2b57de: 4638 passed / 0 failed / 12 skipped, total 4650. Non-SQL tier, no container started or touched.
Merged tier ABORTS: 4100/0/12 counted, then Test Run Aborted, host crash ObjectDisposedException on JsonDocument inside Xunit AllException.get_Message; ~550 tests unrun.
Expected delta was +12 and only that: 12 new [Fact], no InlineData, no Skip, no SqlServer trait; the same 12 skips on both sides, enumerated by name.
NOT merge-induced. A clean checkout of 06b8b582 aborts identically, and the lane's accepted after.trx (962 tests) omits 2 of the 3 wire tests that commit adds, one being the aborting one.
Cause: TrainingWireTests:1096 runs Assert.All over JsonElements from a disposed using-var document, asserting a claim two siblings contradict by writing subject rows into a shared fixture.
Fix named, not written: materialize the elements before Assert.All, and scope the all-false actorIsSubject claim to the rows that test causes. Landing first turns a green tier into an abort.
Reachability still two-halved: the backend merge gives a log with no pack surface (the frontend tip has no GetEvidence method); the FE compose is a fast-forward (0/105) writing rows nobody can read.
Owner step is one gated block in owner-step.md: `git update-ref` CAS 8e2b57de to f4407595, then `merge-base --is-ancestor`; the gate is the tier fix first.
END RETURN
```
