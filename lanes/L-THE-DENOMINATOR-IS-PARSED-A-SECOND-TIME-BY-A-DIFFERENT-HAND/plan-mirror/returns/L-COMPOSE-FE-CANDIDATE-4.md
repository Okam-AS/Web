```
RETURN: L-COMPOSE-FE-CANDIDATE
brief: f90a32e3
verdict: built
evidence: lanes/L-COMPOSE-FE-CANDIDATE/compose-run.md
log:
Candidate candidate/fe-compose-2026-08-05 at f40fdf3 = the ruled clean set + the gate fix, 36 heads. No push (no upstream), no container; feature/restaurant-modules re-read at e34977a, unmoved.
GATE DONE: merged lane/fe-meals-journey-locator (= meals-enrol-pretick + d320105 only). Decoy surface 1 file, read: git resolved exactly d320105's hunk and moved nothing else.
jest at f40fdf3: 126 suites / 2959 / 0 failed, core POPULATED at 1bcab0b; baseline at 9f7d8df re-run not inherited, reproduced run 3 exactly. Translations dup=0 dropped=0 new-skew=0.
Journeys 27 passed / 2 failed (was 26/3). meals-admin-setup PASSES - artifact records outcome:passed over 13 steps. Isolation proved: receipt carries '[fixture] listening on 127.0.0.1:4436'.
meals-statement-month is NOT composition damage: it POSTs /meals/statements/drafts, which no ref serves. All 130 refs scanned; meals route set identical on candidate and its own origin branch.
workforce-schedule-publish @live fails at the pristine tip too (plan.md records it as the tip's single failure). Port 4010 was held by a foreign fixture (pid 73160) throughout and was not touched.
RULING PREMISE REFUTED: 0 of 28 unlanded heads became clean at the new tip (merge-tree, nothing merged). The surface did not shrink; for 11 it GREW - fe-training-meals-surfaces 23->28 files.
Worse: the 12 ORDER-INDUCED heads conflict on 0 files against the pristine tip - each merges clean onto e34977ac alone. At the candidate they conflict on 1-3. Landing the 35 cost them that.
Corrected before reporting: my first count read merge-tree's info lines as conflicts and inflated every figure (PORT-HARDCODED 3 where it is 1). Table: r4-retest-at-new-tip.tsv in my lane dir.
END RETURN
```
