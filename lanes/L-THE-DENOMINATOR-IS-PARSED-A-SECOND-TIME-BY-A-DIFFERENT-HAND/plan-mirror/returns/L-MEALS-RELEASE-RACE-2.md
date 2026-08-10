RETURN: L-MEALS-RELEASE-RACE
brief: 576b8128
verdict: built
evidence: lanes/L-MEALS-RELEASE-RACE/evidence.md — worktree /Users/svendaneel/okam/OkamAPI-meals-race, branch lane/meals-release-race, commit f70a0254 (off feature/restaurant-modules de1e5c5e, local only)
log:
Both brief claims verified true before building; the 500 lands on the cart completion endpoint, the release
seam having no HTTP route. Fix: catch the lost check inside the strategy, roll back, detach, retry. The
rollback is the money line - it undoes the guard decrement the attempt already issued. The DETACH is money
too, not tidiness: this runs on the request's scoped DbContext, so a reservation left tracked as
Modified(State = Released) would be written out by the caller's next SaveChanges - untransacted, and with
no guard decrement at all. The retry's own in-transaction read IS the reviewer's re-read; the existing
state gates answer DeniedCaptured/AlreadyReleased. Re-reading can itself race, but only forwards - the
state machine is monotonic and both terminal states absorb - so 3 attempts is a proof, not a hope, and the
exhausted branch rethrows rather than inventing an outcome. CartService now guards its own release so a
failing unwind cannot replace the checkout failure the guest is told about; PaymentService already did.
HOLDS ON FAST TIER: the catch, the rollback (guard 10000 -> 5000 exactly once), the detach, both callers' containment. Red-then-green per pin with the real failure messages, in the artifact. 4361/0/12 fast tier.
WAITS ON SQL SERVER (Docker down, not attempted): that a real rowversion race raises this at all, and the
classification from a genuinely raced re-read. SQLite never populates the rowversion, so the fixture gives
the LOST CHECK - a real EF exception on the real path, counted so it cannot pass vacuously - not the race.
END RETURN
