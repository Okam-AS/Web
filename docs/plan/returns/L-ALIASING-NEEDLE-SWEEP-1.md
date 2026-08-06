```
RETURN: L-ALIASING-NEEDLE-SWEEP
brief: 925ce2d1
verdict: built
evidence: lanes/L-ALIASING-NEEDLE-SWEEP/census.md
log:
Tip claim CORRECT: feature/restaurant-modules = 8e2b57de. Read from the object DB (git archive) because the OkamAPI worktree is dirty with another lane's WIP. Read-only: no edit, no suite, no container, no ref moved.
SCOPE: all 811 files of WebApi.Tests, the only test csproj. Balanced-paren extractor: DoesNotContain 439, DoesNotMatch 1, Assert.False 967, !x.Contains 66, +1 helper wrapper. PROVED ABSENT: FluentAssertions/.Should() 0, ShouldNotContain 0, IndexOf-absence 0. Assert.Empty 359 / Assert.Null 599 = absence with NO needle, other catalogue.
BOUND that makes it checkable: the ONLY random fixture value in the tree is Guid.NewGuid() (900 sites). All 9 new Random(..) are FIXED-SEEDED, Random.Shared is a doc comment, RandomNumberGenerator is a reflection allowlist, "Bogus" is a timezone literal. So a needle aliases only if its alphabet fits hex -> 15 of 174 literal needles survive; all are named.
2 ALIASING, LIVE: EventsOutboxDeliveryTests.cs:411-412 "250"/"2000" over a body whose only variable part is one GUID = 1 in 196.0 EXACT (DP over a v4 GUID, version nibble pinned). Independently matches the sibling's 200k-body measurement of 1 in 197.6. Briefed 1-in-180 and 22/16^3 both overstate - that is an expected-count, not a probability.
*** BOTH PRIOR FIXES ARE UNMERGED: lane/ev-outbox-flake 59a1d607 and lane/ev-outbox-guid-substring 79f9dd7d are NOT ancestors of 8e2b57de. The defect L-EV-OUTBOX-FLAKE reported fixed is live on the trunk, fixed twice on two branches. Land ONE, not both.
NEW INSTANCE, form nobody had matched - the NEEDLE is the random part: EmailConfirmationSendOutcomeTests.cs:295, helper AssertNothingSensitiveLogged, needle is a 6-digit RandomNumberGenerator code searched in a log line = 1 in 1.51M per GUID. Quantified-safe. Its foreach is also vacuous when nothing was logged (cannot-fail shape, flagged only).
RULED SAFE WITH REASON, not silence: 4 quantified-safe (the 1-in-7.2e8 PII sites), 6 deterministic P=0, 6 wrong-overload (equality/predicate, not substring), 159/174 needles immune by alphabet, 120/266 variable needles use the predicate overload.
BRITTLE, worth a comment not a fix: GrowthErasureRefCountTests.cs:130 needle is "8", one character - safe only because the deferred receipt writes a null destroyer and null timestamp so it holds zero digits. Same for the 1-2 char StoreId needles in the two tenant sweeps (DB identity = sequential, deterministic, not random).
LIMITS STATED PLAINLY: nothing was executed, so every rate is arithmetic not measurement; haystack producers read one level deep; world.B.StoreId proven sequential but its literal integer not pinned; 13 multi-variable interpolated needles classified by shape, none hex-compatible.
END RETURN
```
