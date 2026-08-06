```
RETURN: L-GR-CONFIRMED-PIN-FIX
brief: afe2c524
verdict: built
evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 48950702 (lane/gr-confirmed-email, local, unpushed) · code 3cf288fb · artifacts/tests/3cf288fb-fast-tier.trx + .../3cf288fb.../RUN.md = 4376 run / 4364 passed / 0 failed / 12 skipped
log:
All THREE verified real before anything changed; none was already right.
1 PIN: the subject was seeded with no Email AND the flag false, so the confirmation clause
short-circuited and deleting the null-address clause left the whole tier green. It is now seeded
CONFIRMED-with-no-address, plus a second subject with NO account row (the doc claimed that case,
no test drove it). EXIT MET, measured: delete `IsNullOrWhiteSpace(account.Email)` and the pin reds
with the very NullReferenceException it guards (GrowthNewsletterService.cs:502); delete `account
== null` and it reds again. Each mutation reds exactly ONE test. All four reasons now pinned.
2 SEED PARAM: dead - every one of the 15 SeedStoreWithAdminAsync call sites took the default, and
its doc named a pin that mutates the entity directly. REMOVED; flag seeded true unconditionally.
3 RATIONALE: false - the guard reads only `u.Id == userId`, and GET /user already returns the
caller their own Email and EmailConfirmed. Decision kept, reason rewritten. a7697121's message
repeats it and was NOT reworded: 801d36a3 names that SHA in the trx filename and RUN.md, so a
reword would orphan the receipt; 3cf288fb's message carries the correction.
BASE MEASURED not inherited: 801d36a3 ran 4376/4364/12 = the a7697121 receipt; post-change ±0.
Clause/ordering/static-403/new-pin untouched. No migration, no container. § 15 NOT closed; C5 unmet.
END RETURN
```
