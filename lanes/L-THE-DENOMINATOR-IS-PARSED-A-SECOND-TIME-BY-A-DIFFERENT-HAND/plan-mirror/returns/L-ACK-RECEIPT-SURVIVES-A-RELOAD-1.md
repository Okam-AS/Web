```
RETURN: L-ACK-RECEIPT-SURVIVES-A-RELOAD
brief: 65b2006d
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-ACK-RECEIPT-SURVIVES-A-RELOAD/finding.md
log:
Ref: 8e2b57de = tip of branch feature/restaurant-modules; all backend claims via `git show 8e2b57de:<path>`; working tree (lane/meals-grace-pins) never read. FE via candidate/fe-compose-2026-08-05.
ANSWER: the ack is ALREADY persisted twice per confirm - SelfService.cs:360 inserts an append-only Receipts row; :375 UPDATEs Recipients.AcknowledgedAtUtc in place. Missing is a read, not a write.
The gap is one column: GetInboxAsync:218 already loads that recipient row, selecting SeenAtUtc and stopping short of AcknowledgedAtUtc. WorkforceInboxItemModel has nowhere to put it.
NO endpoint carries it usably. #44 POST returns it but CREATES the ack when absent - calling it on load manufactures a receipt the worker never gave, on a table the EF guard forbids deleting.
#22 GET carries AcknowledgedAtUtc but needs WorkforceManager (PublishService:468) and returns coworker names (:489), which spec §5.2/§13.4 forbid on the worker shell. #33/#34 carry nothing.
The Receipts table has NO reader at all - outside Migrations/Tests only the DbSet and the write's own idempotency re-check. Written by one path, read by no endpoint on any surface.
Read must carry: ONE nullable ack instant keyed by schedulePublicationId (already on the inbox row). alreadyAcknowledged does not survive as a GET field - degenerate; it becomes a string choice.
C1: all three contracts are read-only, so C1 rules none out - it decides which store is evidence. Receipts = new row (append-only L1; MIG-14 owed); Recipients = in-place UPDATE, unguarded by design.
INVERSION: cheap option A reads the mutable store that IS uniquely indexed; B/C read the append-only store that is NOT (MIG-21 owed, race test expected-red). Choice made answerable, not taken (§6).
END RETURN
```
