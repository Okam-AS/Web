```
RETURN: L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH
brief: eda844ce
verdict: aborted
reason: the recomposed phone-in-path touches the gift-card ownership guard, which the brief said to stop on; and my remaining capacity would not cover a tier plus a mutation pass over a combined change to a security guard
evidence: docs/plan/returns/L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH-1.md
log:
BOTH DEFECTS REPRODUCE AT THE TRUNK d30c1c4d4, verified before trusting either branch. GiftcardController.cs:245 is [HttpPost("transfer/{giftcardId}/{newReceiverPhoneNumber}")].
ConsumerNotificationController.cs:31 and StoreNotificationController.cs:54 are both HttpGet {handle} — the push credential is in the path on TWO controllers, not one.
STOPPED AS INSTRUCTED. Composing lane/phone-in-path onto d30c1c4d4 conflicts in GiftcardController.cs, and the conflict is exactly the guard that landed today.
The branch's side calls the two-argument TransferGiftcard(giftcardId, model?.NewReceiverPhoneNumber). It carries no caller, so taking it whole would delete the ownership check.
THE COMPILE-ERROR SAFETY NET HELD. That two-argument call no longer exists — I appended callerUserId rather than inserting it precisely so a stale call site breaks the build instead of compiling.
A sibling proved a branch in this situation cannot compile at the trunk. This is that, and the appended parameter converts a silent behaviour change into a build failure.
THE RECOMPOSITION IS KNOWN AND SMALL, and I am naming it rather than doing it half: keep [HttpPost("transfer/{giftcardId}")] with [FromBody] GiftcardTransferModel from the branch.
Keep the ActorClaims resolution and the shared GiftcardNotFound refusal from the trunk, and call TransferGiftcard(giftcardId, model?.NewReceiverPhoneNumber, callerUserId).
That touches the guard's call site, so it needs its own tier and mutation pass: the guard's three properties mask each other, as two survivors and a combined mutation showed.
WHERE THE CREDENTIAL SHOULD GO, and why better rather than merely different: the BODY, as the branch chose. The reason is asymmetric recording, not secrecy.
A URL is recorded by every reverse proxy, load balancer and access log between caller and process as a matter of course, with no log statement involved, so redaction cannot reach it.
A body is readable by a proxy terminating TLS but is not RECORDED by default. A claim binds a value to the caller and would be better for identity, but the receiver's phone is not the caller's.
CHECKED FOR ANOTHER ROUTE TO A LOG, since closing the URL while a log still prints the value moves the exposure rather than ending it. No log statement names the phone field or the push handle.
The giftcard sites are generic LogWarning(ex, ex.Message), carrying the value only if an exception message embedded it; the refusals I landed use fixed sentences. Not exhaustive, and I say so.
NEITHER BRANCH LANDED. push-token-in-path has no collision with today's work and is the cheaper of the two, but it is untouched. No tier was run: load 16.32 against a gate of 13.
END RETURN
```
