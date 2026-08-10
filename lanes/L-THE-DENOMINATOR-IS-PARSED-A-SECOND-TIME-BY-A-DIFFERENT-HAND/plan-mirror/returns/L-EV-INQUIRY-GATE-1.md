```
RETURN: L-EV-INQUIRY-GATE
brief: 6c6930f4
verdict: built
evidence: backend lane/ev-inquiry-gate 8ecb47df (174/174 SQLite-tier Events+Modules) · frontend lane/fe-ev-inquiry-gate f7695bc (94 suites / 2199 tests)
log:
BRIEF VERIFIED. EventsInquiryService.cs:47 checked only EnsureStoreExistsAsync; EventsFeatureFlagGateTests covered ADMIN routes only.
FIX: gate is a REQUIRED ctor arg (not the deposit service's optional-null, which is default-open); public entry asks IsStoreEnabledAsync before writing.
Admin CreateManualAsync keeps EVENTS_STORE_NOT_FOUND — authenticated, already gated by the controller. 21 test sites updated via new EventsGates.cs.
REFUSAL SHAPE decided, not defaulted: ONE EVENTS_DISABLED for both "Core off" and "no such store". Anonymous POST + sequential storeId in the BODY,
so two answers would be a roster of which venues bought the module. Growth's always-202 REFUTED here — the confirmation carries a reference the guest
is told to keep, so accept-and-discard is the exact lie this lane removes. Limits stated in code: a 200 still marks an opted-in venue, and store
existence is already public via the slug resolver; what the uniform refusal buys is that no single request separates a venue from a non-venue.
TRAP CLEARED: every per-store case asserts gate.IsEnabled==true FIRST, so the refusal cannot be the deployment-wide one; each is paired with the
same world under Core ON, which must be accepted. Also pinned: single public ctor, so DI cannot pick an ungated overload.
MUTATED BOTH WAYS, full rebuild (no --no-build): drop the flag check => 4 red; reinstate the two-answer oracle => the enumeration pin reds alone.
FRONTEND: refusal card and the EVENTS_DISABLED mapping already existed and were untested on this form; the form also survived a refusal no retry can
pass. Form now withdraws on EVENTS_DISABLED ONLY (throttle/validation must survive — pinned). Unmap the code => 2 red; un-withdraw => 1 red.
NO migration. NO SQL slot used, NO foreign container touched (my testcontainer was ryuk-reaped; zen_pasteur untouched). Own worktrees
~/okam/wt-evinqgate + ~/okam/web-evinqgate, local commits only.
OWED: C5 human acceptance — a live run needs Events:Enabled=true AND a store with Core OFF, whose operator lever is the sibling lane's, not built here.
END RETURN
```
