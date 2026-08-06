```
RETURN: L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED
brief: 5e679abf
verdict: built
evidence: lanes/L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED/finding.md
log: Guard built per ruling guard-where-the-value-enters. Read with `git show 8e2b57de:` = feature/restaurant-modules tip (rev-parse + is-ancestor); working dir on lane/meals-grace-pins never read.
log: RequireDefinedTender (FinalizeService:318) = `!= NotSet && Enum.IsDefined`, mirroring PosReasonLabels.IsValid on the same RETREC. Called at :68 (widened from NotSet-only), :220, :523, :659.
log: NOT on the two request types: pass 1 enumerated 250 [FromBody] types, neither is among them, so an attribute there gates nothing — the advertised-control shape shipped 3x in 2 days.
log: NotSet rejected too, measured not assumed: all 40 construction sites of the 3 carrier types (prod+test) assign PaymentType explicitly and none assigns NotSet. A sentinel names no tender either.
log: RED PROVED FIRST (_guard/red-before-guard.txt): 6 failed / 1 passed. Five failed "Assert.Throws() Failure / Actual: (No exception was thrown)" — (PaymentType)999 was JOURNALLED on card sale,
log: single settlement, mixed settlement, referenced RETREC and unreferenced RETREC. Sixth was the NotSet pin on the old narrower message. GREEN AFTER: 7/7 (_guard/green-after-guard.txt).
log: Positive control stops it matching nothing-or-everything: CompanyAccount 120 sits outside any contiguous range of Cash 110 / Stripe 200 — a range check refuses it, IsDefined admits it.
log: Every rejection case asserts the journal is EMPTY afterwards; throwing after the row exists would not close C1. In-memory SQLite harness — NO container started, none touched. NO REGRESSION:
log: non-SQL suite Failed 0 / Passed 4645 / Skipped 12 / Total 4657, WebApi.dll mtime > FinalizeService.cs mtime so --no-build measured the guarded binary. COULD NOT MEASURE, not substituted:
log: SQL tier (88 Trait Database=SqlServer, no slot) and any browser walk (C5); residual = guard sits on the writer, not the table (C2). Commit bd77cd6b, lane/paymenttype-defined-tender, NOT pushed.
END RETURN
```
