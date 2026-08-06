```
RETURN: L-COMPOSE-FE-CANDIDATE
brief: 7368ea62
verdict: blocked
evidence: lanes/L-COMPOSE-FE-CANDIDATE/compose-run.md
spec_gap: The exit criteria assume the 61 census heads can be merged in order; 28 will not merge and 16 of those conflict with the pristine tip itself, so no ordering composes them without rebases the census does not schedule.
reason: The journey re-run point reds at the candidate tip (8 of 29 failing, one a genuine regression) and 28 heads would not merge; per the brief I stopped rather than resolve conflicts on judgement.
needs: a ruling on who rebases the 16 inherently-conflicting heads onto e34977ac — their authors, since no merge order can land them and I may not rewrite other lanes' branches.
log:
Candidate candidate/fe-compose-2026-08-05 tip 9f7d8df, 103 commits, in worktree /Users/svendaneel/okam/web-fe-candidate. No push, no shared-branch commit, feature/restaurant-modules and OkamAPI-modules untouched.
64 heads attempted (61 census, minus 1 held by ruling, plus 4 the census could not see): 35 landed, 28 conflict-aborted-clean, 1 red. Nothing forced; every conflict git merge --abort'ed.
jest at tip: 126 suites / 2959 tests / 0 failed. core submodule populated at 1bcab0b6 and stated on every receipt (F-CORE-PIN-ON-NO-REMOTE hit live; needed protocol.file.allow=always).
STOP REASON: browser journeys 21 passed / 8 failed vs 20/2 at the tip. 1 genuine regression (meals-admin-setup, passed at the tip), 6 new journeys failing on arrival incl. the SS 8-5-6 kodeoversikt (C6), 1 pre-existing.
The 28 conflicts classified against the PRISTINE tip with git merge-tree: 16 INHERENT (conflict with e34977ac itself; no ordering fixes them) and 12 order-induced. compose.md SS7 declined this question; this answers it.
My own error, owned: I read jest.config.js from the dirty shared checkout and took it as the tip's truth, so run 1 measured the wrong suite for 62 steps. Redone; run 1 preserved unedited at run1-superseded/.
Cost measured on one tree: with '<rootDir>/lanes/' 125 suites/2930 tests, without it 127/2959 — +29 assertions from an archived .OLD.test.js copy that runs and passes, reproducing the sibling figure exactly.
That correction recovered lane/train-publish-unclickable, which run 1 wrongly excluded as RED: the red was my collector, not its content (the "failed suites, 0 failed tests" shape).
Twin pair c4a4fa44/8c6e91fa — identical commit message, 3h apart, neither an ancestor. Candidate had landed the wrong half. Reconciled 4 files whole-blob after proving no landed head had touched them since.
Falsifiable check held: lane/L-PRICE-SHADOW-GUARD then merged GREEN, the 35th head. Guard asserts shadows==[] and PINNED_SHADOWS==[]; zero money-gate shadows remain, F-INVOICE-PRICELABEL-STILL-SHADOWS closed here.
I recorded a wrong claim in f1d177f (modal "still declares priceLabel"); line 318 is a comment, not a declaration. Corrected on the branch as 9f7d8df rather than dropped quietly.
Excluded before any attempt, each measured: fe-wf-invite-list-revoke (C3, backend half unlanded, needs a live backend), L-PRICE-BYPASS-FIVE (strict ancestor of L-XZ-NEGATED-ABSENCE), L-OFFER-PARTIAL-SUBTOTAL (alias).
Per step: full jest (superset of the named admin-nav-access) + translations integrity + the decoy surface, recorded for all 36 merges; 17 had a non-zero decoy surface, largest 10 files.
Translations: 0 duplicate keys across every merge; the single dropped key traced to a deliberate deletion by lane/journey-workforce with no surviving caller, not merge damage.
i18n reachability: 33 referenced-but-missing keys at the tip and 33 at the candidate, identical sets — 273 keys added per language, no new gap introduced.
END RETURN
```
