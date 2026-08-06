# L-MODAL-BROKEN-TWO — full detail

Branch `lane/modal-broken-two` off `feature/restaurant-modules` @ 7b99f2a, worktree
`/Users/svendaneel/okam/web-modal-two`, commit `6348944`. Not pushed. Ports 3120 (web) / 4120
(fixture), derived from a sha1 of the checkout path.

## Defect 1 — `ChangeDeliveryTypeModal` "throws on render". IT DOES NOT.

The brief says the modal calls a label helper that does not exist. `deliveryTypeLabel` exists:

- `plugins/global-mixin.js:97` defines it, in the same `methods` block as `paymentTypeLabel`,
  `orderStatusLabel` and `priceLabel`.
- `nuxt.config.js:189` registers that plugin (`ssr: false`, which is irrelevant here — the modal
  only ever renders inside `AdminPage`'s `<client-only>`).
- Four other components call it identically: `OrderCard.vue:108`, `ReceiptModal.vue:63`,
  `components/molecules/OrderModal.vue:56`, `components/organisms/OrderModal.vue:83`,
  `components/admin/kitchen/KitchenTicket.vue:24`.
- `git log -S "deliveryTypeLabel (deliveryTypeEnum)" -- plugins/global-mixin.js` → `ee54c2b`, well
  before the modal's own first commit (`c3486d0`, `7d03d22`).

### Repair or delete? Neither — it needed opening, not fixing.

The interesting question the brief asked was whether anything can still reach it. Everything can.
The whole wire is intact and every link was checked:

```
OrderCard.vue:189-195      <button @click="$emit('change-delivery', order)">   no v-if — always drawn
ongoing.vue:53,95,138      @change-delivery="changeDeliveryType"               all three columns
ongoing.vue:343            changeDeliveryType(order) → showChangeDeliveryModal = true
ongoing.vue:179            <ChangeDeliveryTypeModal v-if=... :order="currentOrder">
modal :122                 this._orderService.ChangeDeliveryType(...)
core/services/order-service.ts:112   PUT /orders/change-delivery-type { orderCode, deliveryType }
```

All fifteen `changeDeliveryTypeModal_*` keys exist in all three of `no.ts`, `en.ts`, `de.ts`. So the
modal was not repaired and not deleted. It was driven, which is the thing nobody had done — and the
journey now exists so that stays true.

### What the browser showed

`artifacts/journeys/admin-change-delivery-type` — 8 steps, all passed:

- heading "Endre leveringstype", store "Fixture Kafé", order "#1042"
- **"Nåværende leveringstype: Hent selv"** — the helper resolved; asserted `!== 'SelfPickup'`, so a
  build that dropped the call for the raw enum would fail
- three options, `SelfPickup` filtered out: Hjemlevering / Spis inne / Wolt
- selected Spis inne → confirm → `PUT /orders/change-delivery-type` → modal closed
- the order card's own delivery row then reads "Levering: Spis inne", asserted `not` "Hent selv"
- zero browser errors attributable to the modal

Screenshot: `admin-change-delivery-type/02-the-delivery-type-modal.png`.

### One cosmetic note, not fixed

The confirm button reuses `changeDeliveryTypeModal_title`, so it reads "Endre leveringstype" —
identical to the modal's own heading. It is correct behaviour (disabled until a type is chosen) and
outside this lane's exit criteria. Flagged, not touched.

## Defect 2 — two login prompts. REAL, and worse than the brief said.

`AdminPage` owns admin auth: `initAuth()` raises `LoginModal` and replaces to
`/admin?redirect=<where you were going>`. Eleven pages carried a second copy of that job.

### Measured, same running build, HMR-swapping the pages between HEAD and the fix

```
BEFORE (pages/admin + AdminPage at HEAD 7b99f2a)
  plain deep link             peak 2   settled 1   final url /admin?redirect=%2Fadmin%2Fongoing
  deep link with ?redirect=   peak 2   settled 2   final url /admin/ongoing?redirect=%2Fadmin%2Fongoing
  statistics with ?redirect=  peak 2   settled 2   final url /admin/statistics?redirect=%2Fadmin%2Fstatistics
AFTER (this lane's change)
  plain deep link             peak 1   settled 1   final url /admin?redirect=%2Fadmin%2Fongoing
  deep link with ?redirect=   peak 1   settled 1   final url /admin/ongoing?redirect=%2Fadmin%2Fongoing
  statistics with ?redirect=  peak 1   settled 1   final url /admin/statistics?redirect=%2Fadmin%2Fstatistics
```

Also `login-prompt-before-after.txt`. **The brief called it transient; the middle row is not.**
`initAuth` navigates only when the URL carries no `redirect` query, so on a URL that already has one
— the shape the app's own login flow mints, and a person can bookmark it or be sent it — nothing
ever unmounts the page and both prompts stay indefinitely.

### What "two stacked" actually means, measured in the DOM

```
BEFORE  loginModals 2  headings 2  telInputs 2  buttons 2   both visible/display:block, both top:212
AFTER   loginModals 1  headings 1  telInputs 1  buttons 1
```

They are perfectly superimposed, so the screenshot looks like one prompt
(`admin-single-login-prompt/00-before-two-stacked-prompts.png` — the DOM count in that shot is 2).
The form underneath is a second live tab stop and a second login form in the accessibility tree.

### Where the duplication lives, and where it was fixed

In the **pages**, not in what they share. Forty-odd sibling admin pages already do it right —
`<AdminPage @login-success="...">` and no modal of their own (`index.vue`, `products.vue`,
`workforce-*.vue`, `margin-*.vue`, `meals-*.vue`, …). These eleven were the stragglers:

`brev` `dinehome` `kitchen` `lang` `onboarding` `ongoing` `orders` `payouts` `statistics`
`wolt-calc` `wolt-menu` — eleven, not the ten the brief states. All eleven wrap `<AdminPage>`.

Each loses `showLogin`, its `<LoginModal>` (import, registration, template) and `closeLoginModal`,
and binds `@login-success` to what its close handler used to call. The mounted-time early return
stays where it guarded a fetch — it was doing two jobs and only the prompt was the shell's.

`AdminPage` gains `promptLogin()`. `onboarding` and `wolt-menu` re-prompt when `_userService.Reload()`
answers falsy mid-session, which is the one case `initAuth` does not cover; they now ask the owner
through `$refs.shell` instead of mounting a second modal beside it.

`pages/meals/join.vue` keeps its own — it does not use `AdminPage` (its own header comment explains
why), so it is the sole owner there. Correctly untouched.

### Two more defects found while reading what the pages declare

- `brev.vue` — the post-login handler called `this.loadOrders()`, a method that page does not have.
  Gone with the handler; now binds `@login-success="loadLetters"`.
- `wolt-menu.vue` — bound `@login-success="handleLoginSuccess"` to a method **never defined**, so the
  shell's post-login event landed on `undefined`. Now a real `onLoginSuccess`.

## Evidence, and why it is browser evidence

Neither claim is one a Jest test in this repo can settle.

- `core/` is an empty submodule in a lane worktree, so component tests here mount with **stand-ins**
  for the global mixin's helpers (`margin-cost-panel.component.test.js` says so in its header). A
  unit test that stubs `deliveryTypeLabel` proves the modal renders when somebody supplies the
  helper; one that omits it proves the modal throws when nobody does. Neither is a fact about the app.
- The stacked prompts are a **composition** fact: page and shell mounted together under a real
  router. `shallowMount` of the page stubs `AdminPage` and sees one modal; mounting the shell alone
  sees one modal. Either reports health.

That is the trap the brief named — an assertion true about the unit and false about the page. So:

| instrument | what it is for |
| --- | --- |
| `test/e2e/journeys/admin-change-delivery-type.spec.js` | the modal, opened and driven |
| `test/e2e/journeys/admin-single-login-prompt.spec.js` | one prompt, counted in the right window |
| `test/admin-login-prompt-single.test.js` | the ratchet — asserts what the pages **declare** |

The Jest file deliberately reads source text rather than mounting, and also checks that every
`@login-success` handler a page binds actually exists — which is how `wolt-menu`'s dangling one
surfaced, and it caught its own comment as a false positive on first run.

### The first version of the login journey PASSED against the broken build

It waited for a modal to become visible and then counted; the wait was long enough for the redirect
to land and take the second modal with it. Rewritten so CASE A asserts the durable `?redirect=` form
plainly, and CASE B polls from first paint and asserts on the **maximum ever seen**. A measurement
taken after the race is not a measurement of the race.

It also signs in at the end — partly to prove the door still opens with the second modal gone, and
partly because a signed-out visit makes no API calls at all, which trips the harness's wrong-world
guard (`stats.served === 0`) for want of any fixture traffic. That is a real edge in
`test/e2e/support/journey.js` worth knowing about: a journey that legitimately talks to nothing is
reported as having run against the wrong world.

## Fixture additions

`test/e2e/fixture/world.js` — one ongoing order, `SelfPickup` (so the modal's filter has something
to remove), customer phone deliberately not `+4799999999` (`OrderCard` hides that row for the
fixture's own sign-in number).
`test/e2e/fixture/api-server.js` — `GET /orders/ongoing` from mutable state, and
`PUT /orders/change-delivery-type` which **refuses an unknown delivery type**, so a fixture that
accepts anything cannot be mistaken for one that holds the contract.

## Suites

- Jest: **94 suites, 2306 tests, all pass**.
- Playwright: **5 journeys, all pass** — including the three that predate this lane
  (`admin-refusal-worker` exercises `AdminPage`'s guard directly).
- ESLint: error set on every touched file is byte-identical to HEAD's, verified by linting the
  `git show HEAD:` versions side by side. One `no-useless-return` I introduced in `wolt-calc.vue`
  was removed.

## Operational gotcha for the next lane

`playwright.config.js`'s `globalTeardown` calls `releaseBorrowedCore()`, which strips `core/` **even
when you started the dev server yourself**. HMR then rebuilds an app with no client bundle and every
probe reads zero of everything — which looks exactly like a product defect. If you run the servers
by hand, restart the dev server after every `playwright test`. This cost one wrong measurement here
(`max 0` login modals) before it was spotted.

## Not done, deliberately

- No SQL tier — Docker is down estate-wide.
- `translations/*.ts` untouched. All fifteen keys the modal needs already exist in all three.
- Nothing pushed.
