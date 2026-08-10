```
RETURN: L-WOLT-SYNC
brief: 0382149c
verdict: built
evidence: lanes/L-WOLT-SYNC/evidence.md
log:
Neither registered nor deleted, per D-WOLT. lane/wolt-sync-unregistered @ 3c7b28ee off 569887a5.
Re-measured myself over all 2977 commits from every ref: `git log --all -G "AddHostedService.*Wolt"` hits one commit, the one that ADDED
the sweep (its own prose); `-G "HostedService.*WoltMenuSync"` nothing. File added 2025-10-14, never touched since; it has never ticked.
Tree says it at the class and at the sweep entry (RULING OWED -> RULED leave-as-is, D-WOLT 2026-08-03, reopen condition verbatim). The
sweep's stale-entry failure printed keys only and said "remove the entry" - wrong for a ruled park - so it now prints key WITH reason.
The check asks the composition root, not the source: invokes Program.AddServices on a throwaway ServiceCollection, reads descriptors,
names the type with typeof (rename or delete breaks compilation). No provider and no host is built anywhere, so it cannot start the loop
it guards. 5 facts: the claim, a factory-opacity precondition, vital signs, an in-suite positive control over 5 registration spellings,
and a completeness alarm against the source scan.
Registered it, watched red (2 fail), unregistered, watched green (16/16). Via a GENERIC HELPER the existing sweep stays 11/11 GREEN and
only the new guard reds - that gap is the point. Fast tier 4634/0/12, no container started, trait filter.
FINDING: a full run still dirties artifacts/journeys/ev-dietary/* here; the fix b10eb11c is on lane/dated-test-output only, NOT an
ancestor of 569887a5. Restored, uncommitted. feature/restaurant-modules advanced to b140ddc0 mid-lane, not by me; its 8 files are
disjoint from my 3, so this merges forward clean.
END RETURN
```
