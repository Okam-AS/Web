RETURN: L-A-MANAGER-IS-TOLD-WHETHER-THE-EXPORT-FLAG-WAS-EVER-READ
brief: eea2623e
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/returns/L-A-MANAGER-IS-TOLD-WHETHER-THE-EXPORT-FLAG-WAS-EVER-READ-1.md
log:
Premise re-measured at the tip before I edited anything: the test was still red and still printed "Eksport er slatt av for denne butikken." over an unread flag.
Fix: the stage flag is three-state in utils/workforce/timesheet.js (flagState: on, off, unread). Unread withholds both controls exactly as off does; only the sentence differs.
The page stops collapsing: exportEnabled returns null when listResult is null rather than !!(listResult && ...), and the flag-off banner now reads exportEnabled === false.
WorkforceTimesheetPanel's exportEnabled prop defaults to null rather than false, because a panel told nothing about the switch has not been told the switch is off.
wft_gate_flag_unread added to no, en and de, in the same "this does not mean the opposite" idiom the neighbouring wft_period_unknown already uses.
The red test goes green because the code changed. Its assertion is untouched; the diff to that file is additions only.
Tier at the lane tip: 171 suites / 4045 / 0, from 171 / 4034 / 1 at aff616d. 10 tests added.
8 mutations applied and reverted, 8 red, including a negative control that an answered-off flag is still reported as off and never softened into unread.
wft_gate_no_period is NOT made reachable: the flag is still tested ahead of the period, and a period-less panel renders wft_period_unknown rather than any gate.
Pinned by a new test, so a later reordering cannot let that previously-dead string reach a manager.
FOUND AND FIXED IN THE INSTRUMENT: lanes/mutate.js passed several test paths as one argv, so jest matched nothing, ran 0 tests, exited 0, and called all 8 mutations GREEN.
It now spreads an array, ABORTS when the baseline runs 0 tests, and flags any mutation whose run has fewer tests than the baseline.
Branch lane/export-flag-unread @ 8d4d1b0 sits on lane/workforce-screens-tested @ aff616d, so a reviewer must read BOTH branches.
aff616d is NOT an ancestor of trunk d4c308e, so the coverage lane's 96 tests are not on the trunk yet; that landing still has to happen first.
Throwaway merge with trunk d4c308e: no conflict, 173 suites / 4113 / 0, lane tip restored. Worktree /Users/svendaneel/okam/web-flagunread removed.
END RETURN
