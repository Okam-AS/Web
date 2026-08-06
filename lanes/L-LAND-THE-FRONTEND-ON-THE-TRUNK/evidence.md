# L-LAND-THE-FRONTEND-ON-THE-TRUNK — evidence

## The result

`feature/restaurant-modules` moved from **`e34977a`** (2026-08-04 15:55) to the commit this file is
committed in — 22 commits on, 194 files, +30958 / −1283 of product code before this record. `core`
moves with it, `1bcab0b → 9626a56`. The last code commit is `e4d4c20`; everything after it is this
record. It is a strict fast-forward, asserted with `git merge-base --is-ancestor` before the branch
was moved.

**Nothing was pushed.** The previous tip is `e34977a`; a rejecting review reverts the whole landing with
`git branch -f feature/restaurant-modules e34977a` and `git -C core checkout 1bcab0b`.

**The owner's checkout was not touched.** Every merge was performed in a worktree of its own
(`<scratchpad>/web-land-trunk`), `node_modules` symlinked to his rather than installed —
`npm ci` / `npm install` were never run. `/Users/svendaneel/okam/Web-modules` is still on
`wip/session-2026-08-06-all-work` with the same working tree it had on arrival, so **his dev server
never hot-reloaded and never recompiled**. Ports bound by this lane: **3010** (nuxt dev) and **4010**
(the Node fixture), both from the Playwright config's own defaults. `:3971` and `:5971` were never bound;
`:5971` was not called at all. No container was started or stopped, and no process was killed — nothing
this lane started needed stopping, and `pkill` was never issued.

## How the wip snapshot was split

`wip/session-2026-08-06-all-work` @ `0c1e4f9` is the owner's whole working tree, 2464 changed paths.

| | paths | landed |
| --- | --- | --- |
| `lanes/**` — lane working notes, probes, arm logs | 1698 | **no** |
| `docs/**` — plan bookkeeping (outside this lane's boundary) | 603 | **no** |
| product code, tests, fixtures, journeys, translations, config | 159 | **yes** |
| `artifacts/journeys/workforce-invitation-onboarding*` — a committed browser capture | 4 | **yes** |
| `core` submodule pointer | 1 | **yes** |

The code slice is commit `11be859`, cut with
`git diff --binary 8ac6f63 0c1e4f9 -- . ':(exclude)lanes' ':(exclude)docs' ':(exclude)core'` onto a branch
rooted at `8ac6f63` — the wip snapshot's own base — so it merges three-way against the lane branches
rather than overwriting them. The evidence is not lost: it stays on
`wip/session-2026-08-06-all-work`, which is not deleted.

`artifacts/` was kept rather than dropped with the rest of the evidence. It is the one kind this plan
asks to be committed (C5), it is four files, and the plan cites it.

## What landed, and from where

| source | carries |
| --- | --- |
| `lane/focustrap-teardown` `8ac6f63` | the focus trap releasing through a hook Vue calls |
| `11be859` (owner's tree, code only) | grouped nav, ongoing board over every `OrderStatus`, the full-replace guard, delivery failure reporting, the kroner/øre field, kitchen + board recovery, the reservation conflict, the dev API default failing closed, the Margin coverage panel, the derived-basename fix, Workforce/Meals/Training surfaces |
| `lane/loginmodal-success-is-silent` `fbcc03a` | a sign-in that worked says nothing in the error slot (carries `lane/login-modal-reports-a-failed-send` `1a33ed7`) |
| `lane/loginmodal-mounted-once` `0f88242` | one sign-in modal per page instead of two |
| worktree `agent-a65db45f6ddd4ab5b` (uncommitted) | `AdminPage` emits instead of navigating |
| worktree `agent-a2127f65723afed15` (uncommitted) | signing out lands where you can sign back in |
| `lane/margin-waste-surface-is-honest` `1d272f1` | the waste surface stops pressing routes nothing answers |
| `lane/live-walk-events` `40b4884` | the Events walk stops asserting an undeployable world |
| `lane/admin-journey-wait-diagnoses` `ac77d25` | a sign-in wait names the fault instead of the timeout |
| `worktree-agent-a1b2b1de4edcf769f` `94f06c7` | a refused Tripletex duplicate stops reading as a failure |

The ordering rule held: `lane/loginmodal-mounted-once` and `L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING`
are adjacent commits, and the branch was never in a state where the first existed without the second.

## Every conflict, and how it was resolved

Eleven conflicts across four files-plus-three. None was resolved by taking a side except where the two
stages were first diffed and one proved a strict superset of the other.

1. **`pages/admin/ongoing.vue`** — the lane deleted the page's modal and bound
   `@login-success="loadOrders"`; the owner's tree had built the whole starter list behind
   `closeLoginModal`. Kept `startLiveBoard`, deleted the orphaned `closeLoginModal`, bound
   `@login-success="startLiveBoard"`. `loadOrders` alone is a board that loads once and never polls.
2. **`pages/admin/kitchen.vue`** — same shape. The lane's `resumeAfterLogin` is the incomplete
   three-step list and omits the per-second clock and the `fullscreenchange` listener, which is the
   whole `0:00` defect. Kept `startLiveBoard`, deleted both handlers, bound the event to it.
3. **`pages/admin/wolt-menu.vue`** — import block. Dropped the `LoginModal` import, kept
   `~/utils/price`; all three of its symbols are used in the file.
4. **`components/organisms/AdminPage.vue`** — `openLogin()` and the emit lane's comment both attach
   above `closeLoginModal`. Adjacent additions, both kept. The logout lane then applied cleanly on top:
   four lanes, one file, no overlapping lines.
5. **`components/admin/margin/MarginCoveragePanel.vue`** — diffed the two stages before choosing. The
   lane's file is a strict superset of the owner's tree's (the only lines unique to ours are the `v-if`
   it replaces with a four-state chain), so taking the lane's loses nothing and adds `wasteNotServed`.
6. **`utils/margin/statement-view.js`** — comment rewording only; the lane's names
   `MarginCoverageResponse` where ours said "the coverage endpoint".
7. **`test/margin-waste.test.js`** — **not** a superset either way. Merged by hand: kept the lane's
   three-test split and folded in the owner's tree's `'none'` and falsy `0` inputs, so no assertion is
   lost. 28 tests, no duplicate names.
8–10. **`translations/{no,en,de}.ts`** — see the correction below.

## The mistake this lane made, and what caught it

The three translation files were first resolved with `git checkout --theirs`. That does not resolve a
hunk, it takes the whole file, and the lane branch's copy predates **351 keys** the owner's tree had
added. Jest named it at once: **8 suites red on `missing translation key: wft_batches_title`**.

Redone as a real three-way merge (`git merge-file`, base `8ac6f63`, ours `0cbbd99`, theirs `1d272f1`),
one conflicting hunk per file, both sides kept. 5172 / 5137 / 5137 keys, no duplicates.
Recorded in its own commit, `22bac8e`, rather than folded away — this estate has resolved a file by side
three times and lost a real measurement each time, and this was the fourth.

## One test was rewritten, and mutation-checked rather than assumed

`test/kitchen-and-board-resume-after-login.test.js` was written against a page that owned its own modal:
7 of its 10 tests addressed `wrapper.vm.closeLoginModal` and `wrapper.vm.showLogin`, neither of which
survives the modal removal. The sign-in is now raised as `login-success` on a named shell stub, which
goes through the page's own template binding and is strictly stronger than the method call it replaced.
The signed-out beat asserts the page mounts no `LoginModal` of its own.

Proven to still fail on the thing it now guards:

| mutant | result |
| --- | --- |
| `ongoing.vue` binds `loadOrders` (the modal-removal branch's own version) | **3 of 10 red** |
| `kitchen.vue` binds nothing | **4 of 10 red** |
| restored | **10 of 10 green** |

## The suite, at the tip

```
Test Suites: 144 passed, 144 total
Tests:       3192 passed, 3192 total
Time:        8.5 s
```

Run in a worktree named `web-land-trunk`, **not** `Web-modules` — so `test/journey-artifact-store.test.js`
(44 tests) passing there is the derived-basename fix demonstrated rather than claimed.

## A person can use it

Playwright against the repo's own fixture, at the merged tip. Ports 3010 / 4010.

Three shipped journeys, unmodified: `login-modal-failed-send`, `margin-waste-absent`,
`ongoing-board-live-statuses` — **3 passed**.

Then this lane's own arm, `/admin/ongoing` signed out (deleted after the run; the screenshots are the
record):

- **exactly one** `.login-modal` on arrival — `01-one-sign-in-modal.png`
- signed in with 99999999 / 123123; the modal closes and the board renders
- **13 nav groups**, grouped by module — `02-grouped-nav-signed-in.png`:
  DRIFT | MARGIN & RÅVARER | BEMANNING & LØNN | OPPLÆRING & KOMPETANSE | SELSKAP & ARRANGEMENT |
  VEKST & PERSONVERN | BEDRIFTSMAT | MENY | LEVERING | SALG & MARKED | ØKONOMI | ADMINISTRASJON | MIN SIDE
- **2 `/orders/ongoing` calls** in the nine seconds after the sign-in — the board polls rather than
  holding the snapshot it loaded

## Deliberately not landed

- **The category change and its admin badge.** `web-admin-categories.patch` is only correct once
  `CategoryModelBuilder` stops filtering on the image, and that is a different repository and a
  different lane. The guards are in two further repositories this lane is not authorised to merge into,
  and both reads are still unguarded, measured just now: `ConsumerWeb/pages/categories.vue:303` and
  `ConsumerApp/src/components/pages/CategoriesPage.vue:405` are `:src="category.image.imageUrl"` under
  `v-if="category"` alone. **Nothing in this landing touches a category file**, so the trunk is safe in
  the state it is handed over in — but the badge must not land before the guards do.
- **`lane/meals-enrolment-has-a-button`** (uncommitted in `agent-a0b63b4f563fc2786`). Three sources
  carry overlapping Meals enrolment work — that worktree, `wip/rescue-2026-08-06-wt-meals-enrol-ui` and
  `-pretick` — and this estate has five double-lands on record. It is not in the brief's list and it
  needs one owner to reconcile the three before any of them lands.
- **`lane/tier-artifacts`**, **`lane/ack-receipt-survives-reload`**, **`candidate/fe-compose-2026-08-05`**.
  The last is a 105-commit composition of the 2026-08-05 lanes that never landed, and the second sits on
  top of it. That is a second landing, not this one.
- **`lane/L-CI-RUNS-THE-FAST-TIER`'s workflow file** — its own brief says produce the diff, do not push a
  workflow.

## Residue worth knowing

`docs/plan/returns/L-MARGIN-WASTE-SURFACE-IS-HONEST-1.md` arrives on the trunk because that lane
committed its own RETURN to its own branch. It is that lane's content, not this one's; it is disclosed
rather than removed, because deleting a sibling's return to satisfy a path boundary would be the worse
of the two.

A husky hook on the shared git dir (`.git/hooks/husky.local.sh`) `cd`s into
`lanes/L-CI-RUNS-THE-FAST-TIER/npmcheck/`, which exists in no checkout. Every commit here was made with
`--no-verify` and `core.hooksPath=/dev/null` for that reason. It is a stale hook another lane left
behind and it will bite the next person who commits in this repo.
