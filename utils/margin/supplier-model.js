// The supplier / supplier-item model: what the two list reads returned, plus the ONE derived fact
// that decides whether any of it reaches a plate cost.
//
// WHY "CAN THIS ITEM COST ANYTHING" IS COMPUTED HERE AND NOT LEFT TO THE READER OF A FORM. Because
// the rule is invisible from the form, and getting it wrong looks like everything worked.
// `MarginPriceResolver` only considers an item that is Active AND has `packSize > 0` AND has
// `purchaseUnitToBaseFactor > 0` — both fields are optional on the wire, so an item saved without
// them is accepted, appears in every list, can be given a price, and contributes NOTHING. The venue
// then reads "none of the 4 lines has a price" on the recipes page and goes looking at the price it
// just entered, which is fine.
//
// And one step worse, which is the case this file is really for: if the item missing a pack size is
// the one marked PREFERRED, the resolver does not fall through to a rival supplier — it returns no
// price for the ingredient AT ALL (`preferredIsPresentButNotCostable`). One incomplete preferred
// item silently un-prices an ingredient that has two other perfectly good priced suppliers.

/** Active, with a pack size and a purchase-unit conversion: this item can produce a cost. */
export const ITEM_COSTABLE = 'costable';
/** Active but missing a pack size or the conversion factor: excluded from costing entirely. */
export const ITEM_INCOMPLETE = 'incomplete';
/** Archived: out of pick-lists and out of costing. History is retained. */
export const ITEM_ARCHIVED = 'archived';

/** A supplier list row. No `revision` — the list does not carry one; see `supplier-client`. */
export function readSupplierRow (supplier) {
  const row = supplier || {};
  return {
    supplierId: row.supplierId || null,
    name: row.name || null,
    organizationNumber: row.organizationNumber || null,
    status: row.status || null,
    isArchived: row.status === 'Archived'
  };
}

/**
 * A supplier-item row, with its costability judged.
 *
 * `packSize` and `factor` stay null when the wire sent null — they are not defaulted to 1, which
 * would be a fabricated conversion and would make an uncostable item look costable.
 */
export function readSupplierItem (item) {
  const row = item || {};
  const packSize = positiveOrNull(row.packSize);
  const factor = positiveOrNull(row.purchaseUnitToBaseFactor);
  const isArchived = row.status === 'Archived';

  return {
    supplierItemId: row.supplierItemId || null,
    supplierId: row.supplierId || null,
    ingredientId: row.ingredientId || null,
    supplierArticleNumber: row.supplierArticleNumber || null,
    name: row.name || null,
    packSize,
    purchaseUnitCode: row.purchaseUnitCode || null,
    purchaseUnitToBaseFactor: factor,
    isPreferred: row.isPreferred === true,
    status: row.status || null,
    isArchived,
    // The row's own revision. Present on every item (unlike suppliers), which is what keeps the item
    // editor usable after a reload.
    revision: row.revision || null,
    costState: isArchived
      ? ITEM_ARCHIVED
      : (packSize !== null && factor !== null ? ITEM_COSTABLE : ITEM_INCOMPLETE),
    // Which of the two is missing, so the message can name it instead of saying "something".
    missingPackSize: !isArchived && packSize === null,
    missingFactor: !isArchived && factor === null
  };
}

/**
 * The ingredient-level warning: an ACTIVE PREFERRED item that cannot cost.
 *
 * Returns the offending item or null. Computed across one ingredient's items, because the damage is
 * to the ingredient rather than to the item — the other items may be complete and priced and will
 * still not be used.
 */
export function blockingPreferredItem (items) {
  return (items || []).find(item => item.isPreferred && item.costState === ITEM_INCOMPLETE) || null;
}

/** A wire decimal that is a usable quantity, or null. Zero and negatives are not usable. */
function positiveOrNull (value) {
  return typeof value === 'number' && isFinite(value) && value > 0 ? value : null;
}
