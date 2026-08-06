# L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN

Measured against `lane/focustrap-teardown` @ `8ac6f63`, which is this checkout's HEAD and **not** the
shipped tip. Divergence from the shipped branch is not assessed here; both target files were clean at
`8ac6f63` when this lane started **except** `pages/admin/ongoing.vue`, which carried uncommitted work
belonging to the live sibling `L-ONGOING-SHOWS-EVERY-LIVE-ORDER` (the `ordersInColumn` /
`~/utils/admin/ongoing-columns` refactor). That work is untouched here — see "Sharing ongoing.vue"
below.

## 1. Is the sibling lane already deleting this problem? No.

`lane/loginmodal-mounted-once` @ `0f88242` removes eleven duplicate per-page `<LoginModal>` mounts,
and both of my pages are among them. It is the right architecture and this lane does not repeat any
of it. But it does **not** fix either defect, because it carries the incomplete starter list forward
verbatim — its own comment says so:

```
+    // A session arrived while the board was sitting empty behind the shell's sign-in modal. These
+    // are the three things the page's own duplicate modal did on the same event, unchanged.
+    resumeAfterLogin () {
+      this.isLoading = true
+      this.refresh()
+      this.startAutoRefresh()
+    },
```

Still no clock, still no fullscreen listener. And for the board it wires `@login-success="loadOrders"`
— one method, so still no 7s poll, still no `adminStores`. The two lanes are complementary: the
sibling decides **who raises the modal**, this one decides **what a sign-in restarts**.

## 2. Reachability — established before the shape was chosen

`AdminPage.initAuth` bounces a signed-out visitor off every admin path **except** when a `redirect`
query is already present (`AdminPage.vue:99`), and that is exactly the URL the sign-in flow leaves in
the address bar. So `/admin/kitchen?redirect=…` and `/admin/ongoing?redirect=…` render for a
signed-out visitor, with a sign-in modal over them. Asserted in
`test/kitchen-and-board-resume-after-login.test.js` under "a signed-out visitor can be standing on
these pages": without the query the shell bounces (`/admin?redirect=%2Fadmin%2Fkitchen`), with it the
page renders and `showLogin` is true. These handlers are live code, not dead code.

## 3. The defects, as the cook and the counter see them

**kitchen** — `mounted` started a 1s clock into `this.now` and a `fullscreenchange` listener;
`closeLoginModal` restarted the fetch and the poll and neither of those. `this.now` then stayed at
the millisecond the screen was opened. `KitchenTicket.ageSeconds` is `(now - createdAt)` clamped at
zero, so every ticket sent **after** the screen was opened — on a kitchen display, every ticket —
read `0:00` for the rest of service and never went amber (8 min) or red (15 min). The red proof
prints it: nine minutes after the ticket was sent, `Received string: "schedule0:00"`.

**ongoing** — `closeLoginModal` called `loadOrders()` and nothing else, so the board showed the
snapshot taken at the instant of sign-in and never changed again; no order placed afterwards ever
appeared. `adminStores` was left empty by the same omission, which does not break transfer visibly —
it just offers nowhere to send the order.

## 4. The shape: one starter list per page, not three patched handlers

Both pages now have `startLiveBoard()` / `stopLiveBoard()`. `mounted` runs the list; the sign-in
handler runs **the same list**. There is no second copy to go stale, which is the mechanism that
produced both defects.

Both starters clear before they set (`startAutoRefresh`, `startClock`), because `beforeDestroy` holds
exactly one handle per interval — an interval started over the top of another is one the page can
never clear. Two sign-ins were enough to leak one.

Answering the brief's question directly: **the durable answer is the sibling's one-modal
architecture plus this lane's one starter list.** Removing the per-page modals alone leaves the
starter list split; fixing the starter list alone leaves two modals stacked. Neither is sufficient.
An `initAuth`-style hook on `AdminPage` is not enough either — see the open seam below.

## 5. Merging with `lane/loginmodal-mounted-once`

Both lanes edit `mounted`, `beforeDestroy` and the sign-in handler on both pages, so a conflict is
certain and is a small one. The resolution is:

- keep the sibling's template change (`<AdminPage @login-success="…">`, no per-page `<LoginModal>`)
- keep this lane's `startLiveBoard()` / `stopLiveBoard()` and idempotent starters
- bind the event to the starter list: kitchen's `resumeAfterLogin` becomes `this.startLiveBoard()`,
  and ongoing's `@login-success="loadOrders"` becomes `@login-success="startLiveBoard"`

`test/kitchen-and-board-resume-after-login.test.js` drives the pages through `closeLoginModal`, which
the sibling deletes; after the merge those three call sites become `wrapper.vm.startLiveBoard()` or a
`login-success` emit. The assertions themselves are on rendered state and do not change.

## 5b. BROWSER EVIDENCE — the end-to-end path is still dead, and not for a reason this lane owns

`browser/diagnostic-run.txt`, run in the isolated worktree against **these fixed pages**, with a
clean compile (`compile-error lines in the dev-server log: 0`). On
`/admin/ongoing?redirect=%2Fadmin%2Fongoing`, signed out:

```
[obs] modals on arrival: 2  (the shell mounts one, the page mounts its own)
[obs] FIRST sign-in completed: true
[obs] url after first sign-in:    http://127.0.0.1:3903/admin/ongoing
[obs] modals after first sign-in: 1
[obs] /orders/ongoing calls so far:       0
[obs] board polled during the 16s wait:   false
[obs] late order 9911 drawn on the board: false
[obs] a sign-in modal still covering it:  1
```

Read it in order. Two sign-in modals stack. The visitor signs in through the one on top — the
shell's, which is last in DOM order because `AdminPage` renders it after the slot. The URL loses its
query, which is `AdminPage.closeLoginModal` taking its `$router.replace(redirectPath)` branch and
therefore **not** emitting `login-success`. The route record is unchanged, so the page component is
reused and `mounted` does not re-run. The page's own modal is still up, and the board has made
**zero** requests.

Then the diagnostic tried to complete the second sign-in, and could not: the remaining modal has no
phone field (`element(s) not found`). So on this URL the page's own `closeLoginModal` — the handler
this lane repairs — is **not reached by the sign-in a person performs**, and the second modal cannot
be driven to make it fire either. Its exact state was not diagnosed further: the duplicate modal
belongs to `lane/loginmodal-mounted-once` and this lane did not go digging in another lane's defect.

**What this does and does not change.** It does not make this change wrong or unnecessary: whatever
ends up triggering recovery must run the whole starter list, and today it runs a hand-picked subset.
It does mean this lane alone does not make the board come alive on that URL, and nobody should read
the green suite as saying it does. The end-to-end fix is three things, of which this is one:

1. this lane's one starter list per page
2. the sibling's removal of the duplicate per-page modal, with the event bound to the starter list
   (`@login-success="startLiveBoard"`)
3. `AdminPage.closeLoginModal` emitting rather than navigating when the redirect target resolves to
   the route already being displayed — see below

## 6. OPEN SEAM, not fixed here — `AdminPage.closeLoginModal` can navigate instead of emitting

`AdminPage.closeLoginModal` emits `login-success` only when there is no `redirect` query or it equals
the current `fullPath`; otherwise it calls `$router.replace(redirectPath)`. On the very URL that makes
these handlers reachable, `redirectPath` (`/admin/ongoing`) differs from `fullPath`
(`/admin/ongoing?redirect=%2Fadmin%2Fongoing`), so it navigates. Vue Router reuses the component for
a same-record navigation, so `mounted` does not re-run **and** no `login-success` is emitted.

This is no longer a prediction — `browser/diagnostic-run.txt` shows the URL losing its query and no
request following, which is that branch being taken. Today the page's own modal is supposed to cover
the case and does not. Once the sibling removes it, the shell's emit is the only recovery trigger
left, and on this path it does not fire at all.

Flagged rather than fixed: `AdminPage.vue` is the sibling's file this pass, and a third lane changing
the same handler is how the estate got its five double-lands. The change it wants is small — compare
the resolved redirect target against `$route.path` rather than `$route.fullPath`, and emit when they
are the same route — but it belongs in one lane with the modal removal, not bolted on here.

## 7. Sharing ongoing.vue with a live lane

`L-ONGOING-SHOWS-EVERY-LIVE-ORDER` holds uncommitted work in `pages/admin/ongoing.vue` in this
checkout. Handled by:

- snapshotting both pages to `baseline/` **before** editing, so `*.patch` here is this lane's hunks
  only and carries none of theirs (`ongoing.patch` hunks start at `@@ -287`; their work is in the
  `computed` block above it and in the imports)
- no `git add`, no `git add -A`, no `git stash`, no commit — the estate's shared stash stack and the
  ~394 uncommitted paths in this checkout are untouched
- the browser arm mutates page files, so it was **moved out of this checkout** into a detached
  worktree at `/Users/svendaneel/okam/web-kitchresume` with `node_modules` symlinked to the primary
  (the pattern the other lane worktrees already use). The first attempt ran in the shared checkout
  and was killed before it reached its mutating arm: reverting `ongoing.vue` for the minutes an arm
  takes would have clobbered whatever the sibling wrote in that window.

## 8. Neighbouring findings deliberately not touched

- `ongoing.vue:259-267` dropping `DriverPickedUp` from its buckets — `L-ONGOING-SHOWS-EVERY-LIVE-ORDER`.
  This lane's hunks sit below it and do not touch the bucketing.
- `kitchen.vue:152-155`, the permanent spinner for a user with no admin store. `startLiveBoard()` sets
  `isLoading = true` and `refresh()` returns early when there is no store id, so that spinner is
  reachable from the recovery path exactly as it already was from `mounted` — neither fixed nor made
  worse here. `data()` already defaults `isLoading` to `true`, so the mounted path is byte-identical
  in behaviour.

## 9. Evidence

| file | what it is |
| --- | --- |
| `red-proof.txt` | the suite against the unmodified pages — 6 of 7 red, kitchen ticket at `0:00` nine minutes on |
| `green-proof.txt` | the same suite after the fix |
| `kill-proof.txt` | ten mutation arms; every starter deleted in turn, each deletion reds a named test |
| `browser-arm.txt` | three browser arms in the isolated worktree, compiler restarted per arm |
| `kitchen.patch`, `ongoing.patch` | this lane's hunks only, taken against `baseline/` |
| `baseline/` | both pages as they stood before this lane, including the sibling's in-flight ongoing work |

Suites run: `test/kitchen-and-board-resume-after-login.test.js` plus every suite that imports either
page (`ongoing-board-covers-every-live-status`, `admin-nav-access`, `modal-scroll-lock-estate`,
`admin-page-auth`) — 5 suites, 69 tests, all green. ESLint clean on all three changed files. No
container was started, entered or stopped; no SQL slot was used; nothing was committed or pushed.
