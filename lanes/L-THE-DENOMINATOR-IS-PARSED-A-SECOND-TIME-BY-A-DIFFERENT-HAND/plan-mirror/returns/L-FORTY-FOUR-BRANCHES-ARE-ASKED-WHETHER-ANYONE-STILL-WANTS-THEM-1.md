```
RETURN: L-FORTY-FOUR-BRANCHES-ARE-ASKED-WHETHER-ANYONE-STILL-WANTS-THEM
brief: 477de9d9
verdict: built
evidence: docs/plan/artifacts/branches-still-wanted.md @ 7b19eb3e, force-added past .gitignore:111 and confirmed tracked
log:
1 SUPERSEDED, 13 WANTED-AND-UNMERGED, 33 UNDECIDABLE. Undecidable is the largest class, and that is the answer to the question the lane was raised on.
You asked whether we have 47 losses or 3. Measured: one branch is provably superseded, thirteen provably are not, and thirty-three cannot be decided by any test that does not build them.
WHAT DECIDED EACH: superseded, git cherry finds every patch already upstream. Wanted-and-unmerged, the diff applies cleanly to the trunk so the work is absent and still fits.
Undecidable, the diff refuses - and a refusal is equally a superseded hunk and a merely stale one. No test I can run without a compiler separates those two.
THE TESTS DISAGREED NOWHERE. git cherry split its verdict on zero branches; no branch had some patches upstream and some not, so no verdict rests on a preference between tests.
But agreement is not confirmation. On the 33 they do not disagree - they are all silent in the same way, which is a different thing and I am not reporting it as consensus.
THE TEST THAT WOULD DECIDE THE 33 is whether it compiles at the trunk. Three lanes tonight found branches that do not, one because a method signature had gained an argument.
That is exactly the shape a stale-but-wanted branch has and a superseded one does not. I did not run it: 33 builds at one to two minutes each, on a host that spent the night above its own gate.
So the remaining cost of this question is 33 builds - a measurement somebody can schedule, not a judgement somebody must make.
WHICH OF MY TESTS COULD CALL A BRANCH SUPERSEDED WHEN IT IS NOT, which runs opposite to the four errors I caught tonight because this one throws work away:
git cherry matches by patch-id, so a patch that landed and was LATER REVERTED still reads as upstream. I would call the branch superseded while the trunk no longer holds the change.
That is the one test that awarded the single superseded verdict, so that verdict carries this exact risk and I have said so beside it rather than in a footnote.
The files-still-exist test is weaker still - a file existing says nothing about its contents - so I classified nothing on it alone.
A cleanly applying diff cannot over-report supersession; its failure direction leaves a superseded branch looking wanted, the safe way round, which is why the 13 are the most trustworthy here.
Read-only throughout: no ref created, deleted, moved, pruned, fetched, merged or pushed. Trunk 6d5328004 unmoved, backend 0 dirty.
END RETURN
```
