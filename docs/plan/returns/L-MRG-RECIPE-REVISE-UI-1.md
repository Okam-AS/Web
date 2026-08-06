```
RETURN: L-MRG-RECIPE-REVISE-UI
brief: 50fdc105
verdict: built
evidence: lanes/L-MRG-RECIPE-REVISE-UI/evidence.md
log:
Brief was coherent; no fragments of another lane. Every claim in it verified true at 3cd2570.
Client had none of CreateVersion/UpdateVersion/Retire; the 3 routes are live in MarginRecipesController.
Added all three to utils/margin/recipe-client.js and a revise card + draft editor to margin-recipes.vue.
C3: nav entry /admin/margin-recipes already existed (AdminPageHeader.vue:368) - ASSERTED, not rebuilt.
Instrument: test/margin-recipe-revise.test.js, 24 tests, stateful fake wire built on MarginRecipeService.
Round trip drives new-draft/edit/activate/retire through the DOM, incl. selecting the recipe from the list.
State asserted by value each step; v-1 proven Superseded after activation and no Active row after retire.
Retire proven reachable from Active and absent on a draft-only recipe (paired fixtures, same screen).
MUTATION: 4 arms, one @click unbound each -> 4 / 6 / 3 / 5 newly red, each attributable to its own step.
No arm reds everything: 12/9/13/11 step-scoped tests stay green per arm.
margin-recipes-page.test.js stayed GREEN in ALL FOUR arms - it calls vm.activate() directly. Recorded,
not changed; it pins no defect. No existing test asserted the defect, nothing deleted or weakened.
Traps pinned: null/undefined/''/real-0 apart; yieldFactor null never 0; notes+sub-recipe lines survive
the REPLACE; retire If-Match is the ACTIVE VERSION's, not the header's. margin 473/473, eslint clean.
NOT COMMITTED: translations/{no,en,de}.ts also carry sibling edits, so no pathspec commit is safe.
END RETURN
```
