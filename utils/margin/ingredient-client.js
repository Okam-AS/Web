// The Margin INGREDIENT MASTER client — the five endpoints of `MarginIngredientsController`:
//
//   GET  /margin/ingredients?storeId[&includeArchived]     list + starter-library candidates
//   POST /margin/ingredients?storeId                       create
//   GET  /margin/ingredients/{id}?storeId                  detail: conversions + REVISION
//   PUT  /margin/ingredients/{id}?storeId                  (If-Match)
//   POST /margin/ingredients/{id}/archive?storeId          (If-Match)
//
// `~/utils/margin/recipe-client` also has `ListIngredients` and `CreateIngredient`, and that is not a
// duplicate to be collapsed: the recipes page needs exactly those two to get an empty store to its
// first recipe, and giving it a client that can also archive an ingredient would put a write it never
// makes one keystroke from the page. This client is the ingredient master's own surface, and it is
// the only one that can reach the three writes the recipes page has no business making.
//
// THE SHAPE THAT MAKES EDITING POSSIBLE HERE AND NOT ON SUPPLIERS: the list rows
// (`MarginIngredientSummary`) carry no revision, but `GET {id}` answers `MarginIngredientDetail`,
// which does. So the editor reads the ingredient it is about to write, and the revision is always
// available. Suppliers have no per-id read at all — see `~/utils/margin/supplier-client`.

import { MarginModuleClient, scoped } from '~/utils/margin/module-client';

export class MarginIngredientService extends MarginModuleClient {
  /**
   * The store's ingredients PLUS the starter-library copy candidates.
   *
   * `includeArchived` widens the ingredient list only. The candidate list is unaffected by it: the
   * server excludes a candidate whose name the store already holds IN ANY STATUS, so archiving an
   * ingredient does NOT make its starter chip come back — and since there is no unarchive, that name
   * cannot be re-created from a chip either. The page says so where a venue would otherwise look for
   * the chip that has gone.
   */
  ListIngredients (storeId, includeArchived) {
    const path = includeArchived ? '/margin/ingredients?includeArchived=true' : '/margin/ingredients';
    return this._request('GET', scoped(path, storeId));
  }

  /**
   * One ingredient with its revision and its conversions — ACTIVE AND SUPERSEDED both, newest
   * version per from-unit first. The superseded ones are history rather than noise: a factor that
   * changed is why a cost changed, and the editor shows them read-only for that reason.
   */
  GetIngredient (storeId, ingredientId) {
    return this._request('GET', scoped(this._path(ingredientId), storeId));
  }

  /**
   * Creates an ingredient. The BASE UNIT IS FIXED AT CREATION — `UpdateMarginIngredientRequest` has
   * no `baseUnit` field at all, so it is immutable by construction rather than by a check. The form
   * says so before the venue picks one.
   */
  CreateIngredient (storeId, request) {
    return this._mutate('POST', scoped('/margin/ingredients', storeId), request);
  }

  /**
   * Name, notes and conversions. The conversions are VERSIONED IN THE PAYLOAD, not replaced by it:
   * a factor that differs from the active one supersedes it forward (the old version stays, flagged
   * inactive), an identical factor is a no-op, and a unit ABSENT from the payload is left exactly as
   * it was — omitting a conversion does not delete it, and nothing in this API can.
   *
   * That is why the editor sends every conversion it is showing, not a delta, and why it offers no
   * delete control: there is no endpoint behind one.
   */
  UpdateIngredient (storeId, ingredientId, revision, request) {
    return this._mutateWithRevision('PUT', scoped(this._path(ingredientId), storeId), request, revision);
  }

  /**
   * Archive — ONE WAY (there is no unarchive endpoint in the module). It retires the ingredient from
   * pick-lists and destroys nothing: recipes that reference it keep referencing it, and the cost
   * preview keeps costing them. What it does change is the NAME lookup on the recipes page, which
   * lists active ingredients only and will render the line as "the ingredient is no longer in the
   * list" (`NAME_UNRESOLVED`) afterwards.
   */
  ArchiveIngredient (storeId, ingredientId, revision) {
    return this._mutateWithRevision('POST', scoped(this._path(ingredientId) + '/archive', storeId), {}, revision);
  }

  _path (ingredientId) {
    return '/margin/ingredients/' + encodeURIComponent(ingredientId);
  }
}

export default MarginIngredientService;
