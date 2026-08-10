```
RETURN: L-EVERYTHING-REACHES-THE-BRANCH
brief: 5554fe18
verdict: built
evidence: docs/plan/lanes/L-EVERYTHING-REACHES-THE-BRANCH/landing-evidence.md
log:
FINAL TIPS on feature/restaurant-modules -- backend dc0fa8508 -> a1c1a6dff ; frontend 0d6692d -> a63c30f ; nothing pushed ; revert each = git branch -f <trunk> <old sha>
all 12 named branches are ancestors of their tip; escpos-ladder-tender 9990b4bb7 rode beneath printed-receipt as instructed, never merged on its own
ZERO conflicts across 11 merges, so git merge-file was never reached; the 4 silent auto-merges were read line by line rather than trusted
Program.cs both hunks intact (middleware first, SMS limiter out of AddMcpAuthentication); UserController/UserService carry meter + 30d token + IsPowerUserAsync in the required order
translations no/en/de were the only files both sides changed: exactly +1 line each, ZERO deletions -- the wolt-menu shape (lane restoring what trunk deleted) did not recur
rule 2 REFUSED and retired unlanded, verified non-ancestors: growth-sql-catch-typed c7912d49f and newsletter-dispatch 33a99ac47, both tagged retired/*
rule 3 re-run at the branch ref: IsCreditSale names only Services/Kassa/KassaCreditSale.cs; no 2431883d-based head merged
frontend jest a63c30f: 150 suites / 3563 / 0 failed (base 149/3543/0). 150 RESOLVED so the empty-core trap did not fire -- core pinned 9626a561, which had to be fetched by ref
+20 accounted: sign-in +8 (5 plain + one test.each of 3 rows) in one new suite; training +12 (components 4, journey 5, page 3)
backend non-SQL a1c1a6dff: 4832 / 0 failed / 10 skipped (base 4759/0/10) = +73, accounted EXACTLY by running every new and edited class at BOTH revisions
+44 escpos+tender, +5 login, +2 error-body, +3 workforce, +1 refusal, +5 margin, +4 poweruser, +6 growth, +3 training = 73; 8 other edited classes 0 delta; none unaccounted
SQL TIER RAN UNINTERRUPTED 32m05s: 695 total, 694 passed, 1 failed -- the first complete SQL tier of the day, not killed by host pressure
that 1 failure (SchedulePublishSqlServer outbox count 1 vs 2, asserted by StoreId alone) REPRODUCES at dc0fa8508: pre-existing on trunk, not from any merge, left for a ruling
CAP FIX worth carrying: one dotnet test spans TWO testcontainers sessions (VSTest reuses testhosts), so a pinned-session watcher skips half; gated on baseline+label, 8 capped 2048MB
both trunks build (dotnet 0 errors; nuxt client 17.11s + server 14.29s); 4 worktrees created and all 4 removed; run-sheet dirt never entered a commit; owner world :5971/:3971 still 200
END RETURN
```
