```
RETURN: L-GR-DEADLINE-ONWIRE
brief: 64b1c514
verdict: built
evidence: artifacts/journeys/growth-privacy-queue.playwright.json (16 steps, 0 failed requests, 0 defects) · Web-modules 6b1412b · OkamAPI-modules lane/gr-deadline-onwire 86c0f9ae
log:
Brief verified before building: GrowthPrivacyRequestListItem carried ReceivedAt/ResolvedAt and no deadline; ListAsync ordered OrderByDescending(ReceivedAt). Both claims true as written.
Backend 86c0f9ae (worktree ~/okam/wt-gr-deadline off feature/restaurant-modules): new GrowthPrivacyObligation.DueAt = receivedAt.ToUniversalTime().AddMonths(1) — AddMonths IS the Reg. 1182/71 art. 3(2)(c) clamp; DTO field DueAt; ListAsync now open-by-deadline then settled-newest, ties on Id for a total order.
NO migration and none needed: the deadline is a function of ReceivedAt, derived on read — nothing stored, nothing to backfill, no fourth migration into the contested chain.
GrowthPrivacyRequestResponse (endpoints 7/21) deliberately NOT given the field — nothing reads a deadline off a resolution, and the e2e fixture projects endpoint 21 separately so it cannot drift into fidelity it does not have.
Frontend 6b1412b: addOneMonth / dueAt() / RESPONSE_WINDOW_MONTHS deleted with NO local fallback (a fallback is the divergence this removes); readQueue splits open/resolved and keeps the wire order.
Both prior bug fixes kept, on this side on purpose: trunc-towards-zero and the negative-zero normalisation are the countdown against the VIEWER's clock, not the statutory date.
Wire pins: GrowthPrivacyDeadlineTests drives the REAL GrowthConsentAdminController over the real StoreAdmin policy, so a field the endpoint dropped still reds.
Trap avoided per the brief: the clamp table is seeded only where a 30-day window and the calendar month DISAGREE — 31 Jan is due 28 Feb where 30 days says 2 Mar; the 31 Mar row is kept but its "not thirty days" assertion was split out after it caught itself passing vacuously.
Backend mutations (each restored): AddDays(30) reds 6/10; restoring OrderByDescending(ReceivedAt) reds both order pins; dropping the DueAt projection reds 8.
Frontend mutations (each restored): deriving due from receivedAt reds 9 incl. the page's rendered date; re-sorting the open queue here reds 2; dropping dueAt from the fixture reds the JOURNEY at the on-screen deadline — which is what proves the browser step reads the wire and not the seed.
Suites: backend Growth scoped (Growth minus SqlServer minus MigrationLineage) 435 passed / 0 failed / 1 skipped, plus 10 new. NO tier was run and none is claimed — no SQL slot was granted, and no container was started or touched.
Frontend: jest 100 suites / 2311 tests green; all 8 admin journeys green (own ports 3091/4091).
HAZARD for the merger: a sibling lane modified test/e2e/fixture/consumer-api-server.js and test/feature-flags-page.test.js in the shared Web-modules checkout while this lane ran. Neither was staged or committed here; my suite runs saw them in the tree.
Doc note, not a change: docs/plans/modules/30-growth-spec.md endpoint 20 is a one-line table row with no DTO field list, so nothing there is contradicted — but the spec never stated the art. 12 deadline as a requirement in the first place, which is why it could go unserved this long.
END RETURN
```
