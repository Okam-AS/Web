RETURN: L-BE-RECEIPT
brief: 9ed87d1f
verdict: built
evidence: fact:be.tests
log:
Fast tier at 8c8a243d: 4095 passed / 0 failed / 8 skipped / 4103 total, exit 0, 5m06s.
Run in a throwaway detached worktree at that SHA with a clean tree. The shared checkout held 13 modified files and an uncommitted Events migration while this ran, so a run there would have measured no commit at all.
Committed 349d8806 on feature/restaurant-modules. It adds only artifacts/, so its tree is source-identical to 8c8a243d; git diff between the two names three files, all under artifacts/tests/.
Artifact directory names the SHA three ways: filename 8c8a243d-fast-tier.trx, the README row, and a directory literally named 8c8a243dad403d184d53a373ba2d3283eacfe210 holding RUN.md.
Probe ../OkamAPI-modules/artifacts/tests/*.trx now resolves; the tool's own trx extractor run against it gives ok, "4095 passed / 0 failed". I did not run plan refresh, so the fact span still reads unconf until you tick.
SQL tier was NOT executed: 519 tests needing a container slot this brief did not grant. Its two 2026-07-30 failures and their 2026-07-31 repair are still evidenced only by a commit message; that wants its own sql-class lane, and RUN.md says so in the artifact.
519 reproduces exactly from static discovery, so the plan's figure for the SQL tier is confirmed even though the tier did not run.
Static discovery lists 4038 for the same fast-tier filter against 4103 executed. The trx is the authority; do not quote 4038 as a suite result.
The 8 skips are named in RUN.md: four declared-gap pins, three Workforce end-to-end journeys, one Surfboard cash-split smoke. The green count excludes them.
No container was started and none was touched; docker ps -a listed the same eight long-exited containers before and after.
Nothing pushed. Sibling lanes' uncommitted work in the shared checkout is untouched and still uncommitted.
F-BE-NO-ARTIFACT clears on fact:be.tests being ok, which is now true on disk; clearing it is yours after a refresh.
Evidence here is suite-kind, so this lane can only reach built-unverified by the tool's own guard. That is correct: a trx is not acceptance.
END RETURN
