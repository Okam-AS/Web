```
RETURN: L-ROLLBACK-TRACKED-SWEEP
brief: ea4c9163
verdict: built
evidence: /Users/svendaneel/okam/wt-rbtracked/lanes/L-ROLLBACK-TRACKED-SWEEP/evidence.md
log:
base feature/restaurant-modules @ 3579bbbc; wt-rbtracked; lane/rollback-tracked-sweep; commit 11829752; no push
shape still present: reference fix 249612ac is NOT an ancestor of this base (it sits on lane/meals-release-actor)
derived census not grep: 1996 throws / 280 files, cut by tracked-local classification + block-chain ordering
RULE: a mutation precedes a throw iff its enclosing-block chain PREFIXES the throw's; that is why onProceed: sibling lambdas and if/else arms are NOT flagged, they are the estate's correct idiom
passes 77 naive -> 68 lambda-aware -> 14 block-prefix -> 9 after fixes; detector bug fixed (nested parens, catch-when)
FIXED 3 guard-first: GoodsGroupService.UpdateAsync (VAT retirement guard, 0% VAT risk); TableService
  .SaveReservationSettingsAsync (guards ran after RemoveRange marked rows Deleted); GiftcardService.CompletePurchase
PINNED 9 findings / 8 keys, each with the argument and what would invalidate it; a stale entry FAILS, cannot rot
BLIND SPOTS named in test and evidence: throws behind a HELPER call (interprocedural, and exactly the Meals guard
  shape that motivated this), collection/Entry-State mutations, navigation provenance, whether the scope is reused
non-vacuity: moved a throw BACK after a mutation at a FIXED site -> RED naming it; other 12 stayed green
  (discriminates); restored cp+touch, forced rebuild, both WebApi.dll copies moved 22:57:48 -> 23:04:14
suite Database!=SqlServer 4382/0/12; no container or migration; fixed a real RowversionAssertionProviderTests
  interaction by renaming my synthetic refusal rather than widening that existing control
COLLISION: does NOT touch the Meals funding interface; F-MEALS-FUNDING-AUTHORITY-COLLISION unaffected, no side picked
END RETURN
```
