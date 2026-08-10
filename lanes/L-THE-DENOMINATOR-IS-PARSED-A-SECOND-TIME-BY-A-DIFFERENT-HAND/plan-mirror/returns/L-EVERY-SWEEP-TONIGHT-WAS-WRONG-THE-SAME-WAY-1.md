```
RETURN: L-EVERY-SWEEP-TONIGHT-WAS-WRONG-THE-SAME-WAY
brief: acd32d22
verdict: built
evidence: docs/plan/artifacts/how-a-sweep-lies.md @ 6cd3bcca, force-added past .gitignore:111 and confirmed tracked
log:
I VERIFIED YOUR LIST RATHER THAN TRUSTING IT, AND THE DIRECTION COUNT IS WRONG. Reproduced in miniature, it is three over-matched and three under-matched, not five and one.
The count was wrong for a reason worth keeping: MATCH DIRECTION AND FINDING DIRECTION ARE NOT THE SAME, and they invert whenever a sweep looks for absence.
Number 6 UNDER-matched files - ls-tree lists nothing under a submodule - and thereby INVENTED findings: 37 imports reported unresolved that resolve perfectly.
So by findings it is 4 invented and 2 hidden; by matches it is 3 and 3. Both are true of different questions, and that ambiguity is what produced the five-and-one.
DOES UNDER-REPORTING LOOK SAFER: half supported, and I would not let the claim stand as written. The eaten slash produced seven-destroyed and was quoted into two censuses before anyone checked.
But the three over-matches cost more, because each SPAWNED A LANE - five dead SHAs, three moved files, four stale branches, all follow-on work against findings that did not exist.
An under-match wastes a reader; an over-match wastes a lane. That is the sharper form of the standing claim.
THE SHAPE: every one is a TEXT OPERATION STANDING IN FOR A STRUCTURAL LOOKUP - a basename compared instead of a path, a regex consulted instead of the filesystem, a substring counted instead of a set.
None was a logic error and none would have been caught by more care - every sweep exited 0 with plausible numbers, which is why all six were found by a human re-reading output.
ONE RULE, NOT SIX, applied in two directions: round-trip every verdict through the tool that owns the namespace - the positives AND the negatives.
Positives-only catches 1, 3 and 5. Negatives-only catches 2, 4 and 6 - the half nobody does, and precisely the three that hid findings. Neither half alone catches more than three.
It is a check that runs rather than an attitude: resolve all N through the authority and assert matched plus rejected equals N, both counts printed.
THE SEVENTH, MARKED NOT FIXED: the 547 evidence-line denominator. It counts a header-then-evidence shape, so a differently shaped lane block is silently omitted - and it is the family under audit.
The 116 and 104 are safer - measured by comparing a naive extractor against a careful one, the rule already applied. The 47 rests on branch -r --contains, an authority lookup.
I did not re-derive the 547: that needs a second independent parse, and correcting a denominator inside the lane auditing denominators is how an audit stops being independent.
END RETURN
```
