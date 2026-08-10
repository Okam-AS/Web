RETURN: L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK
brief: 565a4cb1
verdict: built
evidence: docs/plan/lanes/L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK/evidence.md
log:
WORLD FIRST: the manager published two weeks to one worker via her own draft/batch/validate/publish calls. the inbox held 2 UNREAD rows before each arm. build-world.py is in the lane dir.
REPRODUCED on trunk 6b98839, web-livewalk clean: press the top control, let it settle, press the same place. press1=0dc2e2c3 alreadyAcknowledged=false, press2=74de15a1 alreadyAcknowledged=FALSE.
BY STATE, not by call: the manager recipients read shows BOTH publications carrying acknowledgedAtUtc for that worker after (16:02:28, 16:02:29). two weeks from two presses she made as one act.
CAUSE from the code: publicationsForNotice used read state and acknowledgement state as the SORT KEY, and acknowledging changes both. confirming re-sorted the very list the next press was aimed at.
RE-TARGET, not refuse, and refusal was rejected on merit: it removes the idempotent replay this notice keeps a caller for, and stops a worker rostered on BOTH weeks confirming the second at all.
FIX 1 inbox-filter.js: one ordering over the whole set (noticeOrder: createdAtUtc newest first, inboxItemId tiebreak). read/ack state decides only WHICH rows show, never their order.
FIX 2 Notice.vue: a row this session holds a receipt for reads Bekreft paa nytt; a row it does not still reads Bekreft mottatt. keyed on the receipt, never on isRead. the two acts stop looking alike.
AFTER arm, second pair of weeks, fix applied to web-livewalk by HMR with no restart: press1=cf05ec7d false, press2=cf05ec7d TRUE. the same publication twice; the confirmed row never left the top.
STATE AFTER: cf05ec7d acknowledged, fb618f71 NULL. the week she never opened carries no acknowledgement and keeps its dot and its own button, so confirming it deliberately is still possible.
TIER 166 suites / 3950 / 0, exit 0, 166 PASS 0 FAIL, no abort line above the summary. trunk is 166 / 3939, so +11 tests and no new suite. eslint clean on all four touched files.
MUTATION: 8 written into the source, run, restored from byte copies. all 12 new-or-changed tests red under one. M1 is the trunk ordering itself and reds 8, incl. both exit-criterion cases.
C1: no acknowledgement removed or rewritten. the control appended two (weeks A and B), the after arm one (week D), all via #44 by the recipient herself. no migration, no money write, no secret.
LEFT OPEN: with one row confirmed and one unread, the section lede du har ikke aapnet denne enn aa sits above the row just confirmed. a claim in the wrong place, not a wrong-week press.
LEFT OPEN: the week-run journey still publishes one week. rewriting it needs a world stood up, which restarts servers this brief forbids; an unrun rewrite of the e2e pin would be worse.
branch lane/the-acknowledge-button-cannot-confirm-the-wrong-week at acafde6, not pushed. worktree ~/okam/web-ackwrongweek removed and pruned. web-livewalk carries the diff; undo in evidence.md.
END RETURN
