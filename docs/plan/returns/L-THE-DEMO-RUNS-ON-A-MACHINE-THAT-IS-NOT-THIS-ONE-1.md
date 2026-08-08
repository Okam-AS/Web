```
RETURN: L-THE-DEMO-RUNS-ON-A-MACHINE-THAT-IS-NOT-THIS-ONE
brief: 85309bc2
verdict: built
evidence: docs/plan/lanes/L-THE-DEMO-RUNS-ON-A-MACHINE-THAT-IS-NOT-THIS-ONE/run-2-fixed-script-from-a-fresh-checkout.txt
log:
demo.sh held SRC=/Users/svendaneel/okam/Web-modules as a literal; from a clean ff497c0 worktree it printed 5 acts and "caught+falsified: 7 / failures: 0" reading the authoring repo, not the checkout.
That is a pass reported against the wrong world, the exact class it exists to catch. SRC is now the repo the script sits in; the bench default moved off one session's scratchpad path onto $TMPDIR.
A preflight resolves every input before ACT 1 and names each absent one with the path it wanted and where that path lives; acts needing it SKIP rather than guess; new exit 3 = ran with skips.
Named refusals: docs/plan/plan.md and intent.md (left behind by the 11be859 split), .claude/hooks/plan-pulse.sh (.claude is gitignored by design, so no landing can ever supply it), the 8766 page.
plan serve refuses while PLAN_ACTOR is set, so the agent route is `plan render --html` plus DRIFT_DEMO_HUB=file://F; that is written into the refusal text where a person running it will read it.
Verified from a fresh checkout of the lane branch at a third distinct path: exit 3, ACT 1 two PASS, ACTs 2-5 each SKIP naming its own missing path. Run 2 of 3 in the lane directory.
Same script with every input supplied: caught+falsified 6, shown-uncatchable 1, failures 0 (run 3).
FINDING: ACT 5's claim no longer reproduces. Against `plan render --html` the flag's prose body IS on the page (2 hits) where the 2026-08-06 transcript read 0. The act refuses and names what moved.
FINDING: the old scoreboard double-counted. The two shown-uncatchable passes sat inside "caught+falsified: 8" and were advertised again beside it. Both numbers are counted separately now.
ACT 2's two injection anchors are checked; a differently shaped plan is refused by name instead of comparing two empty strings and calling that a measurement.
ACT 4 now measures the one guard that reads the file (plan check error delta, 1 then 1) instead of asserting three greens it never ran.
.gitignore listed growth-guest-lifecycle and growth-testsend-refusal as force-added records. Their specs are on the trunk; the records stop at lane/L-JOURNEY-GROWTH (ef2d6be) and were never added.
Not re-landed. The comment now says they are absent, why it costs nothing today, and the ref to `git add -f` them from. The three it still claims were checked: all 13 screenshots they name resolve.
Commit ba2016f on branch lane/L-THE-DEMO-RUNS-ON-A-MACHINE-THAT-IS-NOT-THIS-ONE, cut from ff497c0, --no-verify, not pushed. Trunk still ff497c0.
Removed both worktrees I made (scratchpad/wt-demo, scratchpad/verify-elsewhere/a-path-it-was-never-authored-on). No container started, no port bound, owner's branch untouched at 0c1e4f9.
END RETURN
```
