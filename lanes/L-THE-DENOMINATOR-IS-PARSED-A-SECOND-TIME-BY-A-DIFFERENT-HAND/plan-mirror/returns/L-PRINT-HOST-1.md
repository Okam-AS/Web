RETURN: L-PRINT-HOST
brief: 72aeeb4f
verdict: built
evidence: lane/print-host @ 6e6acd0 · artifacts/journeys/admin-print-host/ (5 PDFs, read) · artifacts/journeys/admin-print-host.playwright.json
log:
All three defects reproduced in a browser before anything changed, then re-measured after.
1. Personalliste body carried `class=""` — the whole print stylesheet was inert, as briefed. Worse on paper than described: the A4 print lost the ORGANISASJONSNUMMER, the TIDSSONE, the correction lineage and the hired-in org.nr off the right edge, behind a blank first sheet. Four § 8-5-6 fields, gone. Cause: `.admin__content` padding never zeroed, so the sheet laid out wider than its own 14mm @page box and Chrome clipped it. Fixed via head() + PRINT_HOST_CLASS, carrying `okam-ch` by hand (coordinator's trap — was already handled, verified).
2/3. Gutter + 300ms transition fixed centrally in AdminPage.vue (print-only, no !important; `.admin--collapsed`/`--chromeless` already set the same zero). Blast radius checked: only 4 files in the repo carry `@media print` and none depends on the gutter. Screen measured unchanged (264px) on all three pages after.
Paper, read: personalliste now one page with every § 8-5-6 field and the full identity-gap caveat incl. "virksomheten må selv føre kodeoversikten". Vaktplan A4 landscape regained Lør + Søn and the truncated wage caveat. `00-before-*` PDFs committed alongside so the claim is falsifiable. Artifacts force-added past the `artifacts/` ignore.
DEFECT (unfixed, reported): components/atoms/Modal.vue:58 has the identical vue-meta bug — `classList.add('noscroll')`. Measured with the login modal OPEN: body class `""`, `overflow: visible`. The scroll lock behind every modal is dead in the real login flow. Not mine to fix (shared far beyond 47 pages) and not a print defect.
DEFECT (pre-existing, unfixed): `/admin/workforce-schedule` still clips its TIMER total column on A4 landscape — its own grid width; it has no print stylesheet at all. Strictly better than before (was losing two days as well).
DEFECT (harness): playwright globalTeardown deletes a borrowed `core/` out from under a dev server adopted via `reuseExistingServer`; the next run then fails four journeys that look like product breakage. Cost me one false red.
A unit test asserted the BROKEN behaviour and passed (jsdom has no vue-meta). Rewritten to assert the declaration + the market class, with a regression guard on the imperative form.
Fixture gained the endpoint-30 personnel-list route (world.js + api-server.js), built relative to now so an open window reads as "til stede" rather than a missing punch.
Suites: Jest 92/92, 2155 tests. Browser journeys 4/4 green over five consecutive cold runs. One flake seen and hardened (cold nuxt route compile vs the 10s expect default), then five clean runs.
Not run: SQL tier (not granted). Not pushed, per brief. No translations touched.
END RETURN
