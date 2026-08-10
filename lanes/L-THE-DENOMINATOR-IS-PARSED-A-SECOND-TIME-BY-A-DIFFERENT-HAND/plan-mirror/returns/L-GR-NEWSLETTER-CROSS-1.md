```
RETURN: L-GR-NEWSLETTER-CROSS
brief: f76c7c31
verdict: fail-spec
evidence: lanes/L-GR-NEWSLETTER-CROSS/verification.md
spec_gap: The brief asks this lane to build the proof; it already exists complete at 87600a1c on lane/growth-newsletter-wire (1 commit, 1 file, +439) and meets every clause I checked, so the only unmet clause is "at a tip that carries the proof" -- the merge, which this lane may not perform (never push; merges serialise).
log: Did not rebuild it -- read the remedy first, as instructed.
 87600a1c is test-only (GrowthNewsletterAuthoringWireTests.cs +439) and is
 the entire unlanded delta to the tip: one commit, one file.
 No live defect: at the tip all four actions honour the guard; PROOF gap.
 Clauses checked: at the wire (WebApplicationFactory, real binder, real JWT);
 intruder AdminB is a genuine StoreAdmin of StoreB sent at StoreA's routes;
 refusal EQUAL to NonExistentStore on status AND parsed body error.code
 growth.not_found; anon 401 asserted separately so no case is the auth
 challenge; each refusal paired with the owner succeeding, same template and
 run; C4 actor columns asserted.
 At tip 3579bbbc in worktree wt-gr-nlcross, clean before build: merge
 b521bdb5 ZERO conflicts, 0 build errors, 6/6 PASS. Mutation (four actions
 discard the guard) 4/6 FAIL, Expected NotFound / Actual OK; WebApi.dll
 mtime moved, WebApi.Tests.dll did not; same build TenantIsolation 15/15
 PASS. Restored, 6/6 PASS, clean. Remains: land 87600a1c. No push.
END RETURN
```
