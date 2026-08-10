```
RETURN: L-WF-BOOTSTRAP-ONE-ENGAGEMENT
brief: b4d4b948
verdict: blocked
needs: +F-SQL-HEADROOM
reason: The exit says "refused by a database constraint, proven at the SQL tier". SQL Server was unavailable for the whole lane: five foreign containers (okam-lvsp-sql, okam-lwr-sql, okam-lws-staff-sql, okam-lws-sql, zen_pasteur) held 6.28 GiB of the VM's 7.65 with 668 MB available and swap at 937/1024 MB, measured three times with docker stats over the lane. A sixth SQL Server needs 1.3-1.4 GiB and would have OOM-killed another lane's world, and I started none I did not create. The migration, the service change and the three-fact race test are written and compile; the race has never run. Not weakened to something SQLite can answer: the container-free tier proves the complementary half only and says so in its own remarks.
evidence: lane/wf-bootstrap-one-engagement 6fa2cbc3 in /Users/svendaneel/okam/wt-wfoneeng; docs/plans/PENDING-MIGRATIONS-LEDGER.md MIG-28; WebApi.Tests/TestResults/wfoneeng-fast-tier.trx
log: Defect VERIFIED and UNDERSTATED. Brief and IWorkforceBootstrapService both name one
surviving case: a caller already carrying a person row. A second, larger case survives that
neither names -- two DIFFERENT admins of one store, neither carrying a person. Two logins mint
two persons, so the one-person-per-login index is not touched there either. Both now covered.
MIG-28 = 20260803124302_Workforce_BootstrapFirstEngagement. Designer parent MEASURED as
20260803093235_Kassa_AccountingSummaryDayUniqueIndex (MIG-7); the Designer diff against it is
the new column plus the new index and nothing else. MIG-28 was free, grepped on every branch.
No THROW number claimed: 2601 maps to the existing 409. Ceiling 50073 untouched.
CHAIN CORRECTION: the brief said authoring off integration forks a nine-deep chain. Measured
opposite. feature/restaurant-modules 3579bbbc IS an ancestor of integration 4b37f81b and sits
34 commits and 9 migrations behind it, so authoring off the FEATURE branch is what forks. Eight
merge commits, not seven. Based on integration, merged lane/wf-bootstrap 9d1719df for the code.
SQLite names only the INDEXED column in its violation message, so the MIG-25 by-name
discriminator pattern had to key on StoreId WITHOUT StaffMemberId. Caught by running, not read.
Fast tier 4442/0/10. SQL tier WRITTEN, NEVER RUN. EXIT UNPROVEN.
END RETURN
```
