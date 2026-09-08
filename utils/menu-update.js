// Pure client-side logic for the menu update review screen.
//
// Nothing here decides a price. The server recomputes every field, and these helpers only
// keep the operator's own choices (action, target, manual prices, accepted warnings, scope)
// and derive the counters, filters and bulk-action scope the screen shows. Keeping it free of
// Vue makes the parts that are easy to get wrong — counting over the whole plan rather than
// the visible page, and not letting a rule overwrite a manual edit — directly testable.

export const CHANNELS = ['takeaway', 'eatIn', 'delivery']

export const ACTION = { skip: 'Skip', update: 'Update', create: 'Create' }

export const FILTERS = ['all', 'updated', 'new', 'review', 'unchanged', 'notInSource']

/** Formats an amount in ore as Norwegian kroner. */
export function money (amountInOre) {
  if (amountInOre === null || amountInOre === undefined) { return '—' }
  return (amountInOre / 100).toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function percent (value) {
  if (value === null || value === undefined) { return '' }
  // Math.round pulls a negative half towards zero, which would show a price cut as smaller
  // than it is. Rounding away from zero keeps the two directions symmetric.
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * 10) / 10
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + ' %'
}

/**
 * Turns the analysis response into the editable draft the screen works on. Rows the source
 * never mentioned are appended from the catalogue: they are shown so they can be priced by
 * rule, and they are never deleted.
 */
export function buildDraft (analysis) {
  const rows = (analysis.rows || []).map((row, index) => ({
    rowKey: row.rowKey || ('source-' + index),
    action: row.suggestedAction || ACTION.update,
    targetProductId: row.suggestedProductId || null,
    plannedProductId: null,
    displayName: row.name,
    sizeLabel: row.sizeLabel || null,
    menuNumber: row.menuNumber || '',
    categoryName: row.categoryName || '',
    // The document's own words. They are what a new product is described by, and what the
    // server matches on when a menu prints ingredients instead of dish names.
    description: row.description || '',
    otherInformation: row.otherInformation || '',
    sourcePrices: (row.sourcePrices || []).map(p => ({ ...p })),
    manualPrices: [],
    excludedFromRules: false,
    acceptedWarnings: [],
    // Carried into the plan so the server keeps demanding a decision on them.
    sourceIssues: (row.sourceIssues || []).slice(),
    matchConfirmed: false,
    newProduct: null,
    candidates: row.candidates || [],
    reason: row.suggestedReason || '',
    sourceWarnings: row.warnings || [],
    needsReview: !!row.needsReview,
    inSource: true
  }))

  const catalogueById = {}
  ;(analysis.catalogue || []).forEach((p) => { catalogueById[p.productId] = p })

  ;(analysis.unmatchedCatalogueProductIds || []).forEach((productId) => {
    const product = catalogueById[productId]
    if (!product) { return }
    rows.push({
      rowKey: 'catalogue-' + productId,
      action: ACTION.update,
      targetProductId: productId,
      plannedProductId: null,
      displayName: product.name,
      sizeLabel: null,
      menuNumber: '',
      categoryName: product.categoryName || '',
      description: product.description || '',
      otherInformation: product.otherInformation || '',
      sourcePrices: [],
      manualPrices: [],
      excludedFromRules: false,
      acceptedWarnings: [],
      sourceIssues: [],
      matchConfirmed: false,
      newProduct: null,
      candidates: [],
      reason: '',
      sourceWarnings: [],
      needsReview: false,
      inSource: false
    })
  })

  return rows
}

/** Builds the exact payload validate and apply are given. */
export function toValidateRequest (storeId, rules, rows) {
  return {
    storeId,
    rules: { ...rules },
    rows: rows.map(row => ({
      rowKey: row.rowKey,
      action: row.action,
      targetProductId: row.action === ACTION.create ? null : row.targetProductId,
      plannedProductId: row.action === ACTION.create ? row.plannedProductId : null,
      displayName: row.displayName,
      sizeLabel: row.sizeLabel,
      sourcePrices: row.sourcePrices,
      manualPrices: row.manualPrices,
      excludedFromRules: !!row.excludedFromRules,
      sourceIssues: row.sourceIssues || [],
      matchConfirmed: !!row.matchConfirmed,
      newProduct: row.action === ACTION.create ? row.newProduct : null,
      acceptedWarnings: row.acceptedWarnings || []
    }))
  }
}

/**
 * Whether a resolved row still needs the operator. A row is unresolved while it has a blocker
 * or an unaccepted warning that demands confirmation.
 */
export function isUnresolved (resolved) {
  if (!resolved) { return false }
  if ((resolved.blockers || []).length > 0) { return true }
  return (resolved.warnings || []).some(w => w.requiresAcceptance && !w.accepted)
}

/**
 * Counters for the whole plan. These deliberately ignore the current filter and search, so a
 * narrowed view can never make the footer under-report what is about to be saved.
 */
export function counts (rows, resolvedByKey) {
  const result = { all: rows.length, updated: 0, new: 0, review: 0, unchanged: 0, notInSource: 0, skipped: 0 }

  rows.forEach((row) => {
    const resolved = resolvedByKey[row.rowKey]

    if (!row.inSource) { result.notInSource++ }

    if (row.action === ACTION.skip) {
      result.skipped++
      return
    }

    if (isUnresolved(resolved) || (!resolved && row.needsReview)) {
      result.review++
      return
    }

    if (row.action === ACTION.create) {
      result.new++
      return
    }

    if (resolved && resolved.changed) { result.updated++ } else { result.unchanged++ }
  })

  return result
}

export function matchesFilter (row, resolved, filter) {
  switch (filter) {
  case 'all': return true
  case 'notInSource': return !row.inSource
  case 'review': return row.action !== ACTION.skip && (isUnresolved(resolved) || (!resolved && row.needsReview))
  case 'new': return row.action === ACTION.create && !isUnresolved(resolved)
  case 'updated':
    return row.action === ACTION.update && !isUnresolved(resolved) && !!(resolved && resolved.changed)
  case 'unchanged':
    return row.action === ACTION.skip ||
        (row.action === ACTION.update && !isUnresolved(resolved) && !(resolved && resolved.changed))
  default: return true
  }
}

export function matchesQuery (row, query) {
  if (!query) { return true }
  const needle = query.toLowerCase().trim()
  return [row.menuNumber, row.displayName, row.categoryName, row.sizeLabel]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(needle))
}

export function visibleRows (rows, resolvedByKey, filter, query) {
  return rows.filter(row => matchesFilter(row, resolvedByKey[row.rowKey], filter) && matchesQuery(row, query))
}

/**
 * The rows a bulk action applies to.
 *
 * "allInFilter" is the entire current filter and search, including rows scrolled out of view,
 * which the screen states in so many words next to the count.
 */
export function scopeRows (rows, resolvedByKey, scope, { filter, query, categoryName, checkedKeys } = {}) {
  switch (scope) {
  case 'SelectedCategory':
    return rows.filter(row => row.categoryName === categoryName)
  case 'CheckedRows': {
    const checked = new Set(checkedKeys || [])
    return rows.filter(row => checked.has(row.rowKey))
  }
  case 'AllInFilter':
  default:
    return visibleRows(rows, resolvedByKey, filter || 'all', query || '')
  }
}

/**
 * Counts the price fields a rule would actually move, so the preview can say how many
 * products and how many prices are affected rather than just "all".
 *
 * A field the document priced, or one the operator typed, is never counted: a rule does not
 * overwrite those.
 */
export function ruleImpact (scopedRows) {
  let productCount = 0
  let fieldCount = 0

  scopedRows.forEach((row) => {
    if (row.action === ACTION.skip) { return }

    const touched = CHANNELS.filter(channel =>
      !(row.manualPrices || []).some(m => channelName(m.channel) === channel) &&
      !(row.sourcePrices || []).some(s => channelName(s.channel) === channel)
    ).length

    if (touched > 0) {
      productCount++
      fieldCount += touched
    }
  })

  return { productCount, fieldCount }
}

/**
 * The API serialises the channel enum as a string, but a hand-built payload may still carry
 * the numeric value. Normalising in one place keeps both readable.
 */
export function channelName (channel) {
  if (channel === 0 || channel === 'Takeaway' || channel === 'takeaway') { return 'takeaway' }
  if (channel === 1 || channel === 'EatIn' || channel === 'eatIn') { return 'eatIn' }
  if (channel === 2 || channel === 'Delivery' || channel === 'delivery') { return 'delivery' }
  return null
}

export function channelEnum (channel) {
  if (channel === 'takeaway') { return 'Takeaway' }
  if (channel === 'eatIn') { return 'EatIn' }
  return 'Delivery'
}

/** A deep copy used for the undo snapshot of a bulk action. */
export function snapshot (rows) {
  return JSON.parse(JSON.stringify(rows))
}

/**
 * Returns a copy of the draft with the rule scope applied, leaving the draft alone.
 *
 * Previewing a rule must not edit the rows the operator is looking at: an abandoned preview
 * would otherwise leave every out-of-scope row silently excluded from rules for good.
 */
export function withScopeApplied (rows, scopedKeys) {
  const inScope = new Set(scopedKeys)
  return rows.map(row => ({ ...row, excludedFromRules: !inScope.has(row.rowKey) }))
}

/**
 * The default price rules. Resetting returns to these and touches nothing the operator typed.
 */
export function defaultRules () {
  return {
    missingChannelRule: 'KeepCurrent',
    referenceChannel: 'Takeaway',
    missingChannelPercent: null,
    absentProductRule: 'Keep',
    absentProductPercent: null,
    absentProductUseReferenceRateForAllChannels: false,
    newProductChannelRule: 'RequireExplicit',
    newProductEatInPercent: null,
    newProductDeliveryPercent: null,
    rounding: 'NearestKrone'
  }
}

/**
 * Carries the operator's own decisions from one draft onto a freshly merged one.
 *
 * Re-reading the columns rebuilds every row, so without this a corrected mapping would quietly
 * throw away chosen actions, typed prices, confirmed matches and new product setup. A row key
 * encodes the product and its size, so a row whose key no longer exists genuinely refers to
 * something the new mapping does not produce; those are reported rather than guessed at.
 */
export function carryDecisions (previousRows, nextRows) {
  const previous = {}
  previousRows.forEach((row) => { previous[row.rowKey] = row })

  let carried = 0
  const dropped = []

  const rows = nextRows.map((row) => {
    const before = previous[row.rowKey]
    if (!before) { return row }

    const decided = before.action !== ACTION.update ||
      before.targetProductId !== row.targetProductId ||
      (before.manualPrices || []).length > 0 ||
      (before.acceptedWarnings || []).length > 0 ||
      before.matchConfirmed ||
      !!before.newProduct

    if (decided) { carried++ }

    return {
      ...row,
      action: before.action,
      targetProductId: before.action === ACTION.create ? null : before.targetProductId,
      manualPrices: (before.manualPrices || []).map(m => ({ ...m })),
      acceptedWarnings: (before.acceptedWarnings || []).slice(),
      matchConfirmed: !!before.matchConfirmed,
      excludedFromRules: !!before.excludedFromRules,
      newProduct: before.newProduct ? { ...before.newProduct } : null
    }
  })

  const nextKeys = new Set(nextRows.map(r => r.rowKey))
  previousRows.forEach((row) => {
    const decided = row.action !== ACTION.update ||
      (row.manualPrices || []).length > 0 ||
      (row.acceptedWarnings || []).length > 0 ||
      row.matchConfirmed ||
      !!row.newProduct
    if (decided && !nextKeys.has(row.rowKey)) { dropped.push(row.displayName || row.rowKey) }
  })

  return { rows, carried, dropped }
}

/**
 * Clears only what a price rule produced. Manual prices, chosen actions, catalogue links,
 * accepted warnings and new product setup are the operator's own work and survive.
 */
export function clearRuleState (rows) {
  return rows.map(row => ({ ...row, excludedFromRules: false }))
}

export function resolvedByKey (validation) {
  const map = {}
  ;((validation && validation.rows) || []).forEach((row) => { map[row.rowKey] = row })
  return map
}

/** Sets a manual price on a row, replacing any earlier manual value for that channel. */
export function setManualPrice (row, channel, amountInOre) {
  const name = channelName(channel)
  row.manualPrices = (row.manualPrices || []).filter(m => channelName(m.channel) !== name)
  if (amountInOre !== null && amountInOre !== undefined && amountInOre !== '') {
    row.manualPrices.push({ channel: channelEnum(name), amount: Math.round(Number(amountInOre)) })
  }
  return row
}

export function clearManualPrices (row) {
  row.manualPrices = []
  return row
}
