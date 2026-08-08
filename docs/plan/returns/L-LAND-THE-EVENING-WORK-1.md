RETURN: L-LAND-THE-EVENING-WORK
brief: 18a8e027
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-LAND-THE-EVENING-WORK/evidence.md
log:
BOTH LANDED. FE 6b98839 -> 7a378e4 (guest exit fe9fccd) -> 78ed84f (wrong-week acafde6). BE 81d06c10a -> 057c390ad (guest exit a65d9ab70). Three --no-ff merges. Nothing pushed.
The wrong-week fix was held at first as the brief expected, then merged when its review returned CLEAN mid-lane. It merged onto the advanced trunk with no conflict and no rebase.
ZERO textual conflicts anywhere. One file overlapped since merge-base, GrowthNewsletterService.cs; git combined trunk's body-refusal with the lane's 3-arg footer call, checked against each side.
ONE SEMANTIC CONFLICT git could not see. Trunk-only GrowthNewsletterBodyTests calls AppendHtml; lane-only GrowthMarketingFooter widened it to 3 params, no default. Clean merge, then 2x CS7036.
Found by grepping call-site arity after the merge, not from its output. Fixed with a real unsubscribe URI: null renders the test-send stand-in, hollowing an arm trunk just landed. 0 Error(s) after.
BACKEND TIER at 057c390ad, from WebApi.Tests/ with --filter "Database!=SqlServer", exit 0, no abort line above the summary and no Failed <FQN> line: 4949 passed / 0 failed / 11 skipped.
Baseline 4937/0/10. +12 passed = 4 new facts in GrowthOneClickUnsubscribeWireTests plus 8 in the new GrowthUnsubscribeExitReachabilityTests (5 facts and a 3-case theory). All twelve are the lane's.
+1 skipped = GrowthGuestExitWorldTests, a SkippableFact that Skip.Ifs itself with no run dir. The other 10 are byte-identical to baseline and to the list the lane recorded at a65d9ab70.
FRONTEND TIER twice, exit 0 both, no FAIL line: 166 / 3939 / 0 at 7a378e4 and 166 / 3950 / 0 at 78ed84f. The first equals baseline, as expected -- that half is playwright and a comment-only vue edit.
+11 and no new suite, reproduced from the diff: 8 net in workforce-me-inbox-filter.test.js (9 added, 1 a rename in place) and 3 in workforce-me-components.test.js. Matches the reviewer's 3950.
core pinned to 9626a561 before each run; submodule update --init fails "not our ref" as documented, completed by the fetch-from-local recipe. Without it the tier reds suites with zero tests red.
DEPLOY ORDERING STANDS: UnsubscribePageBaseUrl prints into every dispatched footer via GrowthDispatchService.cs:490, so the consumer surface deploys before or with the backend. Both halves land here.
The reviewer's three non-blockers and its M1-reds-nine correction are recorded in evidence.md; acafde6 was merged unaltered and none of them was fixed here.
HAZARD: the backend tier rewrites tracked artifacts/journeys/ev-dietary/run-sheet.json with fresh timestamps. Restored before teardown; the landing commit does not carry it.
Worktrees Web-modules-wt/L-LAND-THE-EVENING-WORK and OkamAPI-modules-wt/L-LAND-THE-EVENING-WORK detached, then rm -rf and pruned. No worktree holds either trunk. web-livewalk untouched at 6b98839.
END RETURN
