# Can anything create a store whose minimum-order amount carries øre?

Measured 2026-08-06. Web-modules read at `lane/focustrap-teardown` `8ac6f63` **working tree** (the
shipped tip was not measured; the tree carries ~394 uncommitted paths belonging to other lanes).
OkamAPI read **by object** at `feature/restaurant-modules` `8e2b57de` from the clone at
`/Users/svendaneel/okam/OkamAPI-modules` — that clone's working tree is on a foreign lane's branch
`lane/meals-grace-pins` `34c6c10` and **nothing was checked out there**; every read was
`git show <sha>:<path>` / `git grep <sha>`.

## The column

`Entities/Store/Store.cs:108` — `public int MinimumOrderPriceForHomeDelivery { get; set; }`.
A signed 32-bit integer of **øre**. Introduced by `Migrations/20210502042752_HomeDeliveryMinimumOrderAmount`.
No check constraint, no multiple-of-100 constraint, no non-negative constraint anywhere in the chain.

## Every writer in the estate

| Writer | Where | What it can write |
|---|---|---|
| `StoresController.SetMinimumAmountForDelivery(int storeId, int amount)` | `Controllers/StoresController.cs:563-570` | **any int**, assigned straight to the column: `store.MinimumOrderPriceForHomeDelivery = amount`. No rounding, no validation. Gated by `AuthenticateStoreAdmin`. |
| `pages/admin/delivery.vue` (this repo) | one `SetMinimumAmountForDelivery` call site | before this lane: `parseInt(kroner) * 100` — multiples of 100 only |
| `Web/pages/admin/delivery.vue` | the other Nuxt admin | same shape, `kronerToOre` — multiples of 100 only |
| `AdminApp/app/views/pages/DeliveryMethods.vue:318` | the **native** admin app | `parseInt(this.localMinimumAmountForDelivery) * 100` — multiples of 100 only, and it floors on read at `:255` exactly as this page did |

Searched and found **nothing**: no migration seeds the column (every non-Designer hit is the one
`AddColumn`), no script under `Scripts/` mentions it (`Scripts/FromProdToTest.sql` does not), no
importer, no partner or POS integration, no Wolt/Dintero/Vipps path, no demo seed
(`Scripts/demo/seed-*.sh`).

## Conclusion, plainly

**No automated writer in the estate can produce an øre-carrying minimum.** All three admin clients
multiply whole kroner by 100. That is why one reader could not reproduce the defect.

It is not unreachable, though, and the difference matters:

1. The route accepts any integer and validates nothing, and the repo **ships a request template for
   exactly that route** at `Bruno/Okam API/stores/-stores-{storeId}-minimumamountfordelivery-{amount}.bru`
   (`url: {{base_url}}/stores/1/minimumamountfordelivery/100`). A support engineer following the
   collection types the amount by hand.
2. A hand-edited row.

So the honest shape of the fix is a field that can **show what the column can hold**, not a
constraint pretending it cannot hold it. A constraint would additionally be the wrong instrument
here: it would have to be added to a route whose only production callers already satisfy it, and it
would leave every already-stored value invisible.

## What the setting gates (C4 context)

`Services/CartService.cs:256` —
`var minPrice = cart.IsHomeDelivery() ? cart.Store.MinimumOrderPriceForHomeDelivery : MinimumOrderPrice;`
and on the next lines `response.PriceTooLowError = ... cartModel.Calculations.ItemsAmount < minPrice`.
So this number decides whether a guest's home-delivery cart may be ordered at all. An operator
reading `150` off a store set to `150,50` cannot explain a guest refused at `150,25` — and, before
this lane, could not correct it from any UI either.

## The consequence the previous lane's fix left behind

`L-SETTINGS-SAVES-REPORT-FAILURE` made the dirty check put **both** sides through the field's
representation, which correctly stopped the rounded write. But that representation was still the
floor, so with a stored 15050 the operator who types `150` — intending to actually set 150 kr —
gets `15000 === 15000`, no change detected, and **no Save button**. The øre could not be removed
from this page at all. Pinned by
`test/delivery-minimum-ore.test.js` → "the øre can be cleared, which is the correction the floored
field made impossible".
