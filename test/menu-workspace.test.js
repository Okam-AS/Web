import fs from 'fs'
import path from 'path'
import {
  ACTION,
  COMPACT_COLUMNS,
  adoptCurrentPrices,
  attachCurrent,
  buildNewProduct,
  carryWorkspaceState,
  displayValue,
  dropdownPosition,
  eatInAddition,
  fromEditorVariant,
  fromLegacyDraft,
  makeRow,
  mergeForAppend,
  metadataFor,
  normalizeVariantGroup,
  normalizeVisibleColumns,
  priceFor,
  readColumnPreference,
  readDraftFile,
  recommendedColumns,
  setMetadata,
  sourceDiffers,
  toDraftFile,
  toEditorVariant,
  toValidateRequest,
  writeColumnPreference
} from '~/utils/menu-workspace'

const categories = [
  { categoryId: 'c1', name: 'Pizza', suggestedTax: 15, suggestedEatInTax: 25, suggestedDeliveryTax: 15, taxSuggestionAvailable: true }
]

const catalogue = [{
  productId: 'p1',
  name: '1. Vegetar',
  categoryId: 'c1',
  categoryName: 'Pizza',
  takeaway: 24000,
  eatIn: 26000,
  delivery: 26000,
  description: 'Ost og tomat',
  otherInformation: 'Gluten',
  tax: 15,
  eatInTax: 25,
  deliveryTax: 15,
  depositAmount: 0,
  soldOut: false,
  hide: false,
  variants: [{ variantGroupId: 'v1', name: 'Størrelse', required: true, multiSelect: false, orderIndex: 0, options: [] }]
}]

const linkedRow = (overrides = {}) => attachCurrent(makeRow({
  action: ACTION.update,
  targetProductId: 'p1',
  displayName: '1. Vegetar',
  ...overrides
}), catalogue)

describe('metadata is only written when it was edited', () => {
  it('sends no metadata at all for a row nobody edited', () => {
    const request = toValidateRequest(7, {}, [linkedRow()])
    expect(request.rows[0].metadata).toBeUndefined()
  })

  it('still sends no metadata when the source disagrees with the product', () => {
    // The reading claiming a different description is a suggestion, not an instruction. Sending
    // it would rewrite a product nobody asked to change.
    const row = linkedRow({ sourceMeta: { description: 'Noe helt annet' } })
    expect(sourceDiffers(row, 'description')).toBe(true)
    expect(toValidateRequest(7, {}, [row]).rows[0].metadata).toBeUndefined()
  })

  it('sends only the field that was actually edited', () => {
    const row = linkedRow()
    setMetadata(row, 'description', 'Ny tekst')
    expect(toValidateRequest(7, {}, [row]).rows[0].metadata).toEqual({ description: 'Ny tekst' })
  })

  it('treats an empty string, a zero and a false as real values', () => {
    // Blanking a description and turning a deposit off are instructions, not omissions. The
    // deposit is 250 on this product, so 0 genuinely changes it.
    const row = attachCurrent(makeRow({ action: ACTION.update, targetProductId: 'p2' }), [
      { ...catalogue[0], productId: 'p2', depositAmount: 25000, soldOut: true }
    ])
    setMetadata(row, 'description', '')
    setMetadata(row, 'depositAmount', 0)
    setMetadata(row, 'soldOut', false)

    expect(toValidateRequest(7, {}, [row]).rows[0].metadata).toEqual({
      description: '',
      depositAmount: 0,
      soldOut: false
    })
  })

  it('does not send a zero that the product already had', () => {
    // Typing the value it already holds is not a change, and a patch is intent to write.
    const row = linkedRow()
    setMetadata(row, 'depositAmount', 0)
    expect(toValidateRequest(7, {}, [row]).rows[0].metadata).toBeUndefined()
  })

  it('drops an edit that puts a field back to what the product already has', () => {
    const row = linkedRow()
    setMetadata(row, 'name', 'Endret')
    setMetadata(row, 'name', '1. Vegetar')
    expect(toValidateRequest(7, {}, [row]).rows[0].metadata).toBeUndefined()
  })

  it('keeps everything a create row asks for on newProduct, and sends no metadata at all', () => {
    // The writer reads a created product from newProduct only. Anything put in `metadata`
    // instead is built here and then never written, and the contract also makes the same field
    // on both a blocker rather than picking a winner.
    const row = makeRow({ action: ACTION.create, displayName: 'Ny rett' })
    setMetadata(row, 'name', 'Ny rett')
    setMetadata(row, 'description', 'Beskrivelse')
    row.variantGroups = [normalizeVariantGroup({ name: 'Valg', options: [] })]
    row.newProduct = buildNewProduct(row, categories, null)

    const sent = toValidateRequest(7, {}, [row]).rows[0]
    expect(sent.metadata).toBeUndefined()
    expect(sent.newProduct.name).toBe('Ny rett')
    expect(sent.newProduct.variants).toHaveLength(1)
  })

  it('sends the option groups a create row has at send time, not the ones it had earlier', () => {
    const row = makeRow({ action: ACTION.create, displayName: 'Ny rett' })
    row.newProduct = buildNewProduct(row, categories, null)
    // Added after newProduct was last built — exactly how six groups go missing.
    row.variantGroups = [
      normalizeVariantGroup({ name: 'Valg 1', options: [] }),
      normalizeVariantGroup({ name: 'Valg 2', options: [] })
    ]

    expect(toValidateRequest(7, {}, [row]).rows[0].newProduct.variants).toHaveLength(2)
  })

  it('lets a cleared description on a create row stay cleared', () => {
    // `||` would put the extracted text straight back and leave no way to empty the field.
    const row = makeRow({ action: ACTION.create, description: 'Fra menyen', sourceMeta: { description: 'Fra menyen' } })
    setMetadata(row, 'description', '')

    expect(buildNewProduct(row, categories, null).description).toBe('')
  })

  it('keeps a deposit of zero on a create row rather than treating it as unset', () => {
    const row = makeRow({ action: ACTION.create })
    setMetadata(row, 'depositAmount', 0)
    expect(buildNewProduct(row, categories, null).depositAmount).toBe(0)
  })
})

describe('variant groups', () => {
  it('never sends an empty variants list, only an explicit clear', () => {
    // An empty array is what a bug produces, and the API refuses it for that reason.
    const row = linkedRow({ variantGroups: [], clearVariantGroups: true })
    expect(metadataFor(row)).toEqual({ clearVariants: true })
    expect(metadataFor(row).variants).toBeUndefined()
  })

  it('normalises a negative amount into a positive amount with the discount flag', () => {
    const group = normalizeVariantGroup({ name: 'Rabatt', options: [{ name: 'Uten ost', amount: -1500 }] })
    expect(group.options[0]).toMatchObject({ amount: 1500, negativeAmount: true })
  })

  it('reads the legacy positive-amount-plus-flag form unchanged', () => {
    const group = normalizeVariantGroup({ name: 'Rabatt', options: [{ name: 'Uten ost', priceAmount: 1500, negativeAmount: true }] })
    expect(group.options[0]).toMatchObject({ amount: 1500, negativeAmount: true })
  })

  it('keeps exact selection bounds through the editor when nothing contradicts them', () => {
    // "Choose 2 to 3" cannot be said with required/multiSelect alone, so opening a group just to
    // rename it must not flatten it to "required, unbounded".
    const group = normalizeVariantGroup({
      name: 'Tilbehør',
      minimumSelectedOptions: 2,
      maximumSelectedOptions: 3,
      options: [{ name: 'Pommes', amount: 0 }]
    })
    expect(group).toMatchObject({ required: true, multiSelect: true, minimumSelectedOptions: 2, maximumSelectedOptions: 3 })

    const edited = fromEditorVariant({ ...toEditorVariant(group), name: 'Tilbehør og saus' }, 0)
    expect(edited).toMatchObject({ name: 'Tilbehør og saus', minimumSelectedOptions: 2, maximumSelectedOptions: 3 })
  })

  it('drops a bound the operator contradicted rather than letting it override them', () => {
    const group = normalizeVariantGroup({ name: 'Tilbehør', minimumSelectedOptions: 2, maximumSelectedOptions: 3, options: [] })
    const edited = fromEditorVariant({ ...toEditorVariant(group), required: false }, 0)

    expect(edited.required).toBe(false)
    expect(edited.minimumSelectedOptions).toBeNull()
    // The bound they did not touch survives.
    expect(edited.maximumSelectedOptions).toBe(3)
  })
})

describe('legacy import adapter', () => {
  const legacy = {
    storeId: 99,
    replaceAll: true,
    rows: [{
      categoryName: 'Pizza',
      name: 'Vegetar',
      description: 'Ost og tomat',
      otherInformation: 'Gluten',
      priceAmount: 24000,
      priceModel: '999',
      tax: 15,
      tableAdditionalAmount: 2000,
      tableTax: 25,
      deliveryAdditionalAmount: 3000,
      deliveryTax: 15,
      depositAmount: 0,
      soldOut: false,
      variants: [{ name: 'Valg', required: true, multiselect: false, options: [{ name: 'Ekstra', priceAmount: 1500, negativeAmount: false }] }]
    }],
    categoryVariants: [{ categoryName: 'Drikke', variants: [{ name: 'Størrelse', options: [] }] }]
  }

  it('prefers the ore amount over a stale kroner model', () => {
    const draft = fromLegacyDraft(legacy, { categories })
    expect(priceFor(draft.rows[0], 'takeaway')).toBe(24000)
  })

  it('reads the eat-in addition as an eat-in total, never as three additions', () => {
    const row = fromLegacyDraft(legacy, { categories }).rows[0]
    expect(priceFor(row, 'eatIn')).toBe(26000)
    expect(priceFor(row, 'delivery')).toBe(27000)
    expect(eatInAddition(row)).toBe(2000)
  })

  it('keeps a zero deposit and a false soldOut as the real values they are', () => {
    const row = fromLegacyDraft(legacy, { categories }).rows[0]
    expect(row.metadataEdits.depositAmount).toBe(0)
    expect(row.metadataEdits.soldOut).toBe(false)
  })

  it('matches a known category and declares an unknown one instead of inventing it', () => {
    const draft = fromLegacyDraft(legacy, { categories })
    expect(draft.rows[0].metadataEdits.categoryId).toBe('c1')
    expect(draft.newCategories).toEqual([{ key: 'newcat-1', name: 'Drikke' }])
    expect(draft.categoryVariants[0].newCategoryKey).toBe('newcat-1')
  })

  it('reports the file\'s store and replaceAll without acting on either', () => {
    // An old file must never move a draft to another store, and never turn into a deletion.
    const draft = fromLegacyDraft(legacy, { categories })
    expect(draft.declaredStoreId).toBe(99)
    expect(draft.declaredReplaceAll).toBe(true)

    const request = toValidateRequest(7, {}, draft.rows, { newCategories: draft.newCategories })
    expect(request.storeId).toBe(7)
    expect(request.catalogueReplacement).toBeUndefined()
  })

  it('round-trips the root rich fixture to the values root expects', () => {
    const fixture = path.join('/private/tmp/okam-menu-unified-20260909/qa/rich-legacy.json')
    if (!fs.existsSync(fixture)) { return }

    const data = JSON.parse(fs.readFileSync(fixture, 'utf8'))
    const expected = JSON.parse(fs.readFileSync(fixture.replace('.json', '-expected.json'), 'utf8'))
    const draft = fromLegacyDraft(data, { categories: [] })
    const row = draft.rows[0]

    expect(priceFor(row, 'takeaway')).toBe(expected.takeaway)
    expect(priceFor(row, 'eatIn')).toBe(expected.eatIn)
    expect(priceFor(row, 'delivery')).toBe(expected.delivery)
    expect(row.metadataEdits.tax).toBe(expected.tax)
    expect(row.metadataEdits.eatInTax).toBe(expected.eatInTax)
    expect(row.metadataEdits.depositAmount).toBe(expected.depositAmount)
    expect(row.metadataEdits.soldOut).toBe(expected.soldOut)
    expect(row.variantGroups).toHaveLength(expected.productGroups)
    expect(draft.categoryVariants).toHaveLength(expected.categoryGroups)

    const discount = row.variantGroups
      .flatMap(group => group.options)
      .find(option => option.negativeAmount)
    expect(discount.amount).toBe(expected.discountAmount)
    expect(discount.negativeAmount).toBe(expected.discountNegative)

    const request = toValidateRequest(7, {}, draft.rows, { newCategories: draft.newCategories })
    expect(!!request.catalogueReplacement).toBe(expected.replacementRequested)
  })
})

describe('draft transfer', () => {
  it('round-trips edits, option groups and rules through the workspace file', () => {
    const row = linkedRow()
    setMetadata(row, 'description', '')
    row.variantGroups = [normalizeVariantGroup({ name: 'Valg', minimumSelectedOptions: 2, maximumSelectedOptions: 3, options: [] })]

    const rules = { rounding: 'NearestFiveKroner', missingChannelRule: 'SamePercent' }
    const file = toDraftFile(7, [row], [], [], rules)
    const back = readDraftFile(JSON.stringify(file))

    expect(back.rows[0].metadataEdits).toEqual({ description: '' })
    expect(back.rows[0].variantGroups[0]).toMatchObject({ minimumSelectedOptions: 2, maximumSelectedOptions: 3 })
    // Rules decide what an unpriced channel is proposed as, so reopening without them would
    // bring the draft back showing different money.
    expect(back.rules).toEqual(rules)
  })

  it('recognises a legacy file and a workspace file apart', () => {
    expect(readDraftFile(JSON.stringify(toDraftFile(7, [], [], [], null))).legacy).toBeUndefined()
    expect(readDraftFile(JSON.stringify({ storeId: 1, rows: [{ name: 'X', priceAmount: 100 }] })).legacy).toBe(true)
  })
})

describe('appending one draft to another', () => {
  it('renames colliding row keys instead of letting the second row shadow the first', () => {
    const existing = [makeRow({ rowKey: 'row-1', displayName: 'Første' })]
    const merged = mergeForAppend(existing, [], { rows: [makeRow({ rowKey: 'row-1', displayName: 'Andre' })] })

    expect(merged.rows[0].rowKey).not.toBe('row-1')
    expect(merged.rows[0].displayName).toBe('Andre')
  })

  it('renames a colliding new-category key and moves every reference with it', () => {
    // Every legacy import numbers its own categories from newcat-1, so without this the second
    // file's rows would silently point at the first file's category.
    const existing = [makeRow({ rowKey: 'a', metadataEdits: { newCategoryKey: 'newcat-1' } })]
    const incoming = {
      rows: [makeRow({ rowKey: 'b', metadataEdits: { newCategoryKey: 'newcat-1' } })],
      newCategories: [{ key: 'newcat-1', name: 'Dessert' }],
      categoryVariants: [{ newCategoryKey: 'newcat-1', variants: [] }]
    }

    const merged = mergeForAppend(existing, [{ key: 'newcat-1', name: 'Drikke' }], incoming)

    expect(merged.newCategories[0].key).not.toBe('newcat-1')
    expect(merged.rows[0].metadataEdits.newCategoryKey).toBe(merged.newCategories[0].key)
    expect(merged.categoryVariants[0].newCategoryKey).toBe(merged.newCategories[0].key)
  })

  it('folds a category asked for twice by name into the one that already exists', () => {
    const incoming = {
      rows: [makeRow({ rowKey: 'b', metadataEdits: { newCategoryKey: 'newcat-1' } })],
      newCategories: [{ key: 'newcat-1', name: 'Drikke' }]
    }
    const merged = mergeForAppend([], [{ key: 'existing-key', name: 'Drikke' }], incoming)

    expect(merged.newCategories).toHaveLength(0)
    expect(merged.rows[0].metadataEdits.newCategoryKey).toBe('existing-key')
  })
})

describe('carrying work across a re-read', () => {
  it('keeps metadata edits and edited option groups that carryDecisions knows nothing about', () => {
    const before = makeRow({ rowKey: 'n:1', metadataEdits: { name: 'Mitt navn' }, variantGroups: [], clearVariantGroups: true })
    const after = makeRow({ rowKey: 'n:1', sourceMeta: { name: 'Fra ny lesing' } })

    const [carried] = carryWorkspaceState([before], [after])

    expect(carried.metadataEdits).toEqual({ name: 'Mitt navn' })
    expect(carried.clearVariantGroups).toBe(true)
    // The new reading's own claim replaces the old claim; it is still only a suggestion.
    expect(carried.sourceMeta.name).toBe('Fra ny lesing')
  })

  it('lets a fresh proposal stand where the operator never touched the groups', () => {
    const before = makeRow({ rowKey: 'n:1', variantGroups: null })
    const proposed = [normalizeVariantGroup({ name: 'Ny gruppe', options: [] })]
    const [carried] = carryWorkspaceState([before], [makeRow({ rowKey: 'n:1', variantGroups: proposed })])

    expect(carried.variantGroups).toEqual(proposed)
  })
})

describe('prices a linked row starts from', () => {
  it('shows what the product charges today instead of zero', () => {
    const row = adoptCurrentPrices(makeRow({ action: ACTION.update, targetProductId: 'p1' }), catalogue[0])
    expect(priceFor(row, 'takeaway')).toBe(24000)
  })

  it('never sends those inferred prices, because keeping a price is not a change', () => {
    const row = adoptCurrentPrices(makeRow({ action: ACTION.update, targetProductId: 'p1' }), catalogue[0])
    expect(toValidateRequest(7, {}, [row]).rows[0].sourcePrices).toEqual([])
  })

  it('forgets the first product\'s prices when the row is relinked', () => {
    // Otherwise A's prices would follow the row onto B and read as an intended price change.
    const row = adoptCurrentPrices(makeRow({ action: ACTION.update, targetProductId: 'p1' }), catalogue[0])
    adoptCurrentPrices(row, { takeaway: 9900, eatIn: null, delivery: null })

    expect(priceFor(row, 'takeaway')).toBe(9900)
    expect(priceFor(row, 'eatIn')).toBeNull()
  })

  it('leaves a typed price alone when the link changes', () => {
    const row = makeRow({ action: ACTION.update, targetProductId: 'p1', manualPrices: [{ channel: 'Takeaway', amount: 30000 }] })
    adoptCurrentPrices(row, catalogue[0])
    expect(priceFor(row, 'takeaway')).toBe(30000)
  })
})

describe('columns', () => {
  it('stays compact for a plain price update', () => {
    const rows = [linkedRow(), linkedRow()]
    expect(recommendedColumns(rows)).toEqual(COMPACT_COLUMNS)
  })

  it('adds the fields a rich new import actually carries, and no others', () => {
    const row = makeRow({
      action: ACTION.create,
      displayName: 'Hot Mama Burger Meal',
      categoryName: 'Burger Meals',
      sourceMeta: { name: 'Hot Mama Burger Meal', description: 'Double beef patties', otherInformation: 'Hvete, melk' },
      variantGroups: [normalizeVariantGroup({ name: 'Valg 1', options: [] })]
    })
    const visible = recommendedColumns([row])

    expect(visible).toEqual(expect.arrayContaining(['name', 'category', 'description', 'otherInformation', 'variants']))
    // The identity column is gone; `name` is the structural one that replaced it.
    expect(visible).not.toContain('identity')
    // Nothing in this row says anything about a deposit, so that column stays off.
    expect(visible).not.toContain('depositAmount')
  })

  it('never drops a structural column and never keeps an unknown one', () => {
    expect(normalizeVisibleColumns(['takeaway', 'nonsense'])).toEqual(['link', 'name', 'takeaway'])
  })

  it('remembers a chosen set per user and store, and only when it was chosen', () => {
    const store = {}
    const storage = {
      getItem: key => (key in store ? store[key] : null),
      setItem: (key, value) => { store[key] = value }
    }

    writeColumnPreference(storage, 'u1', 7, { chosen: true, visible: ['takeaway', 'soldOut'] })
    expect(readColumnPreference(storage, 'u1', 7)).toEqual({ chosen: true, visible: ['link', 'name', 'takeaway', 'soldOut'] })
    // Another store, and another person on the same browser, get their own.
    expect(readColumnPreference(storage, 'u1', 8)).toBeNull()
    expect(readColumnPreference(storage, 'u2', 7)).toBeNull()
  })

  it('survives a storage that refuses to write', () => {
    const storage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(() => writeColumnPreference(storage, 'u1', 7, { chosen: true, visible: [] })).not.toThrow()
    expect(readColumnPreference(storage, 'u1', 7)).toBeNull()
  })
})

describe('where a dropdown panel lands', () => {
  // The panel is wider than the gap between a wrapped toolbar's trigger and the left edge of a
  // phone, so anchoring it to the trigger's right edge pushed it off screen: on a 390px viewport
  // it sat at left -54, taking the checkboxes with it.
  const parse = position => ({
    left: parseFloat(position.left),
    width: parseFloat(position.width),
    maxHeight: parseFloat(position.maxHeight)
  })

  const trigger = (left, width = 160) => ({ left, right: left + width, top: 200, bottom: 244, width, height: 44 })

  it('stays inside a 390px viewport when the trigger sits near the left edge', () => {
    const { left, width } = parse(dropdownPosition(trigger(16), { width: 390, height: 844 }))

    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + width).toBeLessThanOrEqual(390)
  })

  it('stays inside the narrowest phone at 320px', () => {
    const { left, width } = parse(dropdownPosition(trigger(12), { width: 320, height: 568 }))

    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + width).toBeLessThanOrEqual(320)
    // Narrower than the panel's natural width, so it gives way rather than overflowing.
    expect(width).toBeLessThanOrEqual(320 - 24)
  })

  it('still lines up with the trigger when there is room for it', () => {
    const { left, width } = parse(dropdownPosition(trigger(900, 160), { width: 1400, height: 900 }))

    // Right edges meet: 900 + 160 = 1060.
    expect(left + width).toBe(1060)
  })

  it('opens upwards when the trigger is near the bottom of a short window', () => {
    const position = dropdownPosition(trigger(16), { width: 390, height: 300 })

    expect(position.bottom).toBeDefined()
    expect(position.top).toBeUndefined()
  })

  it('always leaves enough height for the presets and some choices', () => {
    const { maxHeight } = parse(dropdownPosition(trigger(16), { width: 390, height: 260 }))
    expect(maxHeight).toBeGreaterThanOrEqual(160)
  })
})

describe('what a cell shows', () => {
  it('prefers an edit, then the product, then what the source claimed', () => {
    const row = linkedRow({ sourceMeta: { description: 'Fra menyen' } })
    expect(displayValue(row, 'description')).toBe('Ost og tomat')

    setMetadata(row, 'description', 'Min tekst')
    expect(displayValue(row, 'description')).toBe('Min tekst')
  })

  it('falls back to the source on a row that creates a product', () => {
    const row = makeRow({ action: ACTION.create, sourceMeta: { description: 'Fra menyen' } })
    expect(displayValue(row, 'description')).toBe('Fra menyen')
  })
})

describe('catalogue replacement', () => {
  it('is absent unless it was explicitly requested', () => {
    expect(toValidateRequest(7, {}, [linkedRow()], { catalogueReplacement: { requested: false } }).catalogueReplacement).toBeUndefined()
  })

  it('carries the exact ids that were shown back to the server', () => {
    const request = toValidateRequest(7, {}, [linkedRow()], {
      catalogueReplacement: { requested: true, expectedRemovedProductIds: ['p9', 'p8'] }
    })
    expect(request.catalogueReplacement).toEqual({ requested: true, expectedRemovedProductIds: ['p9', 'p8'] })
  })
})

describe('new categories in the request', () => {
  it('drops a declared category nothing points at, which the server would refuse', () => {
    const request = toValidateRequest(7, {}, [linkedRow()], {
      newCategories: [{ key: 'newcat-1', name: 'Ubrukt' }]
    })
    expect(request.newCategories).toBeUndefined()
  })

  it('keeps one a category group refers to, under the contract\'s key name', () => {
    const request = toValidateRequest(7, {}, [linkedRow()], {
      newCategories: [{ key: 'newcat-1', name: 'Dessert' }],
      categoryVariants: [{ newCategoryKey: 'newcat-1', variants: [normalizeVariantGroup({ name: 'Valg', options: [] })] }]
    })

    expect(request.newCategories).toEqual([{ key: 'newcat-1', name: 'Dessert' }])
    expect(request.categoryVariants[0]).toMatchObject({ newCategoryKey: 'newcat-1', categoryId: null })
    expect(request.categoryVariants[0].groups).toHaveLength(1)
  })
})
