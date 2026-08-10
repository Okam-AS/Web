RETURN: L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK
brief: f8b658f8
verdict: built
evidence: docs/plan/returns/L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK-1.md
log:
feature/restaurant-modules 9d88101 -> 914e593, a --no-ff merge of 10ace1a and nothing else. Not pushed. Worktree web-land stayed DETACHED throughout, so no commit in it could move the trunk.
GUARDED MOVE, check and branch -f in ONE command: the trunk still equalled my merge base 9d88101 at the instant of the move, so it moved. Had it differed the command would have refused and recomposed.
Clean merge, zero conflicts. The trunk moved by exactly 2 commits over 5 files: the runner, its pin suite, and three lanes/ receipt files. No new suite file.
PROPERTY 1 — the .git FILE form — confirmed by measurement, not by reading the diff. This worktree's own .git is ASCII text: existsSync says true, isDirectory says false.
So a directory-only test would have re-thrown here, in the very checkout doing the landing. The merged line tests existsSync, which accepts both forms.
PROPERTY 2 — no default — confirmed: the "will not operate outside a repository" throw is present at the filesystem root, and there are ZERO fallback return-start paths in the file.
PROPERTY 3 — both name arms — confirmed present: "does not read a log line beginning Failed as the name of a failed test" and "still reads a real vstest failure line as a test name".
AND THE CONTAINMENT ASSERTION WAS NOT REINTRODUCED: zero occurrences of "refusing to anchor at". Its author measured it redundant to three arms and deleted it; the merge did not bring it back.
TIER AT THE COMPOSED TIP: 183 suites, 4449 tests, 0 failures. Pin suite 23 -> 27 arms, exactly the +4 predicted.
EVERY TEST ACCOUNTED FOR: the merge touches only two test-bearing files and adds no suite file, so the only count delta is the pin suite's +4, putting the trunk baseline at 4445.
Baselined the trunk before merging rather than trusting the figure: 23 arms at 9d88101, and its anchor still threw "no package.json above", which is the defect this lands the fix for.
Blob identity, not an empty diff: trunk test/support/mutate.js is now 1ee9f00c, identical to 10ace1a's and different from 9d88101's 42ad2631.
DECISION CHECK MADE AND STATED: neither this lane nor lane/runner-finds-its-root carries a needs: line, and no open decision names the branch. Nothing else was fetched, merged or touched.
Core pinned a6ae241 with the full 40-character SHA via the local-path fetch, since the plain clone lacks it. Submodule gitlink clean at the composed tip.
Worktree web-land REMOVED and pruned; the branch is held by no worktree. No push, no install, no containers, web-livewalk untouched.
END RETURN
