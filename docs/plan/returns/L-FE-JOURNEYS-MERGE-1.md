```
RETURN: L-FE-JOURNEYS-MERGE
brief: 1061fd4a
verdict: built
evidence: commit ddc27fa on feature/restaurant-modules (ff, no merge commit) - lanes/L-FE-JOURNEYS-MERGE/{bookkeeping.md,suite-18-of-18.log,mutation-proof.log,first-port-attempt-3-red.log}
log:
COUNT IS SIX, NOT FOUR. plan.md marks 194/217/355/380/465/542 driven-lane-only on lane/fe-journeys. COVERAGE-THREE landed 194+465 at 174a550 and their "lane only" marks were never cleared, so the plan was stale in BOTH directions. All six are on the branch now. A SEVENTH, plan.md:121, is still lane-only on lane/fe-wf-onboard (workforce-invitation-onboarding) - not mine, needs its own pass.
PORTED, NOT MERGED, deliberately. lane/fe-journeys is 3 ahead of a base 27 behind; its support/journey.js (-149), playwright.config.js, margin.js, training.js and two specs (-158/-200) are all OLDER. A merge would have offered to take the harness guards, the resolved-flag fixtures and COVERAGE-THREE's rewrites back out. Carried the 4 specs + fixture/meals.js + fixture/growth.js + world constants by hand instead.
PRODUCT FIX LANDED: pages/meals/join.vue built its client in created(), before the mixin rehydrates Vuex in mounted(), so bearerToken was '' for the component's life and both [Authorize] invitee routes 401'd - no invited employee could claim. Computed now. plan.md:424-429 said this was unmerged; it is not any more.
plan.md:258-260 ASSERTED A CONTROL THAT WAS NOT HERE: "two coverage figures on one hook ... Fixed on lane/fe-journeys, so it is live at the branch tip today." Both panels still emitted data-test="coverage-percent" at 033d180. Split here into coverage-window-percent / statement-coverage-percent.
THE PORTED FIXTURES CARRIED THE FLAGS DEFECT and do not now. growth.js answered for every store but one hard-coded dark id; it resolves growth.module out of the shared override table, so the walk starts dark and flips its own switch through /admin/feature-flags - which also proves the guest client withholds the token while an admin session is live. margin-statement-week flips Margin.Module then Margin.Statements, two separate stops.
world.js gains a FOURTH identity, a PowerUser. Additive on purpose: every other identity is isPowerUser:false and three refusal journeys need that, but the Meals concierge forms and the Margin projection repair are PowerUser-only. The projection step is now an ABSENCE assertion from the venue's own session, with a finding - a venue cannot see the lag its own settlement depends on.
MUTATIONS 4/4 RED, tree restored by rewriting: join.vue fix reverted -> claim reds on authorization ABSENT; growth gate removed -> dark step reds; concierge -> manager -> meals form reds; STATEMENTS_FLAG flip removed -> reds.
playwright.config.js: navigation 30s->90s, test 60s->120s. nuxt dev compiles a route on first request and holds it; a cold first navigation timed out with ZERO fixture traffic on /admin/margin-statements AND /subscribe/:store - it reads exactly like a dead page. Shared-file change, 2 knobs widened, no journey meaning altered.
SUITE 18/18 green from an empty .nuxt (incl. all 14 pre-existing), jest 104/104 2370/2370. Ports 3077/4077, mine alone, both released. No container started or touched. support/ untouched.
Method copied from L-MODAL-LAND: isolated detached worktree off the tip, then ff-only into the shared checkout. Diff vs 033d180 is exactly my 13 paths. A sibling's dirty test/e2e/scripts/live-world.sh was there before and after, untouched.
ARTIFACTS: gitignored, so my four leave nothing committed - but the modal lanes force-added theirs, so a suite run dirties 7 tracked files under artifacts/journeys/modal-*. Reverted, not committed.
C5: this is not acceptance. Nobody has walked these four in a browser by hand, and three of the four run only against the fixture.
END RETURN
```
