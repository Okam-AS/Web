# L-REVIEW-RESIDUALS — guard 2: the re-zoning guard's anchors

Branch `lane/review-residuals-rezone`, off `lane/wf-export-duplicate` @ `3a4442a7` — the most
integrated tip carrying `acfacd04` ("A performed routine now stops the store's clock being
re-pointed underneath it"), which is where the closing test was added. It is not on
`feature/restaurant-modules` yet.

## The finding, verified before building

`StoreMarketHistoryCoverageTests.EveryDeclaredAnchorIsActuallyProbedByTheGuard` reads the two probe
methods out of `Services/StoreMarketService.cs` and matches each declared anchor **as text**:

```csharp
var setName = db.Model.FindEntityType(anchor)!.GetTableName();
if (!body.Contains("_context." + setName + ".", StringComparison.Ordinal))
    unprobed.Add(method + " never queries " + setName);
```

That closes the hole it was written for — an anchor declared and never queried — but it cannot see
a PREDICATE. Ten anchors are declared today (six zone, four money) and all ten predicates are
visibly correct, which is exactly when the behavioural case is worth adding: a text match on
correct text is indistinguishable from a text match on anything.

## The change

New `WebApi.Tests/StoreMarket/StoreMarketAnchorBehaviourTests.cs`. Two `[Theory]`s whose cases come
from `StoreMarketHistory.ZoneAnchors` / `MoneyAnchors` at run time, so an anchor added to either
list acquires a case because the walk finds it. Per anchor, three worlds:

1. no history at all → the change is ACCEPTED (so the refusal below is about the row, not the zone
   pair or the country);
2. the row under ANOTHER store → still accepted (this is what a dropped or wrong `StoreId` clause
   fails);
3. the row under THIS store → refused, `TimeZoneChangeUnsafe` / `CurrencyChangeUnsafe`, 409, and
   the store's stored column unchanged.

The row is built from the anchor's own EF entity type: every required column gets a placeholder,
optional ones are left unset, `StoreId` is stamped last. A CLR shape with no placeholder fails
naming the column rather than seeding nothing; after `SaveChanges` the entry state is asserted
`Unchanged`, so a row that never reached the database cannot let a case pass by finding no history.
Foreign keys are off in the world deliberately — the fact under test is which table the guard reads
and how it filters, and seeding each anchor's full parent graph would make the case red for reasons
that have nothing to do with re-zoning.

Two placeholder shapes are name-aware, and that is not decoration: the availability override carries
`CK_WorkforceAvailabilityExceptions_Bounds` (`[StartsUtc] < [EndsUtc]`) and the flat placeholder
violated it on the first run — one failure out of eighty, with SQLite naming the constraint. A
constraint the placeholder cannot satisfy therefore fails loudly rather than skipping the anchor.

## Red, then green

The mutation is a WRONG PREDICATE, not a missing probe — the case the text match cannot see. In
`HasZoneDerivedHistoryAsync`, the § 8-5-6 kodeoversikt probe was changed from
`i.StoreId == storeId` to `i.StoreId == 0`, leaving the table name in the source exactly where the
text guard looks for it.

| run | result |
| --- | --- |
| `~StoreMarketHistoryCoverageTests` (the text guard) | **4/4 passed** — the drift is invisible to it |
| `~StoreMarketAnchorBehaviourTests` (this file) | **1 failed / 10 passed** — `A store holding a WorkforceIdentityCodeRegisterIssue row had its clock re-pointed anyway.` |
| predicate restored, both classes | green (see the after-tier) |

The anchor named is the one that had already been declared-but-unprobed once, in prose only, which
is why it is the one worth mutating.
