```
RETURN: L-GROWTH-SEND-GATE-WALK-IS-GREEN
brief: f6a541d4
verdict: built
evidence: artifacts/journeys/growth-newsletter-send-gate.playwright.json
log:
NOT THE WALK, NOT THE FIXTURE, NOT THE PRODUCT. At the red's OWN commit 31fc45da, clean worktree, ports 3877/4877, the same spec+fixture+page+gate walks 17/17 GREEN (runs/B1-at-31fc45da.txt).
It was the RUN, not staleness - nothing since 31fc45da repaired this. Its own file says backendServed 0: the browser asked the API nothing, then step 1 waited 30s for a redirect that never came.
A FALSE RED, not an out-of-date one. It and the orphan 08-02 screenshots - the only surviving trace of the green that run destroyed - are preserved under before/.
NOW: canonical and runs/ both declare passed - 17/17, served 58 subject 46 foreign 0, commit 8ac6f63, 4/4 shots resolve. BOUND web=3876 fixture=4876; 4010/4971/4973 never bound, never signalled.
MUTATION PROVEN, both arms on disk (mutation-proof.txt): deleting `if (flags.dispatch === false) blocked.push(BLOCK_DISPATCH_OFF)` reds the walk; restoring it (sha back to HEAD's blob) greens it.
Not an equivalent mutant: it reds at step 6 on the whole-SET reason comparison, exactly one expected element missing - the assertion written to catch a reason vanishing - and not on a timeout.
NOT RELABELLED: the JSON is byte-for-byte the harness's output for run A1 in a clean worktree - the primary holds 354 uncommitted paths, 6 under test/e2e; ledger.jsonl APPENDED, never rewritten.
RESIDUAL, not mine: the canonical slot still takes any same-backend run, so the next red erases this green exactly as 08-03 did, runs/ copy and all. Nothing pushed, nothing committed.
FINDING: step 1's 30s waitForURL, copied into ~20 admin journeys, reports a dead app as an undiagnosable URL timeout. Left alone: not reproducible here, and a guessed fix would be improvisation.
END RETURN
```
