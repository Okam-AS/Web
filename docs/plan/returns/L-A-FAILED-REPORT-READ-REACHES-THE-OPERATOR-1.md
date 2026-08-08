RETURN: L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR
brief: fb2571f5
verdict: built
evidence: docs/plan/lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR
log:
BRANCHED FROM lane/every-report-read-says-why (6670619), NOT the trunk: the premise is that hasBackendMessage exists, which d4c308e lacks. A reviewer reads two branches; core stays at a6ae241.
Restored core a6ae241 from the sibling lane's bundle; the documented path worked unchanged. No commit in core this lane, so no new bundle was needed.
PREMISE VERIFIED AT THE TIP FIRST: over a real 500 carrying "Noe gikk galt i rapportmotoren", statistics.vue logged it to console.error and rendered 0 error elements, statistics null.
The brief named ONE page. The four reads have callers on THREE, and the other two are worse than silent.
wolt-drive-invoice.vue caught then set report=null, routing into "Ingen ordre i perioden" — a positive claim about the venue's trade made on a request that never came back.
settlements.vue showed one fixed alert for 401/403/500/offline alike, which disappears, over the same "no Dintero orders" empty state. Both empty states are now displaced.
The rule is EXTRACTED to utils/request-failure.js and used by all four pages including poweruser-growth. Copying it into three more would have been four rules the moment one was edited.
Five requestFailure_* keys in no, en AND de replace four poweruserGrowth_error* keys plus poweruserGrowth_unknownError, all removed; no reference to them remains anywhere.
Mutation receipt: 20 mutations, 23 in-scope arms, 0 survivors, 0 mutations that killed nothing. Restored from an in-memory buffer and asserted byte-identical, never git checkout.
9 of the growth page's arms ALSO red under the shared-rule mutations. Last lane 0 disturbed meant well-targeted; here it means genuinely shared — one implementation, not two copies that agree.
TWO OF MY OWN ARMS PASSED FOR THE WRONG REASON, found by the mutation run reporting them unkillable, not by reading them.
A stale-figures arm could not fail: on a FIRST load statistics is null anyway. Rewritten as good-load-then-failed-refresh, which is the case that matters — stale turnover under an error banner.
A page-side-error arm used a 200 with a null body, which never throws: TryParseResponse returns the null and the page assigns it. Now an explicit TypeError.
Full tier at the lane tip: 171 suites, 4103 tests, 0 failures. 4080 at the sibling tip + my 23 = 4103 exactly, so nothing pre-existing regressed. Trunk d4c308e was 4007.
Load gated on uptime before every tier and the mutation run; held once at 14.42 until it fell. Worktree web-statsfail REMOVED and pruned. No push, no install, no containers, web-livewalk untouched.
END RETURN
