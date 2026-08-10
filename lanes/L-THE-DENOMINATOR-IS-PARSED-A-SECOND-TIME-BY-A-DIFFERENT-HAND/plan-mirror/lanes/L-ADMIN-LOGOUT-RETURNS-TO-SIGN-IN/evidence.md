# L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN — evidence

Base: `lane/focustrap-teardown` @ `8ac6f63` (the shared checkout's HEAD), reproduced in a private
worktree. Nothing committed, nothing pushed, no container started or touched.

## The two questions the brief asked to answer before changing anything

### 1. What does `Logout()` clear, and was the hard reload carrying part of the teardown?

**It was not.** Traced whole:

- `AdminPageHeader.logout` → `AdminUserService.Logout()` (`plugins/admin-core-services.js:64-66`)
  → core `UserService.Logout(notificationId, clearState)` (`core/services/user-service.ts:73-78`),
  which deactivates a push notification if given one (the admin passes none) and calls
  `clearState()`.
- `clearState` dispatches `ClearState` (`store/index.js:53-57`): `ClearCurrentUser` (currentUser =
  `{}`), `SetCarts []`, `SetOrders []`.
- `plugins/global-mixin.js:67-71` subscribes to **every** mutation and writes the whole state to
  `localStorage['state']` — so the cleared session is persisted on the same tick, with no reload.
- Every service is rebuilt per property access from `_coreInitializer`, whose `bearerToken` reads
  `$store.state.currentUser.token` live (`plugins/global-mixin.js:194-207`). The moment the store is
  cleared, every service in the app is already tokenless. There is no cached client to discard.
- The other thing a reload discards is component state. Checked all six admin pages with a
  `setInterval` on the sign-out path (`ongoing`, `kitchen`, `kam`, `goods`, `offers`,
  `reservations`): **every one clears its timers in `beforeDestroy`**, which a route change runs.

What the reload did **not** clear either, and still does not: `selectedAdminStore`,
`selectedAdminStoreName`, `adminLocale`, `adminSidebarCollapsed`. Those are read back out of
localStorage on `Load`, so a reload restored them identically.

### 2. Is `/admin` — the destination `AdminPage.vue` already redirects to — safe to route to?

Yes, and specifically the **bare** path. `/admin?redirect=…` is the form
`F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END` names: `closeLoginModal` answers a redirect query with
`$router.replace` and never emits `login-success`. The bare path takes the emitting branch, and
`pages/admin/index.vue:2` is `<AdminPage @login-success="handleLoginSuccess">`. It is also the one
admin page that mounts **no LoginModal of its own** (checked: 13 pages do; `admin/index.vue` is not
among them), so nothing stacks on the shell's — the other half of `F-LOGINMODAL-MOUNTED-TWICE`.

## The change

Three files, 48 insertions.

- `components/organisms/AdminPage.vue` — a `watch` on `userIsLoggedIn`. When a session that existed
  ends, the shell shows its sign-in and, if the visitor is not already on `/admin`, `replace`s there.
  This is the single policy point: it also covers the 401-driven `ClearState` in
  `AdminUserService.Reload`, not just the button.
- `components/organisms/AdminPageHeader.vue` — `logout()` clears the session and navigates nowhere.
- `components/organisms/AdminPageFooter.vue` — same. That button is currently unreachable (the
  footer renders only when `!userIsLoggedIn`, the button only when `userIsLoggedIn`) but carried the
  identical `window.location.href = "/"`.

## Browser proof — two arms, a fresh compiler each

Ports **3917** (my dev server) against the owner's live API on 5971, read-only. Neither 3971 nor
5971 was bound by me. Store admin `+4799681931` of store 1 "Two Humans Kafé" in the live world
`OkamLiveTwoHumans`; the committed demo pair `+4799999999` has an **empty `adminIn`** in this world
and is bounced to `/registrer` by the membership guard, so it cannot walk this journey.

Exactly one URL is typed per arm — the entry at `/admin`. Everything after is a click.

| | landed on | sign-in offered | SPA survived | signed back in without typing a URL |
| --- | --- | --- | --- | --- |
| **stock** | `/` | **false** | **false** (hard reload) | **false** |
| **fixed** | `/admin?storeId=1` | **true** | **true** | **true** |

- `arm-stock/2-after-signout.png` — the consumer storefront: hero, app-store badges, "Om oss / Wolt
  / Priser / Kontakt / Sett opp din restaurant / Bestill mat" and **no link to `/admin`**.
- `arm-fixed/2-after-signout.png` — "Logg inn — Okam Admin Web Portal", phone field, Send kode.
- `arm-fixed/3-signed-back-in.png` — the dashboard, reached by clicking only.

**The blank white screen did not reproduce here.** On this world the storefront renders correctly
(see the stock screenshot). The defect this lane closes is the *destination*, which reproduced
exactly: a customer landing page with no route back. Whatever makes that page die client-side in the
owner's world is a separate measurement and is not touched by this diff.

### Two console errors, both pre-existing, both proven so

`?storeId=1` on the landing URL and the `401 … Error loading special opening days` come from
arriving at `/admin` signed-out with a stale `selectedAdminStore`, not from this diff:

- `AdminPageHeader`'s root is `v-if="userIsLoggedIn"`, but the **component still mounts** for an
  anonymous visitor — only its output is empty. Its `mounted()` runs `syncQueryStoreIfMissing()` →
  `updateQueryStore()` → `$router.replace({ query: { storeId } })`. Traced by patching
  `$router.replace` in the live page (`who-adds-storeid.playwright.js`) and reading the stack.
- The stock arm's CONTROL leg types `/admin` as a signed-out visitor on the **unfixed** build and
  gets the identical `/admin?storeId=1` and the identical two errors (`arm-stock/walk.txt`).
- The `Navigation cancelled` pageerror is timestamped at **+0.9s, during the first sign-in**, on
  both arms — before any sign-out. It is the header's storeId sync racing itself.

Neither harms this path: the landing URL has **no `redirect` query**, so `closeLoginModal` still
takes the emitting branch, and `initAuth`'s `path !== "/admin"` check is false so it adds none.

## Suites

- `test/admin-logout-destination.test.js` (new, 7 tests). On the unfixed three files: **6 red**. With
  the fix: **7 green**. The one green-on-both is the deliberate negative control (an anonymous
  visitor whose session never existed must not trigger the watcher).
- Full jest: **2594 passed, 2 failed, 2596 total, 114 suites**. Both failures are
  `journey-artifact-store.test.js` asserting `/^Web-modules@/` on the checkout **directory name** —
  mine is a worktree named `agent-…`. Same two reds a sibling lane reported. Zero references to this
  diff.

## Named and not taken

- `AdminPage.initAuth` reads `currentUser?.adminIn` **after** `await Reload()`. If the session ends
  inside that window it navigates to `/registrer`. A mount-time race, pre-existing, and the reason
  the unit test settles the shell before ending the session.
- The storefront still links nowhere to `/admin`. This diff removes the storefront from the sign-out
  path entirely, so the operator no longer needs that link — but a person who reaches `/` any other
  way still has no route in.
- `pages/registrer.vue:541` and `components/atoms/MyUserDropdown.vue:71` also call `Logout()`.
  Neither renders inside `AdminPage`, so neither is covered by the watcher, and neither is an admin
  surface. Left alone.

## Disclosure — I stopped the owner's dev server and restarted it

Restarting my own compiler between arms, I ran `pkill -f "nuxt-ts"`, which matched the owner's
process on **:3971** as well as mine. I restarted it within roughly four minutes, from
`/Users/svendaneel/okam/Web-modules` with `API_BASE_URL=http://127.0.0.1:5971 PORT=3971`; it
recompiled clean and `/admin` answers 200. The API on 5971, `okam-lwtwo-sql` and `okam-lwtwo-redis`
were never touched. Every kill after that was by PID resolved from my own port. No file in that tree
was edited except this lane's RETURN.
