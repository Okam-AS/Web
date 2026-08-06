```
RETURN: L-WF-BLIND-BIND-NAME
brief: 9237641d
verdict: built
evidence: backend OkamAPI lane/wf-blind-bind-name @ 3b593fef, worktree ~/okam/wt-wfblindbind, based on feature/restaurant-modules @ 3579bbbc, NOT pushed - container-free tier 4392/0/12 vs a 4369/0/12 baseline measured in the same worktree at a clean 3579bbbc, delta +23 = the new tests, 0 regressions - WebApi.Tests/Workforce/WorkforceOperatorLinkReviewTests.cs (16), WebApi.Tests/Wire/WorkforceOperatorLinkWireTests.cs (5), 2 contract fixtures | frontend Web lane/fe-wf-blind-bind-name @ c67df92, worktree ~/okam/web-blindbind, based on lane/fe-wf-oplink @ 3e811b2 (the only branch carrying the operator surface), NOT pushed - Jest 2278/0 across 99 suites vs 2268/0 on the parent, +10 | detail: lanes/L-WF-BLIND-BIND-NAME/detail.md
log:
Verified first: the import service was the only writer of OperatorId anywhere, PATCH
/staff has no such field, no read mapped a login to a person. Still real, not stale.
7a GET /staff/pos-operator-candidates names the person for every resolution a bind
can be made under, from the predicate the import itself resolves by; null only for
StoreAdminSkipped, so blank means nobody. Which store is never disclosed.
7b POST /staff/pos-operator-link-corrections withdraws a link, refuses one that has
moved (409, naming the holder), opaque 404 otherwise; the engagement survives; one
audit row, actor = the caller's own StaffMemberId.
Blanking the resolved name reds exactly the two naming tests. The naming pair is one
call, one variable, and the name differs from the operator's own label.
Refused correction sits beside the accepted one; actor asserted by value across two
managers with different ids; wire assertions read the body, the anonymous 401 placed
beside the module 403 so a challenge cannot pass for a refusal.
NOT append-only on the link itself, deliberately - detail 3a has the exact table
shape if a reviewer wants it, and why retire-and-append would be masked here.
END RETURN
```
