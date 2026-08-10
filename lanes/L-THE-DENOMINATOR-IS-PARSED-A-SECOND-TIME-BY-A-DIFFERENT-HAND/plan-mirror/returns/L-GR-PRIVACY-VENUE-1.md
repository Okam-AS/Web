RETURN: L-GR-PRIVACY-VENUE
brief: 16f71fc0
verdict: built
evidence: artifacts/journeys/growth-privacy-queue.playwright.json
log:
BRIEF VERIFIED ENTIRELY: both routes served, zero callers, growth-client.js:25 says so; no.ts:4837 names art. 12.
BUILT /admin/growth-privacy + sidebar entry (C3, same change) + utils/growth/privacy-queue.js + client #20/#21 + 3 locales by hand.
BRIEF CORRECTION: this surface is NOT dark. GrowthConsentAdminController has no ModuleIsLiveAsync, only StoreAdmin — the queue
answers with growth.module off, there is no lever, and art. 12 does not stop applying when marketing is off. Journey asserts it.
C6: art. 12/15/17 printed only because this change's resolve call produces the notice+export (ExecuteAccess/ExecuteErasureAsync).
Page claims NO address, NO delivery (transport-accepted only; null gets its own sentence), NO destruction (shred may be deferred).
TIMELINE SEAM: contactPointId surfaced; #9 left unsurfaced (PowerUser-only, server builds the export) — noted in the client header.
2 BUGS FOUND IN MY OWN CODE AND FIXED: floor() overstated lateness a day; an hours-old overdue read "yesterday". Now trunc + own key.
GREEN: jest 2304/2304 (100 suites), admin journeys 7/7 on ports 3081/4081, eslint clean, artifact 0 failed requests 0 defects.
MUTATION-CHECKED, each reds the assertion naming it: store filter, urgency sort, call-site precondition, 503 mapping, nav entry,
month clamp, unknown-renders-as-empty. Foreign store 99's request seeded and proven absent — the trap the brief named.
CONCURRENCY: world.js/api-server.js clean before and after, every hunk mine; committed d50e75a locally, nothing pushed.
OPEN: the guest's own filing is not browser-drivable (Program.cs AllowAnyOrigin vs the credentialed session cookie) — guest-surface
defect owned elsewhere, filed as a journey note; the row is seeded in the state a filing leaves it in.
SVEN: E2E_WEB_PORT=3081 E2E_FIXTURE_PORT=4081 npx playwright test test/e2e/journeys/growth-privacy-queue.spec.js --headed
END RETURN
