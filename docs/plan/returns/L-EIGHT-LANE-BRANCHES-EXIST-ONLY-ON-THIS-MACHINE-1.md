```
RETURN: L-EIGHT-LANE-BRANCHES-EXIST-ONLY-ON-THIS-MACHINE
brief: c3b8c1c6
verdict: built
evidence: docs/plan/artifacts/branches-only-on-this-machine.md @ 17cc90f, force-added past .gitignore:111 and confirmed tracked
log:
THE CENSUS: 98 lane branches are cited as evidence, and 47 of them exist on no remote. My sample said 8 of 20; the rate held, two of its conclusions did not.
THERE ARE NO DEAD SHAs, AND THERE NEVER WERE. My five were an artifact of my own hex regex.
766072d3 and 76b407d86aaf are the two halves of the session UUID, split on a hyphen and read as commit ids. The third is 17 characters - no git object is that length.
Every cited SHA of commit length resolves in one of the two repos. So no lane's proof is an unresolvable commit, and each claim touched survives on other evidence anyway.
This is the fourth sweep of mine tonight wrong in the same direction, a pattern matching more than it should, and the third caught by re-reading my own output rather than by the sweep failing.
COST, WHICH IS NOT COUNT. Tier 1, the branch is the only place a cited artifact lives: 3. Tier 2, unmerged work whose artifact is readable elsewhere: 44. Tier 3, merged pointer that loses nothing: 0.
TIER 3 BEING EMPTY IS THE FINDING. Every one of the 47 carries work that is not on a trunk, so the reassuring answer - most are just pointers - is unavailable.
That also refutes the premise the ranking was built on. The brief expected merged branches to absorb most of the count; none does.
THE REPAIR, NAMED AND NOT PERFORMED: push them. A branch on a remote survives this machine and nothing else these lanes cite does.
It is not mine to run for a reason beyond the standing rule: some of these branches carry the two trx files held tonight under the open fodselsnummer ruling.
Pushing them publishes a value that passes a date-aware MOD-11 check to a remote - which is the decision being held, made by accident and by a tidy-up.
So the narrow question for the owner is not whether to push, but which of the 47 carry evidence under an open ruling, and whether those go last or never.
WHAT THIS CANNOT TELL YOU: whether a branch's unmerged work is still WANTED. A superseded branch costs nothing to lose, and I measured reachability rather than intent.
Three lanes tonight found branches that could not even compile at the trunk; nothing here rules that out for the other 44.
Read-only throughout: no ref created, deleted, moved, pruned or fetched. Trunk 6d5328004 unmoved, backend 0 dirty, nothing pushed.
END RETURN
```
