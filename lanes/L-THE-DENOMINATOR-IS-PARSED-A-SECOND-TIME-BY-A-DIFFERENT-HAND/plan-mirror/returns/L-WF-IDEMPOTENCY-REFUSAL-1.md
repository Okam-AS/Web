```
RETURN: L-WF-IDEMPOTENCY-REFUSAL
brief: 068c160a
verdict: built
evidence: backend OkamAPI lane/wf-idempotency-refusal @ a1d57208, worktree ~/okam/OkamAPI-wfidemref, based on feature/restaurant-modules @ 9888178f, NOT pushed - container-free tier (dotnet test --filter "Database!=SqlServer") 4402/0/12 vs a 4394/0/12 baseline measured in the same worktree at a clean 9888178f, delta +8 = WebApi.Tests/Workforce/WorkforceIdempotencyTests.cs (6) and WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs (2)
log:
Base 9888178f; worktree ~/okam/OkamAPI-wfidemref; lane/wf-idempotency-refusal a1d57208; NOT pushed.
Container-free 4402/0/12 vs a 4394/0/12 baseline at clean 9888178f in the same worktree; +8 = the
new tests. Baseline's first run had 1 non-reproducing failure - pre-existing flake, name not kept.
No discriminator at 9888178f and the defect is real there: WorkforceScheduleCommit's own doc calls
the stuck reservation an accepted price; publish, exchange, requests, timeoff and staff all refuse
behind an already-committed reservation.
NO MIGRATION OWED: OutcomeState is nvarchar(32) with no CHECK, so "Refused" is a value.
RefuseAsync clears the tracker before its own SaveChanges or it commits the mutation the refusal
rejected; the actor is copied BY VALUE off the reservation row.
Sibling backstop: YES but not free - only because RefuseAsync is keyed by (scope,key), so
award-taken and the two concurrency mappings, decided outside the composition, record too.
Wire unchanged on purpose: in-progress keeps retryable:true and no fresh-key hint, now honest;
the genuinely in-flight duplicate is pinned so it cannot be made replayable.
pos-operator-link-corrections is NOT on 9888178f - unmerged lane/wf-blind-bind-name 3b593fef,
own inline composition, needs the same catch on merge. Mutants red 6 and 4; C5 UI walk owed.
END RETURN
```
