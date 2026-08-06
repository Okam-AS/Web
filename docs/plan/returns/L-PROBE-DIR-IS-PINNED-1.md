```
RETURN: L-PROBE-DIR-IS-PINNED
brief: 72e3fbb5
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-PROBE-DIR-IS-PINNED/detail.md
log:
Instrument: 4 probe lines per dir reading git's own bookkeeping. <dir>/.git gives repo+worktree; <repo>/.git/worktrees/<name>/HEAD gives the ref. No stamp, no collector, nothing to re-run.
Clerk applies proposed-probes.txt (8 lines, into the probes fence before intent.hash) and proposed-facts.txt (2 bullets, into ## Facts before "- Intent hash:"), then plan refresh.
Mutation arm pinbench-run.txt: 8 caught+falsified, 0 failures. ACT 1 switches a SCRATCH worktree; pin reds naming BOTH refs, declared=feature/restaurant-modules found=lane/meals-grace-pins.
Falsified: pin weakened to `exists`, identical mutation reads green. The declared-ref clause is load-bearing, not decoration.
Also reds: detached HEAD (found value is the sha), dir repointed at a different repo that is ALSO on the declared branch, dir removed. Goes green again on return, so it is a guard not a permanent red.
Live arm pinlive-run.txt, real tool and real trees read-only: ../OkamAPI-modules MISMATCH, declared=feature/restaurant-modules found=lane/meals-grace-pins. No checkout switched.
FINDING past the brief: the hub's own checkout Web-modules is on lane/focustrap-teardown, while the plan asserts fe.world.branch=feature/restaurant-modules and fe.world=True as ok facts.
Cause: fe.world/be.world read artifacts/world/WORLD.json, which worldstamp writes from INSIDE the repo it describes. The hub copy was stamped 2026-08-03T08:14Z and the tree moved after.
Two plan facts are therefore false today in the green direction. The backend WORLD.json is right about its branch by luck, not by construction.
Proposed-edit arm pinproposed-run.txt: real plan text plus the exact lines, plan check 1 error/111 warnings before AND after; refresh reds be.dir.pin and names lane/meals-grace-pins.
Coverage pindirs.py: exactly two fact-bearing dirs, `.` (8 probes) and ../OkamAPI-modules (23 probes, 66 dir: fields). Exit 1 today, exit 0 with the lines, exit 1 again on a new unpinned dir.
Flag-body corrections, measured: no ConsumerWeb probes remain (body says 2); the 8 non-backend probes read the hub, never named as a dir there; 66 dir: fields, not 65.
Limits: the pin answers branch identity, not branch position (shown in ACT 6, not claimed). It assumes linked-worktree layout; a plain clone reds, which is a false alarm and never a false green.
Does NOT clear F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH: moving the trees onto the declared ref is a separate act, and the backend tree is another lane's worktree, so it is the owner's call.
../OkamAPI-modules verified untouched at lane/meals-grace-pins 34c6c103. All writes under the lane dir plus two benches outside every git repo. No container, no push, no plan edit.
END RETURN
```
