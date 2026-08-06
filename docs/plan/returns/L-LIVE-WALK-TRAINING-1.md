```
RETURN: L-LIVE-WALK-TRAINING
brief: 8af5aeb8
verdict: blocked
evidence: lanes/L-LIVE-WALK-TRAINING/evidence.md
needs: +L-TRAIN-DISCLOSURE-LAND,+L-COMPOSE-FE-CANDIDATE,+F-TRAIN-INVISIBLE-ON-A-FRESH-STORE
log:
NO RUN CLAIMED. No container, no process, NO PORT BOUND — 4010/4971/4973 untouched, all foreign. Read-only at web 8ac6f63 / api 8e2b57de (clean); wrote only my lane dir.
NEITHER SIBLING DEFECT, for a FOURTH reason: NO MASTER AT ALL. `grep -ni training appsettings*.json` = nothing; TrainingModuleGate binds only ITrainingFeatureFlags + a DbContext probe.
So NO resolver is registered and NONE IS REQUIRED: the board's fallback (FlagsController:64) IS what StoreBackedTrainingFeatureFlags computes; Describe() and DefaultFor share ONE Declared list.
EXTENSION SWEEP DONE, and it inverts: only Margin/Meals have module extensions, only AddMarginModule() runs, Training has none — its 4 sit at Program.cs:1177-1188. No controller-wide filter either.
THE FIXTURE LIE, deeper than a value: training.js:202 answers GET /context 200 UNCONDITIONALLY. TrainingContextService.cs:42 calls EnsureVisibleAsync = setup flag on OR a Training* row exists.
live-world.sh seeds neither ("training" is in neither it nor live-world-reset.sh; SEEDED_TABLES is the 3 Workforce ones). So on ANY live world the walk reds at STEP ONE: context 404, gate renders.
AND IT IS THE WALK'S THESIS, not a seed gap. Steps 2-3 assert visible+flags-Av+409 = disabled-after-data, UNREACHABLE on a fresh venue: visible needs data, data needs a write, a write needs the flag.
AMENDMENT IS SHORTER THAN WHAT IS THERE and the walk holds it already: its LAST step flips assignments off and the rows survive. Open on the never-enabled 404, or move read-only after the course.
DO NOT close it by seeding a Training row — that makes a store no venue can be, the defect this walk stops. Unlike Events/Growth, Training needs NO live-world.sh switch: it has no master to beat.
BOTH MERGES CONFIRMED AT REFS and the two frontend refs have now DIVERGED. #17 is at lane/train-disclosure 06b8b582 only; backend-only = the log with no surface, compose-only = surface with no log.
Measured, as it changes who is blocked: the shipped panel (courses:96) calls #17 on @lookup, NOT on mount — it 404s a manager, not this walk. #16's caller+spec: candidate f40fdf3 only.
THIRD BLOCKER, real product: publish is intercepted by a neighbouring column; the fix is lane/train-publish-unclickable 28548f96, NOT in 8ac6f63, so live reds there too. That lane owns it.
Its capture records that failure; the sibling capture names a commit its spec does not exist at (borrowed tree). Both are backend:fixture and both specs @fixture — Training has ZERO live captures.
BLOCKED ON THE SLOT, MEASURED: class node, live-world.sh:224 needs a RUNNING SQL container, okam-lws-sql Exited(0) 41h. NOT headroom — 2.002GiB of 7.653GiB used, ~5.6GiB free.
The one running mssql is FOREIGN (org.testcontainers.lang:dotnet, reaper 29cdcd1e), up ~1min before I looked — I did not start it, cannot point SQL_CONTAINER at it, did not touch it.
END RETURN
```
