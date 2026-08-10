```
RETURN: L-GROWTH-TELLS-THE-OPERATOR-WHAT-ACTUALLY-FAILED
brief: 001cb1cb
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-GROWTH-TELLS-THE-OPERATOR-WHAT-ACTUALLY-FAILED/mutation-log.md
log:
PREMISE HOLDS, measured at trunk 118f92fb9 not inherited: GrowthConsentTextService.cs:247 and GrowthDispatchService.cs:311 both still catch (DbUpdateException) untyped.
FIX 2 hunks, one per site: catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex)) -- the shared 2627/2601 detector. No 4th copy, no new using. Message text unchanged.
BOTH PATHS AT BOTH SITES, 6 arms. Consent retryable -> the 409 growth.consent_text_version_race survives; consent unfixable -> DbUpdateException naming GrowthAuditEvents.
Dispatch retryable -> still returns the winning run id and its ledger row; dispatch unfixable -> DbUpdateException naming the absent ledger, not "Sequence contains no elements".
MUTATION M1 (widen consent back) reds arms 1+2, all dispatch arms green. M2 (widen dispatch back) reds arms 4+5, all consent arms green. Reds DISJOINT: neither site rides the other.
The reds print the old answer verbatim: "answered as growth.consent_text_version_race ... retry a publish that can never succeed" and "InvalidOperationException: Sequence contains no elements".
Schema identical across mutant and restored runs, so the red is the REPORTING. The 3 inverse arms never red under either mutant -- guards against replacing a wrong answer with a missing one.
FABRICATION: arms 2, 3, 5, 6 are provider-raised. Arms 1 and 4 build a genuine SqlException 208 because production is SQL Server and no SQL slot was granted; stated plainly in the file.
C1: the ledger absence is arranged by withholding the NAME (ALTER TABLE RENAME TO and back), never DROP and never a row statement; both arms assert the ledger count unchanged both ways.
C7: no credential, key, connection string or token added to any message or log; the 3 captured outputs scanned, sole match is EF's CancellationToken inside stack frames.
SUITES here, non-SQL tier: lane tree 4742/0/10 in 9m54s against the brief's recorded trunk baseline 4736/0/10. Delta +6 = the 6 arms, one new file. No existing test file edited.
Stale-build trap avoided: editor-write mutants, explicit builds, assembly mtimes 22:14:09 / 22:18:59 / 22:19:51 / 22:20:47, both restored files md5-equal to the pre-mutation snapshot.
COLLISION resolved rather than repeated: lane/growth-sql-catch-typed c7912d49 and lane/newsletter-dispatch-reports-its-cause 33a99ac4 hold this fix, both unpushed and merged into nothing.
This branch rebases c7912d49's hunks onto 118f92fb9 and folds in the sibling's provider-genuine dispatch arm, dropping its duplicate race arm. Land ONE of the three, this one.
NOT CLOSED: dispatch still fails on a chain-built database until MIG-22 creates GrowthAuditEvents. C5 unmet by design -- a suite is not a person. No push, no migration, no container, no port.
END RETURN
```
