```
RETURN: L-AN-EVIDENCE-LINE-IS-ONE-PATH-A-SWEEP-CAN-OPEN
brief: f0a9218a
verdict: built
evidence: docs/plan/artifacts/evidence-lines-a-sweep-can-read.md @ f277a72, force-added past .gitignore:111 and confirmed tracked
log:
THE COST IS ONE FORM. Of 547 evidence lines, 116 are mis-sorted by the naive extractor both censuses used - and 104 of those come from a single form.
That form is an absolute path whose leading slash an unanchored regex drops, so /Users/... is captured as Users/..., tested as relative, missed, and filed as absent.
Brace expansion costs 11 lanes. A path glued to trailing punctuation costs 1. Those two together are a tenth of the first.
So the seven-versus-one destroyed count was not an unlucky edge case. It was a sample of a defect touching a fifth of every evidence line in the plan.
It fails silently and in the safe-looking direction: the sweep reports LESS evidence than exists, so nothing looks broken and the number gets quoted.
I RANKED BY MIS-SORTS, NOT PREVALENCE, because they disagree sharply. The commonest form by far - 246 lines needing a ../OkamAPI-modules/ prefix - costs zero mis-sorts.
Those 246 parse perfectly and resolve from the wrong root - a resolution fault, the class a sibling amended exits for. A parse fix would not touch it, and a resolution fix would not touch the 104.
Also separated as absences rather than failures: 39 lines of prose with no path, 9 carrying only a fact: key, 40 naming several artifacts where a sweep taking the first sees one of four.
THE RULE, one sentence: an evidence line names exactly one artifact, as a path relative to the plan repo, with no braces, no punctuation touching it, and no worktree in it.
It governs lines written from here. It is not a licence to rewrite the 547 that exist, and I changed none of them.
WHAT MY OWN CLASSIFIER CANNOT READ, which is the part I would want a stranger to read first:
It cannot tell a durable path from one that resolves only today. 53 lines point inside an ephemeral wt-* worktree; 48 of those directories exist right now and 5 have already gone.
My sweep asks only whether a path exists, so it calls those 48 healthy. They read as destroyed the moment anyone runs git worktree prune. That is the next seven-versus-one, already loaded.
It resolves against three roots, so it cannot report ambiguity - if two repos hold a file of that name it says found and cannot say which. I did not measure it because this instrument cannot.
And its form list is hand-written: the three costed forms are the ones I thought to test for. A form nobody has hit yet is invisible to a classifier built from the forms that already bit.
END RETURN
```
