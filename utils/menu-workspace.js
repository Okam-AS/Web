// The draft model behind the single menu import workspace.
//
// Every way into the page — a PDF, pasted text, a manually typed row, a legacy `importRows`
// draft, an exported JSON file — produces rows of the one shape defined here, and exactly one
// request builder turns those rows into the validate payload. There is no second save path.
//
// The rule this module exists to enforce is that existing product metadata is only ever written
// when the operator actually edited it. A row therefore keeps three separate layers:
//
//   current      what the catalogue says today. Display only, never sent.
//   sourceMeta   what a document or an extraction claimed. A suggestion, never sent on its own.
//   metadataEdits the operator's own edits. Only these become `metadataPatch`.
//
// Showing a column, opening the details drawer or reading a suggestion adds nothing to
// `metadataEdits`, so none of those can change a product.

import { ACTION, CHANNELS, channelEnum, channelName, newProductName } from '~/utils/menu-update'

export { ACTION, CHANNELS, channelEnum, channelName }

/** Fields a metadataPatch may carry, in the order the details drawer shows them. */
export const METADATA_FIELDS = [
  'name',
  'categoryId',
  'description',
  'otherInformation',
  'tax',
  'eatInTax',
  'deliveryTax',
  'depositAmount',
  'soldOut',
  'hide'
]

/**
 * Every column the table can show.
 *
 * `field` names the metadata field an inline edit patches. Columns without one are either
 * identity, prices or the variant summary, which are handled on their own.
 *
 * `identity` and `link` are structural: without them a row cannot be read or targeted, so they
 * are never hidden. Everything else is the operator's choice and is remembered.
 */
export const COLUMNS = [
  { id: 'identity', labelKey: 'menuImport_colSource', always: true, kind: 'identity' },
  { id: 'link', labelKey: 'menuImport_colTarget', always: true, kind: 'link' },
  { id: 'takeaway', labelKey: 'menuImport_channelTakeaway', kind: 'price', channel: 'takeaway', recommended: true },
  { id: 'eatIn', labelKey: 'menuImport_channelEatIn', kind: 'price', channel: 'eatIn', recommended: true },
  { id: 'delivery', labelKey: 'menuImport_channelDelivery', kind: 'price', channel: 'delivery', recommended: true },
  { id: 'category', labelKey: 'menuImport_colCategory', kind: 'category', field: 'categoryId' },
  { id: 'name', labelKey: 'menuImport_colName', kind: 'text', field: 'name' },
  { id: 'description', labelKey: 'menuImport_colDescription', kind: 'text', field: 'description', wide: true },
  { id: 'otherInformation', labelKey: 'menuImport_colAllergens', kind: 'text', field: 'otherInformation' },
  { id: 'eatInAddition', labelKey: 'menuImport_colEatInAddition', kind: 'derived' },
  { id: 'tax', labelKey: 'menuImport_colTakeawayVat', kind: 'number', field: 'tax' },
  { id: 'eatInTax', labelKey: 'menuImport_colEatInVat', kind: 'number', field: 'eatInTax' },
  { id: 'deliveryTax', labelKey: 'menuImport_colDeliveryVat', kind: 'number', field: 'deliveryTax' },
  { id: 'depositAmount', labelKey: 'menuImport_colDeposit', kind: 'money', field: 'depositAmount' },
  { id: 'soldOut', labelKey: 'menuImport_colSoldOut', kind: 'boolean', field: 'soldOut' },
  { id: 'hide', labelKey: 'menuImport_colHidden', kind: 'boolean', field: 'hide' },
  { id: 'variants', labelKey: 'menuImport_colVariants', kind: 'variants' }
]

export const COLUMN_IDS = COLUMNS.map(c => c.id)

const ALWAYS_VISIBLE = COLUMNS.filter(c => c.always).map(c => c.id)

/** The compact view: what a price update needs and nothing more. */
export const COMPACT_COLUMNS = [...ALWAYS_VISIBLE, 'takeaway', 'eatIn', 'delivery']

export const columnById = id => COLUMNS.find(c => c.id === id) || null

/**
 * The columns to show before the operator has chosen for themselves.
 *
 * A pure price update stays compact. As soon as the work list creates products or actually
 * carries a metadata field, the columns for the fields that are really present are added — a
 * field no row mentions is not shown just because the table could show it.
 */
export function recommendedColumns (rows) {
  const visible = [...COMPACT_COLUMNS]
  const list = (rows || []).filter(row => row.action !== ACTION.skip)
  const creates = list.some(row => row.action === ACTION.create)

  /**
   * Whether a field is worth a column of its own.
   *
   * A field counts when someone edited it, or when a row that is creating a product carries it.
   * The same field read off the menu for a row that only updates a price does not count: there
   * it is a suggestion nobody has accepted, and putting the whole plan's metadata on screen for
   * a pure price update is the clutter the compact default exists to avoid.
   */
  const present = field => list.some((row) => {
    if (hasOwn(row.metadataEdits, field)) { return true }
    if (row.action !== ACTION.create) { return false }
    const value = row.sourceMeta ? row.sourceMeta[field] : undefined
    return value !== undefined && value !== null && value !== ''
  })

  if (creates || present('name')) { visible.push('name') }
  if (creates || present('categoryId')) { visible.push('category') }

  ;['description', 'otherInformation', 'tax', 'eatInTax', 'deliveryTax', 'depositAmount', 'soldOut', 'hide']
    .forEach((field) => { if (present(field)) { visible.push(field) } })

  if (list.some(row => (row.variantGroups || []).length > 0)) { visible.push('variants') }

  return COLUMN_IDS.filter(id => visible.includes(id))
}

/** Always in table order, never missing a structural column, never containing an unknown id. */
export function normalizeVisibleColumns (ids) {
  const wanted = new Set([...(ids || []), ...ALWAYS_VISIBLE])
  return COLUMN_IDS.filter(id => wanted.has(id))
}

const hasOwn = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key)

// ---------------------------------------------------------------- column preferences

/**
 * Where a store's column choice is kept. Scoped by user as well as store: two people sharing a
 * browser profile should not inherit each other's table.
 */
export function columnPreferenceKey (userId, storeId) {
  return 'menuImport.columns.' + (userId || 'anon') + '.' + (storeId || 0)
}

export function readColumnPreference (storage, userId, storeId) {
  if (!storage) { return null }
  try {
    const raw = storage.getItem(columnPreferenceKey(userId, storeId))
    if (!raw) { return null }
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.visible)) { return null }
    return { chosen: !!parsed.chosen, visible: normalizeVisibleColumns(parsed.visible) }
  } catch (error) {
    return null
  }
}

export function writeColumnPreference (storage, userId, storeId, preference) {
  if (!storage) { return }
  try {
    storage.setItem(columnPreferenceKey(userId, storeId), JSON.stringify({
      chosen: !!preference.chosen,
      visible: normalizeVisibleColumns(preference.visible)
    }))
  } catch (error) {
    // A full or blocked storage must never stop the operator working.
  }
}

// ---------------------------------------------------------------- rows

let rowCounter = 0

export function nextRowKey (prefix) {
  rowCounter += 1
  return (prefix || 'manual') + '-' + Date.now().toString(36) + '-' + rowCounter
}

/** The one row shape. Every entry point produces this. */
export function makeRow (overrides = {}) {
  return {
    rowKey: nextRowKey('manual'),
    action: ACTION.create,
    targetProductId: null,
    plannedProductId: null,
    displayName: '',
    sizeLabel: null,
    menuNumber: '',
    categoryName: '',
    description: '',
    otherInformation: '',
    sourcePrices: [],
    manualPrices: [],
    // What the linked product charges today, filled in when a row gains a link so the boxes are
    // not empty. Display only: it is never sent, because "the price it already has" is not a
    // change, and sending it as a source price would make it look like the menu asked for it.
    inferredPrices: [],
    excludedFromRules: false,
    acceptedWarnings: [],
    sourceIssues: [],
    matchConfirmed: false,
    newProduct: null,
    candidates: [],
    reason: '',
    sourceWarnings: [],
    needsReview: false,
    inSource: false,
    // Where the row came from. Only `source` rows treat their metadata as a suggestion; a row
    // the operator authored carries its fields as the write they asked for.
    origin: 'manual',
    // What the catalogue holds today for the linked product. Display only.
    current: null,
    // What a document or a legacy file said. A suggestion for a linked row.
    sourceMeta: {},
    // The operator's own edits, and the only thing that becomes a metadataPatch.
    metadataEdits: {},
    // null means the product keeps the groups it has. An array replaces them.
    variantGroups: null,
    clearVariantGroups: false,
    ...overrides
  }
}

/** A metadata value as the table and drawer should show it: edit, else current, else source. */
export function displayValue (row, field) {
  if (hasOwn(row.metadataEdits, field)) { return row.metadataEdits[field] }
  if (row.action !== ACTION.create && row.current && row.current[field] !== undefined && row.current[field] !== null) {
    return row.current[field]
  }
  const fromSource = row.sourceMeta ? row.sourceMeta[field] : undefined
  return fromSource === undefined ? null : fromSource
}

/**
 * Whether the source disagrees with what the product holds today. Drives the "the menu says
 * something else" marker; it never writes anything by itself.
 */
export function sourceDiffers (row, field) {
  if (row.action === ACTION.create) { return false }
  if (hasOwn(row.metadataEdits, field)) { return false }
  if (!row.sourceMeta || row.sourceMeta[field] === undefined || row.sourceMeta[field] === null) { return false }
  const current = row.current ? row.current[field] : undefined
  return String(row.sourceMeta[field]) !== String(current === undefined || current === null ? '' : current)
}

/** Records an explicit edit. Setting a field back to its current value drops the patch again. */
export function setMetadata (row, field, value) {
  const current = row.action !== ACTION.create && row.current ? row.current[field] : undefined
  if (current !== undefined && current !== null && sameValue(current, value)) {
    delete row.metadataEdits[field]
  } else {
    row.metadataEdits[field] = value
  }
  return row
}

export function clearMetadata (row, field) {
  delete row.metadataEdits[field]
  return row
}

const sameValue = (a, b) => {
  if (typeof a === 'boolean' || typeof b === 'boolean') { return !!a === !!b }
  if (typeof a === 'number' || typeof b === 'number') { return Number(a) === Number(b) }
  return String(a === null || a === undefined ? '' : a) === String(b === null || b === undefined ? '' : b)
}

/** True when this row will write something other than prices. */
export function hasMetadataPatch (row) {
  return Object.keys(row.metadataEdits || {}).length > 0 ||
    row.variantGroups !== null ||
    !!row.clearVariantGroups
}

// ---------------------------------------------------------------- variant groups

const finite = (value) => {
  if (value === null || value === undefined || value === '') { return null }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

/** What an exact lower bound means as the plain "must be chosen" flag. */
export const requiredFromBounds = minimum => minimum !== null && minimum >= 1

/** `maximumSelectedOptions` of 0 means unbounded, so anything but exactly 1 is multi-select. */
export const multiSelectFromBounds = maximum => maximum !== null && maximum !== 1

/**
 * The contract's group shape.
 *
 * A negative amount is normalised the way the entity stores it — a positive amount plus the
 * `negativeAmount` flag — because that is what the old AI import produced and what the API
 * expects. A discount must never arrive as a surcharge.
 *
 * Exact bounds are kept whenever the catalogue supplied them. `required`/`multiSelect` can only
 * say "at least one" and "more than one", so a group that really is "choose 2 to 3" would be
 * flattened to "required, unbounded" the moment someone opened it to rename it. The bounds are
 * therefore carried through untouched and only dropped when an edit actually contradicts them.
 */
export function normalizeVariantGroup (group, orderIndex = 0) {
  const source = group || {}
  const minimum = finite(source.minimumSelectedOptions)
  const maximum = finite(source.maximumSelectedOptions)

  return {
    variantGroupId: source.variantGroupId || source.id || null,
    name: (source.name || '').trim(),
    orderIndex: Number.isFinite(source.orderIndex) ? source.orderIndex : orderIndex,
    required: minimum !== null ? requiredFromBounds(minimum) : !!source.required,
    multiSelect: maximum !== null
      ? multiSelectFromBounds(maximum)
      : !!(source.multiSelect !== undefined ? source.multiSelect : source.multiselect),
    minimumSelectedOptions: minimum,
    maximumSelectedOptions: maximum,
    options: (source.options || []).map((option, index) => {
      const raw = Number(option.amount !== undefined ? option.amount : option.priceAmount) || 0
      return {
        variantOptionId: option.variantOptionId || option.id || null,
        name: (option.name || '').trim(),
        orderIndex: Number.isFinite(option.orderIndex) ? option.orderIndex : index,
        amount: Math.abs(Math.round(raw)),
        negativeAmount: raw < 0 ? true : !!option.negativeAmount,
        otherInformation: option.otherInformation || ''
      }
    })
  }
}

export function normalizeVariantGroups (groups) {
  if (!Array.isArray(groups)) { return null }
  return groups.map((group, index) => normalizeVariantGroup(group, index))
}

/**
 * The shape VariantEditorModal edits. It predates this flow and speaks the legacy names, so the
 * translation happens here rather than by changing a component several pages already use.
 *
 * The editor has no field for an exact bound, so the bounds ride along untouched and are put
 * back by `fromEditorVariant`.
 */
export function toEditorVariant (group) {
  return {
    id: group.variantGroupId || null,
    name: group.name,
    required: !!group.required,
    multiselect: !!group.multiSelect,
    orderIndex: group.orderIndex,
    minimumSelectedOptions: group.minimumSelectedOptions === undefined ? null : group.minimumSelectedOptions,
    maximumSelectedOptions: group.maximumSelectedOptions === undefined ? null : group.maximumSelectedOptions,
    options: (group.options || []).map(option => ({
      id: option.variantOptionId || null,
      name: option.name,
      amount: option.amount,
      wholeAmount: Math.floor(option.amount / 100),
      fractionAmount: String(option.amount % 100).padStart(2, '0'),
      orderIndex: option.orderIndex,
      negativeAmount: !!option.negativeAmount,
      otherInformation: option.otherInformation || ''
    }))
  }
}

/**
 * Reads the editor's result back, keeping an exact bound the editor cannot express.
 *
 * A bound survives only while it still agrees with the flag beside it. Someone who unticks
 * "must be chosen" on a group whose minimum is 2 means it, so that minimum is dropped rather
 * than left to override the flag on the server; a bound the operator never contradicted is kept
 * exactly as the catalogue had it.
 */
export function fromEditorVariant (variant, orderIndex) {
  const group = normalizeVariantGroup({
    ...variant,
    minimumSelectedOptions: null,
    maximumSelectedOptions: null
  }, orderIndex)

  const minimum = finite(variant && variant.minimumSelectedOptions)
  const maximum = finite(variant && variant.maximumSelectedOptions)

  group.minimumSelectedOptions = minimum !== null && requiredFromBounds(minimum) === group.required ? minimum : null
  group.maximumSelectedOptions = maximum !== null && multiSelectFromBounds(maximum) === group.multiSelect ? maximum : null

  return group
}

// ---------------------------------------------------------------- prices

/**
 * What to show in a price box, most deliberate first: what the operator typed, then what the
 * document said, then what the product already charges.
 */
export function priceFor (row, channel) {
  const manual = (row.manualPrices || []).find(price => channelName(price.channel) === channel)
  if (manual) { return manual.amount }
  const source = (row.sourcePrices || []).find(price => channelName(price.channel) === channel)
  if (source && source.amount !== null && source.amount !== undefined) { return source.amount }
  const inferred = (row.inferredPrices || []).find(price => channelName(price.channel) === channel)
  return inferred && inferred.amount !== null && inferred.amount !== undefined ? inferred.amount : null
}

/**
 * The eat-in surcharge the old import stored, derived rather than stored.
 *
 * The old table held a takeaway price plus an eat-in addition. This flow holds three totals, so
 * the addition is shown as the difference. Keeping it as an editable column alongside the totals
 * would give two fields for one number; it is read-only for that reason.
 */
export function eatInAddition (row) {
  const takeaway = priceFor(row, 'takeaway')
  const eatIn = priceFor(row, 'eatIn')
  if (takeaway === null || eatIn === null) { return null }
  return eatIn - takeaway
}

// ---------------------------------------------------------------- legacy adapter

const legacyAmount = (row, key) => {
  // The old page kept both a kroner model and an øre amount and only wrote the amount on change,
  // so the amount is the truth whenever it is a number. 0 is a real price and must survive.
  const amount = row[key + 'Amount']
  if (typeof amount === 'number' && Number.isFinite(amount)) { return Math.round(amount) }
  const model = row[key + 'Model']
  if (typeof model === 'number' && Number.isFinite(model)) { return Math.round(model * 100) }
  const parsed = Number(amount !== undefined && amount !== null && amount !== '' ? amount : NaN)
  if (Number.isFinite(parsed)) { return Math.round(parsed) }
  const parsedModel = Number(model !== undefined && model !== null && model !== '' ? model : NaN)
  return Number.isFinite(parsedModel) ? Math.round(parsedModel * 100) : null
}

const legacyInt = (value) => {
  if (value === null || value === undefined || value === '') { return null }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

const isBlankLegacyRow = row => !row || (!String(row.name || '').trim() &&
  !String(row.description || '').trim() &&
  !String(row.categoryName || '').trim() &&
  !legacyAmount(row, 'price'))

/**
 * Reads one legacy import row into the draft model.
 *
 * The old page wrote every field it showed, so those fields are the operator's intent and are
 * carried as edits rather than as suggestions. `tableAdditional` is an addition to the takeaway
 * price and becomes an eat-in total; three totals are never read back as three additions.
 */
export function rowFromLegacy (legacy, { categories = [], newCategoryKeys = {} } = {}) {
  const takeaway = legacyAmount(legacy, 'price')
  const addition = legacyAmount(legacy, 'tableAdditional')
  const deliveryAddition = legacyAmount(legacy, 'deliveryAdditional')

  const sourcePrices = []
  if (takeaway !== null) { sourcePrices.push({ channel: 'Takeaway', amount: takeaway }) }
  if (takeaway !== null && addition !== null) { sourcePrices.push({ channel: 'EatIn', amount: takeaway + addition }) }
  if (takeaway !== null && deliveryAddition !== null) {
    sourcePrices.push({ channel: 'Delivery', amount: takeaway + deliveryAddition })
  }

  const edits = {}
  const name = String(legacy.name || '').trim()
  if (name) { edits.name = name }
  if (legacy.description !== undefined && legacy.description !== null) { edits.description = String(legacy.description) }
  if (legacy.otherInformation !== undefined && legacy.otherInformation !== null) {
    edits.otherInformation = String(legacy.otherInformation)
  }

  const tax = legacyInt(legacy.tax)
  if (tax !== null) { edits.tax = tax }
  const tableTax = legacyInt(legacy.tableTax)
  if (tableTax !== null) { edits.eatInTax = tableTax }
  const deliveryTax = legacyInt(legacy.deliveryTax)
  if (deliveryTax !== null) { edits.deliveryTax = deliveryTax }

  const deposit = legacyAmount(legacy, 'deposit')
  if (deposit !== null) { edits.depositAmount = deposit }
  // false is a real value: an old draft that says "not sold out" says so on purpose.
  if (legacy.soldOut !== undefined && legacy.soldOut !== null) { edits.soldOut = !!legacy.soldOut }
  if (legacy.hide !== undefined && legacy.hide !== null) { edits.hide = !!legacy.hide }

  const categoryName = String(legacy.categoryName || '').trim()
  if (categoryName) {
    const existing = categories.find(c => (c.name || '').toLowerCase() === categoryName.toLowerCase())
    if (existing) {
      edits.categoryId = existing.categoryId
    } else {
      edits.newCategoryKey = newCategoryKeys[categoryName.toLowerCase()] || null
    }
  }

  const groups = normalizeVariantGroups(legacy.variants)

  return makeRow({
    rowKey: nextRowKey('legacy'),
    origin: 'legacy',
    action: ACTION.create,
    displayName: name,
    categoryName,
    description: String(legacy.description || ''),
    otherInformation: String(legacy.otherInformation || ''),
    sourcePrices,
    metadataEdits: edits,
    variantGroups: groups && groups.length ? groups : null
  })
}

/**
 * Reads a legacy draft — the old `importRows` in localStorage, or an exported JSON file — into
 * the workspace.
 *
 * The store is never taken from the file. Old drafts carry a `storeId` that may belong to a
 * different store entirely, and `replaceAll` in an old export must never turn into a deletion
 * here, so both are reported for the caller to act on rather than applied.
 */
export function fromLegacyDraft (payload, { categories = [] } = {}) {
  const data = payload || {}
  const legacyRows = (Array.isArray(data.rows) ? data.rows : []).filter(row => !isBlankLegacyRow(row))

  const known = new Set(categories.map(c => (c.name || '').toLowerCase()))
  const missing = []
  const newCategoryKeys = {}
  const remember = (name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed || known.has(trimmed.toLowerCase()) || newCategoryKeys[trimmed.toLowerCase()]) { return }
    const key = 'newcat-' + (missing.length + 1)
    newCategoryKeys[trimmed.toLowerCase()] = key
    missing.push({ key, name: trimmed })
  }

  legacyRows.forEach(row => remember(row.categoryName))
  ;(Array.isArray(data.categoryVariants) ? data.categoryVariants : []).forEach(group => remember(group.categoryName))

  const rows = legacyRows.map(row => rowFromLegacy(row, { categories, newCategoryKeys }))

  const categoryVariants = (Array.isArray(data.categoryVariants) ? data.categoryVariants : [])
    .filter(group => group.categoryName && (group.variants || []).length)
    .map((group) => {
      const name = String(group.categoryName).trim()
      const existing = categories.find(c => (c.name || '').toLowerCase() === name.toLowerCase())
      return {
        categoryName: name,
        categoryId: existing ? existing.categoryId : null,
        newCategoryKey: existing ? null : (newCategoryKeys[name.toLowerCase()] || null),
        variants: normalizeVariantGroups(group.variants) || []
      }
    })

  return {
    rows,
    categoryVariants,
    newCategories: missing,
    // Reported, never applied. The caller asks where this draft should land.
    declaredStoreId: data.storeId === undefined ? null : data.storeId,
    // Reported so the operator can be told it was ignored. Deleting a catalogue is a separate,
    // explicitly confirmed action and can never come out of a file.
    declaredReplaceAll: !!data.replaceAll
  }
}

/** Recognises both the legacy export and this workspace's own file. */
export function readDraftFile (json, options) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  if (data && data.format === DRAFT_FORMAT) { return readWorkspaceDraft(data) }
  return { ...fromLegacyDraft(data, options), legacy: true }
}

export const DRAFT_FORMAT = 'okam-menu-import'
export const DRAFT_VERSION = 2

/**
 * What "download draft" writes. Lossless for this model, and never a deletion instruction.
 *
 * The price rules are part of the draft. They decide what an unpriced channel is proposed as, so
 * a draft reopened without them would come back showing different money than it was saved with.
 */
export function toDraftFile (storeId, rows, categoryVariants, newCategories, rules) {
  return {
    format: DRAFT_FORMAT,
    version: DRAFT_VERSION,
    storeId,
    savedAt: new Date().toISOString(),
    rules: rules ? { ...rules } : null,
    rows: (rows || []).map(row => ({
      rowKey: row.rowKey,
      action: row.action,
      targetProductId: row.targetProductId,
      origin: row.origin,
      displayName: row.displayName,
      sizeLabel: row.sizeLabel,
      menuNumber: row.menuNumber,
      categoryName: row.categoryName,
      description: row.description,
      otherInformation: row.otherInformation,
      sourcePrices: row.sourcePrices,
      manualPrices: row.manualPrices,
      inferredPrices: row.inferredPrices,
      sourceIssues: row.sourceIssues,
      acceptedWarnings: row.acceptedWarnings,
      matchConfirmed: row.matchConfirmed,
      excludedFromRules: row.excludedFromRules,
      sourceMeta: row.sourceMeta,
      metadataEdits: row.metadataEdits,
      variantGroups: row.variantGroups,
      clearVariantGroups: row.clearVariantGroups,
      newProduct: row.newProduct
    })),
    categoryVariants: categoryVariants || [],
    newCategories: newCategories || []
  }
}

export function readWorkspaceDraft (data) {
  return {
    rows: (data.rows || []).map(row => makeRow({
      ...row,
      metadataEdits: { ...(row.metadataEdits || {}) },
      sourceMeta: { ...(row.sourceMeta || {}) },
      variantGroups: normalizeVariantGroups(row.variantGroups),
      current: null
    })),
    categoryVariants: (data.categoryVariants || []).map(group => ({
      ...group,
      variants: normalizeVariantGroups(group.variants) || []
    })),
    newCategories: data.newCategories || [],
    rules: data.rules || null,
    declaredStoreId: data.storeId === undefined ? null : data.storeId,
    declaredReplaceAll: false
  }
}

/**
 * Merges an incoming draft or analysis into one already on screen.
 *
 * Two things collide when lists are joined. Row keys repeat, and the second row would then
 * overwrite the first in every key-addressed lookup — the resolved plan, the undo snapshot, the
 * carry of decisions. And new-category keys repeat, because every legacy import numbers its own
 * from `newcat-1`, so appending a second file would silently point its rows at the first file's
 * category.
 *
 * Both are renamed here, and every reference to a renamed key is moved with it. Categories that
 * are genuinely the same name are folded into one rather than created twice.
 */
export function mergeForAppend (existingRows, existingCategories, incoming) {
  const usedRowKeys = new Set((existingRows || []).map(row => row.rowKey))
  const byName = new Map()
  ;(existingCategories || []).forEach((category) => { byName.set(category.name.trim().toLowerCase(), category.key) })
  const usedCategoryKeys = new Set((existingCategories || []).map(category => category.key))

  const categoryKeyMap = {}
  const addedCategories = []

  ;(incoming.newCategories || []).forEach((category) => {
    const name = String(category.name || '').trim()
    const existingKey = byName.get(name.toLowerCase())
    if (existingKey) {
      // The same category asked for twice is still one category.
      categoryKeyMap[category.key] = existingKey
      return
    }

    let key = category.key
    while (usedCategoryKeys.has(key)) { key = key + '-b' }
    usedCategoryKeys.add(key)
    byName.set(name.toLowerCase(), key)
    categoryKeyMap[category.key] = key
    addedCategories.push({ key, name })
  })

  const remapKey = key => (key && categoryKeyMap[key]) || key

  const rows = (incoming.rows || []).map((row) => {
    let rowKey = row.rowKey
    while (usedRowKeys.has(rowKey)) { rowKey = nextRowKey('appended') }
    usedRowKeys.add(rowKey)

    const metadataEdits = { ...(row.metadataEdits || {}) }
    if (metadataEdits.newCategoryKey) { metadataEdits.newCategoryKey = remapKey(metadataEdits.newCategoryKey) }

    const newProduct = row.newProduct
      ? { ...row.newProduct, newCategoryKey: remapKey(row.newProduct.newCategoryKey) }
      : row.newProduct

    return { ...row, rowKey, metadataEdits, newProduct }
  })

  const categoryVariants = (incoming.categoryVariants || []).map(group => ({
    ...group,
    newCategoryKey: remapKey(group.newCategoryKey)
  }))

  return { rows, categoryVariants, newCategories: addedCategories }
}

/**
 * Carries the operator's own work from one draft onto a freshly read one.
 *
 * The price flow's `carryDecisions` knows about actions, links, manual prices and accepted
 * warnings. It predates metadata editing, so on its own a corrected column mapping would throw
 * away every metadata edit and option group the operator had made — the exact work that is
 * hardest to redo. Those are carried here on top of it.
 */
export function carryWorkspaceState (previousRows, nextRows, carried) {
  const previous = {}
  ;(previousRows || []).forEach((row) => { previous[row.rowKey] = row })

  return (carried || nextRows).map((row) => {
    const before = previous[row.rowKey]
    if (!before) { return row }

    return {
      ...row,
      origin: before.origin || row.origin,
      metadataEdits: { ...(before.metadataEdits || {}) },
      // A fresh reading may propose different groups, but an operator who edited them has said
      // what they want; `null` here means they never touched them and the new proposal stands.
      variantGroups: before.variantGroups !== null && before.variantGroups !== undefined
        ? JSON.parse(JSON.stringify(before.variantGroups))
        : row.variantGroups,
      clearVariantGroups: !!before.clearVariantGroups,
      inferredPrices: (before.inferredPrices || []).map(price => ({ ...price })),
      // The new reading's own claims replace the old ones: they are what this document says now.
      sourceMeta: { ...(row.sourceMeta || {}) }
    }
  })
}

// ---------------------------------------------------------------- autosave

export function draftStorageKey (userId, storeId) {
  return 'menuImport.draft.' + (userId || 'anon') + '.' + (storeId || 0)
}

/**
 * Where an apply whose result was never seen is remembered.
 *
 * Written before the request goes out, not after it fails. A tab closed or reloaded mid-apply
 * would otherwise come back with a clean slate, and the operator would build a second plan for
 * work the first call may already have committed — the one way this flow could create duplicate
 * products. Cleared only by a receipt.
 */
export function pendingApplyKey (userId, storeId) {
  return 'menuImport.pending.' + (userId || 'anon') + '.' + (storeId || 0)
}

// ---------------------------------------------------------------- request

/**
 * Builds the one payload validate and apply are given.
 *
 * Field names follow `api-contract.md` exactly. Everything the API learns about metadata comes
 * from `metadataEdits`; a row with none sends no `metadata` at all, which the contract defines
 * as writing prices and nothing else — the behaviour the old price-only flow already had.
 */
export function toValidateRequest (storeId, rules, rows, extras = {}) {
  const { categoryVariants = [], newCategories = [], catalogueReplacement = null } = extras

  const request = {
    storeId,
    rules: { ...rules },
    rows: rows.map(row => toRequestRow(row))
  }

  const usedKeys = new Set()
  request.rows.forEach((row) => {
    if (row.metadata && row.metadata.newCategoryKey) { usedKeys.add(row.metadata.newCategoryKey) }
    if (row.newProduct && row.newProduct.newCategoryKey) { usedKeys.add(row.newProduct.newCategoryKey) }
  })

  const groups = (categoryVariants || [])
    .filter(group => (group.categoryId || group.newCategoryKey) && (group.variants || []).length)
    .map(group => ({
      categoryId: group.categoryId || null,
      newCategoryKey: group.categoryId ? null : (group.newCategoryKey || null),
      groups: normalizeVariantGroups(group.variants) || []
    }))

  groups.forEach((group) => { if (group.newCategoryKey) { usedKeys.add(group.newCategoryKey) } })

  // An unreferenced key is a blocker on the server, so a category nothing points at is dropped
  // here rather than sent to be refused.
  const declared = (newCategories || []).filter(category => usedKeys.has(category.key))
  if (declared.length) { request.newCategories = declared.map(({ key, name }) => ({ key, name })) }
  if (groups.length) { request.categoryVariants = groups }

  if (catalogueReplacement && catalogueReplacement.requested) {
    request.catalogueReplacement = {
      requested: true,
      expectedRemovedProductIds: [...(catalogueReplacement.expectedRemovedProductIds || [])]
    }
  }

  return request
}

function toRequestRow (row) {
  const isCreate = row.action === ACTION.create
  const request = {
    rowKey: row.rowKey,
    action: row.action,
    targetProductId: isCreate ? null : row.targetProductId,
    plannedProductId: isCreate ? row.plannedProductId : null,
    displayName: row.displayName,
    sizeLabel: row.sizeLabel,
    sourcePrices: row.sourcePrices,
    manualPrices: row.manualPrices,
    excludedFromRules: !!row.excludedFromRules,
    sourceIssues: row.sourceIssues || [],
    matchConfirmed: !!row.matchConfirmed,
    // The option groups are taken from the row at send time rather than from whenever
    // `newProduct` was last rebuilt, so a group added after that cannot be left behind.
    newProduct: isCreate && row.newProduct
      ? { ...row.newProduct, variants: row.variantGroups && row.variantGroups.length ? row.variantGroups : null }
      : null,
    acceptedWarnings: row.acceptedWarnings || []
  }

  const metadata = metadataFor(row)
  if (metadata) { request.metadata = metadata }

  return request
}

/**
 * The `metadata` object for one row, or null when the operator edited nothing.
 *
 * A create row sends nothing here. Everything it asks for — including its option groups — lives
 * on `newProduct`, which is what the writer reads when it creates a product. Splitting a create
 * across both objects is how six option groups get built in the browser and then quietly not
 * written, and the contract also treats the same field on both as a blocker.
 *
 * An empty `variants` array is never sent: the contract refuses it precisely because it is the
 * shape a bug produces, and removing every group is said explicitly with `clearVariants`.
 */
export function metadataFor (row) {
  if (row.action === ACTION.create) { return null }

  const metadata = {}
  const edits = row.metadataEdits || {}
  Object.keys(edits).forEach((key) => {
    if (edits[key] !== undefined) { metadata[key] = edits[key] }
  })
  // Mutually exclusive on the server; an id always wins over a pending new category.
  if (metadata.categoryId) { delete metadata.newCategoryKey }

  if (row.clearVariantGroups) {
    metadata.clearVariants = true
  } else if (row.variantGroups && row.variantGroups.length) {
    metadata.variants = row.variantGroups
  }

  return Object.keys(metadata).length ? metadata : null
}

/**
 * Fills the create payload from the same edits the table shows, so what is on screen is what is
 * created. Category suggestions come from the store's own rates, never a fixed number.
 */
export function buildNewProduct (row, categories, previous) {
  const value = field => displayValue(row, field)
  const categoryId = value('categoryId')
  const newCategoryKey = row.metadataEdits.newCategoryKey || (row.sourceMeta || {}).newCategoryKey || null
  const category = (categories || []).find(c => c.categoryId === categoryId) ||
    (categories || []).find(c => c.name === row.categoryName) ||
    null

  const rate = (field, fallback) => {
    const edited = hasOwn(row.metadataEdits, field) ? row.metadataEdits[field] : null
    if (edited !== null && edited !== undefined) { return edited }
    if (previous && previous[field] !== undefined && previous.categoryId === categoryId) { return previous[field] }
    return category ? category[fallback] : 0
  }

  // Presence, not truthiness. Someone who deletes a description means the empty box; falling
  // back on `||` would put the old text straight back and there would be no way to clear it.
  const text = (field, fallback) => {
    const resolved = value(field)
    return resolved === null || resolved === undefined ? (fallback || '') : String(resolved)
  }

  const deposit = value('depositAmount')

  return {
    name: text('name') || newProductName(row),
    description: text('description', row.description),
    otherInformation: text('otherInformation', row.otherInformation),
    categoryId: categoryId || (category ? category.categoryId : null),
    newCategoryKey: categoryId ? null : newCategoryKey,
    tax: rate('tax', 'suggestedTax'),
    eatInTax: rate('eatInTax', 'suggestedEatInTax'),
    deliveryTax: rate('deliveryTax', 'suggestedDeliveryTax'),
    depositAmount: deposit === null || deposit === undefined ? 0 : deposit,
    soldOut: !!value('soldOut'),
    hide: !!value('hide'),
    // The writer reads a created product's option groups from here, so this is where they go.
    // A create row sends no `metadata`, precisely so they cannot end up in the half nobody reads.
    variants: row.variantGroups && row.variantGroups.length ? row.variantGroups : null,
    setupConfirmed: previous ? !!previous.setupConfirmed : false
  }
}

/**
 * What the workspace shows: the rows of this draft, and nothing else.
 *
 * Products the store already has and this import does not mention are deliberately absent. They
 * are not changed, so listing them would be a catalogue browser rather than a work list.
 */
export function draftRows (rows) {
  return (rows || []).filter(row => row.inSource || row.origin !== 'source')
}

/** Attaches what the catalogue holds today, so a linked row can show current values. */
export function attachCurrent (row, catalogue) {
  if (row.action === ACTION.create || !row.targetProductId) {
    row.current = null
    return row
  }
  const product = (catalogue || []).find(p => p.productId === row.targetProductId)
  row.current = product
    ? {
      name: product.name,
      categoryId: product.categoryId || null,
      categoryName: product.categoryName || '',
      description: product.description === undefined ? null : product.description,
      otherInformation: product.otherInformation === undefined ? null : product.otherInformation,
      tax: product.tax === undefined ? null : product.tax,
      eatInTax: product.eatInTax === undefined ? null : product.eatInTax,
      deliveryTax: product.deliveryTax === undefined ? null : product.deliveryTax,
      depositAmount: product.depositAmount === undefined ? null : product.depositAmount,
      soldOut: product.soldOut === undefined ? null : product.soldOut,
      hide: product.hide === undefined ? null : product.hide,
      variants: normalizeVariantGroups(product.variants)
    }
    : null
  return row
}

/**
 * Shows what the linked product charges today, so a manually created row does not start at zero
 * and quietly propose wiping its prices.
 *
 * These go in their own list, never into `sourcePrices`. Relinking a row from one product to
 * another recomputes the whole list, so the first product's prices cannot linger and be read as
 * something the menu or the operator asked for. Unlinking clears it.
 */
export function adoptCurrentPrices (row, product) {
  if (!product) {
    row.inferredPrices = []
    return row
  }

  row.inferredPrices = CHANNELS
    .filter(channel => product[channel] !== null && product[channel] !== undefined)
    .map(channel => ({ channel: channelEnum(channel), amount: product[channel] }))

  return row
}
