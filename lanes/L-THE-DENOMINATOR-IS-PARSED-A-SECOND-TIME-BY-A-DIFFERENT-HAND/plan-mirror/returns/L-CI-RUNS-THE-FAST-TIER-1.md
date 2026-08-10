```
RETURN: L-CI-RUNS-THE-FAST-TIER
brief: 66d64799
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-aaaf61b6e803d820e/lanes/L-CI-RUNS-THE-FAST-TIER/PROPOSAL.md
log:
Read both repos: OkamAPI's sole workflow is push:[master,test] with no pull_request; Web's runs Jest nowhere. This branch has never been gated by anything.
MEASURED container-free tier at feature/restaurant-modules 8e2b57de: Failed 0, Passed 4638, Skipped 12, Total 4650, 5m57s. restore 1s, build 22s warm / 35s cold, end to end 6m23s.
Plan 10-15 min on a GitHub runner. The cold NuGet restore leg stays an estimate: ~/.nuget is shared with every checkout here and was not mine to empty.
Frontend measured too, on a node_modules this lane installed for itself: 136 suites / 3116 tests / 0 failed, 15s. The plan's fe.tests reads a jest.json from Jul 31 and says 2127.
Diff: proposed/okamapi/.github/workflows/ci-fast-tier.yml (new) and proposed/web/.github/workflows/nuxtjs.yml (amends lane/fe-ci 36ce9ae). Nothing pushed, no file placed in either repo.
Both parse; bash -n and compile() over all 12 run: fragments are clean; pull_request present in both. Timeout 40 min; floors 4300 backend, 125/2900 frontend, both ratchets.
Ride-alongs run in both directions, not asserted: the trx step REFUSES the aborted signature (962 of ~4400, "run was aborted") and reports the declared red WITHOUT refusing it.
Floor guard fires at FLOOR=99999 on a real receipt and passes at 4300 - it is not an instrument that cannot fail. Log at measure/guards.log.
The drift test needs no workflow support but sits on no branch: a .pending file plus a detached-HEAD commit no ref reaches. Its snapshot-not-operations blind spot is stated in the proposal.
journey-artifact-store: the derived-basename fix is UNCOMMITTED. Two independent checkouts, one at the owner's own tip commit, still carry the literal. CI would see 11 failed / 27 passed / 38.
core submodule: submodules:true cannot succeed on a runner - F-CORE-PIN-ON-NO-REMOTE pins 1bcab0b6, contained by no remote ref. The frontend job must not be required until Sven pushes.
npm re-measured in a directory holding only the manifest and lock: npm ci exit 0, 2611 packages, 12s; npm install --dry-run exit 0; the pinned cli-edge tarball answers HTTP 200.
So F-NPM-INSTALL-CANNOT-SUCCEED did not reproduce and is not the blocker here. The shared-symlink hazard is real and separate; the flag wants re-ruling on that measurement.
Caught this week: the aborted-trx receipt, twice over (the crash reds the job; the step refuses the artifact). Missed: the self-agreeing census, the SQL-trait lineage constant, the waste panel.
The five-day assertion is SQL-trait - missed by this gate, caught by the nightly SQL recommendation. The exit's last clause needs a run, which needs a push, so the item stays unverified.
END RETURN
```
