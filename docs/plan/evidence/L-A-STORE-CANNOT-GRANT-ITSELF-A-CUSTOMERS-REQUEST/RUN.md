# L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST — the mutation record, on a durable path

Reason-shape hit: **(1) missing write-up — the run happened and nobody wrote it down**, compounded by the
receipts being committed to no ref in either repo. The census
(`docs/plan/artifacts/instrumentless-exits.md`, Batch 5) measured it exactly:

> `lanes/L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST/{arms-clean.trx,arms-inverted.trx,tier.trx}` are
> on this disk in the plan repo but `git status` reports the whole directory `??` … they are committed to no
> ref in either repo. … Committed nowhere, therefore openable by nobody.

Nothing here is a new run. The three `.trx` beside this file are byte-copies of the originals, moved from the
untracked `lanes/` directory onto the tracked `docs/plan/evidence/` path and force-added past the bare
`artifacts/` ignore rule. What was missing was the record and the commit; this is both.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line in `plan.md` with the single path it is
given:

```
evidence: backend feature/restaurant-modules ada218783 -> 28e60e6b8; lanes/L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST/{arms-clean.trx,arms-inverted.trx,tier.trx}
```

## The exit, clause by clause

> an arm reds when OrderService's requested-by-store decision is inverted, named from a trx with an
> executed-test count, and the non-SQL tier stays green

### Which mutation

`WebApi/Services/OrderService.cs:788` at trunk `6d5328004`:

```csharp
var requestedByStore = !string.Equals(user.Identity.Name, order.UserId, StringComparison.InvariantCultureIgnoreCase);
```

The mutation is the removal of the leading `!` — the inversion of the requested-by-store decision itself. The
decision is consumed one line further down at `OrderService.cs:816`
(`order.CanceledByStore = (requestedByStore && model.Status == OrderStatus.Canceled)`), at `:848`
(`SendPushNotification(order, requestedByStore)`), and reaches two systems this estate cannot retract from:
DineHome is sent `rejected_reason "Canceled by outlet"` and Wolt Marketplace is told the restaurant could not
fulfil.

### Which assertions went red, and what the messages said

Both arms of `WebApi.Tests.OrderCancellationAttributionTests`, read out of `arms-inverted.trx`:

| test | outcome | message |
| --- | --- | --- |
| `A_customer_cancelling_their_own_order_is_not_recorded_as_the_store_cancelling_it` | **Failed** | `a customer cancelling their own order must not be attributed to the store` / `Expected: False` / `Actual: True` |
| `A_caller_who_is_not_the_orders_customer_is_recorded_as_the_store` | **Failed** | `a cancellation by anyone other than the order's own customer is the store's` / `Expected: True` / `Actual: False` |

Both readings are pinned on purpose: the field is two-valued, and a single arm cannot see both ways — an
inversion that made *every* cancellation the customer's would still satisfy the first arm alone.

### The executed count, which is what makes this a kill and not a void run

Read from the `<Counters>` element of each file, not from prose:

| file | counters | `<Times>` finish |
| --- | --- | --- |
| `arms-clean.trx` | `total="2" executed="2" passed="2" failed="0"` | `2026-08-09T00:44:27.93+02:00` |
| `arms-inverted.trx` | `total="2" executed="2" passed="0" failed="2"` | `2026-08-09T00:45:02.72+02:00` |
| `tier.trx` | `total="5119" executed="5108" passed="5108" failed="0" error="0"` | `2026-08-09T00:52:47.11+02:00` |

`executed="2"` is **identical across the clean and the inverted arm run**. That is the fact that disproves
the void-run reading the trap warns about: a mutation that reds nothing because the run executed nothing
would show a collapsed executed count, and this does not. The two arm runs are 35 seconds apart, and the tier
follows both.

### Restored green

`arms-clean.trx` is the restored state, not a pre-mutation state that was never revisited: the lane's own
account records the `!` put back and `WebApi.dll`'s mtime moving, and the tier at `tier.trx` — 5108 passed,
0 failed, 11 skipped of 5119, run *after* both arm runs — is the restored tree measured whole. The delta on
the pre-lane baseline is exactly `+2`, which is the two new arms and no regression.

### Landed

`28e60e6b8` ("Pin who cancelled an order, before the decision that grants can drift") is an ancestor of the
backend trunk `6d5328004` — verified today with `git merge-base --is-ancestor`. The code and the pin are on
the trunk; only the receipts had not travelled with them.

## What this artifact does not claim

Nothing about an operator. C4 attribution on an order write is what the pin holds; C5 acceptance is a
separate gate and no part of it is asserted here. The lane deliberately did **not** repair the fail-open
comparison — it pinned both readings of the field so a repair cannot drift silently — and the class comment
in `WebApi.Tests/OrderCancellationAttributionTests.cs` says so.
