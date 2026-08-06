```
RETURN: L-COMPOSE-FE-CANDIDATE
brief: 7368ea62
verdict: blocked
evidence: lanes/L-COMPOSE-FE-CANDIDATE/compose-run.md
spec_gap: The exit criteria assume the 61 census heads can be merged in order; 28 will not merge and 16 of those conflict with the pristine tip itself, so no ordering composes them without rebases the census does not schedule.
reason: Supersedes return -2, whose journey figures were wrong. A genuine regression plus a journey arriving broken still red the re-run point, so the verdict is unchanged; the evidence behind it is smaller and now correct.
needs: +D-REBASE-CONFLICTING-HEADS
log:
Candidate candidate/fe-compose-2026-08-05 tip 9f7d8df, 103 commits, in worktree /Users/svendaneel/okam/web-fe-candidate. No push, no shared-branch commit, feature/restaurant-modules and OkamAPI-modules untouched.
64 heads attempted (61 census, minus 1 held by ruling, plus 4 the census could not see): 35 landed, 28 conflict-aborted-clean, 1 red. Nothing forced; every conflict git merge --abort'ed.
jest at tip: 126 suites / 2959 tests / 0 failed. core submodule populated at 1bcab0b6 and stated on every receipt (F-CORE-PIN-ON-NO-REMOTE hit live; needed protocol.file.allow=always).
STOP REASON: browser journeys 26 passed / 3 failed against the candidate's OWN fixture — 1 genuine regression (meals-admin-setup), 1 arriving broken (meals-statement-month), 1 pre-existing @live.
CORRECTION to return -2: those runs had silently reused a SIBLING lane's fixture on port 4010 (reuseExistingServer: !CI). Re-run isolated gives 26/3, not 21/8. I WITHDRAW the SS 8-5-6 kodeoversikt C6 flag - it passes.
meals-admin-setup confirmed a real regression under matched conditions: passes at the pristine tip with the tip's own fixture, fails on the candidate with the candidate's own. Which of the 35 heads caused it is unattributed.
PROGRAM HAZARD: with ~80 worktrees on this box, any journey receipt taken without a private E2E_FIXTURE_PORT may have been served by a foreign fixture. Receipts should record the serving fixture's pid and cwd.
The 28 conflicts classified against the PRISTINE tip with git merge-tree: 16 INHERENT (conflict with e34977ac itself; no ordering fixes them) and 12 order-induced. compose.md SS7 declined this question; this answers it.
First self-correction: I read jest.config.js from the dirty shared checkout and took it as the tip's truth, so run 1 measured the wrong suite for 62 steps. Redone; run 1 preserved unedited at run1-superseded/.
Cost measured on one tree: with '<rootDir>/lanes/' 125 suites/2930 tests, without it 127/2959 - +29 assertions from an archived .OLD.test.js copy that runs and passes, reproducing the sibling figure exactly.
That correction recovered lane/train-publish-unclickable, which run 1 wrongly excluded as RED: the red was my collector, not its content.
Twin pair c4a4fa44/8c6e91fa - identical commit message, 3h apart, neither an ancestor. Candidate had landed the wrong half. Reconciled 4 files whole-blob after proving no landed head had touched them since.
Falsifiable check held: lane/L-PRICE-SHADOW-GUARD then merged GREEN, the 35th head. Guard asserts shadows==[] and PINNED_SHADOWS==[]; zero money-gate shadows remain on this candidate.
Third self-correction: I recorded a wrong claim in f1d177f (modal "still declares priceLabel"); line 318 is a comment, not a declaration. Corrected on the branch as 9f7d8df.
Per step: full jest + translations integrity + decoy surface for all 36 merges (17 non-zero); 0 duplicate keys ever; i18n 33 missing at tip and 33 at candidate, identical sets, no new gap introduced.
END RETURN
```
