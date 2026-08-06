RETURN: L-MIRROR-HOLDS-ONLY-REAL-MEMBERS
brief: 38f74149
verdict: built
evidence: lanes/L-MIRROR-HOLDS-ONLY-REAL-MEMBERS/census.md
spec_gap: "core declares OrderStatus.OpenCheck where the backend does not" is false — git show 8e2b57de:Enums/OrderStatus.cs carries OpenCheck = 10; 9 members BE, 9 FE, exact
log:
Refs, all by object: BE feature/restaurant-modules 8e2b57de (177 enums / 2723 .cs); core pin 1bcab0b6 IDENTICAL at FE tip e34977ac, HEAD 8ac6f636 and candidate 9f7d8dfc, so no core ambiguity;
FE app e34977ac + candidate 9f7d8dfc, 0 own enum decls. OkamAPI checkout on lane/meals-grace-pins 34c6c103 NOT read; Web-modules dirty tree NOT read. Both FE refs swept, extras set identical.
Compared member by member: 40 core enums, 4 core union types, 34 switch ladders, 50 object maps. EXTRAS: exactly TWO in the whole frontend, both DEAD, neither deleted.
 E1 'GroupedHomeDelivery' plugins/global-mixin.js:101 — 0 hits in BE at 8e2b57de, 0 in core, 1 in the whole FE (the case itself). git log -S: it WAS DeliveryType=300, added 2c816730 2021-05-05,
 removed fc12eb8f 2024-08-17 — the FE case outlived the BE member. Only residual channel is a legacy stored int 300; Newtonsoft StringEnumConverter emits the number, not a name — NOT executed.
 E2 RewardTransactionType.Transferred core/enums/reward-transaction-type.ts:5 — BE has NotSet/Received/Spent/Canceled. Only FE use is a type annotation; 0 files in Web-modules. Also short Canceled.
NO mirror carries a legitimate client-set extra: neither extra is assigned anywhere, in source, fixture or test. No test names deliveryTypeLabel.
SHORT, kept apart and not this lane's: 8 enum-level (incl. recorded PaymentType/CompanyAccount), 1 union-level (TripletexVoucherStatus/Pending), 5 ladder-level surviving site reading.
 Worth a look by that lane: paymentTypeLabel is short Cash — a POS that takes cash prints 'Ukjent'.
Instrument: 5 of 17 screened short rows were set-match artefacts, killed by reading each call site; the extra screen had 0 false positives. ERE has no \b so that grep matched nothing — -P/\K gives
 201, minus 24 English words after "enum" in comments = 177, the cross-check. paymentTypeLabel set-matches PaymentTypeFilter 0.83 over PaymentType 0.59; its 6 call sites settle it.
NOT determined: whether any row still stores DeliveryType=300 (no SQL, no container); and 145 of 177 BE enums have no core mirror at all — a third question, counted in neither direction.
Changed nothing: no fix, no suite, no container, no commit, no push.
END RETURN
