```
RETURN: L-EV-GUESTLINK-ONE-COMPOSER
brief: f48d1fb4
verdict: built
evidence: lanes/L-EV-GUESTLINK-ONE-COMPOSER/evidence.md
spec_gap: Exit criterion assumes this lane can make the tree hold the invariant, but the surviving composer exists only on unmerged branches and the lane may not commit to a shared branch or push, so convergence is deliverable only as a landing ruling.
reason: nothing stopped; the deletion the brief expected is a no-op because the plural file was never written, and the real fork is a landing-order hazard this lane may not itself land
log:
Premise stale: NO EventsGuestLinks.cs plural on any ref, in 33 worktrees incl untracked, in either
stash, or any dangling commit -- never written. Content sweep of every ref: only TWO production
files compose a guest URL; other 11 hits are tests. A blind 2nd sweep reproduced every finding.
Fork IS real, inside ONE branch: fc09be1d (ev-vipps-fallback-2) points the Vipps adapter at the
scheme-validating helper that THROWS, leaving the mail path inline -- accepts a relative origin,
returns Fail("PublicBaseUrlMalformed"). Helper-vs-inline, not file-vs-file, but the throw/fault-enum
split the brief named is exact. fc09be1d == 9e3a607b MINUS the 16-line mail-path conversion.
Of 315 refs: 2 converged, 199 inline-only, 1 BOTH, 113 predate. Both converged refs are unmerged.
All 3 refs with the helper carry identical blob 087f675d -> add/add auto-resolves, no human notices.
On fc09be1d CredentialCompositionSweepTests still matches "/events/" and PASSES while its own
justification "this is the single place that changes" has gone false -- green on the forked branch.
RULING: helper survives, keeps throw -- only composer rejecting a relative origin (on Unix
new Uri(rel,Absolute) succeeds as file://, so the tip mails an unopenable link). Fault enum is lost
nowhere: outbox catches->Fail(...), Vipps adapter catches->PaymentProvider refusal. No contract moves.
C7 holds. Authored NO code (a 4th copy = the drift this lane must end). LAND 9e3a607b, not fc09be1d.
END RETURN
```
