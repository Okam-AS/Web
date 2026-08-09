# L-GROWTH-HEALTH-HONEST — evidence detail

Lane commit `c11e78a6` on `lane/growth-health-honest`, off `feature/restaurant-modules` @ `24dec838`.
Worktree `/Users/svendaneel/okam/wt-growth-health`. Local only, never pushed. No SQL tier, no
containers started or touched, no subagents.

## Suite results

Fast tier, `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`:
**4360 passed / 0 failed / 12 skipped**, 5m20s. Baseline for this branch was 4351 passed; +9 is
exactly the count of tests this lane adds (4 service, 2 endpoint, 3 contract). No regression.

## Red-then-green, per pin

**Pin 1 — the health lie.** Service left computing rates unconditionally, new tests written against
the new shape. RED, 4 tests:

```
Assert.Null() Failure
Expected: (null)
Actual:   0
```

That message is the defect verbatim: the endpoint answering "no bounces" where it cannot know.
Guard added → GREEN (50/50 across the health, contract and seam-scan suites).

**Pin 1, inversion.** `ingestion.IsPossible` flipped to `!ingestion.IsPossible` at all three use
sites, rebuilt, re-run: **9 failures, in both directions.**

- Transports that CAN ingest started withholding —
  `Expected: (null) / Actual: GrowthWithheldFigure { Code = null, Reason = null }` on
  `..._reports_the_truthful_delivery_state_census...`, `..._for_a_store_with_no_growth_data...`,
  `..._computes_the_outcome_rates_over_the_attempted_count`,
  `..._reports_a_real_bounce_rate_over_a_transport_that_can_ingest_events`.
- Transports that CANNOT ingest started reporting — `Expected: (null) / Actual: 0` on
  `..._separates_a_store_with_no_bounces_from_a_pipeline_that_could_not_hear_one`.

A test that only asserted "null when the pipeline is deaf" would have passed the second half of that
mutation. Restored from a pre-mutation copy, `touch`ed, rebuilt (`WebApi -> …/WebApi.dll` observed in
the build log, so no stale-`--no-build` result), re-run green.

**Pin 2 — the server-token header.** `.RedactLoggedHeaders(...)` removed from the extracted
registration, rebuilt, run. RED:

```
The factory's logging must redact X-Postmark-Server-Token, which carries the Postmark server token.
Expected: True
Actual:   False
```

Restored, rebuilt, re-run → 31/31 on `GrowthMailProviderContractTests`.

## Why the pins cannot go vacuous

- `Every_adapters_event_ingestion_declaration_matches_whether_it_can_verify_a_signed_webhook` derives
  the expected answer from calling `VerifyWebhook` and observing whether it throws
  `GrowthMailProviderCapabilityException` — not from a provider name or a settings enum, either of
  which a rename empties. Flip a declaration without changing the adapter and it goes red. A counter
  asserts exactly 2 of 3 real adapters refuse, so the loop cannot pass by finding nothing.
- `The_named_postmark_client_redacts_the_header_that_carries_the_server_token` drives a real submit
  through the stub transport, then selects the header whose VALUE contains the configured token and
  asserts redaction on the name it found. Lifting `"X-Postmark-Server-Token"` into a constant — the
  move that left a credential sweep green two days ago — cannot empty it. It also asserts
  `User-Agent` is NOT redacted, so a constant-true predicate fails.
- The registration and the adapter now name one constant (`GrowthPostmarkMailProvider
  .ServerTokenHeader`, `private` → `internal`), so the redaction cannot drift onto a header nobody
  sends.

## One suite that went red mid-lane, and why it was right to

`GrowthUnsubscribeHeaderGoldenTests.The_growth_smtp_adapter_has_exactly_one_way_out_and_this_suite_supplies_it`
asserts `GrowthSmtpMailProvider`'s exact field shape, to catch a second outbound seam smuggled in as a
field. My first draft used `{ get; } = …`, whose backing field tripped it. The guard was NOT relaxed —
the declaration became expression-bodied on both real adapters, so the SMTP adapter still holds nothing
but its one way out. This is the guard doing its job on a change that happened to be benign.

## Files

Production: `Services/Growth/{GrowthDeliveryHealthService,GrowthMailProviderContracts,IGrowthMailProvider,
GrowthFakeMailProvider,GrowthSmtpMailProvider,GrowthPostmarkMailProvider}.cs`,
`Services/Growth/GrowthPostmarkHttpClient.cs` (new), `Models/Growth/GrowthDeliveryHealthModels.cs`,
`Program.cs`.

Tests: `WebApi.Tests/Growth/{GrowthDeliveryHealthServiceTests,GrowthDeliveryHealthEndpointTests,
GrowthDeliveryHealthTestSupport,GrowthMailProviderContractTests,GrowthIntegrationJourneyTests,
GrowthDispatchResumeTests,GrowthPostmarkSandboxSmokeTests}.cs`.

Reachability (C3): `GrowthDeliveryHealthService` gained a constructor dependency; `WireHostFixture`
already drives `GET /v1/growth/stores/{id}/delivery-health` to 200 through the real host, so the DI
graph is proven, not assumed. The service stays inside `WebApi.Services.Growth`, so GRW-SEAM-002 and
the IL-level `GrowthProviderSeamScanTests` are satisfied.

Incidental: `artifacts/journeys/ev-dietary/run-sheet.{json,md}` were rewritten by a journey test's
date stamp during the run and reverted before the commit — not part of this lane.
