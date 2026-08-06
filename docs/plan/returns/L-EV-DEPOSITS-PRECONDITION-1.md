RETURN: L-EV-DEPOSITS-PRECONDITION
brief: 11fc371f
verdict: built
evidence: artifacts/journeys/events-deposit-precondition.playwright.json
log:
Finding verified: EventsFeatureFlags.cs:32-37 carries the sentence verbatim and the
precondition it belongs to. The Events.Deposits row printed nothing about it.
ONE BRIEF CORRECTION: the catalog carries NO per-flag description and the page renders
none — FeatureFlagDescriptor is (Key, Module, Title, DefaultEnabled) and the row prints
title + key. The suggested cheaper location does not exist; the page is the only one.
Built as disclosure: FLAG_PRECONDITIONS maps Events.Deposits -> one i18n key, rendered
on that row directly above its switch. Nothing refuses, nothing is conditional, no
client-side claim added. All three locales say what must already be true, that nothing
here checks it, and that arming it anyway succeeds. Silent on the Events config switch;
the standing effective-note is untouched.
Proof: jest 2310/2310 (100 suites); 7 new tests, mutation-checked red 6 ways (text,
placement, blanket-on-every-row, each locale reworded to promise a refusal). Journey
events-deposit-precondition passed on ports 3091/4091, 6/6 steps, 18 rows and exactly 1
precondition. Its 2 console findings are the sign-in race 5 sibling journeys already
record. core/ intact. No migration, no SQL, no backend change.
END RETURN
