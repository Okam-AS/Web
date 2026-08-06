```
RETURN: L-JOURNEY-GUARD-FAIL
brief: c0192fca
verdict: built
evidence: test/e2e/scripts/guard-proof.js @ 31fc45d
log:
Base measured clean at 0138168 first. CORRECTION: the defect is NOT live. There, a live-labelled run against
a fixture-compiled app already exits 1, reporter "1 failed", artifact "failed"; the fixture side likewise.
The re-throw landed in 9a5900a and the flag's own text already said both mutations re-run red. The brief
and the flag state it in the present tense; measured, it is past tense.
Missing was the durable half: nothing in 91 Jest suites went red if that one line were deleted.
Built test/e2e/scripts/guard-proof.js - a proof, not an assertion, since an assertion cannot observe its own
runner's exit code and the exit code is what lied. It drives real playwright children and reads their exit
status. 7 arms, all held: 3 mislabelled exit 1; 2 honest exit 0, so it discriminates rather than merely
refuses; 2 MUTANT arms with the re-throw stripped exit 0 / "1 passed" / artifact "failed" - the historical
defect on demand, and what makes the other five falsifiable.
Delete the re-throw from the real journey.js and the proof exits 1; on a clean tree it exits 0. Lint 0,
118/118 journey jest green, ledger still 30 rows with nothing of mine written into it.
My first draft blocked its own event loop with spawnSync; a mutant arm going red caught it.
NOT wired into CI (no workflow runs any suite; L-FE-CI owns that), and not in the script
F-ARTIFACT-STORE-OVERWRITES touches. Pre-existing, not chased: journey-artifact-store.test.js:223 pins "Web-modules@" and reds in any differently-named worktree.
END RETURN
```
