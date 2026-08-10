```
RETURN: L-MEALS-ENROL-JOURNEY-LOCATOR
brief: 34d049cc
verdict: built
evidence: lanes/L-MEALS-ENROL-JOURNEY-LOCATOR/mutation-log.md
spec_gap: none - the brief matched reality; the three named paragraphs and spec line 131 were exact.
reason: complete - journey green, both mutations killed, fix carries the candidate tip too.
log:
Ruled the SPEC wrong, not the panel, and MEASURED it (runs/R1-probe.txt dumps all four from DOM):
exactly one of the four says 'leser' and exactly one sits outside .mls-enrol - the same element.
Counterfactual in the same probe: only 2 of the 4 are gated on enrolledUnknown, so had that read
answered the class would still match 2 (policy note + unconditional enrol-replaces). It could never
resolve to 1 again - it named a class while meaning a sentence. The panel is NOT over-warning.
Fix d320105 off 2e3f39d: data-test="policy-no-read" on the note (the enrol panel's own convention),
spec:144-146 reads that name + toHaveCount(1) so a duplicate hook cannot pass + toContainText kept.
.first()/.nth(0) refused: under M1 .first() reads enrol-replaces and stays green with the note gone.
R0 FAIL-ASSERT (reproduces bisect S6) -> R2 PASS -> M1 red -> M2 red -> R3 PASS restore.
M1 warning DELETED, three enrol warn notes left in place: toHaveCount expected 1 received 0 (:145).
M2 hook kept, sentence swapped for the immutability text: toContainText('leser') reds (:146).
R4 cherry-picked onto candidate tip 9f7d8df (all 35 heads), own detached worktree: PASS. So line 131
was the candidate's ONLY blocker for this journey. Candidate branch and pretick branch not touched.
FINDING not fixed: e2e fixture serves no GET /programs/{id}/members, so the walk always takes the
unknown-read branch and never exercises the pretick. Own lane. 7 runs, ZERO harness-shape failures.
END RETURN
```
