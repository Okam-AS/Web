```
RETURN: L-ATDE-REVIEW-CONDITIONS
brief: 73aafcd2
verdict: built
evidence: lanes/L-JOURNEY-AT-DE/mutation-log.md
log:
C1 ran run-journey.sh B2-final-no no (3823/4823; 4010 never bound, pid 73160 never signalled): spec 8ebe68bc at edition=no PASS, 1 passed 22.1s, pid 70893, own worktree. Gap closed.
C1 §3 now 8 arms with a spec-blob column: A=820c8473, B/C=7fa75c11, D1-E+B2=8ebe68bc. Draft 7fa75c11 was hashed without -w and is UNRECOVERABLE — recorded as such, not as re-derivable.
C2 21 -> 19 sites, both shown: 21 also matched two not.toHaveText('—') (spec 296, 330), no CH literal. 19 = 17 toHaveText(t.<key>) + 2 turnOn(t.flagOn)->flags.js:63. Runs AGAINST the lane; said so.
C3 21 -> 41 text locators, both shown, re-derived: 21 = 2 helper defs (91, 98) + 7 fixture filters (278/297/304/320/355/357/377) + 12 direct; +29 helper call sites = 41. Rejection better justified.
C3 unasked: re-checked the chosen walk's 0 — holds (sole match is the fixture selectOption at 244). Flagged recipe-to-margin 12 and events 49 as same-instrument and NOT re-derived.
C4 runner now hashes spec/flags/de/no/en and prints verbatim `git status --porcelain -- ':!core'` instead of a count; flags.js added beyond the condition as the 2nd unhashed file under test.
Nothing committed, nothing pushed, no container started. Worktree e34977a unchanged apart from the two files under test; translations byte-clean, now pinned by hash not by a count.
END RETURN
```
