```
RETURN: L-WF-ONBOARD
brief: 38d70257
verdict: built
evidence: commit de0811f6 on lane/wf-onboard-claim in OkamAPI-modules (parent 8e2b57de, ff) + lanes/L-WF-ONBOARD/evidence.txt with evidence/{invitation-contract-suite,join-block-happy-path,join-block-mutations}.txt and harness/
spec_gap: the demo has not been run against a live SQL world - cap sql=2 is fully held by two foreign containers, my class is node, and demo-up.sh borrows a container rather than starting one
needs: +L-WF-ONBOARD-DEMO-RUN
reason: delivered; the only unproven clause needs a sql-class slot I was not granted
log:
ONE CLAUSE OF THREE HELD, as the brief said. seed-workforce-demo.sh:244 still ran `UPDATE WorkforcePersons SET ApplicationUserId=..., State=N'Claimed'`. Deleted. Nothing in the script writes that table now; the only statement still naming it is the bootstrap INSERT for the FIRST manager engagement, which has no endpoint by construction.
THE DEMO NOW JOINS THROUGH THE SHIPPED PATH. Manager POSTs staff/{id}/invitations (endpoint 6); Nora POSTs /workforce/me/invitations/claim (endpoint 32) with HER OWN bearer token - which is why the worker login now keeps that token and not just its user id: the claim binds the CALLER's login, so the manager's cannot stand in for it.
I DID NOT RE-WALK THE SURFACE. Clause 1 is already proven at 35440cf, an ancestor of baseline e34977ac, by L-FE-WF-ONBOARD-WALK: 16/16 steps, and lanes/L-WF-INVITE-SURFACE/evidence/rewalk-at-e34977ac.playwright.json passed at my exact baseline. Screenshots 02 code-shown-once, 04 the worker is in, 05 my shifts, 07 roster after the claim.
THE 200 IS NOT THE PROOF, so I did not assert it. Every refusal on this surface is one opaque 404, so a claim that bound the WRONG engagement is indistinguishable from success on status alone. The script asserts workforcePersonId == Nora's and personState == "Claimed".
NEW STEP 14b READS BACK AS THE WORKER: /workforce/me/staff-memberships must list her engagement and /workforce/me/schedule must be non-empty for published week C. A claim that linked the person but left the work invisible to her would still have printed "Claimed" and been a broken join.
EVERY ASSERTION IS FALSIFIABLE, PROVEN BY MUTATION. Six against a stub answering the REAL DTO shapes: no-token, wrong-person, wrong-state, empty-memberships, empty-schedule, issue-problem. All six RED with the right message; happy path green. The bash executed is CUT FROM THE REAL FILE by anchored line range, never retyped.
C7 HELD ON EVERY PATH INCLUDING THE SIX FAILURES: the raw token appears in 0 of 7 captured runs. The claim body reaches curl over stdin, never argv, so it is not in the process table. This also closed a PRE-EXISTING leak - the worker-login `die` printed the whole login response, bearer token included.
IDENTITY MEASURED, NOT ASSUMED. Observed at the stub: issue=manager token, claim=worker token, memberships=worker token, schedule=worker token, with distinct Idempotency-Keys on both mutations.
CONTRACT VERIFIED ON THE REAL CONTROLLERS: WorkforceInvitationTests 25/25, SQLite fast suite, production service composition. C5: a suite is not acceptance and I do not offer it as one.
THE DEMO HAS NOT RUN AGAINST A LIVE SQL WORLD - the one thing I could not do. Cap is sql=2; okam-lvsp-sql and okam-lwr-sql (foreign, up 2 days, idle) hold both. My class is node. demo-up.sh REFUSES to start its own container by design ("this host OOM-kills past about three") and borrows one, so running it means using a container I did not create. I did neither.
THE BACKEND BASELINE WAS NOT WHAT THE BRIEF SAID: the checkout sat on lane/meals-grace-pins @34c6c103, diverged from integration. I took my own - worktree wt-L-WF-ONBOARD off 8e2b57de, branch lane/wf-onboard-claim, commit de0811f6, verified reachable and 8e2b57de is its ancestor. The demo script is byte-identical at both commits, so there is no port hazard.
LEFT ALONE ON PURPOSE: the identical-404 anti-oracle pinned at WorkforceInvitationTests.cs:493. Still true and not mine to fix - no invitation LIST route and no revoke verb exist though WorkforceInvitationState.Revoked is declared, so a manager cannot see whether a code is live.
COMMITTED EVIDENCE IS THE BACKEND COMMIT ONLY. Lane evidence under lanes/L-WF-ONBOARD/ is untracked, matching the sibling's convention; *.log is gitignored so mine are .txt.
NO CONTAINER STARTED OR TOUCHED. Ports 4311/4312 mine alone, both released; I bound my own rather than adopting anything. Nothing pushed, no shared branch committed to.
THE FRONTEND TREE WAS DIRTY FROM OTHER LANES ON ARRIVAL AND IS LEFT EXACTLY AS FOUND - I added only lanes/L-WF-ONBOARD/ and this return, and reverted, stashed and cleaned nothing.
END RETURN
```
