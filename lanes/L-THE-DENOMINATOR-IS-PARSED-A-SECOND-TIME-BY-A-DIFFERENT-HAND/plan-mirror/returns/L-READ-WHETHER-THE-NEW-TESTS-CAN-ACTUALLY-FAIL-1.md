RETURN: L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL
brief: 9d617bb1
verdict: built
evidence: docs/plan/reviews/L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL.md
log: Growth APPROVE: mutate.py re-run receipt semantically identical to the committed one — 44 mutations, 38/38 arms red, 0 survivors, baseline 38 green + exactly the 3 DEFECT reds.
Growth equivalence attacked: ?? to || separates on {orderCount:0, OrderCount:7} (?? answers 0, || answers 7) — a survivor excused by an unenforced single-casing assumption, not equivalent.
Two devised growth survivors: the 24px click/drag boundary (< 24 to <= 24; tests sit at 20 and 40) and casing precedence swapped in getPointValue — both 0 newly red on full 41-arm runs, both restored.
Workforce re-derived over all ten specs: 95 entries, 90 RED, survivors exactly M01/P17/D06/D10/D16; baselines 96 tests, exactly one deliberate red; 0 invalid, 0 short runs; all 83 titles killable.
M01 genuinely equivalent: load()'s first-line gate re-tests the same predicate and init is load's only caller; M19 removes both copies cleanly and reds. The pairing is honest.
P17 NOT equivalent, proven executable: vanish-then-return renders the stale roster with no fresh read; probe passes unmutated, reds under P17. P17b fabricates a row — another way to break it.
D06 NOT equivalent, proven executable: the panel keeps the old answer up while loading, so the in-flight half of D06's own comment is untested; a hanging-read probe passes unmutated, reds under D06.
Workforce wrinkles: the return's "71 mutations" undercounts its committed 95 entries; P18-v1 reds via a test title its expect string no longer names.
Meals instrument unfit for its claim: no baseline run; RED = a summary regex OR any non-zero exit, so a crash counts as a kill; silent mode defeats red-name capture; committed results say reddened 0.
Meals re-derived with my instrument: 14/15 + 26/26 + 30/30 — 70/71 RED reproduces exactly, the survivor is the claimed one; baselines 29/49/37 tests, 0 red, none invalid or short.
Meals survivor genuinely equivalent: text() maps empty and whitespace to null so hasMemberRef implies a truthy ref; the only consumer builds via readStatement. The one sound equivalence of the three.
Meals per-test claim false on committed evidence: 32 of 115 tests never red under any committed mutation (11+18+3, named in review section 4); no lane instrument ever measured per-test coverage.
My devised statement-view trim mutation was KILLED by "a reference that arrived as blank space is unknown" — a prediction wrong in the suite's favour, reported as such.
D-HOW-A-KNOWN-DEFECT-IS-PINNED: keep the Meals green-pin convention plus a paired plan Flag; convert growth's three reds — a standing red destroys exit-0 gating, a cost this audit paid twice.
Worktree Web-modules-wt/L-READ-CANFAIL removed after byte-equal restores and a clean status per branch; all three branch tips untouched; nothing pushed, no container, no port.
END RETURN
