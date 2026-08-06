# Suite results measured by this lane (non-SQL tier only; no SQL slot held)

Command in both cases:
  dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter 'Database!=SqlServer'

## baseline — clean checkout of OkamAPI 8e2b57de (feature/restaurant-modules tip), no lane changes
Passed!  - Failed:     0, Passed:  4638, Skipped:    12, Total:  4650, Duration: 7 m 43 s - WebApi.Tests.dll (net8.0)

## lane tree — 8e2b57de + the catch filter + the two new arms
Passed!  - Failed:     0, Passed:  4640, Skipped:    12, Total:  4652, Duration: 6 m 22 s - WebApi.Tests.dll (net8.0)

Delta +2, both in WebApi.Tests/Growth/GrowthDispatchAbsentTableReportTests.cs:
  A_dispatch_whose_audit_ledger_is_absent_reports_the_absent_ledger_not_a_race
  A_dispatch_that_genuinely_loses_the_run_race_still_adopts_the_winner

C7: the raw per-test logs are NOT retained here. Both runs' stdout carries freshly minted
single-use fixture tokens (preference-centre u1.* and mealstok_* reservation tokens, 200+
occurrences), and no token belongs in a file this lane writes. Only these summary lines are kept.
