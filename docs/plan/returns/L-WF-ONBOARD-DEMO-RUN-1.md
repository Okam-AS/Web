```
RETURN: L-WF-ONBOARD-DEMO-RUN
brief: a65b5804
verdict: built
evidence: lanes/L-WF-ONBOARD-DEMO-RUN/evidence.md with evidence/{demo-run-1,demo-run-2,caller-binds}.txt + api.log, run from wt-L-WF-ONBOARD-DEMO-RUN @ de0811f6 against my own container okam-lwfodr-sql
spec_gap: the other five module seeds were skipped, so demo-up.sh's full six-module path is still unproven against a live SQL world
reason: delivered; the clause the predecessor could not prove is proven
log:
THE DEMO RAN, TWICE, EACH FROM AN EMPTY CATALOG. seed-workforce-demo.sh at de0811f6 end to end, exit 0 both times, via demo-up.sh with my own SQL container and my own port. One green run is luck; the second dropped and recreated the catalog and reproduced it with entirely different GUIDs.
NORA REACHED CLAIMED THROUGH THE SHIPPED FLOW, checked against the ROWS not the printout: person Claimed and bound to the worker's login, invitation row State=Claimed with ClaimedByApplicationUserId = the worker. Jonas and Selma are the built-in control - same creation path, both still Invited with a null user.
HER WORK IS VISIBLE TO HER AND THE READ IS FALSIFIABLE. Step 14b listed her real membership and 3 published shifts; I probed the negatives on the live API: week B (draft) answers items:0, and /me/staff-memberships as the MANAGER returns only Ingrid. So neither read is a constant.
THE NEGATIVE IS THE POINT: ONE TOKEN, TWO BEARERS. Manager presents Nora's token -> 404 workforce.invitation-invalid, person unchanged, invitation still Pending (the refusal reserves nothing and wrote no audit row). Worker presents THE SAME token -> 200, bound person = Nora's. Only the bearer differed. That is what the old raw UPDATE could never distinguish.
THE RECORDED 2705 HAZARD IS NOT PRESENT AT de0811f6. The chain applied from empty on the first attempt: 127 migrations, 211 tables, 25 append-only triggers, identical on both runs. Only 20260709231226_POSv1.cs names Orders.TableId, and its two hits are the AddColumn in Up and the DropColumn in Down - one migration, not two.
C7 RE-CHECKED AGAINST A REAL BACKEND, not a stub: raw invitation token 0 in api.log and 0 files in the lane dir, manager bearer 0, worker bearer 0, and 675KB of real request logging carries 0 JWT-shaped strings. The token reached curl over stdin, never argv, so never the process table. The audit ledger records the lifecycle and no credential.
C1 HELD AT THE SOURCE TOO: WorkforcePersons is named exactly twice in the seed - the bootstrap INSERT for the first manager engagement (no endpoint by construction) and a comment. No UPDATE, no DELETE, against any workforce table.
TWO REDS WERE MINE, BOTH RECORDED. (1) grep -c prints 0 AND exits 1, so `|| echo 0` made the C7 sweep compare against "0\n0" and cry wolf while every count was 0. (2) sqlcmd renders uniqueidentifier UPPERCASE and the API lowercase, so an IDENTICAL id read as a mismatch - that one only surfaced because I rebuilt the world and stopped hardcoding ids.
CONTAINER DISCIPLINE HELD. okam-lvsp-sql (1.355 of a 1.562 GiB limit) and okam-lwr-sql were up and not mine; both still show started=2026-08-02 and I neither stopped nor touched either. I started okam-lwfodr-sql capped at 2 GiB (peak 1.101), and port 5091 was held by a foreign WebApi so I took 5093.
THE WORLD IS LEFT STANDING for Sven to walk, because C5 says a run is not acceptance either: API on :5093, store 1 Bryggen Bistro, manager 99999999/AppSettings__DemoVerificationCode__REDACTED, worker 90000001/AppSettings__PowerUserVerificationCode__REDACTED, /admin/workforce-me. Tear-down is `docker rm -f okam-lwfodr-sql` plus killing the WebApi on :5093 - only what I started.
NOTHING COMMITTED, NOTHING PUSHED. My worktree is a branch of my own at de0811f6 with zero commits on it - I ran the predecessor's script, I did not change it. The lane directory is untracked and api.log is gitignored. The predecessor's worktree is untouched and clean.
STILL TRUE AND STILL NOT MINE: no invitation LIST route and no revoke verb though WorkforceInvitationState.Revoked is declared, so a manager cannot see whether a code is live. My world now holds three Claimed invitation rows for Nora's one engagement - legal, and exactly the state no screen can show.
END RETURN
```
