```
RETURN: L-WF-IDEMPOTENCY-REFUSAL-REST
brief: 12ed1db9
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-wfrefusalrest @ 02684ecc (branch lane/wf-idempotency-refusal-rest, base a1d57208 = the sibling lane; 0 Workforce files drifted between 9888178f and the tip, so it merges clean)
log:
All three sites now RefuseAsync before the throw: import ~line 236, invitation issue ~176, invitation claim ~397. No migration; Refused is a value in the existing nvarchar(32).
Container-free tier only, no container started: 4405 passed / 0 failed / 12 skipped. Lower total than the tip's 4571 because the base is 39 commits behind it, not because anything is missing.
Non-vacuity per site, one mutation at a time, restored with cp then rebuilt (never --no-build): each removal reds ITS OWN test with "Expected workforce.<code>, Actual workforce.idempotency-in-progress" and leaves the other two green. No unreproducible failure to name.
Every proof reads the code out of the RESPONSE BODY; in-progress is a 409 too, so the status alone proves nothing.
The sibling lane's guard is intact: its in-flight-duplicate test still passes, so only a recorded refusal moves in-progress.
WorkforceD1RaceSqlServerTests: both sites now assert exactly one completion row carrying Refused and none carrying Completed, and the class doc names the discriminator. I COULD NOT RUN THIS FILE - it is [Database=SqlServer], among the 12 skipped, Docker down. Line 100 (staff-create) WAS ALREADY RED BEFORE I ARRIVED: the sibling lane routed WorkforceStaffService through RefuseAsync, so a completion row is written and the old assert-none was false from that commit on. Line 197 (claim) goes red with MY change. Neither is anything the SQL run broke.
Import proof needs UX_WorkforceStaffMembers_ActiveEngagement, which is migration-only DDL EnsureCreated does not build; new WorkforceSqliteD1Index builds the same partial unique index on SQLite and states what a test on it may NOT claim (it is not evidence for D1).
retryWithFreshKey stays true on all three - a fresh key is still what re-runs the write - but the three doc comments saying the same key "replays the in-progress reservation" were corrected; they were the prose form of the test that pinned the defect.
ALSO LOOKED, AND IT IS BAD: Meals and Training BOTH have the same shape, live and controller-reachable. Meals = Services/Meals/MealsCommandReceiptService.cs (Reserve/Complete only, no refuse), reservation commits at :158 ahead of the checks, retry gets meals.idempotency-in-progress, no expiry column at all and no purge. ~18 stranding sites incl. 8 DbUpdateConcurrencyException backstops (MealsProgramService :466, MealsMembershipService :158/:361/:536, MealsCompanyService :297/:369, MealsReconciliationService :285, MealsStatementService :307). The defect is DOCUMENTED AS ACCEPTED at MealsCommandReceiptService.cs:32-37.
Training = Services/Training/TrainingIdempotency.cs, reservation commits :98-101 ahead of stageAsync, ExpiresAtUtc explicitly never read, no purge; PROPORTIONALLY WORSE than Meals because its pre-reserve checks cover only shape and authz - every existence/state refusal is behind the reservation (TrainingCourseService :210/:281/:330/:379, TrainingCompletionService :118/:123, TrainingAssignmentService :106/:111/:179/:194, TrainingCertificateService :255/:274/:299 plus the onConcurrency arm at :333 via TrainingMutation.cs:78-81).
Not fixed here - out of this brief, and each needs its own refuse primitive. Recommend one lane per module.
feature/restaurant-modules moved under me while I worked: 5df07afa -> 26599c6e, fast-forward, author agent:L-INVOICE-AUTHORIZE-LAND. Not me; I never touched the ref. My branch is unaffected.
Checkout asserted clean before building; the wire tier dirtied artifacts/journeys/ev-dietary/{run-sheet.json,run-sheet.md} and both were restored, not committed. Committed by pathspec, 9 files. Not pushed.
END RETURN
```
