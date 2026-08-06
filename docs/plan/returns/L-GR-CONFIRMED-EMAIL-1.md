```
RETURN: L-GR-CONFIRMED-EMAIL
brief: bb782bcf
verdict: built
evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 801d36a3 (lane/gr-confirmed-email, off 5719fc96, local, unpushed) · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · artifacts/tests/a7697121-fast-tier.trx = fast tier 4376 run / 4364 passed / 0 failed / 12 skipped, from a clean detached checkout of a7697121
log:
Brief VERIFIED end to end: the clause selected u.Email alone; UserService.cs:113-121 persists Email
and clears EmailConfirmed BEFORE any code (route UserController.cs:53); RequireUniqueEmail unset
(ServiceCollectionExtensions.cs:176-192); Meals precedent MealsMembershipService.cs:613 requires it.
FIX: the query selects { Email, EmailConfirmed } and refuses unless the flag is set. Unconfirmed and
not-mine deliberately keep ONE error code - splitting them would report which addresses another
account holds. Refusal stays static and address-free (C7). No migration: existing Identity column.
SEEDED, NOT RELAXED: GrowthDeliveryHealthTestSupport carries the flag (parameterised, default true),
as does the lifecycle test's author-1. Clause in, seed reverted to what 5719fc96 left = EXACTLY 4
RED - the four positive controls passing with the hole fully open: both existing binding pins,
GrowthTenantIsolationTests' owner control, and the lifecycle test-send.
NEW PIN An_address_the_account_holds_but_has_never_confirmed_is_not_a_provable_own_address: the
account's address points at a stranger and is unconfirmed - the row that platform write leaves - so
403, provider never called, no address in the envelope; flip that one column and the byte-identical
request is served. Delete the clause and it is the ONLY test in the 4376 that reds.
STILL OPEN from 5719fc96: growth.test_address_not_own has no admin-web mapping. C5 unmet - no UI walk.
END RETURN
```
