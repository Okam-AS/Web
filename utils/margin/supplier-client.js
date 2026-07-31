// The Margin SUPPLIER client — suppliers, their sellable articles, and the effective-dated prices
// those articles carry. The STORE ADMIN surface, scoped to one store.
//
// Route-for-route with `MarginSuppliersController` and adds nothing; the controller's own grouping is
// kept so the two can be diffed by eye:
//
//   GET    /margin/suppliers?storeId[&includeArchived]                 suppliers (4)
//   POST   /margin/suppliers?storeId
//   PUT    /margin/suppliers/{id}?storeId                              (If-Match)
//   POST   /margin/suppliers/{id}/archive?storeId                      (If-Match)
//   GET    /margin/suppliers/{id}/items?storeId[&includeArchived]      supplier items (3)
//   POST   /margin/suppliers/{id}/items?storeId
//   PUT    /margin/suppliers/{id}/items/{itemId}?storeId               (If-Match)
//   GET    /margin/supplier-items/{id}/prices?storeId                  prices (2)
//   POST   /margin/supplier-items/{id}/prices?storeId                  (no If-Match — append-only)
//
// TWO ABSENCES THAT ARE THE BACKEND'S, NOT THIS FILE'S, and that the screens have to live inside:
//
//  1. THERE IS NO `GET /margin/suppliers/{id}`. The list answers `MarginSupplierSummary`, which
//     carries no `revision` — only create/update/archive answer `MarginSupplierDetail`, which does.
//     `TryReadIfMatch` demands the header on EVERY provider, so a supplier's revision is obtainable
//     ONLY from the response to a write in the same session. After a reload there is no way to get
//     one, and the edit/archive controls therefore cannot be offered. The page says so rather than
//     rendering a button that would answer `margin.revision-required` forever. Supplier ITEMS do not
//     have this problem: their list carries `revision` on every row.
//  2. THERE IS NO UNARCHIVE, for suppliers, items or ingredients. `ArchiveAsync` sets
//     `Status = Archived` and nothing sets it back. Archiving is therefore presented as one-way,
//     because it is.

import { MarginModuleClient, scoped } from '~/utils/margin/module-client';

function withArchived (path, includeArchived) {
  return includeArchived ? path + '?includeArchived=true' : path;
}

export class MarginSupplierService extends MarginModuleClient {
  // ---- Suppliers -------------------------------------------------------------------------------

  /**
   * The store's suppliers. `includeArchived` widens the list; the rows come back WITHOUT a revision
   * (see absence 1 in the header), so a row read from here can be read and used but not written.
   */
  ListSuppliers (storeId, includeArchived) {
    return this._request('GET', scoped(withArchived('/margin/suppliers', includeArchived), storeId));
  }

  /**
   * Creates a supplier and answers the FULL detail — revision included. That response is the only
   * place a supplier's revision ever appears for a row the caller did not just write, so the page
   * keeps it: it is what makes edit and archive possible at all before the next reload.
   */
  CreateSupplier (storeId, request) {
    return this._mutate('POST', scoped('/margin/suppliers', storeId), request);
  }

  /**
   * A full replace of the supplier's own fields. The server re-normalises the name and re-checks the
   * case-insensitive uniqueness, so a clash comes back as an uncoded 400 whose `detail` names it.
   */
  UpdateSupplier (storeId, supplierId, revision, request) {
    return this._mutateWithRevision('PUT', scoped(this._supplierPath(supplierId), storeId), request, revision);
  }

  /**
   * Archive — ONE WAY, and it also CLEARS the contact person (name, e-mail, phone) because the
   * lawful basis for holding it ends with the relationship (spec §13). The page says both before it
   * asks; a venue that expected a reversible "hide" would otherwise lose the contact details to it.
   */
  ArchiveSupplier (storeId, supplierId, revision) {
    return this._mutateWithRevision('POST', scoped(this._supplierPath(supplierId) + '/archive', storeId), {}, revision);
  }

  // ---- Supplier items --------------------------------------------------------------------------

  /**
   * One supplier's articles. Every row carries its own `revision`, so unlike suppliers these stay
   * editable across a reload.
   */
  ListItems (storeId, supplierId, includeArchived) {
    return this._request('GET', scoped(withArchived(this._supplierPath(supplierId) + '/items', includeArchived), storeId));
  }

  /**
   * Creates an article against ONE ingredient of the same store.
   *
   * `packSize` and `purchaseUnitToBaseFactor` are optional on the wire and REQUIRED for the item to
   * cost anything: `MarginPriceResolver` excludes an item missing either from the candidate set
   * entirely. Worse, if the excluded item is the `isPreferred` one, the ingredient resolves to NO
   * price at all rather than falling through to a rival. The editor states that; this client only
   * carries the fields.
   */
  CreateItem (storeId, supplierId, request) {
    return this._mutate('POST', scoped(this._supplierPath(supplierId) + '/items', storeId), request);
  }

  /**
   * A full replace of the item's fields. `isPreferred` is a THREE-state field on this request —
   * `true` marks it (clearing any other preferred item for the same ingredient in the same
   * transaction), `false` unmarks it, and OMITTING it leaves the marker alone. The editor always
   * sends a boolean, so the omission case is not reachable from here; the tri-state is named because
   * the wire has it.
   */
  UpdateItem (storeId, supplierId, itemId, revision, request) {
    const path = this._supplierPath(supplierId) + '/items/' + encodeURIComponent(itemId);
    return this._mutateWithRevision('PUT', scoped(path, storeId), request, revision);
  }

  // ---- Prices ----------------------------------------------------------------------------------

  /**
   * The item's whole price timeline, newest effective instant first. Rows are append-only and
   * non-overlapping: at most one is open (`effectiveTo: null`), and every earlier one was closed at
   * the instant its successor opened. `~/utils/margin/price-timeline` reads that shape.
   */
  GetPrices (storeId, supplierItemId) {
    return this._request('GET', scoped(this._itemPricesPath(supplierItemId), storeId));
  }

  /**
   * Records a manual price and answers the WHOLE refreshed timeline, not just the new row — which is
   * what makes the supersession visible without a second read: the predecessor comes back already
   * closed at the new instant.
   *
   * NO `If-Match`. Price rows are append-only and carry no rowversion, and the controller asks for
   * no header; sending one would be a guard the server does not check.
   *
   * `effectiveFromUtc` is REQUIRED and has no server-side default (`AddMarginManualPriceRequest`;
   * a `default` instant is refused). This is the one Margin write where a client-supplied instant is
   * correct rather than avoided: it is the date the SUPPLIER's price starts applying, a fact about
   * the invoice, not a stamp about when the row was typed.
   */
  AddManualPrice (storeId, supplierItemId, request) {
    return this._mutate('POST', scoped(this._itemPricesPath(supplierItemId), storeId), request);
  }

  _supplierPath (supplierId) {
    return '/margin/suppliers/' + encodeURIComponent(supplierId);
  }

  _itemPricesPath (supplierItemId) {
    return '/margin/supplier-items/' + encodeURIComponent(supplierItemId) + '/prices';
  }
}

export default MarginSupplierService;
