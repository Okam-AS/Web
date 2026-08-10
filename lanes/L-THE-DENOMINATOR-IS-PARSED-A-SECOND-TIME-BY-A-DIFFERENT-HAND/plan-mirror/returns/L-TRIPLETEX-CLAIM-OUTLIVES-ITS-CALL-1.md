```
RETURN: L-TRIPLETEX-CLAIM-OUTLIVES-ITS-CALL
brief: 3ea27402
verdict: blocked
needs: +F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-a1b2b1de4edcf769f/.lane/NOTES.md
log:
FE half LANDED at 94f06c7 off feature/restaurant-modules e34977ac: four AccountingExportResult shapes now read as four states - OK, Hoppet over, Kjores allerede (neutral, new), Feil.
FE red first: test/tripletex-run-outcome.test.js against the SHIPPED page = 5 pass / 2 fail, the 2 being exactly the contended-claim assertions. A rejection stays red, so blanket-neutral cannot pass.
FE triple, both sides measured by me: base 4 suites failed / 108 passed, 2 tests failed / 2545 passed / 2547; after 4 / 109, 2 / 2552 / 2554. Delta = +1 suite, +7 tests, all mine, all green.
The 4 red suites are identical on both sides and none is mine: 3 need the empty `core` submodule, and journey-artifact-store.test.js reds 2 tests that hard-code "Web-modules" as the checkout name.
BE half is a PROVEN PATCH, NOT LANDED: .lane/backend-claim-window.patch, 15 files, 738 lines, dry-runs clean under `patch -p1` on a pristine tree. Someone holding a backend worktree must apply it.
That is the block: the harness refuses EVERY git call outside my Web worktree, so `git -C OkamAPI`, `cd OkamAPI && git` and `git worktree add` all fail. "Read by object from OkamAPI" was unexecutable.
Read the backend off disk instead and cross-checked it: poster, client and settings are byte-identical across OkamAPI-modules, wt-pendmodel and wt-growthaudit, so those lane branches carry no drift.
BE non-SQL tier, both sides measured by me: base 0 failed / 4357 passed / 12 skipped / 4369; changed 0 / 4369 / 12 / 4381. The +12 are the new file alone, 6 Theory rows + 6 Facts. Nothing regressed.
No SQL slot used and no container started, stopped or entered - `docker ps` shows only okam-lwtwo-sql and okam-lwtwo-redis, both created before my first run. Ports 3971 and 5971 were never bound.
Fix: MaxClaimHold = MaxSingleCallDuration x 2, ENFORCED by a linked CancellationTokenSource, and StaleClaimAge = MaxClaimHold + 1 min replaces AddMinutes(-10). Heartbeat rejected - it fails open.
Deriving alone would NOT have sufficed and the flag lacks both reasons. First: Retry-After was returned UNCAPPED, so the worst case was unbounded, not 1200 s. Every backoff branch is now capped.
Second: each authenticated call can mint a session through an independent 429 loop plus one 401 re-mint, so an honest static derivation is 2 x 3 x budget = 60 min. Bounding holds recovery near 21.
Red before green, 5 mutants over 12 tests: the shipped 10-minute threshold reds 3; dropping the retry budget out of the derivation reds 4; no-margin reds 6; one-call reds 7; swallowed cancel reds 1.
Whether Tripletex refuses a duplicate externalVoucherNumber is UNESTABLISHED. Changelog 2.69.16 adds the field, 2.68.1 adds a `>externalVoucherNumber` lookup; neither mentions uniqueness, nor the FAQ.
Settle it with the instrument that exists: TripletexLiveSmokeTests hits api-test.tripletex.tech when two env tokens are set - post one external number twice, record the answer. Credentials, not code.
END RETURN
```
