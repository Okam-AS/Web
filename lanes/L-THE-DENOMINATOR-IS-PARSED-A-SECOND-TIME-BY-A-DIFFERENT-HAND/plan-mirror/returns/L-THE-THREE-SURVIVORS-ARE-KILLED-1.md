RETURN: L-THE-THREE-SURVIVORS-ARE-KILLED
brief: 0a5e614a
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/returns/L-THE-THREE-SURVIVORS-ARE-KILLED-1.md
log:
Premise re-measured at both tips before editing: all three survivors reproduced, and the audit's probe descriptions reproduced as written.
P17 killed. Probe: select a week, reload without it, reload with it back. Unmutated the roster stays idle; under P17 the roster read two reloads ago renders as current.
D06 killed. Probe: a hanging GetNotificationFailures. Unmutated the panel stands down to unknown mid-flight; under D06 the previous dead letters stay up.
Each reds EXACTLY ONE test - its own probe - which is the evidence that no pre-existing assertion caught either, i.e. that they genuinely survived before.
Growth killed, on the audit's payload {orderCount: 0, OrderCount: 7}. One arm, written through rendered hero values, also kills the precedence-swap mutant the audit found unrecorded.
M01 left alone as instructed, annotated in the spec as verified-equivalent rather than re-attacked.
Workforce census re-run with the hardened runner: 95 entries, 92 killed (89 RED + 3 RED-WRONG-TEST), 3 survive, 0 INVALID, 0 unappliable.
The 3 survivors are M01 (equivalent) and D10/D16 (the mis-aimed originals superseded by D10b/D16b, which red); both now carry a note saying so.
Bookkeeping: 95 is the count; my earlier "71" undercounted its own committed entries. I could NOT correct that return - boundaries forbid editing docs/plan except this file.
Three stale expect strings fixed - P18 (the audit's) plus P17 and D06, whose expects named the tests that used to fail to catch them.
All three were found by the runner itself, not by reading: RED-WRONG-TEST is a new outcome for a mutation that reds a test other than the one its spec names.
Runner hardened at test/support/mutate.js (branch merged, not copied): verdict from the jest JSON report, per-pattern baselines measured before any byte is written,
baseline reds subtracted, short runs and report-less runs INVALID with a non-zero exit, brace-checked mutants, edits for a rule defended in two places. 11 new pins, 13 old ones still green.
Branch lane/three-survivors-killed @ 0765159 (off lane/workforce-screens-tested, plus the runner branch and lane/export-flag-unread): tier GREEN, 175 suites / 4139 / 0.
Branch lane/growth-casing-pinned @ 4741664 (off lane/growth-poweruser-tested): 171 suites / 4070 / 3 - the three pre-existing [KNOWN DEFECT] standing reds, unchanged by me.
END RETURN
