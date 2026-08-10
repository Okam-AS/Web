RETURN: L-GROWTH-HEALTH-HONEST
brief: 22f32ec4
verdict: built
evidence: OkamAPI-modules lane/growth-health-honest @ c11e78a6 (worktree ../wt-growth-health, off feature/restaurant-modules 24dec838); fast tier 4360 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`
log:
Rates are nullable and withheld when the BOUND transport cannot produce an ingestible event.
The condition is the provider's own declaration — new `IGrowthMailProvider.DeliveryEventIngestion`
(Fake possible; Postmark "does not sign webhooks"; SMTP "no event channel") — never a count, so a
venue with genuinely no bounces still gets 0.0. Response carries `OutcomeRatesWithheld {Code,Reason}`,
not a bare null. `FailureRate` stays reported: the dispatcher writes Failed itself.
RED captured before each pin. Health: `Assert.Null() Failure / Expected: (null) / Actual: 0` on 4 tests
— literally the defect. GREEN after the guard. INVERTED the guard, rebuilt, 9 failures in BOTH
directions (hearing transports got a withheld figure, deaf ones got 0), then restored and recompiled.
Redaction: RED `must redact X-Postmark-Server-Token / Expected: True / Actual: False`, then green.
Anti-vacuity: adapter declarations are pinned to whether `VerifyWebhook` actually refuses (flip a flag
without changing behaviour → red); the redaction test DISCOVERS the header from what the adapter put on
the wire, by matching the token value, so lifting the name into a constant cannot empty it.
Registration extracted to `GrowthPostmarkHttpClient` (the `GrowthMailProviderSelection` shape) and
redacts the same constant the adapter attaches — one constant on both ends, no drift.
Not blocked on D-GROWTH-EVENTS: telling the truth needs no ruling; what to DO about the deaf pipeline does.
Two things I did not change and someone should: `Web-modules/utils/growth/send-gate.js:292` still
documents the bound provider as the in-memory fake, which D-MAIL contradicts; and NO frontend surface
renders these rates today (only `providers` is read), so the honest response has no reader yet.
END RETURN
