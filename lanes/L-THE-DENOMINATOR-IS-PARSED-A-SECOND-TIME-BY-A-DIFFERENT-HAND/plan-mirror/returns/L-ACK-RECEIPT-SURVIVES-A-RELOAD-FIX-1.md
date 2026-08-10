```
RETURN: L-ACK-RECEIPT-SURVIVES-A-RELOAD-FIX
brief: 3ff3f7e5
verdict: built
evidence: /Users/svendaneel/okam/web-ackreload/lanes/L-ACK-RECEIPT-SURVIVES-A-RELOAD-FIX/evidence.md
log:
Contract A. BE lane/ack-receipt-inbox-column 6dfbb74b off tip 8e2b57de; FE lane/ack-receipt-survives-reload ac6ed72 off predecessor 02c7356. Nothing pushed; 4010 never bound.
ONE COLUMN: GetInboxAsync already loaded the recipient row and selected SeenAtUtc; it now selects AcknowledgedAtUtc too. No migration, entity, snapshot, route, DI or fixture regen.
FE: publicationsForNotice keeps a row the SERVER reports acknowledged; the notice renders from item.acknowledgedAtUtc. The session map stays - only it survives a FAILED re-read.
REDS PROVEN 5x: drop the projection field -> RED; set it from `seen` -> RED (the inverse pin); 6 Jest cases RED pre-fix; drop the null guard -> RED; drop it from the fixture -> RED at spec:368.
GREEN: SelfService 10/10; Workforce fast tier 767/4 - all four are *MigrationLineageTests, red identically at the untouched tip (14 there, six modules). Jest 126 suites / 2986.
WALK: workforce-week-run passed on 4077/3077, recording "after reload: Allerede bekreftet 6. aug., 12:47." The step that asserted the absence is inverted, not deleted; its 3 errors pre-existed.
THIS IS UI STATE, NOT THE WORKER'S EVIDENCE COPY - the recipient row's MUTABLE column, outside GuardAppendOnly. The append-only receipt is read back by NO endpoint on any surface.
REOPENS if an inspector or a dispute asks a worker to produce their own confirmation: that needs a GET over the receipts table, behind MIG-21 (race test expected-red) and MIG-14.
NOT a 8-5-6 record (three other tables); no statutory string added, wfme_pub_disclaimer pinned. C5: fixture walk, not acceptance - Sven confirms on /admin/workforce-me, then refreshes.
END RETURN
```
