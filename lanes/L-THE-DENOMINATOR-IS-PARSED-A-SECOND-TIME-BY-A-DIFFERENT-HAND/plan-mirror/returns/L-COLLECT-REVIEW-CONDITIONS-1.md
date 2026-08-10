```
RETURN: L-COLLECT-REVIEW-CONDITIONS
brief: b0a7981b
verdict: built
evidence: lanes/L-COLLECT-REVIEW-CONDITIONS/applied.md
spec_gap: the brief's `cd "$S"` "after set -eu" is unrunnable as written (S is unbound there under set -u) so it went after the variable block, and plan.md still records this evidence as "(15/15 assertions pass)" when it is now 20/20 — that line is outside my write boundary.
reason: nothing stopped; all five conditions were re-derived true and applied, none refused.
log:
All five conditions re-derived before applying; none refused. Fix behaviour unchanged — comment-stripped diff vs 82127eb is empty.
C1 the "(14 paths)" claim is false everywhere: 6 untracked .md on disk, 0 tracked on 119 of 120 refs, 6 on refs/lanes/plan-snapshot 51970563. Reframed on-disk with no number, since the number is what went stale.
C2 `it(` to `test(` in §3 AND §5 — the review named only §3. §4's 14 to 6, with the ref-space measurement written in beside it.
C2b the archive is byte-identical to the live test at e34977ac (551 lines, 29 test(, 0 it(); the 681/31 replacement exists only on lane/mrg-page-test-vacuous. "Superseded" corrected in the evidence AND in the jest.config.js comment.
C3 read the refs rather than the review: 82127eb IS on candidate/fe-compose-2026-08-05 (tip 9f7d8df when read) and lane/jest-collects-lanes, and is NOT on feature/restaurant-modules. Reviewer right; finding A's branch sentence kept operative.
C4 PROVEN, not argued, in two worlds with the unmodified script. From a sibling jest project it overwrote collected.txt with 112 absolute paths of the wrong tree; from a config-less directory jest exited 1 into the discarded stderr and collected.txt became 0 bytes.
In both worlds the two assertions that answer the flag passed VACUOUSLY on the wreckage (13/15 PASS on an empty file), and the failures that did fire accused the control wrapper — the one part that was working.
After the cd: 20/20 and exit 0 from both foreign cwds, and all six listings byte-identical to the backup taken before any of it ran, so the corruption from the before-runs is fully repaired.
C4b five controls added ahead of the assertions that need them: the archived-name regex fires on a synthetic and on a real listing, does not match the live suite name, collected.txt is non-empty, and its paths are relative so `^lanes/` can match at all. 15 assertions to 20.
C5 `A lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` was indeed staged in web-collected — rerun.sh's `git checkout <branch> -- <path>` stages by design. Unstaged; the file is left on disk on purpose, since the worst-case tree proves exclusion and not absence.
Nothing else was staged beside it, and docs/plan/ in that worktree holds one file (the canary), not the 627-file plan tree — so the wildcard-add hazard was the archive plus the three canaries and five probes onto an already-merged lane branch.
Shared checkout jest.config.js untouched and still byte-identical to 82127eb. Corrections committed 808d509 on lane/collect-review-conditions, branched from candidate tip 9f7d8df — the only base carrying both 82127eb and 6f03b18. Nothing pushed, no shared branch written, no container.
END RETURN
```
