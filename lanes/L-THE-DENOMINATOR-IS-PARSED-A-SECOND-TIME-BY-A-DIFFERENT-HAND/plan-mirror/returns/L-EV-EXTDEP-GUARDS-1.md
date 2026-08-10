```
RETURN: L-EV-EXTDEP-GUARDS
brief: 80efd3b7
verdict: built
evidence: /Users/svendaneel/okam/wt-evextguards/artifacts/lanes/L-EV-EXTDEP-GUARDS/EVIDENCE.md (commit 07247536, lane/ev-extdep-guards, local, unpushed)
log:
BASE: the code is NOT on feature/restaurant-modules — lane/ev-extdep (7e9c38bf) is unmerged and tip 24dec838 has no RecordExternalAsync. Branched off lane/ev-extdep, itself off feature/restaurant-modules at d458e1cf. Objective reachable, so not fail-spec.
1 DATE. ReceivedAtUtc was non-nullable, so an omitted field bound to default; probe read back "Actual: 0001-01-01" as PaidAtUtc. Now DateTime? — omitted is distinguishable from stated, null and the epoch both refused before any read, never defaulted to now. Red: Assert.Throws() Failure on both cases, driven through real Newtonsoft binding. Green after.
1b CREATION FLOOR: considered, REJECTED, reason recorded at the guard. It would catch a foreign epoch (1970) too, but it permanently blocks a venue entering a booking whose transfer already arrived (CreatedAtUtc is not backdatable), and such a date is at least CHOSEN by the person the receipt names. Residual stated: an explicit 1970 still passes.
2 PARTITION. New EventsPaymentReceiptWriterCallSiteTests — derived scope, no path list. Forbids a receipt constructed outside the ledger, an Add the ledger did not author, and raw SQL / ExecuteUpdate / ExecuteDelete on the table. A fourth fact fails when the scope rots; under that mutation the other three passed VACUOUSLY, which is why it exists.
2b The gap was real: ModuleActorStampPin's only ActorWriter is EventsStateTransition, and its own remark defers the receipt choke point to tests that did not exist.
3 SINK. Guard now carries the real reason (four nullable columns → IS NULL → matches every reference-less deposit). The pin does NOT rest on the external row — that row no-ops through idempotent replay either way; it asserts the world's collection-path deposit, which is what goes red (sink resolved it and began promoting; the refusing port threw).
3b Honest: the "" case stayed GREEN under mutation ('' matches no NULL column). Pinned anyway, and the test says why.
SUITES: fast tier only — 4324 passed, 0 failed, 10 skipped. No SQL tier, no container started, no migration, no push.
END RETURN
```
