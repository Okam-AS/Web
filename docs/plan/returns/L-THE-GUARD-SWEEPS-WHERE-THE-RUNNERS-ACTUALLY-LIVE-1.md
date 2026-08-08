RETURN: L-THE-GUARD-SWEEPS-WHERE-THE-RUNNERS-ACTUALLY-LIVE
brief: 634f091c
verdict: built
evidence: docs/plan/returns/L-THE-GUARD-SWEEPS-WHERE-THE-RUNNERS-ACTUALLY-LIVE-1.md
log:
Branch lane/guard-sweeps-where-runners-live @ b6715dd, one commit off trunk 3807e90, core re-pinned a6ae241 with the full 40-char SHA. Nothing pushed.
CORRECTION: work WAS written before the limit, just not committed. The worktree survived intact; I preserved it, then rebased onto 3807e90. Nothing was redone from scratch.
SWEEP COUNT: 2 mutation script(s) BEFORE, measured against the trunk's own guard at 3807e90. AFTER: 53 script(s) across 3 roots. Repo-root lanes/ alone holds 47.
The name filter was a SECOND narrowing, and it hid a live offender. run-browser-arm.sh patches LoginModal.vue, compiles, measures, and restored with `git checkout --` in its trap and before every arm.
Its filename has no "mutat", so widening the roots alone walks past it. Its worktree exists and its branch is checked out — a live destructive script, not dormant. It now restores from a buffer.
The hazard was not armed at the moment I looked: no uncommitted edits in that file. Read-only check; I did not touch that lane's worktree.
WIDENING PRODUCED THE FALSE POSITIVE THE BRIEF PREDICTED. Stripping only # and // was adequate for JS in two directories; repo-root lanes/ is full of PYTHON, and a docstring is not a # comment.
So my own earlier lane's mutate.py — buffer restore, naming git checkout only to explain what it does NOT do — was accused. The stripper now understands docstrings and block comments.
It deliberately does not strip every string: a triple quote is prose only when it OPENS a line. subprocess.run("git checkout -- x") and its triple-quoted twin are still accused, both pinned.
EIGHT ARMS. Plant under repo-root lanes/ and it must be named; remove it and the sweep goes quiet. A driver whose filename says nothing about mutation must still be named.
Docstring, // comment and /* */ block must not be accused; an executed restore in either quote style must be. The block-comment half was unexercised until a mutation showed it killed nothing.
Mutation receipt with the trunk's own runner: 9 mutations, 8 in-scope arms, 0 survivors, 0 mutations that killed nothing. Taking the lanes/ root back out reds 7 of the 8.
The 15 never-reddened arms are the pre-existing runner pins from earlier lanes, out of this lane's scope; every arm in the sweep describe is killed.
FOR THE LANDING LANE: lane/loginmodal-success-is-silent carries the SAME unfixed blob as the trunk (04907e7e), confirmed by blob identity, not by an empty diff. It inherits the fix when it rebases.
Full tier at the lane tip: 182 suites, 4421 tests, 0 failures — 4414 at trunk plus my 7 net new arms. Worktree kept until this returns; no push, no install, no containers, web-livewalk untouched.
END RETURN
