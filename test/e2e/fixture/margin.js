// The Margin half of the fixture backend: the recipe/cost surface and the weekly statement.
//
// It is a separate file from `api-server.js` for the reason that file is organised the way it is —
// one place per controller family — and because this module is the only part of the fixture that has
// to COMPUTE something. Margin's whole subject is money, and both of its surfaces are
// compute-on-read: `GET /margin/recipes/{id}` prices the version at the instant it is asked, and
// `GET /margin/menu-margin` prices every dish against the version active at the read instant. A
// fixture that answered canned figures would let a journey pass over a page that had stopped issuing
// the read at all.
//
// WHAT IT HOLDS OF THE CONTRACT, so a green journey means these refusals did NOT fire:
//
//   • `If-Match` on the two aggregate mutations that take one — version activation and every
//     statement mutation. Absent -> 400 `margin.revision-required`; unreadable -> 400
//     `margin.revision-invalid`; stale -> 409 `margin.stale-revision`. Those are three different
//     problems with three different fixes and the real surface splits them, so this does too.
//   • NO `Idempotency-Key`. Margin has no idempotency store, and a fixture that demanded one would
//     make the client look wrong for not sending a header the server never reads.
//   • The single-active-link rule: at most one active product link per product, store-wide. A set
//     naming a product another recipe already claims is `margin.product-link-invalid` (400).
//   • Recipe name uniqueness: `margin.recipe-name-conflict` (400).
//   • The statement surface's business refusals carry NO `code` at all — `MarginStatementsController`
//     renders them through `ModuleProblem`, which emits a `detail` and a `traceId` and nothing else.
//     That asymmetry with the recipe surface is real and is why the statement page pre-empts what it
//     can and quotes the server for the rest, so the fixture reproduces it rather than tidying it up.
//
// WHAT IT IS NOT: a model of the backend. There is no sub-recipe explosion and no VAT engine — a
// product carries its net directly. Anything a journey wants to be true is seeded here explicitly.
//
// ---- WHERE AN INGREDIENT'S PRICE COMES FROM ---------------------------------------------------
//
// TWO PATHS, and the split is deliberate rather than an oversight. A starter ingredient copied out of
// the bootstrap library carries `pricePerBaseUnitMinor` DIRECTLY — a stand-in for supplier data no
// journey walking the recipe surface ever enters, and the only reason `margin-recipe-to-margin` can
// cost a waffle batter in six clicks. An ingredient that has ANY supplier article, on the other hand,
// is priced by `resolvePricePerBaseUnit` and the seeded figure is ignored entirely: the moment a venue
// starts describing where it buys something, the description is what governs.
//
// The resolver reproduces the three rules of `MarginPriceResolver` that decide whether a plate cost
// exists at all, because they are the rules a supplier-to-plate walk is FOR:
//
//   • An article is a candidate only if it is Active AND has `packSize > 0` AND
//     `purchaseUnitToBaseFactor > 0`. Both fields are optional on the wire, so an article missing one
//     is accepted, listed, priceable — and contributes nothing.
//   • An Active PREFERRED article that is not costable un-prices the WHOLE ingredient. The resolver
//     does not fall through to a complete rival; it returns no price at all.
//   • Only the OPEN price row counts (`effectiveTo: null`). Prices are append-only and
//     effective-dated, and recording one closes its predecessor at the instant the new one starts.
//
// Cost per base unit is `priceMinor / (packSize * purchaseUnitToBaseFactor)`, which is the whole of
// the arithmetic. There is no effective-date WINDOW: this fixture reads the open row and never asks
// what the price was on some past instant, because no surface in the product does either.

const world = require('./world');

const CURRENCY = world.CURRENCY;

// ---- units -------------------------------------------------------------------------------------
//
// Mirrors `MarginRecipeSupport.TryFamilyFactor` for the universal families only, which is exactly
// what `utils/margin/units.js` offers in its pickers. A code outside the ingredient's own family does
// not convert, and a line authored in one does not price — the same silent-unpriced outcome the real
// calculator produces, rather than an error.

/** Authored code -> its canonical family unit (kg, l, stk). */
const CANONICAL = { g: 0.001, kg: 1, ml: 0.001, cl: 0.01, dl: 0.1, l: 1, stk: 1 };
/** A `MarginBaseUnit` -> how much of its canonical family unit it is. */
const BASE_IN_CANONICAL = { Gram: 0.001, Kilogram: 1, Milliliter: 0.001, Liter: 1, Piece: 1 };
/** Which canonical family a base unit belongs to, so a cross-family code is refused rather than scaled. */
const FAMILY = { Gram: 'mass', Kilogram: 'mass', Milliliter: 'volume', Liter: 'volume', Piece: 'count' };
const CODE_FAMILY = { g: 'mass', kg: 'mass', ml: 'volume', cl: 'volume', dl: 'volume', l: 'volume', stk: 'count' };

/** Quantity in an authored `unitCode` -> quantity in the ingredient's base unit, or null. */
function toBaseQuantity (quantity, unitCode, baseUnit) {
  if (typeof quantity !== 'number' || !isFinite(quantity)) { return null; }
  if (!CANONICAL[unitCode] || !BASE_IN_CANONICAL[baseUnit]) { return null; }
  if (CODE_FAMILY[unitCode] !== FAMILY[baseUnit]) { return null; }
  return quantity * CANONICAL[unitCode] / BASE_IN_CANONICAL[baseUnit];
}

/**
 * HALF-UP to integer minor units, the way `MarginRecipeCostCalculator` rounds — and rounded ONCE, at
 * the presentation boundary, separately for each line and for the batch total over the UNROUNDED sum.
 * That is why `sum(lines) !== total` in general, and why nothing downstream may add the column up.
 */
function roundMinor (value) {
  return Math.floor(value + 0.5);
}

// ---- state --------------------------------------------------------------------------------------

function fresh () {
  const state = {
    seq: 0,
    ingredients: [],
    recipes: {},
    // recipeId -> [{ productId, quantityPerSoldUnit }]. Active links only; this fixture has no
    // retired-link history, because no surface reads one.
    links: {},
    statements: {},
    // Who the venue buys from, what they sell it, and what it costs. Flat arrays rather than a tree
    // because every read the product makes is a filter over one of them, and a tree would have to be
    // flattened at each one.
    suppliers: [],
    items: [],
    prices: [],
    projectionLag: 4
  };

  // The two suppliers a statement's purchase-spend line can be attributed to. They are STATE rather
  // than a constant list so the supplier surface can add a third beside them, and they are seeded
  // rather than left to a journey because `margin-statement-week` picks one by name out of the spend
  // panel's dropdown and does not go near the supplier screen.
  for (const seed of world.MARGIN_SUPPLIERS) {
    newSupplier(state, { name: seed.name, organizationNumber: seed.organizationNumber || null }, seed.supplierId);
  }

  // ONE SEEDED RECIPE, and it exists to make a refusal reachable. `Kaffe` is claimed by it, so the
  // journey's attempt to link the same product to a second recipe meets the real single-active-link
  // rule rather than a fixture that shrugged.
  const brew = newRecipe(state, 'Kaffebrygg', 'Sellable');
  const version = newVersion(state, brew, {
    yieldQuantity: 1, yieldUnit: 'Liter', portionCount: 1, components: []
  });
  version.state = 'Active';
  version.activatedAtUtc = stamp();
  brew.activeVersionId = version.recipeVersionId;
  state.links[brew.recipeId] = [{ productId: 'prod-kaffe', quantityPerSoldUnit: 1 }];

  return state;
}

function stamp () {
  return new Date().toISOString().slice(0, 19) + 'Z';
}

function nextId (state, prefix) {
  state.seq += 1;
  return prefix + '-' + state.seq;
}

/** An opaque revision token. Bumped on every write, exactly as a rowversion is. */
function bumpRevision (row) {
  row.revision = 'rev-' + row.id + '-' + (row.version = (row.version || 0) + 1);
}

function newRecipe (state, name, kind) {
  const recipeId = nextId(state, 'recipe');
  const recipe = {
    id: recipeId,
    recipeId,
    name,
    kind: kind || 'Sellable',
    createdAtUtc: stamp(),
    versions: [],
    activeVersionId: null,
    version: 0,
    revision: ''
  };
  bumpRevision(recipe);
  state.recipes[recipeId] = recipe;
  return recipe;
}

function newVersion (state, recipe, input) {
  const id = nextId(state, 'ver');
  const version = {
    id,
    recipeVersionId: id,
    versionNumber: recipe.versions.length + 1,
    state: 'Draft',
    yieldQuantity: input.yieldQuantity,
    yieldUnit: input.yieldUnit,
    portionCount: input.portionCount,
    components: (input.components || []).map((c, index) => ({
      componentId: id + '-c' + (index + 1),
      ingredientId: c.ingredientId || null,
      subRecipeId: c.subRecipeId || null,
      quantity: typeof c.quantity === 'number' ? c.quantity : null,
      unitCode: c.unitCode || null
    })),
    createdAtUtc: stamp(),
    activatedAtUtc: null,
    version: 0,
    revision: ''
  };
  bumpRevision(version);
  recipe.versions.push(version);
  return version;
}

function ingredientDetail (ingredient) {
  return {
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    baseUnit: ingredient.baseUnit,
    notes: ingredient.notes,
    status: ingredient.status,
    conversions: [],
    revision: ingredient.revision
  };
}

// ---- suppliers, their articles, and the prices those articles carry -----------------------------

function newSupplier (state, input, forcedId) {
  const supplierId = forcedId || nextId(state, 'sup');
  const supplier = {
    id: supplierId,
    supplierId,
    name: (input.name || '').trim(),
    organizationNumber: input.organizationNumber || null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    contactPhone: input.contactPhone || null,
    status: 'Active',
    version: 0,
    revision: ''
  };
  bumpRevision(supplier);
  state.suppliers.push(supplier);
  return supplier;
}

/**
 * The LIST shape, and it deliberately carries NO revision. `MarginSupplierSummary` has none, there is
 * no `GET /margin/suppliers/{id}` to get one from, and the page withholds its edit and archive
 * controls after a reload for exactly that reason — a fixture that helpfully added one here would
 * make `data-test="supplier-no-revision"` unreachable and the page would look over-cautious.
 */
function supplierSummary (supplier) {
  return {
    supplierId: supplier.supplierId,
    name: supplier.name,
    organizationNumber: supplier.organizationNumber,
    status: supplier.status,
    isArchived: supplier.status === 'Archived'
  };
}

/** The WRITE response: the only place a supplier's revision ever appears. */
function supplierDetail (supplier) {
  return Object.assign(supplierSummary(supplier), {
    contactName: supplier.contactName,
    contactEmail: supplier.contactEmail,
    contactPhone: supplier.contactPhone,
    revision: supplier.revision
  });
}

function newItem (state, supplier, input) {
  const supplierItemId = nextId(state, 'item');
  const item = {
    id: supplierItemId,
    supplierItemId,
    supplierId: supplier.supplierId,
    status: 'Active',
    version: 0,
    revision: ''
  };
  assignItem(item, input);
  bumpRevision(item);
  state.items.push(item);
  return item;
}

/**
 * A full replace of the article's fields — `PUT` is a replace, not a patch.
 *
 * `packSize` and `purchaseUnitToBaseFactor` are stored EXACTLY as sent, nulls included. Defaulting a
 * missing one to 1 would be a fabricated conversion and would make an article that cannot cost look
 * as though it can, which is the single most consequential thing this surface gets wrong in the wild.
 */
function assignItem (item, input) {
  item.ingredientId = input.ingredientId || null;
  item.name = (input.name || '').trim() || null;
  item.supplierArticleNumber = input.supplierArticleNumber || null;
  item.packSize = typeof input.packSize === 'number' ? input.packSize : null;
  item.purchaseUnitCode = input.purchaseUnitCode || null;
  item.purchaseUnitToBaseFactor = typeof input.purchaseUnitToBaseFactor === 'number'
    ? input.purchaseUnitToBaseFactor
    : null;
  item.isPreferred = input.isPreferred === true;
}

function itemDocument (item) {
  return {
    supplierItemId: item.supplierItemId,
    supplierId: item.supplierId,
    ingredientId: item.ingredientId,
    supplierArticleNumber: item.supplierArticleNumber,
    name: item.name,
    packSize: item.packSize,
    purchaseUnitCode: item.purchaseUnitCode,
    purchaseUnitToBaseFactor: item.purchaseUnitToBaseFactor,
    isPreferred: item.isPreferred,
    status: item.status,
    // UNLIKE a supplier, every item row carries its revision — which is what keeps the item editor
    // usable after a reload, and the asymmetry is the real controller's.
    revision: item.revision
  };
}

/**
 * Records a price and returns the item's WHOLE refreshed timeline.
 *
 * APPEND-ONLY AND EFFECTIVE-DATED. The open row is CLOSED at exactly the instant the new one opens —
 * the same instant is simultaneously one row's `effectiveTo` and the next row's `effectiveFrom` — so
 * there is never a moment with two prices in force and never an ambiguous boundary. Nothing is
 * edited and nothing is deleted; a superseded amount stays readable forever, which is the whole
 * subject of the timeline panel.
 */
function addPrice (state, item, input) {
  const from = String(input.effectiveFromUtc || '').replace('Z', '');
  for (const row of state.prices) {
    if (row.supplierItemId === item.supplierItemId && row.effectiveTo === null) {
      row.effectiveTo = from;
    }
  }
  state.prices.push({
    id: nextId(state, 'price'),
    supplierItemId: item.supplierItemId,
    priceMinor: input.priceMinor,
    currency: input.currency || CURRENCY,
    effectiveFrom: from,
    effectiveTo: null,
    source: 'Manual',
    importBatchId: null,
    createdAtUtc: stamp().replace('Z', '')
  });
  return priceTimeline(state, item.supplierItemId);
}

/** Newest effective instant first — the server's own `OrderByDescending`, kept. */
function priceTimeline (state, supplierItemId) {
  return state.prices
    .filter(row => row.supplierItemId === supplierItemId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
    .map(row => ({
      id: row.id,
      priceMinor: row.priceMinor,
      currency: row.currency,
      // BARE, no `Z`, like every other column-loaded stamp this fixture sends: EF hands them back as
      // `Unspecified` and `utils/margin/price-timeline` exists to parse exactly that. Sending them
      // the tidy way would hide the bug that file was written against.
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      source: row.source,
      importBatchId: row.importBatchId,
      createdAtUtc: row.createdAtUtc
    }));
}

function openPriceOf (state, supplierItemId) {
  return state.prices.find(row => row.supplierItemId === supplierItemId && row.effectiveTo === null) || null;
}

function supplierOf (state, supplierId) {
  return state.suppliers.find(s => s.supplierId === supplierId) || null;
}

/** Active, with a pack size and a conversion: this article can produce a cost. See the file header. */
function isCostable (state, item) {
  if (item.status !== 'Active') { return false; }
  if (!(item.packSize > 0) || !(item.purchaseUnitToBaseFactor > 0)) { return false; }
  const supplier = supplierOf(state, item.supplierId);
  return !!supplier && supplier.status === 'Active';
}

/**
 * What one base unit of this ingredient costs, in integer minor units — or null.
 *
 * See the file header for the three rules. The one worth restating where it is implemented: an
 * incomplete PREFERRED article does not merely fail to win, it makes the whole ingredient unpriced.
 * Falling through to a rival here would produce plate costs the real backend does not produce, and
 * the venue-facing warning the supplier page draws for that case would be describing nothing.
 */
function resolvePricePerBaseUnit (state, ingredient) {
  const own = state.items.filter(item => item.ingredientId === ingredient.ingredientId);
  // No articles at all: the ingredient falls back to the bootstrap price it was seeded with, which is
  // null for anything a venue authored itself.
  if (!own.length) {
    return typeof ingredient.pricePerBaseUnitMinor === 'number' ? ingredient.pricePerBaseUnitMinor : null;
  }

  const preferred = own.find(item => item.isPreferred && item.status === 'Active') || null;
  if (preferred && !isCostable(state, preferred)) { return null; }

  const candidates = own
    .filter(item => isCostable(state, item))
    .map(item => ({ item, price: openPriceOf(state, item.supplierItemId) }))
    .filter(row => row.price && typeof row.price.priceMinor === 'number');
  if (!candidates.length) { return null; }

  const chosen = candidates.find(row => row.item === preferred) ||
    candidates.reduce((best, row) => (best === null || perBaseUnit(row) < perBaseUnit(best) ? row : best), null);
  return perBaseUnit(chosen);
}

function perBaseUnit (row) {
  return row.price.priceMinor / (row.item.packSize * row.item.purchaseUnitToBaseFactor);
}

/**
 * At most ONE preferred article per ingredient, store-wide — across suppliers, which is why this is
 * keyed on the ingredient and not on the article's own supplier.
 */
function clearOtherPreferred (state, item) {
  for (const other of state.items) {
    if (other !== item && other.ingredientId === item.ingredientId && other.isPreferred) {
      other.isPreferred = false;
      bumpRevision(other);
    }
  }
}

// ---- the cost preview ---------------------------------------------------------------------------

function ingredientById (state, id) {
  return state.ingredients.find(i => i.ingredientId === id) || null;
}

/**
 * Prices one version. Each line is rounded on its own; the batch total is rounded over the UNROUNDED
 * sum, and the per-portion figure over the unrounded total divided by the portion count. A line whose
 * ingredient carries no price, or whose unit does not convert, is `incomplete` and its `lineCostMinor`
 * goes on the wire as 0 — which is what the real calculator emits and precisely why the client is
 * forbidden from reading it except behind the flag.
 */
function priceVersion (state, version) {
  let unroundedTotal = 0;
  let complete = true;
  const incompleteReasons = [];

  const lines = version.components.map((component) => {
    const ingredient = component.ingredientId ? ingredientById(state, component.ingredientId) : null;
    const baseQuantity = ingredient
      ? toBaseQuantity(component.quantity, component.unitCode, ingredient.baseUnit)
      : null;
    // THE ONE PLACE A PRICE IS LOOKED UP, so a line's cost changes the moment the supplier data
    // behind its ingredient does — which is what makes a supplier-to-plate walk observable at all.
    const pricePerBaseUnit = ingredient ? resolvePricePerBaseUnit(state, ingredient) : null;
    const priced = !!(ingredient && typeof pricePerBaseUnit === 'number' && baseQuantity !== null);

    if (!priced) {
      complete = false;
      incompleteReasons.push('Ingredient ' + (component.ingredientId || '(none)') + ' has no effective price.');
      return {
        componentId: component.componentId,
        ingredientId: component.ingredientId,
        subRecipeId: component.subRecipeId,
        quantity: component.quantity,
        unitCode: component.unitCode,
        incomplete: true,
        lineCostMinor: 0
      };
    }

    const exact = baseQuantity * pricePerBaseUnit;
    unroundedTotal += exact;
    return {
      componentId: component.componentId,
      ingredientId: component.ingredientId,
      subRecipeId: component.subRecipeId,
      quantity: component.quantity,
      unitCode: component.unitCode,
      incomplete: false,
      lineCostMinor: roundMinor(exact)
    };
  });

  return {
    recipeVersionId: version.recipeVersionId,
    complete,
    currency: CURRENCY,
    totalCostMinor: roundMinor(unroundedTotal),
    perPortionCostMinor: version.portionCount > 0 ? roundMinor(unroundedTotal / version.portionCount) : null,
    pricedAtUtc: stamp(),
    lines,
    incompleteReasons
  };
}

function versionDocument (version) {
  return {
    recipeVersionId: version.recipeVersionId,
    versionNumber: version.versionNumber,
    state: version.state,
    yieldQuantity: version.yieldQuantity,
    yieldUnit: version.yieldUnit,
    portionCount: version.portionCount,
    // BARE, no `Z`. These are column-loaded stamps and EF hands them back as `Unspecified`; the
    // client's `parseApiInstant` exists for exactly this and reading one with `new Date()` would
    // shift it by the browser's offset. Sending them the tidy way would hide that.
    createdAtUtc: version.createdAtUtc.replace('Z', ''),
    activatedAtUtc: version.activatedAtUtc ? version.activatedAtUtc.replace('Z', '') : null,
    revision: version.revision,
    components: version.components
  };
}

function activeVersionOf (recipe) {
  return recipe.versions.find(v => v.recipeVersionId === recipe.activeVersionId) || null;
}

function latestDraft (recipe) {
  return recipe.versions
    .filter(v => v.state === 'Draft')
    .reduce((best, v) => (!best || v.versionNumber > best.versionNumber ? v : best), null);
}

/**
 * The detail document. The preview is of the ACTIVE version when there is one and otherwise of the
 * latest Draft, and the response says only WHICH version id it used — the caller compares that
 * against `activeVersion.recipeVersionId` itself. Answering which one directly would remove the
 * comparison the client's `readCostPreview` exists to make.
 */
function recipeDetail (state, recipe) {
  const active = activeVersionOf(recipe);
  const draft = latestDraft(recipe);
  const priced = active || draft;

  return {
    recipeId: recipe.recipeId,
    name: recipe.name,
    kind: recipe.kind,
    revision: recipe.revision,
    createdAtUtc: recipe.createdAtUtc.replace('Z', ''),
    activeVersion: active ? versionDocument(active) : null,
    draftVersions: recipe.versions.filter(v => v.state === 'Draft').map(versionDocument),
    costPreview: priced ? priceVersion(state, priced) : null
  };
}

function recipeRow (state, recipe) {
  const active = activeVersionOf(recipe);
  return {
    recipeId: recipe.recipeId,
    name: recipe.name,
    kind: recipe.kind,
    revision: recipe.revision,
    activeVersionNumber: active ? active.versionNumber : null,
    draftVersionCount: recipe.versions.filter(v => v.state === 'Draft').length,
    activeProductLinkCount: (state.links[recipe.recipeId] || []).length,
    createdAtUtc: recipe.createdAtUtc.replace('Z', '')
  };
}

// ---- the menu margin ----------------------------------------------------------------------------

/** Which recipe actively claims a product, if any. The single-active-link rule made queryable. */
function claimOf (state, productId) {
  for (const recipeId of Object.keys(state.links)) {
    const link = (state.links[recipeId] || []).find(l => l.productId === productId);
    if (link) { return { recipeId, link }; }
  }
  return null;
}

function menuMargin (state) {
  const rows = [];

  for (const product of world.MARGIN_PRODUCTS) {
    const claim = claimOf(state, product.productId);
    const recipe = claim ? state.recipes[claim.recipeId] : null;
    const active = recipe ? activeVersionOf(recipe) : null;
    const preview = active ? priceVersion(state, active) : null;

    // ABSENT rather than zero: no link, or no version active at the read instant. The three plate
    // states are three different facts and the client renders them three different ways.
    const plateCostMinor = preview && preview.perPortionCostMinor !== null
      ? roundMinor(preview.perPortionCostMinor * claim.link.quantityPerSoldUnit)
      : null;
    const costComplete = !!(preview && preview.complete);

    for (const basis of product.bases) {
      const derivable = plateCostMinor !== null && costComplete && basis.netPriceMinor !== null;
      rows.push({
        productId: product.productId,
        productName: product.productName,
        goodsGroupName: product.goodsGroupName,
        productHidden: false,
        recipeId: recipe ? recipe.recipeId : null,
        recipeName: recipe ? recipe.name : null,
        quantityPerSoldUnit: claim ? claim.link.quantityPerSoldUnit : null,
        linkBroken: false,
        priceBasis: basis.priceBasis,
        vatPercent: basis.vatPercent,
        grossPriceMinor: basis.grossPriceMinor,
        depositMinor: null,
        netPriceMinor: basis.netPriceMinor,
        plateCostMinor,
        // READ, never `net − plate` recomputed by a client: the backend rounds the plate cost once
        // after scaling it by the link quantity, and a browser subtracting two rounded figures can
        // disagree with the till.
        contributionMinor: derivable ? basis.netPriceMinor - plateCostMinor : null,
        // Percentage POINTS, exact, never a fraction and never in minor units.
        foodCostPercent: derivable ? (plateCostMinor / basis.netPriceMinor) * 100 : null,
        costComplete
      });
    }
  }

  const unlinked = Object.keys(state.recipes)
    .map(id => state.recipes[id])
    .filter(recipe => recipe.kind === 'Sellable' && !(state.links[recipe.recipeId] || []).length)
    .map(recipe => ({ recipeId: recipe.recipeId, name: recipe.name }));

  return {
    currency: CURRENCY,
    pricedAtUtc: stamp(),
    rows,
    unlinkedRecipes: unlinked
  };
}

// ---- statements ---------------------------------------------------------------------------------

const WEEK = world.MARGIN_WEEK;

function newStatement (state, weekStart, previous) {
  const id = nextId(state, 'stmt');
  const statement = {
    id,
    statementId: id,
    periodStart: weekStart,
    periodEnd: WEEK.weekEnd,
    revisionNumber: previous ? previous.revisionNumber + 1 : 1,
    previousStatementId: previous ? previous.statementId : null,
    state: 'Open',
    spendEntries: [],
    openingStockValueMinor: null,
    closingStockValueMinor: null,
    // NEVER CALCULATED YET, and the three money columns hold their schema defaults. That is the
    // state `calculationTimestampUtc` exists to distinguish, and the page withholds every figure
    // while it holds rather than printing three zeros.
    calculationTimestampUtc: null,
    finalizedAtUtc: null,
    version: 0,
    revision: ''
  };
  bumpRevision(statement);
  state.statements[id] = statement;
  return statement;
}

function recalculate (statement) {
  const actual = statement.spendEntries.reduce((sum, e) => sum + e.amountMinor, 0);
  const net = WEEK.netFoodSalesMinor;
  statement.netFoodSalesMinor = net;
  statement.theoreticalIngredientCostMinor = WEEK.theoreticalIngredientCostMinor;
  statement.actualPurchaseSpendMinor = actual;
  statement.theoreticalFoodCostPercent = (WEEK.theoreticalIngredientCostMinor / net) * 100;
  statement.actualFoodCostPercent = (actual / net) * 100;
  statement.gapPercentagePoints = statement.actualFoodCostPercent - statement.theoreticalFoodCostPercent;
  statement.coveragePercent = (WEEK.coveredNetSalesMinor / net) * 100;
  statement.calculationTimestampUtc = stamp();
}

function statementDetail (statement) {
  // The receipt is written by a bare `JsonConvert.SerializeObject` rather than through the MVC
  // pipeline, so it keeps PascalCase inside a camelCased document. The client accepts both spellings;
  // this sends the shape the server actually produces so the tolerant branch is not the only one
  // ever exercised.
  const receipt = statement.calculationTimestampUtc
    ? JSON.stringify({ Currency: CURRENCY, TheoreticalCostComplete: true })
    : null;

  return {
    statementId: statement.statementId,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    revisionNumber: statement.revisionNumber,
    previousStatementId: statement.previousStatementId,
    state: statement.state,
    currency: CURRENCY,
    inputReceiptJson: receipt,
    netFoodSalesMinor: statement.netFoodSalesMinor || 0,
    theoreticalIngredientCostMinor: statement.theoreticalIngredientCostMinor || 0,
    actualPurchaseSpendMinor: statement.actualPurchaseSpendMinor || 0,
    openingStockValueMinor: statement.openingStockValueMinor,
    closingStockValueMinor: statement.closingStockValueMinor,
    coveredNetSalesMinor: WEEK.coveredNetSalesMinor,
    uncoveredNetSalesMinor: WEEK.uncoveredNetSalesMinor,
    theoreticalFoodCostPercent: nullable(statement.theoreticalFoodCostPercent),
    actualFoodCostPercent: nullable(statement.actualFoodCostPercent),
    gapPercentagePoints: nullable(statement.gapPercentagePoints),
    coveragePercent: nullable(statement.coveragePercent),
    theoreticalCostComplete: true,
    theoreticalCostExcludedCurrencies: [],
    projectionWatermark: WEEK.projectionWatermark,
    recipeVersionIds: ['ver-1'],
    priceFreshnessAsOfUtc: '2026-07-19T22:00:00Z',
    calculationTimestampUtc: statement.calculationTimestampUtc,
    finalizedAtUtc: statement.finalizedAtUtc,
    spendEntries: statement.spendEntries.map(e => ({
      id: e.id,
      spendDate: e.spendDate,
      supplierId: e.supplierId,
      amountMinor: e.amountMinor,
      currency: e.currency || CURRENCY,
      note: e.note
    })),
    revision: statement.revision
  };
}

function nullable (value) {
  return typeof value === 'number' ? value : null;
}

function statementRow (statement) {
  return {
    statementId: statement.statementId,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    revisionNumber: statement.revisionNumber,
    previousStatementId: statement.previousStatementId,
    state: statement.state,
    netFoodSalesMinor: statement.netFoodSalesMinor || 0,
    theoreticalFoodCostPercent: nullable(statement.theoreticalFoodCostPercent),
    actualFoodCostPercent: nullable(statement.actualFoodCostPercent),
    gapPercentagePoints: nullable(statement.gapPercentagePoints),
    coveragePercent: nullable(statement.coveragePercent),
    theoreticalCostComplete: true,
    currency: CURRENCY,
    finalizedAtUtc: statement.finalizedAtUtc
  };
}

// ---- routing ------------------------------------------------------------------------------------

/**
 * The `If-Match` precondition, split into the THREE answers the real surface gives. Nothing keys on
 * the status: the two 400s used to be 409s, and a status-keyed caller would have changed meaning
 * silently when they moved.
 */
function checkRevision (ctx, row) {
  const raw = ctx.req.headers['if-match'];
  if (!raw) {
    ctx.problem(400, 'margin.revision-required', 'This resource carries a revision; If-Match is required.');
    return false;
  }
  const token = String(raw).replace(/^"|"$/g, '');
  if (!token.startsWith('rev-')) {
    ctx.problem(400, 'margin.revision-invalid', 'The If-Match value is not a decodable revision token.');
    return false;
  }
  if (token !== row.revision) {
    ctx.problem(409, 'margin.stale-revision', 'The resource has changed since it was read.', { retryable: true });
    return false;
  }
  return true;
}

/**
 * The statement surface's own refusal shape: a `detail` and NO `code`. See the file header.
 *
 * Returns true so a call site can `return uncoded(...)` and read as "answered, handled" — the same
 * shape every other branch in this router uses.
 */
function uncoded (ctx, detail) {
  ctx.send(400, { type: 'about:blank', title: 'Bad Request', status: 400, detail, traceId: 'fixture-trace' });
  return true;
}

// ---- the gate ----------------------------------------------------------------------------------
//
// THE FLAGS ARE RESOLVED, NOT ASSUMED, and that is the correction this file most needed. It used to
// answer `flags: { module: true, statements: true }` unconditionally, which made every Margin journey
// green against a world no real store is in: `Margin.Module` and `Margin.Statements` are both
// deny-closed, so on a real venue the first read of the recipe page would have drawn the blocker and
// every route below would have answered 404. A fixture that cannot produce the refusal cannot be
// evidence that the refusal does not happen — the same defect a sweep found in six other journeys.
//
// `ctx.flagEffective` is the SHARED override store the operator switchboard writes through
// `PUT /stores/{id}/feature-flags`, so a journey turns Margin on the way a person does and this
// module reads the result. Nothing here writes a flag.
const MODULE_FLAG = 'Margin.Module';
const STATEMENTS_FLAG = 'Margin.Statements';
const PRICE_IMPORT_FLAG = 'Margin.PriceImport';

/**
 * The opaque refusal every Margin route collapses to when a gate is down.
 *
 * `margin.not-found` and never a 403, and the SAME answer for a switched-off module, a store the
 * caller does not hold and a row that does not exist — `MarginProblem.NotFound` is one exception
 * type and the controllers throw it for all three. `api-client.js` says so in as many words
 * («`margin.not-found` deserves its own warning»), and it is why `GET /margin/status` exists at all:
 * that one read is the only place the difference is observable, so it stays answering below.
 */
function darkModule (ctx) {
  ctx.problem(404, 'margin.not-found', 'Not found.');
  return true;
}

function route (ctx) {
  const { path, method, url, body } = ctx;
  const state = ctx.state.margin;

  if (!path.startsWith('/margin/')) { return false; }

  // Every Margin route is store-scoped through `?storeId=`, and the body's tenant id is ignored.
  // A route reached without it is a client bug, not a 404 about the module.
  const storeId = url.searchParams.get('storeId');
  if (!storeId) {
    ctx.problem(400, 'margin.version-input-invalid', 'storeId is required on every Margin route.');
    return true;
  }

  const moduleOn = ctx.flagEffective(storeId, MODULE_FLAG);

  // THE ONE READ THAT ANSWERS WHILE THE MODULE IS OFF. It is the module's self-report, and reporting
  // it truthfully is the whole reason `MarginModuleClient.GetStatus` is called first by every page:
  // with `module: false` the page draws its blocker and names the switch, and with the same 404 every
  // other route gives it could only have said "something failed".
  if (path === '/margin/status' && method === 'GET') {
    ctx.send(200, {
      flags: {
        module: moduleOn,
        // The STAGE flags are reported under the master rather than beside it: a stage flag whose
        // master is down gates nothing, and reporting `statements: true` while the module is off
        // would invite a page to offer a surface every route refuses.
        statements: moduleOn && ctx.flagEffective(storeId, STATEMENTS_FLAG),
        priceImport: moduleOn && ctx.flagEffective(storeId, PRICE_IMPORT_FLAG)
      },
      activeRecipeCount: Object.keys(state.recipes).length,
      projection: { lagEntries: state.projectionLag, watermarkJournalEntryId: WEEK.projectionWatermark }
    });
    return true;
  }

  // Everything else in the module is INVISIBLE while the master is down — reads included. Margin is
  // not read-only when it is off the way Workforce's publication stage is; `Margin:EnabledStoreIds`
  // is a store allow-list and a store outside it has no Margin surface at all.
  if (!moduleOn) { return darkModule(ctx); }

  // The statement surface sits behind a SECOND, separate switch under the master, and a venue running
  // Margin without the weekly settlement is the ordinary case rather than an exotic one. Gated here
  // once, for the list, the create and every per-statement route, because a fixture that gated only
  // some of them would let the page ship half-lit.
  if (path.startsWith('/margin/statements') && !ctx.flagEffective(storeId, STATEMENTS_FLAG)) {
    return darkModule(ctx);
  }

  // ---- ingredients ------------------------------------------------------------------------------
  if (path === '/margin/ingredients' && method === 'GET') {
    const have = state.ingredients.map(i => i.name);
    ctx.send(200, {
      ingredients: state.ingredients.map(i => ({
        ingredientId: i.ingredientId,
        name: i.name,
        baseUnit: i.baseUnit,
        status: i.status,
        isArchived: i.status === 'Archived'
      })),
      // Only the ones the store does not already have — the backend's own bootstrap affordance.
      starterCandidates: world.MARGIN_STARTERS
        .filter(c => !have.includes(c.name))
        .map(c => ({ name: c.name, baseUnit: c.baseUnit, notes: c.notes, suggestedConversions: [] }))
    });
    return true;
  }

  if (path === '/margin/ingredients' && method === 'POST') {
    const name = ((body && body.name) || '').trim();
    const seed = world.MARGIN_STARTERS.find(c => c.name === name) || null;
    const id = nextId(state, 'ing');
    const ingredient = {
      id,
      ingredientId: id,
      name,
      // FIXED at creation and immutable afterwards — there is no field for it on the update request,
      // so it is immutable by construction rather than by a rule.
      baseUnit: (body && body.baseUnit) || (seed && seed.baseUnit) || 'Kilogram',
      notes: (body && body.notes) || (seed && seed.notes) || null,
      status: 'Active',
      // THE BOOTSTRAP PRICE, and only a starter has one. An ingredient a venue authors itself is
      // unpriced until it has a costable supplier article with an open price — see the file header.
      pricePerBaseUnitMinor: seed ? seed.pricePerBaseUnitMinor : null,
      version: 0,
      revision: ''
    };
    bumpRevision(ingredient);
    state.ingredients.push(ingredient);
    ctx.send(200, ingredientDetail(ingredient));
    return true;
  }

  const ingredientRoute = /^\/margin\/ingredients\/([^/]+)$/.exec(path);
  if (ingredientRoute && method === 'GET') {
    const ingredient = ingredientById(state, decodeURIComponent(ingredientRoute[1]));
    if (!ingredient) { ctx.problem(404, 'margin.not-found', 'No such ingredient.'); return true; }
    // The detail read is what carries the REVISION; the list does not, which is why the page opens
    // its editor on this response rather than on the row somebody clicked.
    ctx.send(200, ingredientDetail(ingredient));
    return true;
  }

  // ---- recipes ----------------------------------------------------------------------------------
  if (path === '/margin/recipes' && method === 'GET') {
    ctx.send(200, Object.keys(state.recipes).map(id => recipeRow(state, state.recipes[id])));
    return true;
  }

  if (path === '/margin/recipes' && method === 'POST') {
    const name = ((body && body.name) || '').trim();
    if (!name) {
      ctx.problem(400, 'margin.version-input-invalid', 'A recipe needs a name.');
      return true;
    }
    const clash = Object.keys(state.recipes).some(id => state.recipes[id].name.toLowerCase() === name.toLowerCase());
    if (clash) {
      ctx.problem(400, 'margin.recipe-name-conflict', 'A recipe with this name already exists in the store.');
      return true;
    }
    const initial = (body && body.initialVersion) || {};
    if (!(initial.portionCount > 0) || !(initial.yieldQuantity > 0)) {
      ctx.problem(400, 'margin.version-input-invalid', 'Yield and portion count must both be greater than zero.');
      return true;
    }
    const recipe = newRecipe(state, name, (body && body.kind) || 'Sellable');
    newVersion(state, recipe, initial);
    // The create answers with the FULL detail, cost preview included — one round trip from entered
    // to costed, and the page makes no second read.
    ctx.send(200, recipeDetail(state, recipe));
    return true;
  }

  const recipeRoute = /^\/margin\/recipes\/([^/]+)(\/.*)?$/.exec(path);
  if (recipeRoute) {
    const recipe = state.recipes[decodeURIComponent(recipeRoute[1])] || null;
    const rest = recipeRoute[2] || '';
    if (!recipe) {
      // DELIBERATELY AMBIGUOUS: unknown recipe, out-of-scope store, or the module switched off — one
      // answer for all three, so existence is never disclosed.
      ctx.problem(404, 'margin.not-found', 'No such recipe.');
      return true;
    }

    if (!rest && method === 'GET') {
      ctx.send(200, recipeDetail(state, recipe));
      return true;
    }

    const activate = /^\/versions\/([^/]+)\/activate$/.exec(rest);
    if (activate && method === 'POST') {
      const version = recipe.versions.find(v => v.recipeVersionId === decodeURIComponent(activate[1]));
      if (!version) { ctx.problem(404, 'margin.not-found', 'No such version.'); return true; }
      if (version.state !== 'Draft') {
        ctx.problem(400, 'margin.version-not-draft', 'Only a draft version can be activated.');
        return true;
      }
      // The DRAFT's own revision, not the recipe header's — they carry the same field name one level
      // apart and sending the wrong one would guard the wrong row.
      if (!checkRevision(ctx, version)) { return true; }

      const previous = activeVersionOf(recipe);
      if (previous) { previous.state = 'Superseded'; bumpRevision(previous); }
      version.state = 'Active';
      version.activatedAtUtc = stamp();
      recipe.activeVersionId = version.recipeVersionId;
      bumpRevision(version);
      bumpRevision(recipe);
      ctx.send(200, { recipeVersionId: version.recipeVersionId, versionNumber: version.versionNumber, state: 'Active' });
      return true;
    }

    if (rest === '/product-links' && method === 'GET') {
      ctx.send(200, { links: (state.links[recipe.recipeId] || []).map(link => linkDocument(link)) });
      return true;
    }

    if (rest === '/product-links' && method === 'PUT') {
      const wanted = (body && body.links) || [];
      const seen = {};
      for (const link of wanted) {
        if (!link.productId || !(link.quantityPerSoldUnit > 0)) {
          ctx.problem(400, 'margin.product-link-invalid', 'Every link needs a product and a positive quantity.');
          return true;
        }
        if (seen[link.productId]) {
          ctx.problem(400, 'margin.product-link-invalid', 'A product is named twice.');
          return true;
        }
        seen[link.productId] = true;
        // THE SINGLE-ACTIVE-LINK RULE, store-wide. The backend keeps it with a filtered unique index
        // and its `detail` names the product by raw Guid, which is why the client renders from the
        // code and not from the prose.
        const claim = claimOf(state, link.productId);
        if (claim && claim.recipeId !== recipe.recipeId) {
          ctx.problem(400, 'margin.product-link-invalid',
            'Product ' + link.productId + ' is already actively linked to another recipe.');
          return true;
        }
      }
      // A REPLACE-SET: the body is the complete desired set, so anything left out is gone.
      state.links[recipe.recipeId] = wanted.map(l => ({
        productId: l.productId,
        quantityPerSoldUnit: l.quantityPerSoldUnit
      }));
      ctx.send(200, { links: state.links[recipe.recipeId].map(link => linkDocument(link)) });
      return true;
    }
  }

  if (path === '/margin/menu-margin' && method === 'GET') {
    ctx.send(200, menuMargin(state));
    return true;
  }

  // ---- suppliers, articles, prices --------------------------------------------------------------
  //
  // The half of the module that every plate cost is built from, and the half no journey could reach
  // until it existed here: `GET /margin/suppliers` used to answer a constant list of two names with
  // no articles and no prices behind them, so `/admin/margin-suppliers` could be opened and nothing
  // on it could be driven. Every route below is the one `MarginSuppliersController` publishes, with
  // the same `If-Match` discipline: on suppliers and articles, and NOT on prices, which are
  // append-only and carry no rowversion.
  if (path === '/margin/suppliers' && method === 'GET') {
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    ctx.send(200, state.suppliers
      .filter(s => includeArchived || s.status === 'Active')
      .map(supplierSummary));
    return true;
  }

  if (path === '/margin/suppliers' && method === 'POST') {
    const name = ((body && body.name) || '').trim();
    if (!name) { return uncoded(ctx, 'A supplier needs a name.'); }
    // Case-insensitive uniqueness, refused UNCODED — this surface's business failures carry a
    // `detail` and no code, and the page renders the server's own sentence for them.
    if (state.suppliers.some(s => s.status === 'Active' && s.name.toLowerCase() === name.toLowerCase())) {
      return uncoded(ctx, 'A supplier with this name already exists in the store.');
    }
    ctx.send(200, supplierDetail(newSupplier(state, body || {})));
    return true;
  }

  const supplierRoute = /^\/margin\/suppliers\/([^/]+)(\/.*)?$/.exec(path);
  if (supplierRoute) {
    const supplier = supplierOf(state, decodeURIComponent(supplierRoute[1]));
    const rest = supplierRoute[2] || '';
    if (!supplier) { ctx.problem(404, 'margin.not-found', 'No such supplier.'); return true; }

    if (!rest && method === 'PUT') {
      if (!checkRevision(ctx, supplier)) { return true; }
      const name = ((body && body.name) || '').trim();
      if (!name) { return uncoded(ctx, 'A supplier needs a name.'); }
      if (state.suppliers.some(s => s !== supplier && s.status === 'Active' && s.name.toLowerCase() === name.toLowerCase())) {
        return uncoded(ctx, 'A supplier with this name already exists in the store.');
      }
      supplier.name = name;
      supplier.organizationNumber = (body && body.organizationNumber) || null;
      supplier.contactName = (body && body.contactName) || null;
      supplier.contactEmail = (body && body.contactEmail) || null;
      supplier.contactPhone = (body && body.contactPhone) || null;
      bumpRevision(supplier);
      ctx.send(200, supplierDetail(supplier));
      return true;
    }

    if (rest === '/archive' && method === 'POST') {
      if (!checkRevision(ctx, supplier)) { return true; }
      // ONE WAY, and it CLEARS the contact person: the lawful basis for holding it ends with the
      // relationship. There is no unarchive route, here or in the module.
      supplier.status = 'Archived';
      supplier.contactName = null;
      supplier.contactEmail = null;
      supplier.contactPhone = null;
      bumpRevision(supplier);
      ctx.send(200, supplierDetail(supplier));
      return true;
    }

    if (rest === '/items' && method === 'GET') {
      const includeArchived = url.searchParams.get('includeArchived') === 'true';
      ctx.send(200, state.items
        .filter(item => item.supplierId === supplier.supplierId)
        .filter(item => includeArchived || item.status === 'Active')
        .map(itemDocument));
      return true;
    }

    if (rest === '/items' && method === 'POST') {
      if (!body || !body.ingredientId || !ingredientById(state, body.ingredientId)) {
        return uncoded(ctx, 'An article must name an ingredient of the same store.');
      }
      const item = newItem(state, supplier, body);
      // Marking one article preferred CLEARS the marker on every other article of the same
      // ingredient, in the same transaction and possibly under a supplier not on screen — which is
      // why the page re-reads the whole list after any item write rather than patching one row.
      if (item.isPreferred) { clearOtherPreferred(state, item); }
      ctx.send(200, itemDocument(item));
      return true;
    }

    const itemRoute = /^\/items\/([^/]+)$/.exec(rest);
    if (itemRoute && method === 'PUT') {
      const item = state.items.find(candidate =>
        candidate.supplierItemId === decodeURIComponent(itemRoute[1]) &&
        candidate.supplierId === supplier.supplierId) || null;
      if (!item) { ctx.problem(404, 'margin.not-found', 'No such supplier item.'); return true; }
      if (!checkRevision(ctx, item)) { return true; }
      if (!body || !body.ingredientId || !ingredientById(state, body.ingredientId)) {
        return uncoded(ctx, 'An article must name an ingredient of the same store.');
      }
      assignItem(item, body);
      bumpRevision(item);
      if (item.isPreferred) { clearOtherPreferred(state, item); }
      ctx.send(200, itemDocument(item));
      return true;
    }
  }

  const priceRoute = /^\/margin\/supplier-items\/([^/]+)\/prices$/.exec(path);
  if (priceRoute) {
    const item = state.items.find(candidate => candidate.supplierItemId === decodeURIComponent(priceRoute[1])) || null;
    if (!item) { ctx.problem(404, 'margin.not-found', 'No such supplier item.'); return true; }

    if (method === 'GET') {
      ctx.send(200, priceTimeline(state, item.supplierItemId));
      return true;
    }

    if (method === 'POST') {
      // NO `If-Match`. Price rows are append-only and carry no rowversion, and the controller asks
      // for no header — demanding one here would make the client look wrong for not sending a header
      // the server never reads.
      if (typeof body.priceMinor !== 'number' || body.priceMinor < 0) {
        return uncoded(ctx, 'A price must not be negative.');
      }
      if (!body.effectiveFromUtc) {
        return uncoded(ctx, 'A price needs the instant it starts applying.');
      }
      // BACKDATING IS REFUSED. The open row would have to be closed BEFORE it opened, which is not a
      // shape the interval invariant allows; the real service refuses it and says so in prose.
      const open = openPriceOf(state, item.supplierItemId);
      const from = String(body.effectiveFromUtc).replace('Z', '');
      if (open && from <= open.effectiveFrom) {
        return uncoded(ctx, 'A new price must start after the price currently in force.');
      }
      ctx.send(200, addPrice(state, item, body));
      return true;
    }
  }

  if (path === '/margin/projection/rebuild' && method === 'POST') {
    // Append-only and idempotent on the journal line, so over an intact fact set it appends nothing
    // and its only effect is to close the gap it was pressed about.
    state.projectionLag = 0;
    ctx.send(200, { appendedFactCount: 0, watermarkJournalEntryId: WEEK.projectionWatermark });
    return true;
  }

  if (path === '/margin/coverage' && method === 'GET') {
    ctx.send(200, {
      fromDate: url.searchParams.get('from'),
      toDate: url.searchParams.get('to'),
      coveragePercent: (WEEK.coveredNetSalesMinor / WEEK.netFoodSalesMinor) * 100,
      netFoodSalesMinor: WEEK.netFoodSalesMinor,
      coveredNetSalesMinor: WEEK.coveredNetSalesMinor,
      uncoveredNetSalesMinor: WEEK.uncoveredNetSalesMinor,
      currency: CURRENCY,
      uncoveredTopSellers: [
        { productId: null, isOpenPrice: true, productNameSnapshot: null, netSalesMinor: 250000, lineCount: 41 },
        { productId: 'prod-kaffe', isOpenPrice: false, productNameSnapshot: 'Kaffe', netSalesMinor: 150000, lineCount: 96 }
      ],
      brokenLinks: [],
      priceFreshness: world.MARGIN_SUPPLIERS.map((s, index) => ({
        supplierId: s.supplierId,
        supplierName: s.name,
        latestPriceEffectiveFromUtc: '2026-07-0' + (index + 1) + 'T00:00:00',
        priceAgeDays: 19 - index,
        itemsWithPrice: 12 - index,
        itemsWithoutPrice: index
      })),
      projectionWatermark: WEEK.projectionWatermark
    });
    return true;
  }

  // ---- statements -------------------------------------------------------------------------------
  if (path === '/margin/statements' && method === 'GET') {
    const rows = Object.keys(state.statements)
      .map(id => state.statements[id])
      .sort((a, b) => (a.periodStart === b.periodStart
        ? b.revisionNumber - a.revisionNumber
        : b.periodStart.localeCompare(a.periodStart)))
      .map(statementRow);
    ctx.send(200, { statements: rows });
    return true;
  }

  if (path === '/margin/statements' && method === 'POST') {
    const weekStart = (body && body.weekStart) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) { return uncoded(ctx, 'The week must be a calendar date.'); }
    // The server's own Monday guard. The page pre-empts it, so a journey that ever met this sentence
    // would be telling us the client-side guard had stopped working.
    const day = new Date(Date.UTC(...weekStart.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))));
    if (day.getUTCDay() !== 1) { return uncoded(ctx, 'The week must start on a Monday.'); }

    const week = Object.keys(state.statements)
      .map(id => state.statements[id])
      .filter(s => s.periodStart === weekStart);
    const open = week.find(s => s.state !== 'Finalized');
    if (open) {
      return uncoded(ctx, 'An open statement already exists for this week. Edit or finalize it before creating a revision.');
    }
    const previous = week.reduce((a, b) => (!a || b.revisionNumber > a.revisionNumber ? b : a), null);
    ctx.send(200, statementDetail(newStatement(state, weekStart, previous)));
    return true;
  }

  const statementRoute = /^\/margin\/statements\/([^/]+)(\/.*)?$/.exec(path);
  if (statementRoute) {
    const statement = state.statements[decodeURIComponent(statementRoute[1])] || null;
    const rest = statementRoute[2] || '';
    if (!statement) { ctx.problem(404, 'margin.not-found', 'No such statement.'); return true; }

    if (!rest && method === 'GET') {
      // THIS READ NEVER RECOMPUTES. It returns the stored figures verbatim — frozen for a Finalized
      // statement, last-recalculated for an Open one.
      ctx.send(200, statementDetail(statement));
      return true;
    }

    if (rest === '/export' && method === 'GET') {
      const detail = statementDetail(statement);
      const csv = [
        'periodStart,periodEnd,revision,state,netFoodSalesMinor,theoreticalIngredientCostMinor,actualPurchaseSpendMinor',
        [detail.periodStart, detail.periodEnd, detail.revisionNumber, detail.state,
          detail.netFoodSalesMinor, detail.theoreticalIngredientCostMinor, detail.actualPurchaseSpendMinor].join(','),
        '',
        'spendDate,supplierId,amountMinor,currency,note'
      ].concat(detail.spendEntries.map(e => [e.spendDate, e.supplierId || '', e.amountMinor, e.currency, e.note || ''].join(',')))
        .join('\n') + '\n';
      ctx.sendText(200, csv, 'text/csv; charset=utf-8');
      return true;
    }

    // Everything below is an aggregate mutation and is refused on a finalized statement — with no
    // `code`, because that is the shape `ModuleProblem` emits. The page renders no control for it at
    // all, so a journey reaching this sentence is a journey that found a control that should be gone.
    if (statement.state === 'Finalized') {
      return uncoded(ctx, 'This statement is finalized and immutable.');
    }
    if (!checkRevision(ctx, statement)) { return true; }

    if (rest === '/inputs' && method === 'PUT') {
      const entries = (body && body.spendEntries) || [];
      for (const entry of entries) {
        if (typeof entry.amountMinor !== 'number' || entry.amountMinor < 0) {
          return uncoded(ctx, 'A purchase-spend amount must not be negative.');
        }
      }
      // REPLACE-SET: anything left out of the body is deleted, and both stock estimates are assigned
      // verbatim including their nulls.
      statement.spendEntries = entries.map((entry, index) => ({
        id: statement.statementId + '-spend-' + (index + 1),
        spendDate: entry.spendDate,
        supplierId: entry.supplierId || null,
        amountMinor: entry.amountMinor,
        currency: entry.currency || CURRENCY,
        note: entry.note || null
      }));
      statement.openingStockValueMinor = typeof body.openingStockValueMinor === 'number' ? body.openingStockValueMinor : null;
      statement.closingStockValueMinor = typeof body.closingStockValueMinor === 'number' ? body.closingStockValueMinor : null;
      // The inputs write re-derives, which is why its response IS the recalculated statement and the
      // page re-reads nothing for the figures panel.
      if (statement.calculationTimestampUtc) { recalculate(statement); }
      bumpRevision(statement);
      ctx.send(200, statementDetail(statement));
      return true;
    }

    if (rest === '/recalculate' && method === 'POST') {
      recalculate(statement);
      bumpRevision(statement);
      ctx.send(200, statementDetail(statement));
      return true;
    }

    if (rest === '/finalize' && method === 'POST') {
      // It recalculates ONCE MORE on the way in, then freezes. There is no route back: a correction
      // is the next forward-only revision.
      recalculate(statement);
      statement.state = 'Finalized';
      statement.finalizedAtUtc = stamp();
      bumpRevision(statement);
      ctx.send(200, statementDetail(statement));
      return true;
    }
  }

  return false;
}

function linkDocument (link) {
  const product = world.MARGIN_PRODUCTS.find(p => p.productId === link.productId) || null;
  return {
    productId: link.productId,
    quantityPerSoldUnit: link.quantityPerSoldUnit,
    productName: product ? product.productName : null,
    goodsGroupName: product ? product.goodsGroupName : null,
    productHidden: false,
    // The link surface reports a link whose product the catalog no longer has, FLAGGED — the menu
    // margin produces no row for one at all, which is why the editor is seeded from here.
    isBroken: !product,
    isActive: true
  };
}

module.exports = { fresh, route };
