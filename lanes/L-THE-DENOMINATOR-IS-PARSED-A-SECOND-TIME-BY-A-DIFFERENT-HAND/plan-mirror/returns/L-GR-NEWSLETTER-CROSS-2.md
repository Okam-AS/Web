```
RETURN: L-GR-NEWSLETTER-CROSS
brief: f1a0704c
verdict: built
evidence: lanes/L-GR-NEWSLETTER-CROSS/landing.md
log:
Both halves of `both` delivered. RESTATEMENT (undeferrable) done and on the board; LANDING prepared,
re-validated at the current tip, not merged -- the merge to feature/restaurant-modules is not mine.
RESTATEMENT. Read with `git show 8e2b57de:Controllers/GrowthNewslettersController.cs`, never the
checkout (it sits on lane/meals-grace-pins): Create/Detail/Edit/Approve guard at l.81/101/121/164 all
call AuthorizeStoreAsync AND return NotFound on refusal. No live defect, and none when raised -- the
discard-the-answer shape is the injected mutation. Drop-in replacement title+body for the flag block,
which I may not edit, at lanes/L-GR-NEWSLETTER-CROSS/restatement.md; logged agent-signed 09:23Z.
Severity left at blocker, deliberately: an unprotected cross-tenant guard earns one; only the KIND changes.
LANDING. 87600a1c NOT an ancestor of 8e2b57de (merge-base exit 1); 1 commit, 1 file, +439, test-only.
merge-tree exit 0, tree 9ac81af9, diff vs tip = that one file. Real merge 2fc29f34 on
lane/gr-newsletter-cross-land (wt-gr-nlcross), zero conflicts, no production file moves.
Green was RE-ESTABLISHED, not inherited: tip moved 59 commits/227 files since run 1's 3579bbbc,
including both newsletter subjects. Build 0 errors, 6/6 PASS. Mutation re-run HERE: 4/6 FAIL Expected
NotFound/Actual OK, WebApi.dll mtime moved and WebApi.Tests.dll did not, and GrowthTenantIsolationTests
15/15 PASS in that same mutated build -- root finding reproduced at the tip. Restored, 6/6, clean. No push.
END RETURN
```
