```
RETURN: L-MRG-COVERAGE-UNKNOWN
brief: 17019a53
verdict: built
evidence: lanes/L-MRG-COVERAGE-UNKNOWN/evidence.md (section 9)
log:
Committed. branch lane/mrg-coverage-unknown, worktree /Users/svendaneel/okam/web-mrgcovunknown, parent 3cd2570.
2f4e389 the fix, the tests, lanes/L-MRG-COVERAGE-UNKNOWN/ and +1 dictionary line each. 4557027 adds the provenance section to the evidence.
Committed by pathspec, seven paths named explicitly; no git add -A. Worktree clean, nothing pushed, no shared ref moved.
Dictionaries separated cleanly: the worktree held pristine 3cd2570 copies, so my one line was re-applied by hand to each. diff vs 3cd2570 is exactly 1 added line per file and carries NONE of the sibling edits those files hold in the shared checkout. Nothing was left behind.
Committed blobs for the four source and test files are byte-identical (cmp) to the tree the 443/443 run and the mutation proof ran on.
Re-verified on the committed tree, not just asserted: 21/21 suites 443/443 in the worktree, green in ISOLATION off 3cd2570 - which the first run could not show, since the shared checkout then carried six lanes' edits.
mutation-proof.py re-run there: BASELINE GREEN, MUTANT-A RED 5, RESTORE-A GREEN, MUTANT-B RED 3, RESTORE-B GREEN, PASS. Worktree clean after.
Shared checkout untouched: my edits still in place (copied out, not moved), sibling edits intact, HEAD still 3cd2570 on feature/restaurant-modules. I cleaned only the node_modules symlink I made myself.
NOT committed, deliberately: docs/plan/returns/L-MRG-COVERAGE-UNKNOWN-1.md and -2.md. The hub owns docs/plan/** and sibling 804fe23 carries no return either. Untracked, so they survive checkout/reset and are at risk only from git clean.
Checked your note rather than taking it: 804fe23 is a SIBLING off 3cd2570, not an ancestor or descendant, and still carries longOrNull(block.x) || 0 and the two-branch panel. It needs none of my behaviour. The -S hit was its evidence.md recording my flipped assertion at 0 commits - it read the exposure from outside and left it alone, exactly as you said.
END RETURN
```
