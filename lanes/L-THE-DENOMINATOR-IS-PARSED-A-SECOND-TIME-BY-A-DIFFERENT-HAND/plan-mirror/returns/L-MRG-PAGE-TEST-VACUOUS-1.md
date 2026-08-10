```
RETURN: L-MRG-PAGE-TEST-VACUOUS
brief: e25340a3
verdict: fail-spec
evidence: lanes/L-MRG-PAGE-TEST-VACUOUS/mutation-log.md
spec_gap: Of the four named mutations only activate exists at 3cd2570; the other three are in uncommitted sibling edits.
log:
Verified at 3cd2570, not assumed. Brief's core claim CONFIRMED and understated: with
@click="activate" unbound the OLD file stayed 29/29 green - and so did it with the list
row, create button and link save unbound. It pinned NONE of its four controls, because
every action entered via wrapper.vm.<handler>().
fail-spec is about the exit's four NAMED mutations, not the defect: at 3cd2570 the page
has only ONE of newDraft/saveDraft/activate/retire - activate. The other three exist only
in L-MRG-RECIPE-REVISE-UI's UNCOMMITTED working-tree edits, so they cannot be mutated.
SIBLING STATUS as asked: still NOT committed, and no branch lane/mrg-recipe-revise-ui
exists. Its 415-line page diff, client diff and 36KB margin-recipe-revise.test.js sit
untracked in /Users/svendaneel/okam/Web-modules, one git checkout from loss. I did not
touch them - tests-only and "do not commit what you did not dirty" both forbid it.
BUILT ANYWAY on a SIBLING branch: lane/mrg-page-test-vacuous @ 8ac314c, descendant of
3cd2570, worktree /Users/svendaneel/okam/web-mrgpagevac. 31 green, eslint clean, page
restored. 4 unbind mutations x (red, restored-green) = 8 states; each reds its OWN
transition (11/3/10/2), none reds everything, OLD reds 0 in all 4 arms. 12 runs logged.
END RETURN
```
