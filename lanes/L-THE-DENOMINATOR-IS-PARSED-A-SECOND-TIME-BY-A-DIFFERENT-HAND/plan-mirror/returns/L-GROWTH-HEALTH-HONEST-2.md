RETURN: L-GROWTH-HEALTH-HONEST
brief: 22f32ec4
verdict: built
evidence: OkamAPI-modules lane/growth-health-honest @ c11e78a6 (worktree ../wt-growth-health, off feature/restaurant-modules 24dec838); fast tier 4360 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`; per-mutation detail at ../wt-growth-health/.lane/L-GROWTH-HEALTH-HONEST-detail.md
log:
Bounce and complaint are nullable now, withheld with their cause when the bound transport cannot
produce an ingestible event. The condition is the provider's OWN declaration — new
`IGrowthMailProvider.DeliveryEventIngestion` — never a count, so a venue that genuinely had no
bounces on a transport that could have reported one still gets 0.0. The response carries
`OutcomeRatesWithheld {Code, Reason}`, null exactly when the rates are reported, never a bare null.
`FailureRate` is not withheld: the dispatcher writes Failed itself, so no inbound event is needed.
Postmark and SMTP declare DIFFERENT cause codes and both are asserted, which proves the service
projects the bound provider's declaration rather than reciting one literal.
Red-then-green on both pins with real messages. I then INVERTED the guard, rebuilt, and got failures
in BOTH directions — hearing transports withholding, deaf ones reporting 0 — then restored.
Declarations are pinned to whether `VerifyWebhook` actually refuses, so a flag cannot drift from
behaviour; the redaction test DISCOVERS the header from what the adapter put on the wire by matching
the token value, so lifting the name into a constant cannot empty it.
Not blocked on D-GROWTH-EVENTS: telling the truth needs no ruling; what to do about it does.
END RETURN
