```
RETURN: L-GROWTH-SQL-CATCH-TYPED
brief: 64e8cc0e
verdict: built
evidence: lanes/L-GROWTH-SQL-CATCH-TYPED/mutation-log.md
spec_gap: brief says both catch SqlException; they catch DbUpdateException (the SqlException is its inner) — same defect, same fix
reason: built and mutation-proved; no container taken, no migration authored
log:
PREMISE HOLDS at 8e2b57de, re-measured in my own worktree: both catches untyped, neither already fixed.
Services/Growth held ZERO violation classifiers; the other four modules all have one.
FIX 2 lines: catch (DbUpdateException) -> catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex))
at GrowthConsentTextService.cs:247 + GrowthDispatchService.cs:311 — the estate's ONE detector (SQL Server
2627/2601 by NUMBER, never message text). No new GrowthDbViolations type, no using added, no dead branch.
PROOF 5 arms in matched pairs. A 208 arm per service: the refusal now names dbo.GrowthAuditEvents instead of
a false publish race / "Sequence contains no elements". Consent also gets a FABRICATION-FREE arm (DROP TABLE
GrowthAuditEvents -> SQLite's own "no such table"). Inverse arms pin the 409 race and the winning run id.
MUTATION M1 (consent untyped only) reds arms 1+2, dispatch green; M2 (dispatch untyped only) reds arm 4 only.
DISJOINT reds => each site is load-bearing and neither rides the other. Inverse arms never red under any mutant.
REGRESSION 4643/0/12 container-free tier; Growth 494/0/1. No container, no SQL slot, no migration, no model
change. The 208 SqlException is constructed (SqlClient's own factory, 5.1.7); arm 2 is why that is covered.
COMMITTED lane/growth-sql-catch-typed c7912d49, parent 8e2b57de, 3 files by pathspec, NOT pushed.
FOUND, not mine: GrowthSqlServerFixture uses MigrateAsync, so the Growth SqlServer tier ALSO lacks the table —
every audit-writing Growth SqlServer test is red-by-construction today, unseen because Docker has been down.
END RETURN
```
