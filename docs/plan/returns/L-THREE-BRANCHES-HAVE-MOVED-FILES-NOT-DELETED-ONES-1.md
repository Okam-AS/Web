```
RETURN: L-THREE-BRANCHES-HAVE-MOVED-FILES-NOT-DELETED-ONES
brief: 93665e9a
verdict: built
evidence: docs/plan/artifacts/moved-not-deleted.md @ 317d4645, force-added past .gitignore:111 and confirmed tracked
log:
NO FILES MOVED, AND NONE WERE DELETED. All 40 unresolved imports across the four branches were resolved by CONTENT, and not one target had either fate.
Two mechanisms, neither evidence of a stale branch. 37 name modules THE BRANCH ITSELF ADDS - unresolved on the trunk by construction, since a branch adding files imports files the trunk lacks.
The other 3 point into core, which is a git submodule at mode 160000, so ls-tree -r lists ZERO files beneath it and every ~/core/... import reads unresolved.
SO THE INSTRUMENT I RECOMMENDED LAST LANE DOES NOT WORK, AND I RETRACT IT. It decided 0 of 14, not 4. Its signal is not staleness, it is this-branch-adds-modules, which every feature branch does.
The three moved files this lane was raised on were my bug, of the same family as the others tonight: I counted a basename with .count() against the whole tree listing joined into one string.
A substring count is not a basename match - and a basename match would not have established a move either, which is the correction the brief asked for and the reason content had to come first.
PRICE-CROSSCURRENCY IS SETTLED: all three unresolved imports are ~/core/services and ~/core/helpers/tools, the submodule case. It has zero real unresolved imports and returns to undecidable.
WHAT IT CHANGES FOR THE OWNER'S NUMBER: it lowers nothing and raises nothing. It REMOVES evidence.
I had offered four branches as probably stale and probably still wanted; that reading is withdrawn, so all 14 frontend branches are undecidable again and the 47 local-only branches stand untouched.
The movement is the opposite of progress: decided branches go from 1 superseded plus 13 wanted plus 4 stale, back to 1 superseded plus 13 wanted.
ONE THING LEFT UNDECIDED: ~/utils/workforce/pos-clock matches 2 trunk paths by substring while the content test found no matching blob and no exact basename.
Those two facts disagree. Resolving it needs a read of both files, and a lane that has just retracted an instrument for guessing should not guess here, so it is marked undecided rather than assigned.
METHOD, the whole correction: take the target's blob sha on the branch and look it up in a full ls-tree index of the trunk - an identical blob anywhere IS the move, and its path is the new location.
Only when no content matched did I look at basenames, and then as a question rather than an answer.
Read-only: no build, no tier, no jest, no ref created, deleted, moved or pushed. Trunk 6d5328004 unmoved, 0 dirty.
END RETURN
```
