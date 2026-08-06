```
RETURN: L-MEALS-STATEMENT-SURFACE
brief: 98ecba68
verdict: blocked
needs: +L-MEALS-RECONCILE-UI,+D-MEALS-FINALIZE-OWNER
evidence: lanes/L-MEALS-STATEMENT-SURFACE/
log:
Exit names 3 stages; a browser CONTROL walked 1: get #22 and export #23, plus the decisive
clause in full - the FINALIZED line shows the persisted ref BY VALUE. #19/#20 ran via the API
context, labelled API per step: I built no second freeze control. MealsMonthClose.vue owns it
and names its blocker where mine cannot; a full walk needs both surfaces merged plus a link from
the close.
Built: statement-client (3 reads), statement-view, MealsStatementLines (first data-test in
Meals), the page, nav entry, fixture #19-#23, 22 unit tests.
Non-vacuity, both real browser runs: mutant B (view reads allocationId) RED at step 5, got
alc-2026-06-0001 wanted ANS-2287; mutant C (CSV col 5) RED at step 8; restored, re-run GREEN. No
line carries a membershipId or applicationUserId, so nothing reconstructs ANS-2287.
Jest 2615/2615, lint clean; journey-artifact-store passes here (worktree-name red only). Tip
3cd2570 ok, BE 8e2b57de stale. Work at lane/fe-meals-statement-surface 9215d38 via commit-tree,
HEAD unmoved. Shared: AdminPageHeader, admin-nav-access.test, 3 translations (55 keys, checked),
fixture/meals.js. No container, no push, one spec run. artifacts/ is gitignored: the JSON is
copied to the lane dir, the 3 PNGs are not. C5 unmet, persistence is a FIXTURE PROXY.
END RETURN
```
