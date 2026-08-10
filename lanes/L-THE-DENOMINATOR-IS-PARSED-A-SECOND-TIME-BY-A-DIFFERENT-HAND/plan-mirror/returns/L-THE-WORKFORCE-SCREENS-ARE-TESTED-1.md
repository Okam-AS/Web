RETURN: L-THE-WORKFORCE-SCREENS-ARE-TESTED
brief: e7c80bda
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/returns/L-THE-WORKFORCE-SCREENS-ARE-TESTED-1.md
log:
Five test files add 96 tests: 171 suites / 4034 passed / 1 red at the lane tip, from the 166/3939/0 baseline I measured first.
Coverage on the eight target files, measured before and after per file: 0/270 statements before, 265/270 after.
stmt before -> after: workforce-timesheets 0/114 -> 112/114, workforce-publications 0/65 -> 64/65, workforce-delivery 0/44 -> 43/44.
PublicationList 0/16 -> 16/16, DeliveryGroup 0/12 -> 11/12, ReceiptGroup 0/7 -> 7/7, Recipients 0/9 -> 9/9, DeliveryPanel 0/3 -> 3/3.
71 mutations were written into the source, run and reverted; the runner restores in a finally and re-verifies the bytes (lanes/mutate.js).
Every passing test reds under at least one applied-and-restored mutation, so no test was deleted for being unfalsifiable.
Four mutations first survived: two were mis-aimed (D10, D16) and re-aimed; two (P18, C22) exposed assertions too weak to catch them, now tightened.
Three more survived because the source defends the rule twice (M01, P17, D06); each of those rules reds under a paired or alternative mutation.
DEFECT left failing and NOT fixed: "does not tell a manager the export flag is off when the flag was never read" (workforce-timesheets-page).
The flag-off BANNER asks whether the list answered; the withheld-reason beside Approve/Export does not, since exportEnabled collapses unread to false.
approveAvailability tests the flag before the period, so wft_gate_no_period is unreachable; refresh() re-reads detail whatever ListTimesheets did, so any write reaches it.
Left uncovered on purpose: the second copy of each capability guard (timesheets 237/301, publications 170, delivery 128) and the || coalescing fallbacks.
Genuinely unreachable: DeliveryGroup stamp()'s empty guard, and ReceiptGroup sendKey()'s default, which would render an unknown send state as "pending" if SEND_KEYS drifts from DELIVERY_STATES.
Branch lane/workforce-screens-tested at aff616d off trunk 7a378e4; trunk has since advanced to 78ed84f, merge-tree reports no conflict, 95/96 pass on the merged tree.
Worktree /Users/svendaneel/okam/web-wfscreens removed; no product source changed, git diff against the base is empty for pages, components and utils.
END RETURN
