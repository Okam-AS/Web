```
RETURN: L-WF-CONTACT-PINS
brief: 362403af
verdict: built
evidence: lanes/L-WF-CONTACT-PINS/mutation-log.md
log:
All four items pinned; each mutation watched red, restored, watched green.
1 TENANCY. Counterfactual measured first: with s.StoreId==storeId deleted from
  WorkforceStaffService.cs:405 the WHOLE container-free tier is 4376/4376 GREEN,
  not just the wire tests. WireHostFixture gains ManagerB (new login, StoreB
  engagement, same grants, deliberately not a StoreAdmin) so a caller can PASS
  the capability gate and then be refused by the lookup. New wire test reds
  (Expected NotFound, Actual OK), reading workforce.not-found from the BODY.
2 WATCHER. detail-watcher refill deleted: 1 red in 2495 (the new null-to-loaded
  test) plus the pre-existing basename failure. Nothing else in 111 suites.
3 VALUE SHAPE. Emitting phone.Replace("+","") leaks 4740000777 into the ledger
  and the OLD DoesNotContain("@")/("+") pair stays 8/8 GREEN. Shape pin reds.
4 CLAIM. Keys were in all 3 files but nothing asserted it. Coverage built, not
  claim softened: wfr_ parity block over all 148 keys + the 7 named.
Final: backend 4377/0/12, frontend 2498/1 (journey-artifact-store, worktree
basename, pre-existing). Local commits only: be 0b28f601, fe 3583b9f.
END RETURN
```
