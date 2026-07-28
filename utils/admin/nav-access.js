// What the admin sidebar is allowed to offer the signed-in person.
//
// THE BUG THIS EXISTS TO CLOSE. `AdminPage` now lets a pure worker — someone with no store-admin
// membership anywhere — reach `/admin/workforce-me`, because the backend authorises that page from
// their own token. The sidebar did not get the memo: it still listed all six store-admin groups, and
// every one of those links lands on a page whose shell immediately bounces the worker to
// `/registrer`. A menu of forty links, thirty-nine of which throw you out, is worse than no menu.
//
// THE FLICKER, AND WHY "UNKNOWN" IS A STATE. The obvious fix — hide the groups when `adminIn` is
// empty — has a failure mode that would hit all 46 existing admin pages rather than the one new
// page: `AdminPage.initAuth` refreshes the user with an async `Reload()`, so there is a window in
// which the membership fact is simply not in hand. Treating that window as "no access" makes a real
// admin's sidebar render empty and then fill in, on every page, on every load. That is a regression
// paid by everyone to fix a bug that affects a handful of people.
//
// So membership is modelled as THREE states rather than as a boolean, in the same spirit as the week
// grid's unknown/no-plan/counted:
//
//   unknown     — nobody has told us yet. Either no identity is loaded at all, or the loaded user
//                 carries no `adminIn` field, so the question is open.
//   store-admin — `adminIn` is a list and it has entries. This person administers at least one store.
//   worker      — `adminIn` is a list and it is empty. A positive answer: they administer none.
//
// The rendering rule follows from that, and it is deliberately asymmetric:
//
//   HIDE THE STORE-ADMIN NAV ONLY ON A POSITIVE `worker`. NEVER ON `unknown`.
//
// `unknown` therefore renders byte-for-byte what the sidebar rendered before this file existed, so
// no admin can ever see a link disappear and come back. The only transition `Reload()` can produce
// on an admin's screen is unknown → store-admin, which changes nothing on screen.
//
// WHY THE WORKER DOES NOT FLICKER EITHER. `plugins/global-mixin.js` writes the whole Vuex state to
// `localStorage` on every mutation and `store/index.js` restores it synchronously in the `Load`
// mutation. `currentUser.adminIn` is part of that state. A returning worker is therefore resolved to
// `worker` in the first render pass, before any network call — the async `Reload()` only confirms
// it. The `unknown` window is reachable only by a user whose persisted record predates the field.
//
// AND THE FIRST LOGIN DOES NOT FLICKER EITHER. The remaining worry would be a worker's first login
// on a device, where there is no persisted answer to start from. There is no such frame: the entire
// sidebar in `AdminPageHeader` sits behind `v-if="$store.getters.userIsLoggedIn"`, so an anonymous
// visitor is shown no navigation at all. The first nav ever rendered to that worker is rendered
// from a `currentUser` that already carries `adminIn`, and it is already the worker's.
//
// So `unknown` never actually reaches the screen as a menu in the flows we have — it exists to make
// sure that if it ever did, it would err toward showing a working admin too much rather than
// showing a real admin nothing.

export const ACCESS_UNKNOWN = 'unknown';
export const ACCESS_STORE_ADMIN = 'store-admin';
export const ACCESS_WORKER = 'worker';

/**
 * Resolves the three-state store-admin membership of a Vuex `currentUser`.
 *
 * `adminIn` is checked with `Array.isArray` rather than for truthiness on purpose: `undefined` and
 * `[]` are the two answers that must NOT be collapsed here. `AdminPage` collapses them — it bounces
 * on `!adminIn || adminIn.length === 0` — and that is correct for a redirect, where erring toward
 * `/registrer` is safe. It is not correct for a menu, where erring the same way blanks the sidebar
 * of every admin whose profile has not come back yet.
 */
export function storeAdminAccess (currentUser) {
  const user = currentUser || {};
  // `userIsLoggedIn` is `currentUser && currentUser.id`; without an identity there is nobody whose
  // memberships could have been resolved, so the question is open rather than answered "none".
  if (!user.id) { return ACCESS_UNKNOWN; }
  if (!Array.isArray(user.adminIn)) { return ACCESS_UNKNOWN; }
  return user.adminIn.length > 0 ? ACCESS_STORE_ADMIN : ACCESS_WORKER;
}

/**
 * Whether the sidebar may show the store-admin groups.
 *
 * True for `store-admin` AND for `unknown` — see the asymmetry above. This is the single place the
 * "unknown is not a refusal" rule is spelled out, so a future caller cannot re-derive it wrongly.
 */
export function showsStoreAdminNav (access) {
  return access !== ACCESS_WORKER;
}
