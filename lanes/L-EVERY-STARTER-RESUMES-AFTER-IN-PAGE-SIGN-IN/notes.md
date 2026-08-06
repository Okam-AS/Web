# L-EVERY-STARTER-RESUMES-AFTER-IN-PAGE-SIGN-IN

Base: `ff497c0` (trunk `feature/restaurant-modules`). Branch `lane/every-starter-resumes`.

## The defect, precisely

Both pages return early from `mounted` for a signed-out visitor and both are reachable by one
(`AdminPage.initAuth` skips its bounce to `/admin` when a `redirect` query is already set —
AdminPage.vue:99 — which is the URL the post-login return path itself produces). Both bound the
shell's `login-success` to the LAST line of their own starter list instead of the whole of it.

| page | `mounted` after the guard | `@login-success` was bound to |
|---|---|---|
| `pages/admin/orders.vue` | `adminStores` ← session; `selectedStoreIds` ← saved subset **or** all of them; `fetchOrders()` | `fetchOrders()` |
| `pages/admin/statistics.vue` | `adminStores` ← session; `selectedStoreIds` ← all of them; `loadStatistics()` | `loadStatistics` |

`adminStores` left empty is not cosmetic on either page, and neither page reports anything wrong:

* the store picker on both is `v-if="adminStores.length > 1"`, so it is not rendered — the operator
  has no control with which to widen the selection back;
* `selectedStoreIds` stays `[]`, and both pages send it to the server as the store filter —
  `fetchOrders` as the sixth argument of `GetAllOrdersWithPagination`, `loadStatistics` as `storeIds`
  on each of its five requests. The server is asked about no stores and answers with nothing.

On screen: an operator with no stores, no orders and no turnover — indistinguishable from one who
genuinely has none.

## The fix

The shape the landed `L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN` lane used: ONE starter method per
page, run by `mounted` and bound to `login-success`, so a starter added later cannot be added to
only one path.

* `orders.vue` → `startOrdersView()`
* `statistics.vue` → `startStatisticsView()`

One deliberate exclusion, commented in place: `orders.vue`'s `loadSettingsFromLocalStorage()` stays
in `mounted` ABOVE the guard rather than moving into the starter. It depends on no session and has
already run by the time a sign-in arrives; re-running it on `login-success` would overwrite any
filter the visitor adjusted while the modal was over the page (there is a test for that).

## Proof

`test/orders-and-statistics-resume-after-login.test.js` — 11 tests. Nothing asserts a handler was
called. The sign-in is raised as the `login-success` EVENT on the shell stub, so it travels each
page's own template binding, and the service fakes filter by `storeIds` the way the server does, so
an empty `adminStores` shows up as an empty screen rather than as an unread field.

Includes a reachability section (the `redirect`-query exception that makes these handlers live code
rather than dead code) and a fresh-mount comparison: mounting for an already-signed-in operator is
the reference, and signing in on the page must land on the same `{adminStores, selectedStoreIds}`.
That reference moves on its own if a starter is added later.

### Mutation check

`node lanes/L-EVERY-STARTER-RESUMES-AFTER-IN-PAGE-SIGN-IN/mutate-bindings.probe.js`
→ `mutation-run.txt`. Four mutations, each applied alone and then restored; two of them put back the
exact binding that shipped the defect.

```
BASELINE — fix in place                                     11 passed
orders:     login-success back to the SHORT handler          4 failed, 7 passed
orders:     login-success bound to nothing at all            4 failed, 7 passed
statistics: login-success back to the SHORT handler          3 failed, 8 passed
statistics: login-success bound to nothing at all            3 failed, 8 passed
RESTORED — fix back in place                                11 passed
VERDICT: every mutation is caught — no surviving mutant.
```

The probe reads BOTH stdout and stderr. Jest writes its whole reporter output to stderr even on a
green run, and a stdout-only read reported the two green anchors as "suite did not run" while the
mutants still looked convincing — i.e. the probe's own check of itself was the part that was broken.

## Estate sweep — no fifth page

Every `@login-success` binding under `pages/` and `components/` was read, and every admin page that
guards on `userIsLoggedIn` without one. The seven pages with a guard and no binding are NOT this
defect:

* `goods.vue`, `wrapped.vue` — `$router.push('/admin')`, so they never render for a signed-out
  visitor and there is nothing to half-restart;
* `payment.vue`, `reward-members.vue`, `settlements.vue`, `terminals.vue`,
  `wolt-drive-invoice.vue` — recover through a `watch` on `userIsLoggedIn`/`selectedStore`, which
  fires when the session arrives.

This confirms the reviewer's F3 scoped the defect correctly at exactly two pages.

## Suites

* full jest suite on this branch: 145 suites, 3203 tests, all green.
* eslint on the two pages: 52 errors before, 52 after — no new error. Two new
  `space-before-function-paren` warnings, one per new method, matching the existing style of every
  other method in both files.

## Not covered by this lane (C5)

C5 says acceptance is a person completing the journey. This lane's exit criterion is state-driven
and met, but nobody has walked it. The journey to walk is: sign out, open
`/admin/orders?redirect=%2Fadmin%2Forders` (and the same for `/admin/statistics`), sign in in the
modal that appears over the page, and confirm the store picker and the operator's own data are
there without a reload.
