# check-discriminates.sh — recorded runs

Extracts the deposit-stage block verbatim from Scripts/demo/seed-events-demo.sh and drives it
against (POST code, POST body, deposit-list JSON) triples. Pass 2: the two triples that decide the
lane are MEASURED, not invented — see the wire-tier run below.

## Pass 2 — the wire tier, where the two triples come from

`dotnet test --filter FullyQualifiedName~WebApi.Tests.Wire` on lane/ev-seed-deposits caee6ae3
(base feature/restaurant-modules 3579bbbc): **199 passed, 2 skipped, 0 failed**, no container
started. `EventsWireTests
.A_deposit_row_and_its_receipt_are_committed_only_when_the_store_holds_the_deposits_flag` drives the
seed's own two calls over the real pipeline against one Accepted event, flag row the only variable:

```
flag absent   POST /events/admin/4101/events/4311/deposits  -> 404 application/problem+json
                                                                code = EVENTS_DISABLED
              GET  .../deposits                             -> 200 []            0 deposit rows
flag present  POST .../deposits                             -> 500 text/plain, no `code` at all
              GET  .../deposits                             -> 200 [one row]     1 deposit row,
                                                                status Failed, AmountMinor 40000,
                                                                Initiated receipt (ActorKind Admin,
                                                                ActorUserId wire-admin-a) + Failed,
                                                                no LinkIssued; event back on Accepted
```

Non-vacuity, red then green, watching WebApi.dll's mtime (a production edit does not move the test
dll's): `requireDepositsFlag: true` → `false` in EventsDepositsController.Issue turns the absence arm
RED **on the row assertion**, printing what a flagless store would have taken on —

```
Assert.Empty() Failure
Expected: <empty>
Actual:   [EventsDeposit { AmountMinor = 40000, CurrencyCode = "NOK", ... }]
```

— and restoring it returns the suite to green. Both refusals are non-200, so the status code cannot
separate them; the row does.

## AFTER — lane/ev-seed-deposits (wt-evseeddep)
```
PASS  provider failed, intent committed              expected live
PASS  module refusal (missing Events.Deposits)       expected die 
PASS  refused before the intent was committed        expected die 
PASS  deposit actually issued (200)                  expected live
PASS  deposit list did not answer a list             expected die 
PASS  non-JSON body, intent committed                expected live
PASS  non-JSON body, no intent committed             expected die 

7 passed, 0 failed
```

## BEFORE — feature/restaurant-modules de1e5c5e, the blind check
```
PASS  provider failed, intent committed              expected live
FAIL  module refusal (missing Events.Deposits)       expected die  got live
        NOTE deposit issue REFUSED (404) -- expected without live Vipps credentials:
        NOTE   {"type":"https://okam.no/problems/events/EVENTS_DISABLED","status":404,"detail":"Events is not enabled for this store.","code":"EVENTS_DISABLED"}
        NOTE event 42  Accepted
FAIL  refused before the intent was committed        expected die  got live
        NOTE deposit issue REFUSED (409) -- expected without live Vipps credentials:
        NOTE   {"code":"EVENTS_STATE","status":409}
        NOTE event 42  Accepted
PASS  deposit actually issued (200)                  expected live
FAIL  deposit list did not answer a list             expected die  got live
        NOTE deposit issue REFUSED (500) -- expected without live Vipps credentials:
        NOTE   {"message":"Could not parse the Vipps response"}
        NOTE event 42  Accepted
PASS  non-JSON body, intent committed                expected live
FAIL  non-JSON body, no intent committed             expected die  got live
        NOTE deposit issue REFUSED (500) -- expected without live Vipps credentials:
        NOTE   <!DOCTYPE html><html><body>AppException</body></html>
        NOTE event 42  Accepted

3 passed, 4 failed
```
