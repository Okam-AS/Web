```
RETURN: L-EV-OUTBOX-GUID-SUBSTRING
brief: 71084bba
verdict: built
evidence: OkamAPI-modules lane/ev-outbox-guid-substring 79f9dd7d (worktree /Users/svendaneel/okam/wt-evoutboxguid, off feature/restaurant-modules 3579bbbc, local, unpushed); after 4383/0/12 vs base 4369/0/12 measured myself, filter "Database!=SqlServer", no container started; .lane/base-3579bbbc.trx, .lane/after-lane.trx, .lane/repeat-runs.txt, .lane/L-EV-OUTBOX-GUID-SUBSTRING-detail.md
log:
VERIFIED FIRST. Blob 62c0a61e is identical on feature/restaurant-modules, integration/mig-stack-land, integration/confirm-family and lane/meals-grace-pins, so the defect is live on all of them. Shape exactly as briefed: DoesNotContain("250"/"2000") over a body whose only digits are the 32 hex of the link token.
RATE CORRECTION - the brief OVERSTATES it. A probe over 200,000 real composed bodies gives 1,012 hits = 1 in 197.6, not the briefed 1 in 130. Matches the arithmetic: 22 three-char windows in a D-format GUID at 16^-3 plus 17 four-char at 16^-4. Still a merge-reddener, ~1.5x rarer than briefed.
FIX (test file only, no production change): the expected token is masked by exact value and the checks run over the remainder, so an amount elsewhere in the body OR elsewhere in the URL still fails - the whole link is deliberately not cut out. A stray-identifier guard makes any second identifier-shaped run a failure, so a future second token cannot silently reopen the hole.
NOT WEAKENED, and pinned in three ways. (1) The amounts are now derived from the seeded proposal's own minor values instead of spelled as literals, and the main test asserts the proposal really carries them - a changed fixture used to leave the check hunting for digits no leak could produce. (2) A negative-control theory asserts the check still THROWS for each refused value planted outside the token. (3) Mutation 2 below.
MUTATION 1, revert the mask to scan the raw body: 6/6 seeded-token cases red. MUTATION 2, delete the two amount checks: the negative control reds on 250, 2000, 25000, 200000. Both recompiled - assembly mtime > source mtime checked each time, no --no-build on a mutation run.
DETERMINISTIC, not lucky: a 6-case theory over tokens drawn to contain the digits in each GUID segment, plus the real token the measurement drew (74ed9e07-...-077a2ce7d250), composed through the real EventsEmailNotificationDelivery.
The same 200,000-body sweep re-run against the FIXED assertion: 0 failures, vs 1,012 before. EventsOutboxDeliveryTests run 40 times consecutively: 40/40 green, 29/29 each.
SWEEP for the same shape elsewhere: five other bare-digit DoesNotContain sites (Tripletex x4, Workforce rate authoring x1). All scan a List<string> by equality or a fixed problem-detail string. None can match inside a random identifier. This was the only one.
TIER: +14 tests, +14 passing, 0 failing - exactly the 6 + 7 + 1 cases added. Base 4369/0/12 measured in this worktree from a clean stash of 3579bbbc, matching what other lanes recorded for that tip.
The wire tier dirtied artifacts/journeys/ev-dietary/run-sheet.json and run-sheet.md as warned; both restored with git checkout --, neither committed. Both throwaway probes deleted before the commit.
C1 untouched - the seeded tokens are set on detached entity objects, never attached or saved; no row is written, backfilled or repaired. C7 clear - every fixture value is synthetic and already in the file before this lane.
No migration authored, no container started or touched, nothing pushed, committed by pathspec.
END RETURN
```
