```
RETURN: L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE
brief: 94f4e239
verdict: built
evidence: lanes/L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE/receipt-visible.md
log:
Base candidate/fe-compose @9f7d8df; the shared checkout (focustrap-teardown @8ac6f63) has no such journey. Fix 8539b3f, evidence 02c7356 on lane/wf-acknowledge-receipt-visible; not pushed.
The feed was the defect, not the template: publicationsForNotice() keeps a row this session acknowledged, so the receipt has a row to render on. Component edits are honesty only.
Journey steps 12 and 13 inverted, not deleted, each keeping the mechanism it pinned. 13 now proves the replay is reachable: alreadyAcknowledged=true and "Allerede bekreftet" on screen.
4 runs at 8539b3f, ports 3931/4931 (4010 never bound, foreign pid 73160 untouched): green; RED with the receipt render cut from the FINAL file; RED with render intact, feed reverted; green restored.
That third run measures the brief's claim that fixing the render alone changes nothing. Jest at 8539b3f with core/ borrowed: 126 suites, 2974 tests, 0 failures; eslint clean on all six changed files.
Unborrowed core/ makes 6 suites fail to RUN (empty submodule, 0 test failures) — the worktree, not this change. NOT acceptance (C5): fixture runs only, nobody has walked it by hand.
Show Sven lanes/L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE/04-after-confirming-the-receipt-is-on-screen.png. Gap left: the receipt is session-scoped, no worker-side read of #44, so a reload loses it.
END RETURN
```
