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
//   POST /margin/recipes/{recipeId}/versions?storeId                  MarginRecipesController
//   PUT  /margin/recipes/{recipeId}/versions/{versionId}?storeId      MarginRecipesController (If-Match)
//   POST /margin/recipes/{recipeId}/versions/{versionId}/activate     MarginRecipesController (If-Match)
//   POST /margin/recipes/{recipeId}/retire?storeId                    MarginRecipesController (If-Match)
//   GET  /margin/recipes/{recipeId}/product-links?storeId             MarginRecipesController
//   PUT  /margin/recipes/{recipeId}/product-links?storeId             MarginRecipesController
//   GET  /margin/menu-margin?storeId                                  MarginMenuMarginController
//
// WHAT IS DELIBERATELY ABSENT, so its absence is not read as an oversight:
//
//  • `/margin/statements` and `/margin/coverage` — bound by `~/utils/margin/statement-client`, which
//    owns the weekly reconciliation journey. They used to be absent from this repo entirely because
//    the projector labelled the journal's Oslo wall-clock stamp as UTC and a surface resting on that
//    is wrong every evening; the epoch ruling has since landed (the projector takes its business date
//    from `IKassaBusinessDateResolver`, and `MarginBusinessDateEpochSwitchTests` is the after picture
//    with the legacy relabel kept as its discriminating control), so the block is lifted.
//
// The supplier, ingredient, price and import surfaces now exist too, as
// `~/utils/margin/supplier-client`, `~/utils/margin/ingredient-client` and
// `~/utils/margin/price-import-client`. They are separate clients rather than more methods here for
// the reason this file is organised the way it is: one client per controller, so the two can be
// diffed by eye.

import { MarginModuleClient, scoped } from '~/utils/margin/module-client';

/** `GetStatus` and the `?storeId=` scoping come from `MarginModuleClient` — see that file. */
export class MarginRecipeService extends MarginModuleClient {
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

  /**
   * A NEW Draft, cloned from the recipe's current ACTIVE version.
   *
   * This is the only way to change a recipe once it is live: an Active version is immutable (R4), so
   * a fix is a new draft, edited, then activated in the old one's place. A recipe with no Active
   * version is refused by CODE (`margin.no-active-version`) rather than by a precondition — there is
   * nothing to clone.
   *
   * NO `If-Match`. The controller routes this action through `Run` rather than `RunWithIfMatch` and
   * asks for no header, so sending a revision would be a guard the server does not check — which
   * reads as a guarantee and is not one. Nothing is overwritten either way: the clone is a new row.
   *
   * The body carries `notes` only, and OMITTING it is meaningful: the server falls back to the
   * Active version's notes (`request?.Notes ?? active.Notes`), which is what a clone should inherit.
   */
  CreateVersion (storeId, recipeId, request) {
    return this._mutate('POST', scoped(this._versionsPath(recipeId), storeId), request || {});
  }

  /**
   * Replaces a DRAFT version's whole content. The DRAFT's own revision travels in `If-Match`.
   *
   * REPLACE, NOT PATCH, and that is the trap every caller above this has to respect:
   * `MarginRecipeService.EditDraftAsync` ASSIGNS `YieldQuantity`, `YieldUnit`, `PortionCount`,
   * `Notes` and the whole component set unconditionally. A body that omits `components` therefore
   * DELETES every component line — including sub-recipe lines, which cost a different dish — and one
   * that omits `notes` blanks a note the caller may never have offered to change. The caller sends
   * the version whole or it silently loses what it did not send.
   *
   * Only a Draft is editable; Active, Superseded and Retired are immutable and answer
   * `margin.version-not-draft`.
   */
  UpdateVersion (storeId, recipeId, versionId, request, revision) {
    const path = this._versionsPath(recipeId) + '/' + encodeURIComponent(versionId);
    return this._mutateWithRevision('PUT', scoped(path, storeId), request, revision);
  }

  /**
   * Ends the recipe's costing: its ACTIVE version becomes Retired and the recipe has none.
   *
   * THE REVISION IS THE ACTIVE VERSION'S — the row the server actually guards
   * (`ApplyRevisionGuard(active, ifMatch)`) — and NOT the recipe header's, which the detail document
   * carries one level up under the same field name. Sending the header's would compare a recipe
   * rowversion against a version rowversion: a spurious 409, or worse, a pass.
   *
   * Reachable only FROM ACTIVE. There is no route that retires a draft, and a recipe with no Active
   * version answers `margin.no-active-version`.
   *
   * `EffectiveFrom` is deliberately not sent, exactly as on activate: it defaults to the server's
   * injected clock, and a client-supplied instant has no business entering a module whose journal
   * epoch is an open defect.
   */
  Retire (storeId, recipeId, revision) {
    const path = '/margin/recipes/' + encodeURIComponent(recipeId) + '/retire';
    return this._mutateWithRevision('POST', scoped(path, storeId), {}, revision);
  }

  /**
   * The recipe's product links — the dishes it is sold as.
   *
   * Read even though `GET /margin/menu-margin` already reports a link per row: the menu margin is
   * built from the CATALOG, so a link pointing at a product the catalog no longer has produces no row
   * there at all. This surface reports it, flagged broken (spec §7 C2, gate F2). The editor is seeded
   * from THIS list, because the save below is a replace-set and seeding it from the menu margin would
   * silently drop a link nobody was shown.
   */
  GetProductLinks (storeId, recipeId) {
    return this._request('GET', scoped(this._linksPath(recipeId), storeId));
  }

  /**
   * REPLACE-SET: the body is the recipe's complete desired set of active links, not a delta. Sending
   * `{ links: [] }` clears them.
   *
   * NO `If-Match`. This one is not an aggregate mutation — the controller routes it through `Run`
   * rather than `RunWithIfMatch` and asks for no header — so sending a revision would be a guard the
   * server does not check, which reads as a guarantee and is not one. Its own concurrency defence is
   * the filtered unique index behind the single-active-link rule; a race there comes back as
   * `margin.stale-revision` from the server, not from a header this client sent.
   *
   * `EffectiveFrom` is deliberately omitted, exactly as on activate: it defaults to the server's
   * injected clock, and a client-supplied instant has no business entering a module whose journal
   * epoch is an open defect.
   */
  SetProductLinks (storeId, recipeId, links) {
    return this._mutate('PUT', scoped(this._linksPath(recipeId), storeId), {
      links: links.map(link => ({
        productId: link.productId,
        quantityPerSoldUnit: link.quantityPerSoldUnit
      }))
    });
  }

  /**
   * Every dish in the store's catalog, its plate cost, and the margin it earns against the price the
   * till would actually charge — ONE ROW PER PRICE BASIS, because a dish has one plate cost and up to
   * three prices at up to three VAT rates.
   *
   * Store-wide rather than per recipe: the read has no per-dish route, and its answer also carries
   * the product catalog this module has no endpoint of its own for. See `~/utils/margin/menu-margin`,
   * where the row model and its honest states live.
   */
  GetMenuMargin (storeId) {
    return this._request('GET', scoped('/margin/menu-margin', storeId));
  }

  _linksPath (recipeId) {
    return '/margin/recipes/' + encodeURIComponent(recipeId) + '/product-links';
  }

  _versionsPath (recipeId) {
    return '/margin/recipes/' + encodeURIComponent(recipeId) + '/versions';
  }
}

export default MarginRecipeService;
