RETURN: L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK
brief: c9794899
verdict: built
evidence: docs/plan/reviews/L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK.md
log: APPROVE the trunk from c6c04c7 to 3807e90. THIS VERDICT COVERS THAT RANGE ONLY — the frontend trunk has since moved 24 commits to de5e68c, which this review does not read.
T3 shared file read line by line: both intents survive in pages/admin/workforce-timesheets.vue — exportEnabled() returns null unread with the banner on === false, and the refusal routes contextRefusalKey.
Mechanical corroboration: diff 8d4d1b0..3807e90 on that file is exactly 2ce83f6's hunk (+5/-3) and diff 2ce83f6..3807e90 exactly 8d4d1b0's (+16/-4). The merge interleaved; neither intent destroyed.
T4 pin move sound and load-bearing: gitlinks 9626a561 at c6c04c7/bb22728, a6ae241 only at 3807e90; fresh checkout agrees at the full SHA; hasBackendMessage 0 at old pin, 1 at new — both blobs read.
The field is read at utils/request-failure.js:30,:32 and consumed by four pages; at the old pin every failure takes the absence branch and prints the raw axios string — green in jest, wrong in a browser.
Deliberate red went green by code, reproduced: numstat aff616d..8d4d1b0 on workforce-timesheets-page.test.js is 59 added / 0 removed. The assertion was never touched.
Knowingly-led branch verified demo-only: 8357c8a33 is a demo seed script (+19/-3) and its test (+110), zero production code, and it is NOT on the backend trunk.
The contract the frontend depends on is already landed backend-side: workforce.module-disabled at IWorkforceModuleGate.cs:47, answered via WorkforceSelfService.cs:507, mapped at context-refusal.js:29,50.
Ruling on the knowing lead: engineering consequence nil; governance consequence stands recorded; when the decision is ruled, "land neither" is no longer an available outcome and the record should say so.
All three tiers reproduce exactly: c6c04c7 = 173/4200/0, bb22728 = 179/4318/0, 3807e90 = 182/4414/0, each run at its own SHA with core re-pinned per its gitlink.
Owned process slip: the bb22728 run's gate was bundled into the tier command and read 43.3 (my own prior run's decaying burst); the other two runs were gated separately at 10.79 and 1.83.
Bonus verified: T2 contains 5ed9664, so the seam-1 pairing landed exactly as the landing plan required, and the fixed runner carries the executed-count judgment and INVALID-RUN verbatim.
Worktree Web-modules-wt/L-READ-TRANCHES removed and pruned; no commit, merge, rebase, push or branch move; web-livewalk, containers and ports untouched.
END RETURN
