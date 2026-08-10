RETURN: L-WF-FLAGS-UI
brief: 164f9827
verdict: built
evidence: artifacts/journeys/workforce-flag-lever.playwright.json
log:
Exit criterion met IN A BROWSER, 10/10 steps: switch on -> build+validate a week -> switch off -> Publiser answers "Vaktplanen er skrivebeskyttet / Bryteren workforce.publication star av..." with a link to the switchboard -> the week still fully rendered (read-only, not dark) -> switch on -> "Publisert til 1 mottakere."
BUILT: /admin/feature-flags (catalog-scoped, all six modules gain the lever), utils/platform/feature-flags-client.js (adds the PUT/DELETE nothing in the frontend wrote), flag-board.js, the nav entry + converse-walk prefix, and the flag-disabled-read-only branch on workforce-schedule.vue.
BRIEF VERIFIED against wt-flagguard: all five module claims are TRUE. Two corrections. (1) "render withheld keys as withheld" is impossible and unnecessary - withheld flags are absent from Describe(), so neither read carries them and there is no wire field. (2) C5's "this branch has no browser-level test framework at all" is stale: Playwright, three journeys and an artifact contract are on the branch.
FOUND: workforce-schedule-publish was green only because the fixture modelled no flags; on a real store all four of its writes are refused. The fixture now models the flag store and the deny-closed default, that journey gained the enabling step, and both pass.
HONESTY RULES ON SCREEN: effective:false is reliable and effective:true is not a promise (Growth/Events sit under an invisible config switch); a failed store read is UNKNOWN, never all-off; a 403 gets one sentence for both things it conceals; a non-catalog key gets no toggle; setting-on + gate-off is named as overruled.
HAZARD: commit c1b4619 (another lane) swept up my uncommitted translations/*.ts and test/e2e/fixture/*. Content intact and asserted green, but attribution is wrong and a revert of c1b4619 would take this lane's keys with it.
OPS: the shared e2e ports 3010/4010 were being killed mid-run by a neighbour; ran on 3021/4021 instead of spin-waiting.
Mutation-checked: 7 mutations, 6 went red; the 7th exposed an assertion that could not fail, and the test was strengthened until it did.
2257/2257 jest (98 suites), eslint clean, local commit 6b02462. Never pushed.
END RETURN
