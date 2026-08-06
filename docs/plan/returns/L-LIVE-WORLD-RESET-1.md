```
RETURN: L-LIVE-WORLD-RESET
brief: e78b4955
verdict: fail-spec
evidence: lanes/L-LIVE-WORLD-RESET/evidence.md
spec_gap: The brief rests on "live mode has no reset", contradicted by test/e2e/scripts/live-world-reset.sh (385 lines, landed 337f9bf, an ancestor of HEAD 4b5c5c2, unchanged since, clean in the tree); and the exit is word-for-word the exit of L-LIVE-WORLD-RESTORE (plan 4831, built-unverified, class sql pts 2), which met it on 2026-08-02.
log:
DUPLICATE LANE. Plan 4689 (mine, node/1) and plan 4831 (RESTORE, sql/2) carry the same exit sentence. RESTORE walked it with three journeys not two, one world, a restore before each, all green, all "backend":"live" at :5961, __EFMigrationsHistory still 127 at the end (09-chain-three-journeys.txt).
CONTROL ALREADY ON DISK, so the non-vacuity my dispatcher asked for was satisfied before I was dispatched: flag-lever run with NO reset REDS by name, Expected "Av" / Received "Pa" at spec:104, artifact status failed, backendServed 9; restore; same journey 1 passed. Plus verify reds on the used world ("carries 1 schedule revision") and greens on the restored one.
AUDITED, NOT TRUSTED. Every archived JSON parsed; all read backend live at :5961 including chain-workforce-flag-lever. One cosmetic discrepancy: the inline snippet for journey 3 in 09-chain quotes :5956 because the CANONICAL file had been overwritten by another lane's run (the L-ARTIFACT-PROVENANCE defect); the copied per-run artifact is :5961. Not a falsification.
BRIEF FALSE A SECOND WAY. It blames the WEEK. RESTORE established A->B with no reset PASSES (published revision does not resolve in the draft view, so B quietly makes Revisjon 2 - weaker evidence, not a red). The collision that reds is the FLAG. Both spec headers already corrected.
THE RESIDUAL DEFECT, AND IT IS WHY I EXIST. The reset has 9 references outside itself (playwright.config.js, both workforce spec headers, journey-assertions.js) but NONE from test/e2e/scripts/live-world.sh - the script an operator runs. Its header (111-113) and closing banner (710-720, the last text on the terminal) still print "a live world has no such thing", "incompatible, and each needs its own world", and a recipe calling live-world.sh TWICE: two full rebuilds for a pair a 9s restore now separates. It also still blames the week.
LEFT KNOWINGLY: RESTORE's return line 18 says it did not touch live-world.sh because a sibling owns it and "that correction is the sibling's to make". Owner is L-LIVE-SEED-VIA-PRODUCT (plan 4888), whose evidence IS that file, state built-unverified. File is clean in the tree, so the fix is small and uncollided. I did not edit it - fail-spec says do not improvise.
NO CONTAINER STARTED, none touched, no shared ref moved, nothing committed, nothing outside my lane dir written. I ran no journey and claim no run, live or proxy. Exit needs a world; my brief is node/1 with no slot, five worlds standing, three held for the acceptance walk that asserts zero flag overrides. The node sizing of a lane RESTORE did as sql/2 is itself the tell.
NO PROXY BUILT: the mechanism proxy already exists (L-EV-JOURNEY-TIMEBOMB consecutive-run-proof.py, arm A twice green, arm B control red at run 2) and the live half is done. A third demonstration adds no fact.
NOT DUPLICATED: L-JOURNEY-TEARDOWN (plan 7947) keeps the two open gaps - restore is a step not a teardown, and ten unregistered journeys end with a flag on. I built no second mechanism.
RECOMMEND: close 4689 onto 4831 rather than re-dispatching it, and hand the banner correction to the file's owner as a one-edit item.
END RETURN
```
