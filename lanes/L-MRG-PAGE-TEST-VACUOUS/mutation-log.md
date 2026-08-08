# L-MRG-PAGE-TEST-VACUOUS -- mutation log

Worktree `/Users/svendaneel/okam/web-mrgpagevac`, branch `lane/mrg-page-test-vacuous`,
based on `feature/restaurant-modules` @ `3cd2570` (the integration tip named in the brief; verified
by `git log`, not assumed).

Harness: `lanes/L-MRG-PAGE-TEST-VACUOUS/mutation-proof.py` -- rerun with
`python3 lanes/L-MRG-PAGE-TEST-VACUOUS/mutation-proof.py` from the worktree root.
Suite under proof: `test/margin-recipes-page.test.js`.
`OLD` is that file exactly as it stood at `3cd2570`, kept at
`lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js`.

Each mutation replaces one handler binding with an inert attribute, so the control still RENDERS and
is still findable and only the wiring goes -- which is the defect being modelled: a control on
screen that does nothing.

## What the mutations found

The brief reported, from `L-MRG-RECIPE-REVISE-UI`, that this file stayed green when the activate
button was unbound. That is confirmed, and it is worse than reported: **the file was blind to all
four of the controls its own assertions depend on.** OLD reds 0 of 29 under every one of the four
mutations below. Four describes -- "entering a recipe", "the three concurrency arms", "activating a
draft", "linking a recipe" -- named four page transitions and pinned none of them, because every one
entered through `wrapper.vm.<handler>()`.

Each mutation reds ITS OWN transition's tests and leaves the rest green, so the suite discriminates
rather than merely running:

- `select-recipe` reds 11 and leaves 20 green -- the module gate, the read-state screens, the create
  path and the copy checks are untouched. Selection is a genuine precondition of activation and
  linking, so those reding is cause, not collateral.
- `activate` reds 3, all inside the activate describe. It correctly does NOT red
  "a draft with no revision offers no activate button", which is about the `v-if` and not the
  binding.
- `create-recipe` reds 10 -- the four create tests, the five concurrency arms that press submit, and
  the create-side margin re-read. The two pure dictionary tests in that describe stay green because
  they never touch the page.
- `save-links` reds exactly the 2 tests that save. The two that only READ the link set stay green.

Causality was checked rather than assumed: under `activate` the red is
`expect(named('ActivateVersion')).toHaveLength(1)` receiving 0 -- the button was found and pressed,
and nothing was sent. It is not a missing selector and not a helper throw.

## Baseline -- page unmutated

| suite | passed | failed |
| --- | --- | --- |
| OLD (`wrapper.vm.*`, as at 3cd2570) | 29 | 0 |
| NEW (driven through the DOM) | 31 | 0 |

## Mutation `select-recipe` -- unbind the recipe list row

```
- @click="selectRecipe(row.recipeId)"
+ data-unbound="selectRecipe"
```

| state | suite | page | passed | failed |
| --- | --- | --- | --- | --- |
| 1 | OLD | UNBOUND | 29 | **0** |
| 2 | NEW | UNBOUND | 20 | **11** |
| 3 | NEW | restored | 31 | **0** |

NEW suite failures under the mutation:
- activating a draft carries the DRAFT revision, not the recipe header one > the row that was clicked is the recipe that gets read
- activating a draft carries the DRAFT revision, not the recipe header one > the highest draft and its own revision are what get sent
- activating a draft carries the DRAFT revision, not the recipe header one > the detail is re-read after activation rather than patched
- activating a draft carries the DRAFT revision, not the recipe header one > a draft with no revision offers no activate button, and says why
- activating a draft carries the DRAFT revision, not the recipe header one > activation re-reads the menu margin, not just the recipe
- the margin read is unknown when it fails, never an empty menu > a failed menu-margin read leaves the model UNKNOWN
- the margin read is unknown when it fails, never an empty menu > CONTROL: an answered read is READY, and its rows reach the page
- linking a recipe to the dishes it is sold as > selecting a recipe reads its own link set
- linking a recipe to the dishes it is sold as > a failed link read leaves the set UNKNOWN rather than empty
- linking a recipe to the dishes it is sold as > saving sends the whole desired set and re-reads the margin it just changed
- linking a recipe to the dishes it is sold as > a server refusal renders from its CODE, not its prose

## Mutation `activate` -- unbind the activate button

```
- @click="activate"
+ data-unbound="activate"
```

| state | suite | page | passed | failed |
| --- | --- | --- | --- | --- |
| 1 | OLD | UNBOUND | 29 | **0** |
| 2 | NEW | UNBOUND | 28 | **3** |
| 3 | NEW | restored | 31 | **0** |

NEW suite failures under the mutation:
- activating a draft carries the DRAFT revision, not the recipe header one > the highest draft and its own revision are what get sent
- activating a draft carries the DRAFT revision, not the recipe header one > the detail is re-read after activation rather than patched
- activating a draft carries the DRAFT revision, not the recipe header one > activation re-reads the menu margin, not just the recipe

## Mutation `create-recipe` -- unbind the create button

```
- @click="createRecipe"
+ data-unbound="createRecipe"
```

| state | suite | page | passed | failed |
| --- | --- | --- | --- | --- |
| 1 | OLD | UNBOUND | 29 | **0** |
| 2 | NEW | UNBOUND | 21 | **10** |
| 3 | NEW | restored | 31 | **0** |

NEW suite failures under the mutation:
- entering a recipe > the create response IS the cost: no follow-up GET is issued
- entering a recipe > the request is shaped the way the controller binds it
- entering a recipe > a blank name is refused locally without a round trip
- entering a recipe > a server refusal is rendered from its CODE, not its prose
- the three concurrency arms are three different sentences > an absent precondition is its own message, not the generic one
- the three concurrency arms are three different sentences > a mangled precondition is its own message too
- the three concurrency arms are three different sentences > and the lost race keeps its own, which is now the ONLY one advising a retry
- the three concurrency arms are three different sentences > none of the three falls through to the generic failure
- the three concurrency arms are three different sentences > the code decides, and the status does not
- linking a recipe to the dishes it is sold as > creating a recipe re-reads the margin so the new recipe can be named as unsold

## Mutation `save-links` -- unbind the product-link editor save

```
- @save="saveLinks"
+ data-unbound="saveLinks"
```

| state | suite | page | passed | failed |
| --- | --- | --- | --- | --- |
| 1 | OLD | UNBOUND | 29 | **0** |
| 2 | NEW | UNBOUND | 29 | **2** |
| 3 | NEW | restored | 31 | **0** |

NEW suite failures under the mutation:
- linking a recipe to the dishes it is sold as > saving sends the whole desired set and re-reads the margin it just changed
- linking a recipe to the dishes it is sold as > a server refusal renders from its CODE, not its prose

## Summary

| mutation | OLD reds | NEW reds | NEW restored reds | verdict |
| --- | --- | --- | --- | --- |
| `select-recipe` | 0 | 11 | 0 | PINNED |
| `activate` | 0 | 3 | 0 | PINNED |
| `create-recipe` | 0 | 10 | 0 | PINNED |
| `save-links` | 0 | 2 | 0 | PINNED |

