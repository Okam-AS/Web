```
RETURN: L-CENSUS-DERIVES-ITS-FLOOR
brief: ccbb4e49
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-CENSUS-DERIVES-ITS-FLOOR/detail.md
log:
Base verified: OkamAPI feature/restaurant-modules tip IS 8e2b57de; that ref resolves in no Web-modules object. Worktree OkamAPI-censusderive, branch lane/census-derives-its-floor @ 7585fa3b, unpushed.
TWO uncensused audit-stamping services at that tip, not one: Services/Training/TrainingEvidenceService.cs:274 and Services/Meals/MealsFundingAuthority.cs:251, a C4 money-path attribution row.
Measured twice, agreeing on all 21 rows: ActorStampCensus.Derive (C#) and a hand-rolled Python scanner sharing no code. Meals holds 15 sites over 7 files vs a floor of 14/6; Training 11/5 vs 10/4.
Neither old comparison can fail on an ADDITION (>= and Contains are one-directional), and the slack they open then absorbs a DELETION. Both directions shipped at this tip.
New: ActorStampCensus.cs plus a generated, committed actor-stamp-census.txt naming every stamping file, compared by equality both ways; a sha256 over the rows refuses a hand edit.
The regeneration lever ACTOR_STAMP_CENSUS_WRITE=1 rewrites the artifact and FAILS its own run, so a rewrite can never read as a pass. Line numbers stay out of the artifact so it cannot churn.
KnownFiles/KnownSiteFloor/KnownResolverFloor/KnownGuardFloor deleted: keeping them beside a working census leaves the failed instrument shipping. Census and rule now read one enumeration.
RED, site deleted: run-2 names TrainingEvidenceService.cs as a row the tree no longer holds. RED, 5->4 sites in a named file: run-3 prints the four survivors at lines 157/234/290/340.
RED, whole service added: run-4 names Services/Training/TrainingRefresherService.cs line 30. RED, artifact hand-edited: run-7 reds on the digest. GREEN: run-1 and run-8, 39 passed / 0 failed.
THE PAIR THAT MATTERS: on ONE identical tree the OLD census reports Passed! 38/38 for the added service (run-5) AND for the deleted site (run-6), while the new one names the file both times.
Container-free tier --filter Database!=SqlServer: 4639 passed / 0 failed / 12 skipped (run-9). Production tree restored: git diff 8e2b57de -- Services/ empty. Each mutation compiled before its run.
No push, no shared-branch commit, no migration, no container started, no stash, no bare pathspec add. The Web-modules checkout is untouched apart from this lane directory and this return.
C3 plainly: it is an xUnit test so every dotnet test WebApi.Tests runs it, and NOTHING in CI gates this branch — the sole workflow triggers on push to master/test only, with no pull-request trigger.
Residual: a blind regeneration still blesses drift; the digest stops a hand edit, not an unread rewrite. Named in detail.md rather than implied away.
Complement: L-CENSUS-FLOORS-DERIVED's IL arm needs no blessing but is blind to a deletion and names no file; the two conflict in one file, resolve additively, and its base 3579bbbc needs rebasing.
END RETURN
```
