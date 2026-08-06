```
RETURN: L-FIXTURE-VOCABULARY-SWEEP
brief: d2aff61e
verdict: built
evidence: /Users/svendaneel/okam/web-vocabsweep/lanes/L-FIXTURE-VOCABULARY-SWEEP/vocabulary.md
spec_gap: five string-typed (not enum-backed) fields also diverge - action, permittedActions, capabilities, subscribe status, approval.state - outside the exit criterion, three of them rendered, none fixed
log:
All 10 fixture files swept, not the 4 named as the floor: 1556 literals + 17 enum-shaped KEYS, comments stripped first.
360 rows checked; 272 bound to a backend enum by the READING code (89 fields, 47 of 177 enums at 8e2b57de); 260 correct.
12 wrong, 11 distinct strings, 5 files. events/margin/meals/training/consumer-world are CLEAN - 149 values, zero wrong.
New enum-backed: Staff (EventsActorKind, world:460/461), Card (PaymentType, :470), Capture (EventsPaymentReceiptKind, :479),
Kitchen (EventsRunSheetSection, :498), Sent (GrowthMailSubmissionStatusDto, gn:488), Dispatched (GrowthNewsletterState, :541),
Planned (WorkforceShiftAssignmentState, api:472), Superseded (WorkforceInvitationState, api:1202 - no such state), Received/Pending (OrderStatus, consumer:352/334).
SIX ARE PRINTED RAW: EventsJourney.vue 136/167/258/340 - and :136 does NOT route through paymentTypeLabel - plus
GrowthAudiencePanel.vue:51 (PendingConfirmation, twin of GrowthConsentStanding:54) and growth-newsletter.vue:561 (banner).
Order Received renders as the fallback «Ikke satt» via OrderModal:52 - wrong AND invisible.
Intended member corroborated, never guessed: Admin/ProviderConfirmed/Accepted/Dispatching/Draft from backend writers plus
sibling fixture halves. Card and Kitchen left UNKNOWN - Kitchen's row carries a shape the composer cannot produce at all.
Drift is seeded-vs-simulated, not per-module: events.js derives values by running the machine (74/74 right); world.js
hand-types them and owns 5 of 12, all inside the Events objects events.js SERVES but does not build.
A union-membership check passes 5 of the 12: Capture is a real MealsAllocationKind; Superseded/Pending/Received/Sent are
members of five other enums. Only binding field to enum by the reading code finds them. Read-only; no suite, no container.
END RETURN
```
