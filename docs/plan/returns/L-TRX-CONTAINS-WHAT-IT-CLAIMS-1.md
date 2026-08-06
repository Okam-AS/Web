```
RETURN: L-TRX-CONTAINS-WHAT-IT-CLAIMS
brief: 3ba625f7
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-TRX-CONTAINS-WHAT-IT-CLAIMS/trx-contains-what-it-claims.md
log:
Derived, not sampled: all 20 plan items whose evidence: field names a trx, 25 cited trx, every commit in repo OkamAPI. Six further items mention a trx in prose only and cite none as evidence.
147 tests are added by those 20 commits: 125 present in the cited trx (117 exact, 8 matched as [Theory] rows), 11 absent-unexplained, 14 absent-because-filtered, 0 skipped.
Honest categories counted apart, not folded into missing: 0 lanes with no reachable commit, 0 unreadable trx, 0 truncated trx, 3 entries whose commit legitimately adds no test method.
One lane falls short. L-TRAIN-DISCLOSURE, OkamAPI 06b8b582, after.trx: claimed 14 / present 3 / missing 11, plus one modified test also absent.
That trx is not a pass. Its ResultSummary reads outcome="Failed" while Counters reads failed="0" - the signature of an aborted run - holding 962 of roughly 4,400 rows across 87 seconds.
RunInfo names the cause: test host process crashed, ObjectDisposedException on a JsonDocument inside Xunit.Sdk.AllException.get_Message, an Assert.All whose own message formatting threw.
The crash sits inside the lane's own new class: the last eight results by endTime are all WebApi.Tests.Wire.TrainingWireTests, so the receipt omitted both the failure and the tests that caused it.
Absence there is unrun, not filtered: none of the 11 carries a trait, the run holds 0 of the tree's 558 SqlServer-trait tests, and 96 sibling Training plus 12 sibling TrainingWireTests rows ran.
Neither the evidence line nor the lane body discloses the abort, the crash, or that 962 is a partial count.
The filtered-vs-unrun split was load-bearing: a first pass ignoring run mode scored 14 false shortfalls across L-WF-EXPORT-DUPLICATE, L-MEALS-SUPERSEDE-SQL and L-EV-REFUND-FAKE-ARG.
Each of those three also cites a second tier that does contain the tests, in both directions (SqlServer tests in a SqlServer tier, fast tests in a fast tier), so those receipt pairs are complete.
Second reading worth keeping: presence is not sufficiency. L-COMPOSITION-ROOT-CHECK also reads outcome="Failed", failed=1, on one of its own new pins - but declares it in evidence line and body.
Of the 25 cited trx, 23 read Completed and 2 read Failed: one disclosed, one silent. Checking ResultSummary/@outcome against Counters/@failed is the cheap read that separates them.
Read-only throughout: no suite re-run, no container touched, no push. List, scripts and report.json sit under the lane dir; not git-committed, as my boundaries forbid a shared-branch commit.
C7: the deliverable's only secret-shaped matches are test method names; no suite stdout was copied out.
END RETURN
```
