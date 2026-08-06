```
RETURN: L-GR-DEADLINE-LAND
brief: f8f3c7e7
verdict: blocked
evidence: OkamAPI feature/restaurant-modules @ 3579bbbc; artifacts/tests/bb82b3a0-fast-tier.trx (4381 run / 4369 passed / 0 failed / 12 skipped)
needs: +L-LIVE-WORLD-SEED
log:
BRIEF TRUE. 86c0f9ae was not on feature/restaurant-modules (merge-base = de1e5c5e = the tip). All three symptoms confirmed. No migration, no OnModelCreating change: derive-on-read holds and the MIGRATION note does not gate this.
LANDED, exit half 1. 1416e810 merges lane/gr-deadline-onwire; the branch now carries GrowthPrivacyRequestListItem.DueAt and the obligation ordering.
Fast tier run AT the merged tip from a clean detached checkout, recorded per the artifacts/tests convention: +18 vs 99855b1d, every case attributed to a commit, no new skips. SQL tier again unrun — no slot; the two live mssql containers were not touched.
BLOCKED, exit half 2: the journey cannot run live, and three separate walls each stop it. (a) It carries the default @fixture tag, and `E2E_API_BASE_URL=... playwright test --list` selects 0 tests — live mode is DESIGNED to exclude it, per playwright.config.js's own header.
(b) world.js hard-codes store 42, a demo phone/OTP pair and request ids 9100-9102 plus foreign-store 9900; the journey asserts on those literals and none exist in a real database.
(c) Program.cs registers UseSqlServer only, port 1433 is closed, and no slot was granted. Un-tagging the journey without (b) and (c) would produce a live-labelled run against the wrong world — the exact thing that config comment refuses.
DONE INSTEAD, closing both gaps the review named by name. bb82b3a0 pins dueAt over the REAL pipeline (WireHost boots WebApi.Program over TestServer: real routing, real [Authorize], real Newtonsoft): property name read ordinally with PascalCase refused, ISO format, end-of-January value, and the served order.
Four mutations red it, each restored and rebuilt: DefaultContractResolver, DateFormatString, dropping the DueAt projection, restoring OrderByDescending(ReceivedAt).
FINDING 1. The camelCase was never this repo's choice — it is the naming strategy JsonSerializerSettingsProvider installs by default, so the review was right that nothing pinned it. It is pinned now.
FINDING 2. DateFormatHandling.MicrosoftDateFormat does NOT move a DateTimeOffset on this pipeline (measured, wire value unchanged); DateFormatString does. The /Date(...)/ shape a browser cannot parse is unreachable for this DTO.
DIFFERENTIAL. The fixture's privacyDueAt agrees with the backend's six discriminating clamp dates — all six, including the two where a thirty-day window diverges. Measured, not committed: making it a standing pin needs api-server.js to export the function, which is the fixture owner's call.
NOT FOLDED IN, as instructed: working-day extension, end-of-day expiry, UTC-vs-local rendering.
NOTE. The frontend is still shipping against the fixture alone; what this lane changed is that the backend it will meet now serves the field and is pinned to serve it under that exact name.
END RETURN
```
