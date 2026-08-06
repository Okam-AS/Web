```
RETURN: L-FIXTURE-RENDERED-VALUES-FIX
brief: 9c0d988e
verdict: built
evidence: /Users/svendaneel/okam/web-fixrendered/lanes/L-FIXTURE-RENDERED-VALUES-FIX/mutation-log.md
spec_gap: the sweep's row-10 render claim fails twice - organisms/OrderModal.vue is admin-only (pages/admin/orders.vue is its sole importer) and consumer-api-server.js serves the sibling ConsumerWeb, where an unknown status renders as an empty heading and a stalled progress bar, never «Ikke satt»
log:
Five values corrected, two left with the reason IN CODE; 20 mounted assertions over 7 render sites, all green.
Suite 112 files/2583 tests -> 113/2603; the SAME 2 reds before and after (journey-artifact-store checkout-basename, not mine).
Predicted 0 reds from the edits - no jest test and no Playwright journey reads any of the five words - and got 0.
Corrected: actorKind Staff->Admin x2 (EventsJourney:340), receipt Capture->ProviderConfirmed (:167), breakdown key
PendingConfirmation->Unverified (GrowthAudiencePanel:51), test-send Sent->Accepted (growth-newsletter.vue:561 banner),
order Received->Accepted (OrderModal:52). Every membership AND every intended member re-read from OkamAPI by object at 8e2b57de.
Card and Kitchen LEFT, named, not guessed: no corroborated member. Kitchen's row carries timeLabel AND quantityLabel, a shape
EventsRunSheetComposer never emits, so no section name repairs it - the shape is the finding. Both recorded via unresolved()
and exported; the exemption list is asserted WHOLE, so a third value quietly joining it reds (arm 6).
SEED FIXED, not only the values: world.js routes them through member(), which THROWS at require time on a non-member
(negative control proven). events.js is 74/74 because it derives by running the machine; world.js hand-typed and owned 5 of 12.
Mutation proof, 9 arms: each pre-fix word reds exactly its own assertions; arm 7 DELETES the actorKind chip from the template
and reds 3 - which is what shows these assertions read the SCREEN and not the constant. Positive control green at both ends.
Both fixture servers DRIVEN rather than imported as constants: growth-newsletter.route(ctx) for real; consumer-api-server via
jest.mock('http') replacing only createServer, so its real handler runs with no socket and no port to collide with a lane.
END RETURN
```
