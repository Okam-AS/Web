```
RETURN: L-WF-DIGEST-TAUTOLOGY
brief: ae95030d
verdict: built
evidence: OkamAPI-modules lane/wf-digest-tautology @ 4b911917 (worktree ~/okam/wt-wfdigest, cut from lane/wf-w5-timesheet 9e82b286; local, not pushed) · WorkforceEndToEndJourneyTests + WorkforceTimesheetTests 33 passed / 0 failed / 1 skipped · lanes/L-WF-DIGEST-TAUTOLOGY/{evidence.md,fix.diff,commit.txt}
log:
WRONG REPO IN THE BRIEF, AND I SWEPT IT BEFORE SAYING SO. The notes said Web-modules / feature/restaurant-modules / class node; the defect is in the BACKEND. Every digest|sha256|checksum|contentHash|hash hit under Web-modules test/e2e/journeys, test/e2e/support, test/, components/, pages/ was read and none has this shape. The finding's source is docs/plan/reviews/L-WF-W5-REVIEW.md D3, reviewing lane/wf-w5-timesheet @ 9e82b286 in OkamAPI-modules. Exit criterion itself was exact, so I built rather than returning fail-spec on a resource pointer.
THE LINE: WorkforceEndToEndJourneyTests.cs:889, Assert.Equal(sent.PayloadSha256, file.FileDownloadName == null ? null : sent.PayloadSha256). With a file name present, actual IS expected. The only thing it could ever detect was a MISSING NAME - never a byte. Sweep for the same shape across the whole test project: exactly one instance.
FOUR STATES, MUTATING PRODUCTION CODE NOT THE TEST (one 0x20 byte appended to what DownloadBatchAsync serves, so served bytes diverge from the recorded digest): shipped+clean GREEN; shipped+mutated GREEN (cannot fail); fixed+mutated RED at line 893; fixed+restored GREEN.
CONTROL, so state 2's green is not a dead mutation: on that same mutated binary the real check elsewhere - WorkforceTimesheetTests.Exporting_renders_..._what_the_download_serves - went RED. The bytes really did diverge and the journey step slept through it.
RED FOR THE RIGHT REASON (the sibling's wrong-region hazard): the failure is Assert.Equal at line 893 printing two diverging 64-hex digests, Expected 5b689ebb… Actual 220bc311…, not an adjacent assertion.
NOT A SECOND TAUTOLOGY: the old line hinged on FileDownloadName, so mutation B (FileName = null) proves the replacement's name assertion reds on its own line, 894. Both new lines are independently falsifiable.
STRENGTHENED, NOT DELETED, and the brief asked me to consider deleting. The sibling check covers the ORDINARY download; WFJ-15's sentence is the §9.2 kill-switch law - with workforce.export OFF the artifact stays BYTE-IDENTICAL, not merely still downloadable. No other test states that, so deleting would have removed the only place it is written down.
HYGIENE: never wrote in the sibling's worktree - cut my own branch off lane/wf-w5-timesheet. Committed by pathspec, one file, +9 -1; commit reachable (git branch --contains). Production file restored with cp+touch against the mtime trap and verified clean by git status. Host SDK 8.0.110 matches global.json, so no container was started and none was touched. Nothing pushed.
NOT ACCEPTANCE (C5): this is a test's honesty, not a capability. The W5 return's NO DOOR still stands - no frontend screen calls endpoints 27-29, so WFJ-15 remains backend-only.
END RETURN
```
