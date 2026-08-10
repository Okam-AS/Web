RETURN: L-GR-TESTSEND-GUARD
brief: ce98c3fa
verdict: built
evidence: /Users/svendaneel/okam/wt-gr-testsend @ 5719fc96 · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · Growth 460/0/1 (SqlServer excluded, no slot held)
log:
Brief VERIFIED, one correction. TestSendAsync did no consent and no address check; the controller
alone among newsletter writes passed no user id. But "unattributed" is the weaker half:
GrowthEndpointContractTests already proves the 401 branch is UNREACHABLE at the wire (StoreAdminPolicy
refuses a principal without Identity.Name; ActorClaims resolves every one that has it). The caller was
always identifiable - nothing recorded or used it. A 401 wire pin is undriveable, so I wrote none.
CHOSE BOTH, with the actor as the SUBJECT of the check rather than a stamp: test-send now requires a
resolved user id AND may only reach that user's own account address, composed from the account and
never the request, so softening the comparison cannot widen the recipient. Deny-closed on the lookup
(a phone-signup admin with no Email cannot test-send). Placed after the ownership load so cross-tenant
probes keep 404-ing. NOT a consented-contact rule - that skips the final re-check and frequency cap,
worse than the hole. No migration; nothing is stored, chain untouched.
STILL OPEN: no persisted test-send record (needs a table), and admin-web maps growth.* codes
explicitly, so growth.test_address_not_own falls to growth_error_generic
(pages/admin/growth-newsletter.vue:245) - frontend lane.
Mutations: binding removed / hard-coded "system" actor / service guard removed -> 3, 3, 3 red.
END RETURN
