```
RETURN: L-TRAIN-DISCLOSURE
brief: bb182bfa
verdict: built
evidence: OkamAPI-modules 06b8b582 (lane/train-disclosure) + Web-modules 2d3488c; artifacts/tests/L-TRAIN-DISCLOSURE/after.trx
log:
Finding CONFIRMED, not overstated: TrainingEvidenceService appends evidence.read keyed to personRef, and the only ledger read (ReadLedgerAsync) selects on completion/certificate ids, so no route could return it.
Built GET /training/stores/{storeId}/evidence/disclosures[?personRef=] - service, interface, DI in Program.cs, route, panel, and both pages that mount it, in one change.
WHO MAY READ IT, decided: the SUBJECT, resolved from the token through IWorkforceCallerIdentity and never from the query string; and the store's StoreAdmin/PowerUser, the same gate that already reaches the record this log merely counts.
REFUSED, deliberately: resolving the actor reference to a name (that is a disclosure ABOUT THE READER, made to the person the log is about, that nobody authorised); a store-wide who-read-what feed; and any way for the subject branch to name another person.
Only one field is derived - actorIsSubject - which separates "I opened my own file" from "somebody else did" without a name. Everything else is the ledger row verbatim.
Reading the log is itself appended (disclosure-log.read), after the answer is assembled, so a refused read still discloses and records nothing.
Backend 960/0/2 over Training + Wire + Modules + Observability + Workforce (base measured first: 232/0). Frontend 107 suites / 2412 tests (base 2388, green). Lint clean.
Mutations red the right pins: drop the store predicate, drop the person predicate, drop the route attribute, or send personRef on the self-read - each reds a named test; restored green each time.
Two parked reachability exemptions on IWorkforceCallerIdentity are DELETED: their own ruling said "Training adopts the seam or the seam goes", and Training adopted it.
Two Training census pins were reverse pins that reddened by design; both renamed and re-goldened so the rule is now "a ledger reader must record the disclosure it performs", not "there is exactly one".
Wire matrix seeds two subjects, three readers and two stores by REAL requests, so every absence is a filter rather than an unwritten row; wire-outsider is now a claimed person and administers nothing, which is what makes the subject branch provable.
No migration authored, no column needed. No log or telemetry call added. No statute string printed.
NOT ACCEPTED under C5: nobody has walked this in a browser - this branch has no browser-level framework, and the suite counts above are evidence of behaviour, not of a finished capability.
END RETURN
```
