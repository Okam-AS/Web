# FINDING — `EventsDrainOutcome.StoresWithheld` is bounded, and the bound is asserted

Written by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
This is the **written finding** the lane's exit asks for. It did not exist: the lane's evidence line named
two `.trx` files, and a trx names no bound and no mutation. Reason-shape: **missing write-up** (the run
happened, nobody wrote it down).

**The evidence line as the original agent recorded it, preserved here because `plan verify` overwrites it:**

    lanes/L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ/{baseline.trx,mutation-a.trx} - executed=9 in both, passed 9/0 then 4/5

Both trx are copied into this directory (`baseline.trx`, `mutation-a.trx`) so the citation survives a
`git worktree prune` and a `git clean`.

## 1. Does `StoresWithheld` have a bound? Yes, and here is the line.

`Services/Events/EventsNotificationDrainService.cs:122`, read out of the trunk with
`git show 6d5328004:Services/Events/EventsNotificationDrainService.cs`:

```csharp
outcome.StoresWithheld = dueStores.Count - dispatchableStores.Count;
```

It is **not an accumulator**. It is a per-run subtraction, written onto a fresh `EventsDrainOutcome` on
every drain pass. `dispatchableStores` is built at :113–121 by iterating `dueStores` and appending the
entries whose store flag is on, so it is a **subset of `dueStores` by construction** — not a parallel query
that could return an unrelated set.

Therefore:

    0 <= StoresWithheld <= dueStores.Count

and `dueStores` is `EventsNotificationOutbox.Where(duePredicate).Select(o => o.StoreId).Distinct()` — a
DISTINCT over store id. **The bound is fleet size (tens), never the number of queued rows.** A store with
ten thousand withheld notifications contributes 1.

## 2. Does any arm red when that bound is broken? Yes — five of nine.

**Mutation named: MUT-A — replace the subtraction at :122 with a constant `0`**, so the counter can never
report a withholding (`StoresWithheld` pinned to its lower bound). Applied, run, restored from a file copy.

| run | executed | passed | failed | artifact |
|---|---|---|---|---|
| baseline (unmutated) | **9** | 9 | 0 | `baseline.trx` |
| MUT-A applied | **9** | 4 | **5** | `mutation-a.trx` |

**The executed count is identical in both runs (9), which is what makes this a kill and not a void run** —
the standing trap in this program is a mutation that "reds nothing" because the run executed nothing.

The five arms that went red, by name from `mutation-a.trx`, all in
`WebApi.Tests.Events.EventsDispatchStoreLeverTests`:

1. `One_stores_switch_does_not_release_another_stores_queue`
2. `A_stores_own_switch_drains_its_queue_while_the_fleet_default_is_off`
3. `A_dark_module_is_never_refined_on_by_a_dispatch_row`
4. `A_promoted_fleet_keeps_dispatching_and_a_store_can_still_switch_itself_off`
5. `A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on`

**What the message said** — the same shape in all five, e.g. for
`One_stores_switch_does_not_release_another_stores_queue`:

```
Assert.Equal() Failure
Expected: 1
Actual:   0
```

**Why five and not six.** `git show 6d5328004:WebApi.Tests/Events/EventsDispatchStoreLeverTests.cs |
grep -n StoresWithheld` returns **six** assertion sites — lines 48, 59, 129, 172, 196, 222. Five of them
assert `Equal(1, …)` and die under a constant 0; the sixth, line 59, asserts `Equal(0, released.StoresWithheld)`
and is **satisfied by the mutant**, because a released pass withholds nothing anyway. So the 4/5 split is
exactly what a constant-0 mutant predicts, and the one survivor is a case the mutation cannot distinguish
rather than an unmeasured arm. Restored green: `baseline.trx`, 9/9.

## 3. The separate finding, kept separate: the counter is bounded, the backlog it counts is not.

A withheld store's rows are **left exactly as found** — no expiry, no maximum age, no cutoff anywhere in
`EventsNotificationOutbox`. This is deliberate and stated in the source at
`EventsNotificationDrainService.cs:132-134`:

> A withheld store's rows are never selected, so they are LEFT EXACTLY AS FOUND — status, attempt count and
> next-attempt time untouched, nothing deleted. Switching the store on therefore delivers the backlog that
> accumulated rather than finding it spent.

That is a **retention choice with no ceiling**, and it is the same shape as the workforce backlog bound
that landed separately — but for different reasons, so it wants its own lane rather than the same fix
copied across. Recorded here, not repaired here.

**Ordering note worth keeping** (source comment at :98–107): the switch is resolved **before** the batch is
taken, because filtering an already-drawn batch would let one dark store's backlog starve a switched-on
neighbour. `WorkforceNotificationDispatcher` has the other shape.

## What this finding does not claim

- No SQL tier was run and no container was started; the nine arms are the container-free tier.
- The trunk named in the original RETURN was `ada218783`; the line, the six assertion sites and the comment
  text above were **re-read at trunk `6d5328004`** for this write-up and are unchanged there.
- Nothing was repaired. This lane reads a counter; it does not bound the backlog.
