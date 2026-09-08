import {
  ACTION,
  buildDraft,
  channelEnum,
  channelName,
  counts,
  isUnresolved,
  matchesQuery,
  money,
  percent,
  resolvedByKey,
  ruleImpact,
  scopeRows,
  setManualPrice,
  snapshot,
  toValidateRequest,
  visibleRows
} from '~/utils/menu-update'

const analysis = {
  storeId: 7,
  rows: [
    {
      rowKey: 'n:1#medium',
      menuNumber: '1',
      name: 'Jungel sterk salami',
      sizeLabel: 'Medium',
      categoryName: 'Pizza',
      suggestedAction: 'Update',
      suggestedProductId: 'p1',
      needsReview: false,
      sourcePrices: [{ channel: 'Takeaway', amount: 24200, documentName: 'takeaway.pdf', pageNumber: 2, columnLabel: 'Medium' }],
      candidates: [],
      warnings: []
    },
    {
      rowKey: 'n:2#medium',
      menuNumber: '2',
      name: 'Rabarbra',
      sizeLabel: 'Medium',
      categoryName: 'Pizza',
      suggestedAction: 'Update',
      suggestedProductId: 'p2',
      needsReview: true,
      sourcePrices: [
        { channel: 'Takeaway', amount: 24500, documentName: 'takeaway.pdf', pageNumber: 2, columnLabel: 'Medium' },
        { channel: 'Takeaway', amount: 23200, documentName: 'torshov.pdf', pageNumber: 2, columnLabel: 'Ta med' }
      ],
      candidates: [],
      warnings: []
    }
  ],
  catalogue: [
    { productId: 'p1', name: '1. Jungel sterk salami', categoryName: 'Pizza' },
    { productId: 'p2', name: '2. Rabarbra', categoryName: 'Pizza' },
    { productId: 'p9', name: 'Cola 0,5', categoryName: 'Drikke' }
  ],
  unmatchedCatalogueProductIds: ['p9']
}

const validation = (overrides = {}) => resolvedByKey({
  rows: [
    { rowKey: 'n:1#medium', changed: true, blockers: [], warnings: [] },
    { rowKey: 'n:2#medium', changed: false, blockers: [{ code: 'sourceConflict' }], warnings: [] },
    { rowKey: 'catalogue-p9', changed: false, blockers: [], warnings: [] },
    ...(overrides.rows || [])
  ]
})

describe('buildDraft', () => {
  it('keeps every source row and appends catalogue products the menus never mentioned', () => {
    const rows = buildDraft(analysis)

    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.rowKey)).toEqual(['n:1#medium', 'n:2#medium', 'catalogue-p9'])

    const absent = rows[2]
    expect(absent.inSource).toBe(false)
    expect(absent.targetProductId).toBe('p9')
    expect(absent.action).toBe(ACTION.update)
    expect(absent.sourcePrices).toEqual([])
  })

  it('carries the suggested match and the review flag through to the draft', () => {
    const rows = buildDraft(analysis)

    expect(rows[0].targetProductId).toBe('p1')
    expect(rows[0].needsReview).toBe(false)
    expect(rows[1].needsReview).toBe(true)
    expect(rows[1].sourcePrices).toHaveLength(2)
  })
})

describe('counts', () => {
  it('counts the whole plan rather than the filtered view', () => {
    const rows = buildDraft(analysis)
    const resolved = validation()

    const all = counts(rows, resolved)
    expect(all.all).toBe(3)
    expect(all.updated).toBe(1)
    expect(all.review).toBe(1)
    expect(all.unchanged).toBe(1)
    expect(all.notInSource).toBe(1)

    // Narrowing the view must not change the numbers the footer reports.
    const visible = visibleRows(rows, resolved, 'updated', '')
    expect(visible).toHaveLength(1)
    expect(counts(rows, resolved)).toEqual(all)
  })

  it('moves a skipped row out of the unresolved bucket', () => {
    const rows = buildDraft(analysis)
    rows[1].action = ACTION.skip

    const result = counts(rows, validation())
    expect(result.review).toBe(0)
    expect(result.skipped).toBe(1)
  })
})

describe('isUnresolved', () => {
  it('treats a blocker and an unaccepted required warning the same way', () => {
    expect(isUnresolved({ blockers: [{ code: 'sourceConflict' }], warnings: [] })).toBe(true)
    expect(isUnresolved({ blockers: [], warnings: [{ code: 'largePriceChange', requiresAcceptance: true, accepted: false }] })).toBe(true)
    expect(isUnresolved({ blockers: [], warnings: [{ code: 'largePriceChange', requiresAcceptance: true, accepted: true }] })).toBe(false)
    expect(isUnresolved({ blockers: [], warnings: [{ code: 'ruleReferenceMissing', requiresAcceptance: false }] })).toBe(false)
  })
})

describe('filters and search', () => {
  it('separates updated, review, unchanged and not-in-source', () => {
    const rows = buildDraft(analysis)
    const resolved = validation()

    expect(visibleRows(rows, resolved, 'review', '').map(r => r.rowKey)).toEqual(['n:2#medium'])
    expect(visibleRows(rows, resolved, 'updated', '').map(r => r.rowKey)).toEqual(['n:1#medium'])
    expect(visibleRows(rows, resolved, 'notInSource', '').map(r => r.rowKey)).toEqual(['catalogue-p9'])
    expect(visibleRows(rows, resolved, 'all', '')).toHaveLength(3)
  })

  it('searches on number, name and category', () => {
    const row = buildDraft(analysis)[0]

    expect(matchesQuery(row, '1')).toBe(true)
    expect(matchesQuery(row, 'salami')).toBe(true)
    expect(matchesQuery(row, 'PIZZA')).toBe(true)
    expect(matchesQuery(row, 'burger')).toBe(false)
    expect(matchesQuery(row, '')).toBe(true)
  })
})

describe('bulk scope', () => {
  it('covers the whole filter, including rows that are scrolled out of view', () => {
    const rows = buildDraft(analysis)
    const resolved = validation()

    const all = scopeRows(rows, resolved, 'AllInFilter', { filter: 'all', query: '' })
    expect(all).toHaveLength(3)

    const narrowed = scopeRows(rows, resolved, 'AllInFilter', { filter: 'updated', query: '' })
    expect(narrowed.map(r => r.rowKey)).toEqual(['n:1#medium'])
  })

  it('honours a category and an explicit selection', () => {
    const rows = buildDraft(analysis)
    const resolved = validation()

    expect(scopeRows(rows, resolved, 'SelectedCategory', { categoryName: 'Drikke' }).map(r => r.rowKey))
      .toEqual(['catalogue-p9'])
    expect(scopeRows(rows, resolved, 'CheckedRows', { checkedKeys: ['n:2#medium'] }).map(r => r.rowKey))
      .toEqual(['n:2#medium'])
  })
})

describe('ruleImpact', () => {
  it('never counts a field that came from the document or that was typed by hand', () => {
    const rows = buildDraft(analysis)

    // Row 1 has takeaway from the source, so only eat in and delivery are left for a rule.
    expect(ruleImpact([rows[0]])).toEqual({ productCount: 1, fieldCount: 2 })

    // The catalogue-only row has no source price at all.
    expect(ruleImpact([rows[2]])).toEqual({ productCount: 1, fieldCount: 3 })

    setManualPrice(rows[2], 'eatIn', 20000)
    expect(ruleImpact([rows[2]])).toEqual({ productCount: 1, fieldCount: 2 })
  })

  it('ignores skipped rows', () => {
    const rows = buildDraft(analysis)
    rows[2].action = ACTION.skip
    expect(ruleImpact([rows[2]])).toEqual({ productCount: 0, fieldCount: 0 })
  })
})

describe('toValidateRequest', () => {
  it('drops the target on a create row and the planned id on an update row', () => {
    const rows = buildDraft(analysis)
    rows[1].action = ACTION.create
    rows[1].plannedProductId = 'planned-1'
    rows[1].newProduct = { name: 'Rabarbra', categoryId: 'c1', tax: 15, eatInTax: 25, deliveryTax: 15, setupConfirmed: true }

    const payload = toValidateRequest(7, { rounding: 'NearestKrone' }, rows)

    expect(payload.storeId).toBe(7)
    expect(payload.rows[0].targetProductId).toBe('p1')
    expect(payload.rows[0].plannedProductId).toBeNull()
    expect(payload.rows[0].newProduct).toBeNull()
    expect(payload.rows[1].targetProductId).toBeNull()
    expect(payload.rows[1].plannedProductId).toBe('planned-1')
    expect(payload.rows[1].newProduct.setupConfirmed).toBe(true)
  })

  it('keeps the unresolved source prices when a row becomes a create', () => {
    const rows = buildDraft(analysis)
    rows[1].action = ACTION.create

    const payload = toValidateRequest(7, {}, rows)
    expect(payload.rows[1].sourcePrices).toHaveLength(2)
  })

  it('sends the rule scope as a per-row exclusion', () => {
    const rows = buildDraft(analysis)
    rows[2].excludedFromRules = true

    const payload = toValidateRequest(7, {}, rows)
    expect(payload.rows[0].excludedFromRules).toBe(false)
    expect(payload.rows[2].excludedFromRules).toBe(true)
  })
})

describe('manual prices', () => {
  it('replaces an earlier manual value for the same channel and clears on an empty value', () => {
    const row = buildDraft(analysis)[0]

    setManualPrice(row, 'eatIn', 26500)
    setManualPrice(row, 'eatIn', 27000)
    expect(row.manualPrices).toEqual([{ channel: 'EatIn', amount: 27000 }])

    setManualPrice(row, 'delivery', 28000)
    expect(row.manualPrices).toHaveLength(2)

    setManualPrice(row, 'eatIn', null)
    expect(row.manualPrices).toEqual([{ channel: 'Delivery', amount: 28000 }])
  })
})

describe('undo snapshot', () => {
  it('restores the exact draft, including manual prices and actions', () => {
    const rows = buildDraft(analysis)
    const before = snapshot(rows)

    rows[0].action = ACTION.skip
    setManualPrice(rows[1], 'takeaway', 23200)
    rows[2].excludedFromRules = true

    expect(before[0].action).toBe(ACTION.update)
    expect(before[1].manualPrices).toEqual([])
    expect(before[2].excludedFromRules).toBe(false)
  })
})

describe('formatting', () => {
  it('renders ore as kroner and shows a dash for an unknown amount', () => {
    expect(money(24200)).toBe('242')
    expect(money(24250)).toBe('242,5')
    expect(money(null)).toBe('—')
  })

  it('signs a percentage and rounds it to one decimal', () => {
    expect(percent(10)).toBe('+10 %')
    // A negative half rounds away from zero, and nb-NO renders a true minus sign.
    expect(percent(-8.25)).toBe('\u22128,3 %')
    expect(percent(8.25)).toBe('+8,3 %')
    expect(percent(null)).toBe('')
  })

  it('normalises the channel between its numeric and named forms', () => {
    expect(channelName(0)).toBe('takeaway')
    expect(channelName('EatIn')).toBe('eatIn')
    expect(channelName('delivery')).toBe('delivery')
    expect(channelEnum('eatIn')).toBe('EatIn')
  })
})
