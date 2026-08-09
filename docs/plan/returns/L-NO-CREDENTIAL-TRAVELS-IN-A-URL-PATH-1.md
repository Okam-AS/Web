```
RETURN: L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH
brief: 914196bc
verdict: built
evidence: backend feature/restaurant-modules bcfe0d893 -> e640608e5 -> ada218783; lanes/L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH/{tier-phone.trx,tier-pushtoken.trx,targeted-suites.trx}
log:
BOTH LANDED, one at a time, each with its own tier and its own atomic guard that re-read the trunk in the same command and matched its expected base. Nothing pushed.
Phone at e640608e5: 5079 passed, 0 failed, 11 skipped, 5090 total - +39 on the 5040/5051 baseline, the exact count the branch predicted. Push token at ada218783: 5106/0/11/5117, +27.
WebApi.dll mtime moved on both runs. Both run-sheet artifacts restored after each; never git add -A.
Named from the trx, not a console log: PersonalIdentifierRouteShapeTests 39, PushTokenRouteShapeTests 20, PushTokenRegistrationWireTests 7, GiftcardTransferAuthorizationWireTests 5 - all Passed.
The exit's falsifiability clause, both credentials at once: putting the phone back into transfer/{giftcardId}/{newReceiverPhoneNumber} and the handle back into registrationid/{handle} reds 4.
RECOMPOSED, never replayed: POST transfer/{giftcardId} with [FromBody] from the branch, ActorClaims and the GiftcardNotFound refusal from the trunk, the call carrying callerUserId.
It touched the guard's WIRE TESTS, which called the old route and 404d. Only the request shape changed - every assertion left as landed, since those assertions are the guard's three properties.
Three of eight wire call sites still posted no body after my first pass, because a regex broke on Guid.NewGuid(). A bodyless post binds a null model and would have refused for the wrong reason.
THE SECOND PHONE ROUTE IS CLOSED BY THE SAME BRANCH, not left open: StoresController is now PUT {storeId}/phonenumber with StorePhoneNumberModel in the body.
The push token was on TWO controllers and both are closed: ConsumerNotificationController and StoreNotificationController are each POST registrationid now. No {handle} survives outside a doc comment.
One route still binds a credential, deliberately: PosController receipt/public/{journalEntryId}/{token}. A bearer capability has no other carrier, and it stays on the sensitive-route list.
Evidence READ, not pattern-scanned: the only credential-shaped strings are +4791234567, the standard synthetic number, and a sha1 I recomputed against the live file, so it is a content hash.
CARRIED FORWARD, not closed here: mutating the caller resolution ALONE survives twice, reproduced again this pass. It is pre-existing and needs the fixture to express an OAuth-shaped principal.
Decisions checked before each merge: none of the three lanes carries a gate. lane/route-guard-gaps was NOT landed - it is the same product diff carried twice.
Ran only once load read 5.81 against the gate of 13. No container started, no worktree left behind.
END RETURN
```
