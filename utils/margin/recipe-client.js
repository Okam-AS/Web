// The Margin recipe API client — the STORE ADMIN surface, scoped to one store.
//
// Deliberately route-for-route with the backend and adds nothing: every method below maps to a
// controller action that exists today in `OkamAPI-modules`. The controller file and its own endpoint
// numbering are named on each method so the two can be diffed by eye.
//
//   GET  /margin/status?storeId                                       MarginStatusController
//   GET  /margin/ingredients?storeId                                  MarginIngredientsController #1
//   POST /margin/ingredients?storeId                                  MarginIngredientsController #2
//   GET  /margin/recipes?storeId                                      MarginRecipesController
//   POST /margin/recipes?storeId                                      MarginRecipesController
//   GET  /margin/recipes/{recipeId}?storeId                           MarginRecipesController
//   POST /margin/recipes/{recipeId}/versions/{versionId}/activate     MarginRecipesController (If-Match)
//
// WHAT IS DELIBERATELY ABSENT, so its absence is not read as an oversight:
//
//  • `GET /margin/menu-margin` — the read that would answer "what is this dish's margin against its
//    menu price". IT DOES NOT EXIST. `WebApi.Tests/Margin/MarginMenuMarginReadTests.cs:19` says so in
//    its own words ("is NOT BUILT; this file is its ORACLE") and fixes the contracted field list
//    `{netPriceMinor, plateCostMinor, contributionMinor, foodCostPercent, priceBasis, costComplete}`
//    for whenever it lands. Nothing here reconstructs it: the net price is gross minus VAT, and the
//    VAT rate is resolved server-side from the goods-group profile plus the delivery-type basis
//    (`Helpers/ProductExtensions.cs`), so a client-side net price would be a guess dressed as money.
//  • `/margin/statements` and `/margin/coverage` — both read the projected sales facts, and the
//    projector currently labels the journal's Oslo wall-clock stamp as UTC
//    (`MarginBusinessDateEpochPinTests`, red and pinned). A surface whose correctness rests on that
//    is a surface that is wrong every evening, so this one does not touch it.
//  • the draft edit, retire, product-link, supplier, price and import surfaces — other journeys.

import { MarginClientBase } from '~/utils/margin/api-client';

/** `?storeId=` is the authoritative tenant scope on every Margin route; body tenant ids are ignored. */
function scoped (path, storeId) {
  return path + (path.includes('?') ? '&' : '?') + 'storeId=' + encodeURIComponent(storeId);
}

export class MarginRecipeService extends MarginClientBase {
  /**
   * The module's own self-report: the resolved `Margin.*` flag states, the active recipe count and
   * (once the projector has run) the sales-projection lag.
   *
   * Called FIRST and used only to tell "the module is off for this store" from "the module is on and
   * the read failed". Both answer 404 on every other route — the module is uniformly invisible when
   * off, by design — so without this read the page would have to guess which one it was looking at.
   */
  GetStatus (storeId) {
    return this._request('GET', scoped('/margin/status', storeId));
  }

  /**
   * The store's ingredient master, PLUS the starter-library copy candidates.
   *
   * The candidates are the backend's own bootstrap affordance (spec §2 in-scope item 2): curated
   * name + base unit + suggested conversions for names the store does not already have. Copying one
   * is a normal create, which is why `CreateIngredient` below is the only write this surface needs to
   * get an empty store to its first recipe.
   */
  ListIngredients (storeId) {
    return this._request('GET', scoped('/margin/ingredients', storeId));
  }

  /** Creates one ingredient. The base unit is FIXED at creation and immutable afterwards (spec §3). */
  CreateIngredient (storeId, request) {
    return this._mutate('POST', scoped('/margin/ingredients', storeId), request);
  }

  ListRecipes (storeId) {
    return this._request('GET', scoped('/margin/recipes', storeId));
  }

  /**
   * One recipe: its active + draft versions and the compute-on-read cost preview.
   *
   * The preview is of the ACTIVE version when there is one and otherwise of the latest Draft
   * (`MarginRecipeService.GetAsync`), so the response alone does not say which — the caller compares
   * `costPreview.recipeVersionId` against `activeVersion.recipeVersionId`. See
   * `readCostPreview` in `~/utils/margin/cost-preview`, where that comparison lives once.
   */
  GetRecipe (storeId, recipeId) {
    return this._request('GET', scoped('/margin/recipes/' + encodeURIComponent(recipeId), storeId));
  }

  /**
   * Creates a recipe header plus its first Draft version, and answers with the FULL detail document
   * — cost preview included. One round trip from "entered" to "costed"; there is no second read.
   *
   * No `If-Match`: there is no prior revision of a resource that does not exist yet, and the
   * controller does not ask for one on this action.
   */
  CreateRecipe (storeId, request) {
    return this._mutate('POST', scoped('/margin/recipes', storeId), request);
  }

  /**
   * Draft → Active. The DRAFT VERSION's revision travels in `If-Match`; a stale one is a typed 409
   * (`margin.stale-revision`) and a missing one is refused before the request leaves (see
   * `MarginMissingRevisionError`).
   *
   * `EffectiveFrom` is deliberately not sent. It defaults to the server's injected clock, and the one
   * thing this surface must not do is put a client-supplied instant into a module whose journal epoch
   * is an open defect.
   */
  ActivateVersion (storeId, recipeId, versionId, revision) {
    const path = '/margin/recipes/' + encodeURIComponent(recipeId) +
      '/versions/' + encodeURIComponent(versionId) + '/activate';
    return this._mutateWithRevision('POST', scoped(path, storeId), {}, revision);
  }
}

export default MarginRecipeService;
