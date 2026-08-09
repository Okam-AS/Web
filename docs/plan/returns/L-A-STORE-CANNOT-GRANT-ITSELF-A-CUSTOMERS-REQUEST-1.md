```
RETURN: L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST
brief: ceea8589
verdict: built
evidence: backend feature/restaurant-modules ada218783 -> 28e60e6b8; lanes/L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST/{arms-clean.trx,arms-inverted.trx,tier.trx}
log:
THE CONSEQUENCE SENTENCE, written before the test: a customer cancelling their own order would be recorded and reported as the store cancelling it.
Order.CanceledByStore is persisted at OrderService.cs:816 and is what the order view prints and what store-cancellation statistics count.
DineHomeService.cs:132 then sends rejected_reason "Canceled by outlet" instead of "Canceled by customer", and OrderService.cs:918 tells Wolt Marketplace the restaurant could not fulfil.
Two of those three records live in systems this estate does not own and cannot retract, which is what makes this pin money rather than a boolean. C4 attribution, on an order write.
LANDED: trunk ada218783 -> 28e60e6b8, tier 5108 passed, 0 failed, 11 skipped, 5119 total - exactly +2 on the 5106/5117 baseline. WebApi.dll mtime moved.
THE ARM REDS ON INVERSION. Removing the ! from the requested-by-store comparison reds BOTH arms: executed=2 passed=0 failed=2, against executed=2 passed=2 failed=0 clean.
The executed count is identical across the two runs, so this is a real kill and not the void-run signature the rule warns about.
Named from the trx: A_customer_cancelling_their_own_order_is_not_recorded_as_the_store_cancelling_it and A_caller_who_is_not_the_orders_customer_is_recorded_as_the_store.
BOTH readings are pinned on purpose. With only the first arm, an inversion making every cancellation the customer's would still pass - the field is two-valued and one arm cannot see both ways.
I did NOT rewrite the decision to fail closed. The comparison is exactly as it was; only the suite changed, and the class comment says why a repair is a separate lane.
Confirmed unguarded before this: every existing CanceledByStore assertion is on a POS or Meals path - CheckSplit, OpenCheck, TableService, PosDiscountVoid, MealsFundedCheckout - none on UpdateStatus.
Three harness facts found by running, not reading: Order.UserId is a foreign key so the customer must be seeded, ApplicationUser has no parameterless ctor, and cancelling calls IPaymentService.
THE TRUNK WAS CHECKOUT-HELD, so git branch -f correctly refused. The main checkout sat clean at my merge base, so I fast-forwarded it there, re-reading the ref in the same command.
That is non-destructive by construction: --ff-only refuses if the trunk moved, and there was no uncommitted work to lose. I did not reset anyone's checkout.
Nothing pushed - origin is at ada218783, put there by someone else, and no remote branch contains 28e60e6b8. Run-sheets restored, worktree removed, backend 0 dirty.
END RETURN
```
