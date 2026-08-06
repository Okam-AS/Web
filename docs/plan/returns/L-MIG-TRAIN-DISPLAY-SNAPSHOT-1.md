```
RETURN: L-MIG-TRAIN-DISPLAY-SNAPSHOT
brief: e0cf19f8
verdict: blocked
evidence: lanes/L-MIG-TRAIN-DISPLAY-SNAPSHOT/{retention-grounding.md,probe-output.txt,probe.cs}
needs: +D-TRAIN-ERASURE, +F-SQL-HEADROOM
log:
FINDING RE-PROVEN INDEPENDENTLY, executed not inherited. probe.cs writes a completion as "Kari Nordmann", edits the roster to "Kari Hansen", re-reads the SAME pack: documents identical apart from the subject line = True; "Kari Nordmann" survives anywhere in the reprint = False. Source confirmed at TrainingEvidenceService.cs:110 - DisplayName = person.DisplayName, resolved live per read, and the lookup still has NO store predicate.
STOPPED ON THE PERIOD, which the brief made the gate. All three permitted groundings measured, all three fail; details in retention-grounding.md.
1. THE SPEC LINE FORBIDS IT. Spec 13.5 verbatim: retention is "a documented product policy (default: retain, exportable), not a marketed legal duration - the module never claims a specific statutory retention period it has not confirmed with counsel." That is a written refusal, not a gap a lane may fill.
2. THE PERSONALLISTE PERIOD IS ANOTHER STATUTE. WorkforcePersonnelListRetention.cs grounds 3y6m in bokforingsforskriften 8-5-6, the BOOKKEEPING regulation governing the personalliste as a bookkeeping document. Training records are IK-mat/IK-alkohol/HMS (spec 13.2: matloven, internkontrollforskriften, alkoholloven). Carrying it across invents a period and attributes it to a statute that does not say it.
3. THE EVENTS/GROWTH TREATMENT HAS NO PERIOD. The shipped erasure (GrowthPrivacyRequestService, GrowthErasureShred) is request-driven crypto-shred. Nothing to copy.
THE RULING RESTS ON A FALSE PREMISE - the load-bearing finding. Its pro says the data "dies on a schedule, which is the answer the personalliste already gives one module over". The personalliste gives the OPPOSITE answer. RetainUntilUtc is a keep-until LOCK: the test is literally named The_retention_horizon_is_set_and_cannot_be_shortened and asserts a trigger REFUSES shortening it. And there is NO sweep - RetainUntilUtc is touched by exactly four non-test files, all writers/projections; nothing deletes; ParticipantDisplayName is never erased.
SO COPYING THE SHAPE WOULD SHIP THE DEFECT WITH A DATE NEXT TO IT: a frozen name, no erasure path, and a column that looks like it closed D-TRAIN-ERASURE without closing it. The ruling's own con - a sweep deleting from an append-only table is a NEW C1 EXCEPTION - is why the personalliste never built one.
TWO QUESTIONS MUST BE RULED, not one number: (a) what period on what authority, given 13.5 forbids asserting a statutory duration without counsel - if product-policy, 13.5 needs amending and the number needs a named owner; (b) what the horizon DOES at expiry - lock (personalliste semantics, defect stands) or delete (needs an explicit C1 exception, since the sweep must remove rows GuardAppendOnly and two triggers protect).
BUILT NOTHING, deliberately. The snapshot half alone creates personal data with no erasure path - the exact exposure the ruling was taken to cure - so half was worse than none.
CHAIN MEASURED, WRONG A FOURTH TIME: it is EIGHT, not seven. feature/restaurant-modules = 127 migrations; tip lane/mig-company-receivable @ 32c56fa4 = 135, ending 20260803090036_Meals_CompanyReceivableAccount. Verified by git ls-tree on both branches, not inherited.
MIG-28 IS THE NEXT FREE NUMBER (MIG-27 is the max across every branch ledger, held by lane/mig-company-receivable). NOT written into the ledger - nothing authored, so nothing claimed; it stays free. No THROW number needed; 50073 unverified because unneeded.
BASE MEASURED IN A CLEAN CHECKOUT: own worktree off 32c56fa4, Training 248/0/0 at Database!=SqlServer. Build 0 errors.
SQL TIER UNRUN AND UNRUNNABLE: five foreign containers hold 6.13 GiB of 7.653 (okam-lvsp-sql already at 79% of its own 1.562 cap). Started nothing, touched nothing, killed nothing. The exit criterion's SQL half is NOT claimed - but it was moot, since there was nothing to prove.
NO WRITES: nothing committed in either repo, no migration, no ledger edit, no OnModelCreating change, no production connection resolved. Worktree and branch removed clean; migration-author slot RELEASED.
END RETURN
```
