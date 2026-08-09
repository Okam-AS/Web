```
RETURN: L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ
brief: bae5a70b
verdict: built
evidence: lanes/L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ/{baseline.trx,mutation-a.trx} - executed=9 in both, passed 9/0 then 4/5
log:
FINDING: StoresWithheld IS BOUNDED, and here is the line. It is not a counter that grows - it is a per-run subtraction, recomputed on a fresh EventsDrainOutcome every drain.
EventsNotificationDrainService.cs:122 reads StoresWithheld = dueStores.Count - dispatchableStores.Count, and dispatchableStores is built by filtering dueStores, so it is a subset by construction.
The bound is therefore 0 <= StoresWithheld <= dueStores.Count, and dueStores is a DISTINCT over StoreId, so it is bounded by fleet size, never by the number of queued rows.
It is also TESTED - a separate claim, kept separate: EventsDispatchStoreLeverTests asserts the value at six call sites.
FALSIFIED, not assumed. MUT-A replaced the subtraction with a constant 0, so the counter never reports a withholding. Five of nine arms red.
Named from the trx: One_stores_switch_does_not_release_another_stores_queue, A_stores_own_switch_drains_its_queue_while_the_fleet_default_is_off, A_dark_module_is_never_refined_on_by_a_dispatch_row,
A_promoted_fleet_keeps_dispatching_and_a_store_can_still_switch_itself_off, and A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on.
EXECUTED-TEST COUNT, as the rule requires: baseline executed=9 passed=9 failed=0; under MUT-A executed=9 passed=4 failed=5. The count is unchanged, so this is a real kill, not a void run.
THE SEPARATE FINDING, worth its own lane: the COUNTER is bounded, the BACKLOG IT COUNTS IS NOT. A withheld store's rows are left as found - no expiry, no max age, no cutoff in that outbox.
That is deliberate, stated at EventsNotificationDrainService.cs:132-134: switching a store on should deliver the backlog rather than find it spent. A retention choice with no ceiling.
It is the same shape as the workforce backlog bound that landed earlier today, but the reasons differ, so it wants its own lane rather than the same fix copied across.
I did NOT widen into the workforce dispatcher. I read its two sites only where this file's own comment cites them by name to contrast the ordering.
Ordering note worth keeping: the switch is resolved BEFORE the batch is taken, because filtering an already-drawn batch would let one dark store's backlog starve a switched-on neighbour.
Nothing repaired. Both mutations restored from a file copy, trunk unmoved at ada218783, backend 0 dirty, worktree removed, run-sheet.json and run-sheet.md restored, nothing pushed.
Two honesty notes: the brief names the trunk bcfe0d893 and it is ada218783. The gate read 21.20 as MUT-A ran, inflated by my own build; I stopped rather than run a second mutation.
END RETURN
```
