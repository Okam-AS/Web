# L-MRG-RECIPE-REVISE-UI — evidence

brief `50fdc105` · verdict `built` · frontend tip when the lane opened: `3cd2570`
(`The script an operator runs stops saying the reset does not exist`)

## Exit criterion

> an active recipe gains a new-draft, edit, activate and retire round trip in the browser,
> driven by a test against the mocked wire

**Named instrument:** `test/margin-recipe-revise.test.js`, test
`an active recipe can be fixed and then ended, without leaving the page ›
new draft -> edit -> activate -> retire, every step driven from the screen`.

Run it with:

```
cd /Users/svendaneel/okam/Web-modules
npx jest test/margin-recipe-revise.test.js --coverage=false
```

Result at the end of this lane: **24 passed, 24 total**.

## The brief's claim, checked before building

The brief said the client has no CreateVersion, UpdateVersion or Retire method and the backend routes
are live. **Both confirmed, and nothing in the brief was wrong.**

| claim | observed |
| --- | --- |
| client has no version/retire methods | `utils/margin/recipe-client.js` had 9 methods; none of the three. Its own header even asserted the absence: *"the draft edit and retire surfaces — other journeys."* |
| the routes are live on the backend | `OkamAPI-modules/Controllers/MarginRecipesController.cs:60,64,72` — `POST recipes/{id}/versions`, `PUT recipes/{id}/versions/{versionId}`, `POST recipes/{id}/retire` |
| once activated a recipe cannot be fixed | `MarginRecipeService.EditDraftAsync` refuses a non-Draft (`margin.version-not-draft`), and `CreateAsync` refuses a duplicate name — so the recipe was frozen and could not be re-created either |
| nav entry (C3) | **already present** at `components/organisms/AdminPageHeader.vue:368` and already pinned by `test/admin-nav-access.test.js:99`. **Asserted, not rebuilt** — pinned again in my own suite so its removal reds here too. |

## What the round trip proves, step by step

The wire is a **stateful fake**, not a per-call script: `activate v2` is only satisfiable if v1
actually leaves the Active state, and every mutation bumps the row's revision the way a rowversion
does. The transitions are modelled line for line on `MarginRecipeService`
(`CreateDraftFromActiveAsync`, `EditDraftAsync`, `ActivateAsync`, `RetireAsync`).

Every step is driven **through the DOM** (`find('[data-test=…]').trigger('click')`, `setValue`),
including the recipe selection, which goes through the list row rather than `vm.selectRecipe`.

| step | state asserted by value | previous state asserted gone |
| --- | --- | --- |
| start | `['v-1:Active']`, per-portion cost `1200` | — |
| 1 new draft | `['v-1:Active','v-2:Draft']`, editor open, 2 component rows incl. the sub-recipe | `new-draft` control gone |
| 2 edit | `v-2.portionCount === 20` | `v-1.portionCount` still `10`; states unchanged |
| 3 activate | `['v-1:Superseded','v-2:Active']`, cost now `600` (12000/20), `pricedVersionIsActive` true | **`v-1` is no longer Active** — the two-active defect a round trip exists to catch; editor and activate control both closed by themselves |
| 4 retire | `['v-1:Superseded','v-2:Retired']`, no Active version anywhere, `revise-no-active` shown | `retire` control gone; cost state `not-costed` with **null** totals, never `kr 0` |

Retire is shown reachable **from Active** and refused from a draft: the pair
`a recipe with only a draft offers no retire control` / `CONTROL: the same recipe with an Active
version offers it` differ only in whether a version is Active, and the draft fixture still offers the
`activate` control — so the absence is a rule and not an empty card.

## Mutation proof — four arms, one transition each

`lanes/L-MRG-RECIPE-REVISE-UI/mutation-proof.py` (output in `mutation-proof.txt`). Each arm replaces
exactly one `@click` binding with an inert attribute, so the control still renders, is still enabled
and still clickable — and does nothing.

Baseline: **53 tests, 0 failing.**

| arm | unbound | newly red |
| --- | --- | --- |
| 1 | `@click="newDraft"` | 4 — the 2 journey tests + **both** `the new draft is a clone…` tests |
| 2 | `@click="saveDraft"` | 6 — the round-trip test + **all 5** `the edit carries…` tests |
| 3 | `@click="activate"` | 3 — the 2 journey tests + `activation supersedes what it replaces` |
| 4 | `@click="retire"` | 5 — the 2 journey tests + **all 3** `retire is reachable from ACTIVE…` behaviour tests |

No arm reds everything: each arm leaves the other three transitions' step-scoped describes green
(12 / 9 / 13 / 11 respectively). The discrimination is the point — the round trip reds for all four
because it is a chain, and the step-scoped describes attribute the break to one transition.

### The vacuity the brief warned about, measured rather than asserted

`test/margin-recipes-page.test.js` was run alongside in every arm and **stayed green in all four —
including arm 3, which unbound the activate button.** That suite drives `wrapper.vm.activate()`
directly, so it cannot see an unbound control. It is not wrong about what it asserts (the revision
sent, the re-read); it simply is not a reachability instrument. Recorded, not changed: it does not
pin a defect, so nothing there was deleted.

## The traps, and where each is pinned

* **`Number(null) === 0`.** Guarded with `=== null`, never falsiness, in two new helpers in
  `pages/admin/margin-recipes.vue` (`formValue`, `yieldFactorOrNull`) and in the `activeVersionNumber`
  computed via `numberOrNull`. Pinned separately for **null / undefined / '' / a real 0** in
  `an absent number and a real zero are two different screens` (5 tests): the first three render
  `mrg_revise_active_unknown`, and the real `0` renders `mrg_revise_active {"number":0}`. A truthiness
  guard passes the first three and fails the fourth.
* The same rule inside the editor: a draft whose `portionCount` is `null` seeds an **empty** field, one
  whose `portionCount` is a real `0` seeds `"0"`.
* **`yieldFactor` is where that coercion is money.** `null` means "no trim loss"; `Number(null)` is 0,
  and 0 is outside the server's `(0,1]` range — so the coercion would not fail silently, it would make
  a save that changed nothing impossible. The fake mirrors the server's range check, and
  `a null yield factor stays null, and a real one is not rounded away` asserts `null` stays `null`
  (explicitly `not.toBe(0)`) while `0.9` survives.
* **The edit is a REPLACE, not a patch.** `EditDraftAsync` assigns yield, unit, portions, `Notes` and
  the whole component set unconditionally. A body omitting `components` deletes every line; one
  omitting `notes` blanks the note. The editor therefore carries the notes it never shows and the
  sub-recipe lines it will not re-point, and `a save that changed one number sends the version whole`
  pins all of it.
* **The revision mix-up.** The detail document carries `revision` at three levels. Retire's `If-Match`
  guards the **active version's** row (`ApplyRevisionGuard(active, ifMatch)`), not the recipe header's.
  The fixture gives the three tokens deliberately different values (`rev-recipe-HEADER`,
  `rev-v-1-live`, `rev-v-2-draft`) so the assertions can tell them apart rather than agreeing with
  whichever was picked; both the edit and the retire tests assert `not.toBe` against the wrong ones.
* **An existing test asserting the defect:** none found. Nothing was deleted or weakened. The one
  pre-existing assertion I touched at all is the activate button, which gained `data-test="activate"`
  so the control is addressable from the DOM.
* **What I measured is caused by what I think causes it:** the mutation script asserts the binding it
  removes occurs exactly once in the page before removing it, and restores the file in a `finally`.

## Files touched (this lane only; nothing else was cleaned)

* `utils/margin/recipe-client.js` — `CreateVersion`, `UpdateVersion`, `Retire`, `_versionsPath`;
  header route list corrected and the stale "deliberately absent" bullet removed.
* `pages/admin/margin-recipes.vue` — the revise card (STEP 6), the draft editor, `newDraft` /
  `saveDraft` / `retire` / `seedDraftForm` / `draftRequest` / `validateDraft` / `addDraftComponent` /
  `removeDraftComponent` / `draftUnitOptionsFor`, the `activeVersion` + `activeVersionNumber`
  computeds, the `activatable` watcher, `data-test="activate"`, and the `.mrg-btn--danger` /
  `.mrg-revise` styles.
* `translations/no.ts`, `translations/en.ts`, `translations/de.ts` — **14 new `mrg_revise_*` keys,
  hand-edited, inserted after `mrg_activate_no_revision` in each.** No regex, no bulk edit. All three
  files were already dirty from siblings who appended near the end of the file; my block is ~3070 and
  does not overlap theirs, and I touched nothing of theirs.
* `test/margin-recipe-client.test.js` — a `revising and ending a live recipe` describe: 6 route /
  If-Match / typed-refusal tests.
* `test/margin-recipe-revise.test.js` — new, 24 tests.
* `lanes/L-MRG-RECIPE-REVISE-UI/` — this file, `mutation-proof.py`, `mutation-proof.txt`.

## Runs

| what | result |
| --- | --- |
| `npx jest test/margin-recipe-revise.test.js` | 24 / 24 |
| `npx jest test/margin-recipe-client.test.js` | 27 / 27 (21 pre-existing + 6 new) |
| `npx jest test/margin` (whole module, 22 suites) | **473 / 473** |
| `npx jest test/admin-nav-access.test.js` | 28 / 28 |
| `npx eslint` on all four changed source files | 0 errors, 0 warnings |
| mutation proof, 4 arms | all four discriminate; see the table above |

No container was started. No shared ref moved. No migration authored. Nothing pushed. The playwright
journey suite under `test/e2e/` was NOT run (jest excludes it, and one journey is known red at the
tip). No failure that failed to reproduce.

## Named for the reader, not fixed here

* **Retire is terminal, by the backend's design.** After retiring there is no Active version, so
  `CreateDraftFromActiveAsync` refuses (`margin.no-active-version`) and the recipe can never be costed
  again — and `CreateAsync`'s name check still counts the retired recipe, so it cannot be re-created
  under the same name either. That is the server's contract, not a UI gap, but it is exactly the
  "state you can enter and not leave" shape, so the copy warns before the button is pressed
  (`mrg_revise_retire_lede`, asserted in all three languages by
  `the retire copy warns that it cannot be taken back`).
* **The draft editor edits ingredient lines and preserves sub-recipe lines verbatim.** It can remove a
  sub-recipe line but cannot re-point one at an ingredient, deliberately: the two cost different
  things. Adding a sub-recipe component from this screen is not offered.
* **C5 acceptance is still owed.** This lane's exit names a test against the mocked wire and that is
  what is delivered; a person walking the journey in a browser is Sven's gate, and no live world of
  mine exists to open.
