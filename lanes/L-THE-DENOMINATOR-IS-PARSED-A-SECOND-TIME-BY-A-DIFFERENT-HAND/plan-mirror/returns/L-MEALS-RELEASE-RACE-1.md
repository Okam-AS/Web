RETURN: L-MEALS-RELEASE-RACE
brief: 576b8128
verdict: built
evidence: OkamAPI worktree /Users/svendaneel/okam/OkamAPI-meals-race, branch lane/meals-release-race, commit f70a0254 (off feature/restaurant-modules de1e5c5e, local only)
log:
Brief verified before building; both claims true. Release: nothing caught the save's
DbUpdateConcurrencyException (MealsFundingAuthority.cs:272 pre-fix). Checkout: CartService.cs:795
released inside `catch (Exception) when (isCompanyAccount)` with no guard, so a release throw replaced
the original failure and `throw;` never ran. Correction: the 500 surface is CartsController.Complete
(catches only AppException), not MealsFundingController - the release seam is not HTTP-exposed at all.
Fix: catch inside the strategy, roll back (undoes the guard decrement - the money line), DETACH the
reservation (it is the request's scoped context; a Modified(Released) entity left tracked would be
written by the caller's next SaveChanges, untransacted and with no guard decrement), then retry. The
retry's own in-transaction read IS the reviewer's re-read - the existing state gates answer
DeniedCaptured/AlreadyReleased. Re-reading can race, but only forwards: the state machine is monotonic
and both terminal states absorb, so 3 attempts is a proof; the exhausted branch rethrows rather than
inventing an outcome (there is no DeniedBound in MealsReleaseOutcome, and both callers now contain a
throwing release). CartService now guards its release; PaymentService already did.
Red-then-green, all three defect pins red with fixes reverted: checkout got TimeoutException instead of
InvalidOperationException; both seam pins got "expected to affect 1 row(s), but actually affected 0".
The PaymentService pin is a preservation pin - it cannot be reddened by deleting its try/catch (Cancel's
outer catch swallows too), so it was reddened by removing the release wire: "the cancel never reached
the release".
HOLDS ON FAST TIER: the catch, the rollback (guard 10000 -> 5000 exactly once across the lost attempt
and the retry - two reservations on one guard, because with one the >= 0 floor hides a double
decrement), the detach, and both callers' containment. 4361/0/12 fast tier, 379 Meals.
WAITS ON SQL SERVER (Docker down, not attempted): that a real rowversion race raises this at all, and
the DeniedCaptured/AlreadyReleased classification from a genuinely raced re-read. SQLite never populates
the rowversion, so the fixture supplies the LOST CHECK (a real EF DbUpdateConcurrencyException on the
real path, counted via ThrowingConcurrencyExceptionAsync so it cannot pass vacuously) but not the
interleaving - a rival's commit cannot land inside the window between the in-transaction read and the
save on one connection. Stated in the test file, not glossed.
FLAG (not fixed, outside the two named paths): MealsReconciliationWorker.ReleaseStrandAsync has the
identical unguarded shape, and its caller does not catch - one lost race aborts the whole expiry sweep
for that store, leaving every remaining strand unreleased that run. It is also the rival that makes the
core-facing race real.
END RETURN
