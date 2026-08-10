```
RETURN: L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE
brief: 773dcc6b
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE/mutation-log.md
log:
FIX one hunk, GrowthDispatchService.cs:311: catch (DbUpdateException) -> catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex)), the shared 2627/2601 detector. No 4th local copy.
COLLISION outranking the fix: this exact change exists at lane/growth-sql-catch-typed c7912d49 (L-GROWTH-SQL-CATCH-TYPED, built-unverified), UNPUSHED, merged into neither 8e2b57de nor 7f8945dc.
Independent convergence — I derived the identical filter before finding that branch. Land ONE. Prefer c7912d49: it also narrows GrowthConsentTextService:247, which this exit criterion excludes.
NET NEW: c7912d49's dispatch missing-object arm raises a CONSTRUCTED SqlException 208; only its consent arm is fabrication-free. Mine is the fabrication-free DISPATCH arm. My arm 2 overlaps its arm 5.
SYMPTOM measured, not argued: under the broad catch the operator gets InvalidOperationException "Sequence contains no elements" from the winner re-read. The absent table is named nowhere at all.
MUTATION M1 (widen back to catching every DbUpdateException) reds arm 1 only; arm 2 stays green under the mutant. Schema identical across both runs, so the red is the reporting and not the table.
Stale-build trap avoided: editor-write mutant, explicit build, assembly mtimes 15:13:21 vs 15:14:02, restore by cp+touch, md5 b60cfe3d re-checked equal to the pre-mutation snapshot.
SUITES measured myself, non-SQL tier: baseline clean 8e2b57de 4638/0/12; lane tree 4640/0/12. Delta +2, both my arms, named in suites.md. No SQL slot taken, no container touched.
C1: the absence is arranged by RENAMING GrowthAuditEvents and renaming it back, never DROP; the arm asserts the ledger count unchanged both ways, so no row is purged and none is invented.
C7: 6.3MB of raw suite stdout carried 200+ single-use fixture tokens (u1.*, mealstok_*); distilled to summary lines and deleted rather than committed under the lane directory.
NOT FIXED, reported: GrowthConsentTextService.PublishAsync:247 has the same untyped catch, answering an absent table with 409 growth.consent_text_version_race — a retry that can never succeed.
F-NEWSLETTER-DISPATCH-DEAD-ON-CHAIN half-clears: the reporting conjunct only. Dispatch still fails on any chain-built database until MIG-22 lands; those 5 SQL reds stay red, now naming the ledger.
Reachability: no new capability, no route, no flag — a report change on a service already wired. Test project is outside the actor-stamp scope, so the ledger writer pin is untouched.
No push, no commit, no shared branch, no migration, no model change. Worktree /Users/svendaneel/okam/wt-newsletter-cause detached at 8e2b57de; 3 files: 1 production hunk, 1 new test, 1 optional param.
END RETURN
```
