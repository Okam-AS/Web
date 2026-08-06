RETURN: L-FLAGS-JOURNEY-SWEEP
brief: 8e623d02
verdict: built
evidence: lanes/L-FLAGS-JOURNEY-SWEEP/census.md (all 12 journeys) · mutation-{a,b,c-a,c-b}.log · commit bb1bf0c · artifacts/journeys/*.playwright.json 12/12 passed
log:
Censused all 12 journeys, clean ones included. 6 walked a gated surface unmodelled.
EVENTS x2 (runsheet print + onboarding): Events.Core is deny-closed and gates the READS, so on a real venue there was no pipeline, no event, no sheet to print. Both now open dark, ASSERT the refusal, then flip Events.Core through /admin/feature-flags. Events.Settlement left down on purpose - the page now also proves it prints with one facet read refused.
MEALS x5 (consumer checkout): gated by HOST CONFIG only. meals.module, the one catalog lever, is read at three admin routes and none on this path - so the switchboard shows an operator a Meals switch that does not reach a guest, in either direction. Fixture now models Features:Meals; nothing in the product can flip it, so the mutation is permanent instead, as new journey meals-module-dark.
CLEAN, verified not assumed: guest-proposal (public routes carry only the Events:Enabled config; EventsProposalService has no gate at all, contradicting IEventsModuleGate's own docstring) and refusal-worker (WorkforceModuleGate GRANDFATHERS a store that has staff - which is also why schedule-publish only ever needed workforce.publication).
MUTATIONS 4/4 red, tree restored byte-for-byte. Removing a journey's flip reds the journey; removing the fixture's gate reds the dark-venue control. The second of each pair is what stops this lane reproducing the defect one level up.
HANDED ON: Events.Core does NOT gate the public accept/decline writes (state-changing, reachable with the flag off); the Meals catalog lever is inert on the consumer path; the fixture's effective for workforce.module diverges from the real resolver - left alone deliberately, it is the flag-lever lane's screenshot.
Margin, Training and Growth have no journey at all, so none can carry this defect: a coverage gap, not a sweep gap.
Ports 3061/4061 and 3071/4071 throughout. world.js and api-server.js were clean at start and the commit carries only my hunks.
END RETURN
