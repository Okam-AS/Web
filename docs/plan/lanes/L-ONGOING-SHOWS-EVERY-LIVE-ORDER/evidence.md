# L-ONGOING-SHOWS-EVERY-LIVE-ORDER — evidence

Measured against `lane/focustrap-teardown` @ `8ac6f63`, in the shared checkout
`/Users/svendaneel/okam/Web-modules`, which carried ~394 uncommitted paths belonging to other lanes
before this lane started. Nothing was committed, stashed or pushed.

## The defect

`pages/admin/ongoing.vue` bucketed its three columns with three hand-written status lists:

```
newOrders         x.status === 'Accepted'
processingOrders  x.status === 'Processing'
readyOrders       ['ReadyForPickup', 'ReadyForDriver', 'Served'].includes(x.status)
```

`core/enums/order-status.ts` has nine members. Two that a live order can hold — `DriverPickedUp` and
`OpenCheck` — were in none of those lists. An order in either state was returned by
`/orders/ongoing`, assigned to `this.orders` by `loadOrders()`, and then rendered in no column: not
visible, not counted, and not completable, because `Fullfør` is a button on the card.

`DriverPickedUp` is a labelled, live status — `plugins/global-mixin.js:140` renders it
*"Sjåføren er på vei"* and `pages/admin/orders.vue` lists it among the statuses it filters on.

## The placement, and why each status is where it is

`utils/admin/ongoing-columns.js` states the rule once, as a total table over the enum.

| status           | column       | primary action | why |
| ---------------- | ------------ | -------------- | --- |
| `OpenCheck`      | New          | none           | A check still open at the register. It is live and the venue must SEE it, but the POS owns its lifecycle until it is accepted; `startProcessing` on a check still being written would advance an order the register has not finished. Visible, cancellable, receipt readable; not advanceable. |
| `Accepted`       | New          | Neste          | unchanged |
| `Processing`     | Processing   | Neste          | unchanged |
| `ReadyForPickup` | Ready        | Fullfør        | unchanged |
| `ReadyForDriver` | Ready        | Fullfør        | unchanged |
| `DriverPickedUp` | Ready        | Fullfør        | **the defect.** Food has left with a driver; the order is still open and still has to be closed from this screen. `core/pinia/order.ts:127` already collapses this rung onto `ReadyForDriver` for the guest's progress bar, so this is the placement the rest of the estate had chosen. |
| `Served`         | Ready        | Fullfør        | unchanged |
| `Completed`      | *off board*  | —              | terminal; read on `/admin/orders` |
| `Canceled`       | *off board*  | —              | terminal; read on `/admin/orders` |

Two failure modes remain and BOTH ARE LOUD, which is the pairing that makes this non-recurring:

- a status added to `OrderStatus` and classified nowhere → `unclassifiedStatuses()` reds the suite;
- a status the backend returns that this build's `core` pin has never heard of → `columnForStatus`
  falls back to the New column with no action, so it is surfaced to a human, never dropped.

## Files

| path | change |
| --- | --- |
| `utils/admin/ongoing-columns.js` | new. The table, `columnForStatus`, `actionForStatus`, `ordersInColumn`, `unclassifiedStatuses`. |
| `pages/admin/ongoing.vue` | three computeds now call `ordersInColumn`; the three inline `:primary-action-button` expressions now call one `primaryActionLabel(order)`. |
| `test/ongoing-board-covers-every-live-status.test.js` | new. 10 tests. |
| `test/e2e/journeys/ongoing-board-live-statuses.spec.js` | new browser journey. |

`pages/admin/ongoing.vue` is SHARED with `F-KITCHEN-CLOCK-FREEZES-AFTER-LOGIN`, which had already
added `startLiveBoard()` / `stopLiveBoard()` to the same file in this checkout before this lane
started. The two edits are disjoint — that lane owns `mounted`/`beforeDestroy`/`closeLoginModal`,
this lane owns the computeds, the three template props and `primaryActionLabel`. Neither reverted
the other, but the file's `git diff` is BOTH lanes' work and must not be read as one lane's.

## Red first

`lanes/L-ONGOING-SHOWS-EVERY-LIVE-ORDER/red-before-fix.txt` — the suite against the unfixed board:
5 failed, 1 passed. The first failure names the two missing statuses:

```
    - Expected  - 2
    + Received  + 0
      Array [
        "Accepted",
    -   "DriverPickedUp",
    -   "OpenCheck",
        "Processing",
        ...
```

The one test that passed against the defect is the terminal-exclusion one, which is correct:
`Completed` and `Canceled` already rendered nowhere and still should.

`green-after-fix.txt` — 10/10 after the fix.

## Mutation proof

`lanes/L-ONGOING-SHOWS-EVERY-LIVE-ORDER/mutation-proof.txt`. Three mutations, each restored:

1. `DriverPickedUp` deleted from the table → **5 failed**, including the enum-totality guard and the
   completability test.
2. `DriverPickedUp` moved to the off-board list — classified, but hidden → **5 failed.** The
   totality guard stays green here, which is the point: an explicit exclusion cannot be used to hide
   a live status, because the DOM presence tests still red.
3. `OpenCheck` deleted from the table → **1 failed**, the totality guard only. The unknown-status
   fallback keeps the card on screen, so the runtime stays non-silent and the classification gap is
   still named by the suite. This is the designed division of labour between the two guards.

Baseline re-run after each restore: 10/10.

## Browser evidence

`artifacts/journeys/ongoing-board-live-statuses.playwright.json` — status `passed`, 0 failed
requests, 4 steps:

```
1. sign in and land on the live orders board -> /orders/ongoing answered with 16 live orders
2. THE COUNT. Every order the API sent is drawn somewhere -> 16 orders sent, 16 cards drawn, same ids
3. the two statuses that used to render nowhere are on screen -> DriverPickedUp -> "Klar"; OpenCheck -> "Nye"
4. the order out with a driver can be completed from this screen -> #9015 offers Fullfør; #9016 offers no advance button
```

**Browser red arm**, fresh compiler on its own ports (3904/4904, `CI=1` so no server is reused across
the mutation): with the board mutated back to its five-status bucketing the same journey FAILS, and
the diff is exactly the two ids —
`lanes/L-ONGOING-SHOWS-EVERY-LIVE-ORDER/browser-arm-red.txt`:

```
    @@ -11,8 +11,6 @@
        "1014",
    -   "9015",
    -   "9016",
      ]
```

Every arm ran on its own port pair with `CI=1`, so each got its own `nuxt dev` — ports used by this
lane: 3903/4903, 3904/4904, 3905/4905, 3906/4906, 3907/4907, 3908/4908, 3909/4909, 3911-3913 /
4911-4913, 3921/4921, 3922/4922. All released. 4010, 4971 and 4973 are foreign fixture servers and
were never touched.

## A shared fixture was tried and REVERTED

The first version of the journey seeded the two orders into `test/e2e/fixture/world.js`
(`ONGOING_ORDERS`, appended so the fourteen `Accepted` ones were untouched). That broke
`modal-estate-scroll-lock.spec.js` — it scrolls the ongoing board to a fixed anchor and asserts the
page is held within two pixels, and two more cards moved the document under it (held at 986 where
900 was expected). `test/e2e/fixture/world.js` was restored to exactly its prior content; the diff
it still carries is another lane's second-venue work, and `git diff` on it now contains zero
occurrences of `DriverPickedUp`, `OpenCheck`, `ongoingOrder`, `Bord 4` or `Gjest på vei`.

The journey now injects the two orders at the WIRE with `page.route`, fetching the fixture's own
answer and appending to it, so no other journey sees anything change.

## `modal-estate-scroll-lock.spec.js` is FLAKY — not a regression from this lane

While checking the above, the journey failed in some runs and passed in others on the SAME tree:

| run | tree | selection | result |
| --- | --- | --- | --- |
| 3908 | world restored, this lane's change present | with 2 siblings | FAIL, held at 985 |
| 3909 | world restored, this lane's change present | with 1 sibling | FAIL, held at 985 |
| 3911-3913 | world restored, this lane's change present | alone | PASS ×3 |
| 3921 | this lane's `ongoing.vue` change surgically reverted | with 1 sibling | PASS |
| 3922 | world restored, this lane's change present | with 1 sibling | **PASS** |

3909 and 3922 are identical configurations with opposite results, so the journey is flaky rather
than sensitive to this change. With fourteen `Accepted` orders this lane's bucketing produces a
byte-identical board — all fourteen resolve to the New column with the `Neste` label, exactly as the
hand-written list did.

LIKELY MECHANISM, offered as a lead and not as a finding: the failing step scrolls to 900, waits
250ms, presses Kvittering, waits 400ms and reads `scrollY`. `ongoing.vue` reassigns `this.orders`
every 7 seconds from `startAutoRefresh()`, which re-renders every card. A refresh landing inside that
window relays the board out from under the anchor, and ~85px is the right order of magnitude. It
depends only on where in the 7s cycle the journey happens to be, which is why selecting a second
spec — and thus shifting the start time — changes the outcome.

## Suites

- `npx jest --coverage=false`, `TZ=Europe/Oslo`: **135 suites, 3088 tests, 0 failed.** The earlier
  run in this lane saw `test/delivery-save-failure.test.js` red with 14 failures; that is a sibling's
  untracked file against their own modified `pages/admin/delivery.vue`, and it went green on its own
  while this lane ran. Nothing in this lane touches it.
- `npx eslint` on all five touched paths: clean.

## Adjacent finding, NOT fixed here

**Five `.vue` files cannot be imported by any jest test on this branch.** `vue-jest` transpiles
render functions with buble (`vue-template-es2015-compiler`), which cannot parse optional chaining,
so a template containing `?.` throws `SyntaxError: Unexpected token` at import time and takes the
whole suite file with it:

```
components/molecules/ReceiptModal.vue         order.user?.phoneNumber      (1:1472)
components/onboarding/OnboardingProductImages.vue                          (2:133)
pages/admin/offers.vue                                                     (1:15429)
pages/admin/products.vue                                                   (2:922)
pages/admin/wolt-menu.vue                                                  (1:905)
```

Found by compiling all 322 `.vue` files through the same pair vue-jest uses. This is why
`/admin/ongoing` had no unit test to catch the defect at all: the page imports `ReceiptModal`. This
lane works around it with a module-level `jest.mock` of that one component, recorded in the test's
header rather than left silent. The real fix is one of: drop `?.` from those five templates, or
replace the buble transpile step.

## Not touched

`test/e2e/support/admin.js` (31 journeys share it), `jest.config.js`, `core/` (a submodule; the enum
is read, never edited), `translations/*`, any container, any branch. No migration was authored. No
secret, token or credential reaches a log call in any file this lane wrote.
