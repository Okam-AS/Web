```
RETURN: L-THE-FOURTEEN-FRONTEND-BRANCHES-NEED-AN-INSTRUMENT-THAT-EXISTS
brief: a9804cb2
verdict: built
evidence: docs/plan/artifacts/frontend-branch-instrument.md @ 90c9dfc1, force-added past .gitignore:111 and confirmed tracked
log:
THE POWERFUL INSTRUMENT FOR THIS HALF DOES NOT EXIST. No frontend compiler fails when a signature gains an argument, and that check is exactly what makes the backend half decidable.
I did not reach for the tier. A suite at a branch tip proves the branch is consistent with ITSELF; it never looks at the trunk, so it cannot speak to supersession at any price.
Same for lint, which decides conformance to a style config, and typecheck, which has little to say in a Vue 2 tree of mostly untyped js and vue. A render costs most and decides least here.
THE ONE CHEAP CANDIDATE THAT LOOKS AT THE TRUNK is import resolution: resolve every ~/ and relative import in the branch's changed files against the trunk's tree.
IT IS ASYMMETRIC, AND THAT IS THE FINDING. It can show a branch does not FIT the trunk - the world moved under it. It cannot show the trunk already HOLDS the change.
An all-resolving branch is equally a superseded one and a wanted one. So no cheap frontend instrument decides supersession; this one decides fit, a different question wearing similar clothes.
RUN OVER ALL 14 IT DECIDES 4: fe-wf-blind-bind-name and fe-wf-link-deadend at 10 unresolved imports each, fe-wf-oplink at 8, price-crosscurrency at 3.
Each of the first three also carries 3 imports whose BASENAME still exists elsewhere on the trunk - a file that moved, the clerical kind rather than the superseded kind.
9 branches resolve every import and stay undecidable. A 10th, ev-journey-timebomb, changes 12 files holding no imports at all, so the instrument has no purchase on it rather than a verdict.
THE TRADEOFF WITH THE NUMBER: about two seconds a branch, fourteen for all of them, no build, no node_modules, no core - against a dotnet build's one to two minutes on the backend half.
So 4 decided at roughly 2 seconds each, and 10 left undecidable at any price this repo can pay. That is a named tradeoff rather than a recommendation.
Leaving 10 undecidable is the answer, not a shortfall - and the reason I did not reach for a tier that would answer a different question in seven seconds and look like progress.
THE CORE TRAP WAS AVOIDED RATHER THAN SURVIVED. A fresh worktree leaves core empty, about 15 suites then fail to RESOLVE, and jest still exits 0.
This instrument never runs jest, so it cannot be fooled by that. Any future proposal to use the tier here must populate core first and prove the suite COUNT, never the exit code.
Read-only: nothing built, no suite run, no ref created, deleted, moved or pushed. Trunk 6d5328004 unmoved, 0 dirty.
END RETURN
```
