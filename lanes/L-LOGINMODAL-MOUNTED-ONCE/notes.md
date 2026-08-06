# L-LOGINMODAL-MOUNTED-ONCE — one sign-in modal per page

Worktree `/Users/svendaneel/okam/web-loginmodalonce`, branch `lane/loginmodal-mounted-once`, off
`8ac6f63`. Nothing was written to the primary checkout, no shared branch was touched, no container
was started or inspected, and the two node servers this lane started (fixture 4891, `nuxt dev` 3891)
were killed by the arm script's own EXIT trap — verified afterwards with `lsof`.

## 1. The census, measured rather than relayed

The brief said **twelve** admin pages. **Eleven** is the number, and the disagreement is worth
keeping because three different counts are already on the record in this repository:

| source | claim |
| --- | --- |
| `test/e2e/journeys/modal-estate-scroll-lock.spec.js:246` | "Ten admin pages carry that duplicate handling." |
| `lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND/nothing-listening.evidence.spec.js:32` | "twelve admin pages mount their OWN `<LoginModal>`" |
| this lane, by compiling every page's template and walking its component closure | **eleven** |

The eleven, each of which held **2** mount sites before this change and holds **1** after:

```
pages/admin/brev.vue        pages/admin/dinehome.vue    pages/admin/kitchen.vue
pages/admin/lang.vue        pages/admin/onboarding.vue  pages/admin/ongoing.vue
pages/admin/orders.vue      pages/admin/payouts.vue     pages/admin/statistics.vue
pages/admin/wolt-calc.vue   pages/admin/wolt-menu.vue
```

The count is not a grep. `test/login-modal-mounted-once.test.js` compiles each SFC with
`vue-template-compiler` and walks the element tree — including `v-else` branches, which hang off
`ifConditions` rather than off the child list, and which is how BOTH modals were written. Child tags
are resolved by name rather than by import statement, because `nuxt.config.js` sets
`components: true` and a template needs no import to render a component; an import-graph census
would have under-reported, which is the wrong direction to be wrong in for a "no more than one"
rule. Two mutations in `mutate.py` (16 and 17) confirm it is structural and not textual: a
`<LoginModal>` written inside an HTML comment, and one written inside a script comment, both leave
the census green.

Not the twelfth, and deliberately so:

* **`pages/admin/index.vue`** — `/admin` — mounts none of its own and never did. The sibling lane's
  note that "a second also appears on `/admin` in fixture mode" did **not** reproduce: arm A of the
  browser run reports `.login-modal=1` on `/admin` against the fixture, before and after this change.
* **`pages/admin/workforce-me.vue`** — the `allow-non-admin` page the brief asked to be checked
  deliberately — mounts no modal of its own. `allowNonAdmin` opts out of the STORE-ADMIN membership
  requirement inside `initAuth`, not out of authentication, and the shell's modal is untouched by it
  (`AdminPage.vue:52-67`). It is in test 1's sweep like every other admin route and reports 1.
* **`pages/admin/reservation.vue`** and **`pages/admin/wrapped.vue`** are the only two admin pages not
  built on `<AdminPage>`, so they have no sign-in modal at all. They are named in the test rather
  than filtered out by a shape check, so that a page which LOSES its shell shows up as a failure
  instead of quietly excusing itself.
* **`pages/meals/join.vue`** and **`pages/workforce/join.vue`** each mount the ONLY modal on their
  page: `layout: 'empty'`, no `<AdminPage>`, and a guest holding a claim token who must sign in
  without navigating away from it. Left alone.
* **`components/atoms/MyUserDropdown.vue`** mounts a `<LoginModal>` and **nothing in the repository
  renders `<MyUserDropdown>`** — no template names the tag, no module imports the file. It is on no
  page's tree, so it is not a duplicate; it is dead code carrying one. Deleting a component is a
  different change from deleting a duplicate, so it is listed in test 3's census instead, which puts
  it on the record and reds if anything ever starts rendering it.

## 2. What each duplicate was for, before it was removed

Ten of the eleven were the same four lines: `showLogin` in `data`, `showLogin = true` in a `mounted`
that then `return`s before touching a service, a `<LoginModal v-if="showLogin">` inside the very
`<AdminPage>` that already had one, and a `closeLoginModal(isLoggedIn)` that reloaded the page's data
on success. Every one of those conditions is `!this.$store.getters.userIsLoggedIn` — the identical
condition `AdminPage.initAuth` evaluates in its own `mounted`, which is why there were two.

The half that was NOT redundant is the data reload, and it is preserved by wiring the page's own
loader to the shell's existing `@login-success` event — the pattern 47 admin pages already use:

| page | now |
| --- | --- |
| brev | `@login-success="loadLetters"` |
| dinehome | `@login-success="fetchDeliveryTimes"` |
| kitchen | `@login-success="resumeAfterLogin"` (isLoading + refresh + startAutoRefresh, unchanged) |
| lang | `@login-success="loadCultures"` |
| onboarding | `@login-success="handleLoginSuccess"` (`window.location.reload()`, unchanged) |
| ongoing | `@login-success="loadOrders"` |
| orders | `@login-success="fetchOrders()"` — called with no argument on purpose, so a future event payload cannot arrive as a page number |
| payouts | `@login-success="loadPayouts"` |
| statistics | `@login-success="loadStatistics"` |
| wolt-calc | nothing — see below |
| wolt-menu | `@login-success="handleLoginSuccess"` — see §3 |

`pages/admin/wolt-calc.vue` is a calculator that reads nothing from the API. Its `mounted` and its
entire `methods` block existed only to raise the second modal, so both are gone and there is no
reload to wire.

**The one behaviour the shell genuinely could not cover**, and the reason `AdminPage` gained a
method rather than just losing eleven children: `onboarding.vue` and `wolt-menu.vue` each raised
their own modal a SECOND way — from `_userService.Reload()` answering `false`, or throwing. That is
a session that was present at mount and turned out to be stale, and `AdminPage.initAuth` calls the
same `Reload()` and **ignores its result** (`AdminPage.vue:103`). Deleting those two call sites with
nothing in their place would have lost the re-prompt, so `AdminPage` now exposes:

```js
openLogin () { this.showLogin = true; }
```

and both pages call `this.$refs.adminPage.openLogin()`. One modal, one owner, same behaviour. A child
component's `mounted` runs before its parent's in Vue 2, so `$refs.adminPage` is populated by the
time either page's `mounted` — or any promise it started there — can run. Mutation 19 deletes
`openLogin` and the suite reds, so the method is not decoration.

## 3. Defects found on the way, and what was done with each

1. **`pages/admin/brev.vue` called a method that does not exist.** Its `closeLoginModal` ran
   `this.loadOrders()` on a successful sign-in; `brev.vue` has no `loadOrders`. Signing in on
   `/admin/brev` threw `TypeError: this.loadOrders is not a function`. Fixed incidentally — the
   duplicate is gone and `@login-success` points at `loadLetters`, which is the method that loads
   this page's data.
2. **`pages/admin/wolt-menu.vue` bound `@login-success="handleLoginSuccess"` to a method that did not
   exist**, before this lane touched it. It now exists and re-runs `reloadCurrentUser()` — the same
   thing `mounted` does, because a session that arrives late is the same session mount would have
   found. Extracted rather than invented.
3. **`components/atoms/MyUserDropdown.vue` is dead** (§1). Left in place, recorded in test 3.
4. **A harness that lied, caught before it was believed.** The first version of the browser arm
   mutated `lang.vue` under a single running `nuxt dev` and slept 25s for the rebuild. Arm B
   **passed**, reporting one modal on a page that had two mount sites in it. The arm now restarts the
   compiler for each of the three runs and uses `git show HEAD:pages/admin/lang.vue` — the defect
   verbatim, with its own import — instead of an inserted tag leaning on auto-import. See the header
   of `run-browser-arm.sh`; `kill-proof-browser.txt` is the corrected run.

Not touched, as instructed: `LoginModal.vue:203` assigning `JSON.stringify(response)` to
`errorMessage` on the SUCCESS path (`L-LOGINMODAL-SUCCESS-IS-SILENT`). **No line of
`components/molecules/LoginModal.vue` is in this diff**, so the two lanes cannot collide.

## 4. Evidence

| file | what it is |
| --- | --- |
| `red-proof.txt` | the census run BEFORE the fix: 3 tests failing, all eleven pages listed at 2 |
| `kill-proof.txt` | 20 mutations, 0 fooled the census |
| `kill-proof-browser.txt` | three browser arms; B reports `.login-modal=2` **and 2 phone inputs** on `/admin/lang` |
| `suite.txt` | 112 suites / 2548 tests, all passing |
| `mutate.py`, `run-browser-arm.sh`, `browser-proof.config.js`, `count.arm.spec.js` | the instruments |

`kill-proof-browser.txt` is the one that answers the brief's actual claim. The invisible cost was
said to be "two modals hold two copies of the sign-in state"; arm B measures it directly — with the
defect restored, `/admin/lang` served **two `.login-modal` elements and two phone fields**, only one
of which a person is looking at. Arms A and C, on either side of it, report one of each on all six
routes.

### Runs that were excluded from `suite.txt`, and why

Four suites fail in this worktree for reasons that are not this change. Two were confirmed by
running them with all twelve of my files reverted to HEAD:

* `test/journey-artifact-store.test.js` — asserts the checkout is named `Web-modules`; this one is
  `web-loginmodalonce`. The documented worktree hazard.
* `test/core-request-path-shape.test.js` — 4 failures, **reproduced identically at HEAD** with my
  files reverted.
* `test/core-price-label.test.js`, `test/price-absence.test.js` — a fresh worktree does not populate
  the `core/` submodule. Both **pass** once `core/` is borrowed from the primary checkout, which is
  how `suite.txt` was produced; the symlink was removed afterwards and `git status` confirmed clean.

Per-file ESLint was measured before and after against each file's HEAD content. No file gained an
error and none gained a warning: `AdminPage.vue` is identical at 1/45, `wolt-menu.vue` improves from
8/127 to 7/125, and seven of the eleven pages are 0/0 both ways.

## 5. What a reviewer should push on

* `openLogin()` is a new public surface on `AdminPage`. Two callers, both named above. If the
  preferred shape is for `initAuth` to honour `Reload()`'s result for all 70 admin pages instead,
  that is a bigger change with a wider blast radius and was deliberately not made here.
* `pages/admin/kitchen.vue`'s in-place sign-in resumes refresh and auto-refresh but still does not
  start the clock interval or bind `fullscreenchange` — those are in `mounted`'s signed-in branch
  only. That gap is **pre-existing and unchanged**; `resumeAfterLogin` does exactly what
  `closeLoginModal` did. Widening it was not this lane's call.
* `pages/admin/wolt-menu.vue` is also modified in the primary checkout by another lane (price
  formatting, around `formatPrice`/`updateItemPrice`, roughly 200 lines below anything here). No
  textual overlap, but the merge order is worth knowing.
