```
RETURN: L-POWER-USER-IS-A-FACT-THE-PRODUCT-CAN-SET
brief: 449a9375
verdict: blocked
evidence: /Users/svendaneel/okam/wt-poweruser-fact/lanes/L-POWER-USER-IS-A-FACT-THE-PRODUCT-CAN-SET/evidence.md
needs: +D-RESTART-THE-WALK-WORLD-API
log:
DECIDED: the PowerUserRole membership is the truth and login projects it. Writing the column at grant time puts one fact in two rows that can disagree, which is the defect and not a fix for it.
OkamAPI lane/poweruser-is-a-fact b170a9e45 off trunk feature/restaurant-modules 118f92fb9, not pushed. ONE repo: the frontend needs no change, so the backend-first ordering question does not arise.
Login and GET /user set ApplicationUserModel.IsPowerUser from IsInRoleAsync; AutoMapper now ignores the name, so a site that forgets to project reads false rather than a hand-written row.
In Login the projection runs AFTER GenerateJwtTokenAsync: that call is where the late grant lands, so reading before it answers false on the very login that grants the role.
RED BEFORE GREEN against the pristine trunk: 3 of the 4 new wire tests fail. The fourth is the control - a store admin reported not a power user - and passes on both sides.
They drive the real host: a role holder whose column is false is true on both payloads, a column set by hand with no membership grants nothing, a store admin stays false.
Fast tier at the lane tip 4750 total, 4740 passed, 0 failed, 10 skipped. The trunk-landing receipt for 118f92fb9 records 4736 passed, so this is that baseline plus exactly the four added.
FOUND A STANDING RULING. PowerUserBypassMechanismTests records decision T-13 and five other sites gating on the column. I moved all five onto the role, then reverted all five.
Those five are authorization rather than reporting, and that guard calls the swap a widening wearing a refactor's clothes; DinteroController.GetBalance is the money-path read T-13 names.
RESIDUAL TO RECORD: StoresOverviewResponseModel.IsPowerUser still copies the column, so /admin/overview still reports false to a genuine power user. Not mine to change.
THE HAND-WRITTEN ROW IS STILL STANDING, proven from outside the database: GET /config on :5971 answers exploreAreaEnabled true, which is ConfigController.cs:54 reading that column.
With the trunk's own NoCSharpCodeAssignsTheIsPowerUserColumn proving no C# writes it, a browser walk against this world today renders all three screens and proves nothing at all.
NO WALK: :5971 is a compiled ./bin/Debug/net8.0/WebApi, not dotnet watch, so this needs a restart the brief forbids; :3971 bakes API_BASE_URL at build time and cannot be repointed.
No container started, stopped or entered. No DML anywhere. Both live servers and both owner checkouts untouched. Worktree kept: the three run logs beside evidence.md are the receipts.
Clears when :5971 is rebuilt on this branch and the recorded revert is run. Under this change that revert costs the account nothing, because it holds the role and the payload reports the role.
END RETURN
```
