import { mount } from '@vue/test-utils'
import MarginPriceTimelinePanel from '~/components/admin/margin/MarginPriceTimelinePanel.vue'
import MarginImportRowsPanel from '~/components/admin/margin/MarginImportRowsPanel.vue'
import MarginSupplierItemPanel from '~/components/admin/margin/MarginSupplierItemPanel.vue'
import { readPriceTimeline } from '~/utils/margin/price-timeline'
import { readImportBatch } from '~/utils/margin/price-import'
import { readSupplierItem } from '~/utils/margin/supplier-model'
import no from '~/translations/no'

// These mount the real components against the REAL Norwegian dictionary, because the thing being
// asserted is what a venue reads. A key-returning `$i` cannot tell a closed price from a current one.
function interpolate (key, params) {
  const text = no[key] || key
  return params ? text.replace(/\{(\w+)\}/g, (match, token) => (params[token] != null ? params[token] : match)) : text
}

const mocks = {
  $i: interpolate,
  priceLabel: minor => 'kr ' + String(Math.trunc(minor / 100)) + ',' + String(minor % 100).padStart(2, '0'),
  wholeAmount: minor => String(Math.trunc(minor / 100)),
  fractionAmount: minor => String(minor % 100).padStart(2, '0'),
  $store: { state: { adminLocale: 'no' } }
}

function price (overrides) {
  return Object.assign({
    id: 'p-1',
    priceMinor: 4990,
    currency: 'NOK',
    effectiveFrom: '2026-03-01T00:00:00',
    effectiveTo: null,
    source: 'Manual',
    importBatchId: null,
    createdAtUtc: '2026-03-01T00:00:00'
  }, overrides)
}

const costableItem = readSupplierItem({
  supplierItemId: 'si-1',
  name: 'Tomat 10 kg',
  packSize: 10,
  purchaseUnitCode: 'kg',
  purchaseUnitToBaseFactor: 1000,
  isPreferred: false,
  status: 'Active',
  revision: 'irev'
})

describe('MarginPriceTimelinePanel — a closed price must READ as closed', () => {
  function mountTimeline (rows, extra) {
    return mount(MarginPriceTimelinePanel, {
      mocks,
      propsData: Object.assign({
        timeline: readPriceTimeline(rows),
        item: costableItem,
        currency: 'NOK',
        locale: 'no'
      }, extra || {})
    })
  }

  test('the current price is badged "Gjelder nå" and the superseded one "Avsluttet"', () => {
    const wrapper = mountTimeline([
      price({ id: 'p-2', priceMinor: 5250, effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null }),
      price({ id: 'p-1', priceMinor: 4990, effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00' })
    ])

    const badges = wrapper.findAll('[data-test="timeline-badge"]')
    expect(badges.at(0).text()).toBe('Gjelder nå')
    expect(badges.at(1).text()).toBe('Avsluttet')
  })

  test('the seam says the old price was superseded by the one above it', () => {
    const wrapper = mountTimeline([
      price({ id: 'p-2', priceMinor: 5250, effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null }),
      price({ id: 'p-1', priceMinor: 4990, effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00' })
    ])

    const seams = wrapper.findAll('[data-test="timeline-seam"]')
    expect(seams).toHaveLength(1)
    expect(seams.at(0).text()).toContain('Avløst')
    expect(seams.at(0).text()).toContain('den ble avsluttet i samme øyeblikk som den neste startet')
  })

  test('a gap says a gap: no price applied in between', () => {
    const wrapper = mountTimeline([
      price({ id: 'p-2', effectiveFrom: '2026-04-10T00:00:00', effectiveTo: null }),
      price({ id: 'p-1', effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00' })
    ])

    expect(wrapper.find('[data-test="timeline-seam"]').text()).toContain('ingen pris gjaldt før neste startet')
  })

  test('a null price renders as the unknown mark, never as kr 0,00', () => {
    const wrapper = mountTimeline([price({ priceMinor: null })])
    expect(wrapper.find('[data-test="timeline-amount"]').text()).toBe('—')
  })

  test('an amount comes off the wire through the shared formatter', () => {
    const wrapper = mountTimeline([price({ priceMinor: 4990 })])
    expect(wrapper.find('[data-test="timeline-amount"]').text()).toBe('kr 49,90')
  })

  test('an item with no price at all says the ingredient cannot be costed', () => {
    const wrapper = mountTimeline([])
    expect(wrapper.find('[data-test="timeline-empty"]').text()).toContain('kan ikke kostes')
  })

  test('a failed read is unknown, and says so in different words', () => {
    const wrapper = mount(MarginPriceTimelinePanel, {
      mocks,
      propsData: { timeline: readPriceTimeline(null), item: costableItem, currency: 'NOK', locale: 'no' }
    })
    expect(wrapper.find('[data-test="timeline-unknown"]').text()).toContain('ukjent — ikke tom')
  })

  test('two current prices at once are reported rather than silently reconciled', () => {
    const wrapper = mountTimeline([
      price({ id: 'p-2', effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null }),
      price({ id: 'p-1', effectiveFrom: '2026-03-01T00:00:00', effectiveTo: null })
    ])
    expect(wrapper.find('[data-test="timeline-multi-open"]').text()).toContain('2 priser står som gjeldende samtidig')
  })

  test('AN UNCOSTABLE ITEM warns before a price is entered on it', () => {
    const incomplete = readSupplierItem({ supplierItemId: 'si-2', name: 'Tomat kasse', packSize: null, purchaseUnitToBaseFactor: null, status: 'Active' })
    const wrapper = mountTimeline([], { item: incomplete })
    expect(wrapper.find('[data-test="price-item-incomplete"]').text()).toContain('blir ikke brukt til kostpris')
  })

  test('and an uncostable PREFERRED item warns that the whole ingredient loses its price', () => {
    const incompletePreferred = readSupplierItem({ supplierItemId: 'si-3', name: 'Tomat kasse', packSize: null, purchaseUnitToBaseFactor: null, isPreferred: true, status: 'Active' })
    const wrapper = mountTimeline([], { item: incompletePreferred })
    expect(wrapper.find('[data-test="price-item-incomplete"]').text()).toContain('ingen pris i det hele tatt')
  })

  test('the form emits integer øre and a UTC instant, and refuses bad input before that', async () => {
    const wrapper = mountTimeline([])
    wrapper.setData({ form: { amount: '49,90', currency: 'nok', effectiveFrom: '2026-03-01T10:00' } })
    wrapper.vm.submit()

    const emitted = wrapper.emitted('add-price')[0][0]
    expect(emitted.priceMinor).toBe(4990)
    expect(emitted.currency).toBe('NOK')
    expect(emitted.effectiveFromUtc).toBe(new Date('2026-03-01T10:00').toISOString())

    wrapper.setData({ form: { amount: '1,234', currency: 'NOK', effectiveFrom: '2026-03-01T10:00' } })
    wrapper.vm.submit()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('add-price')).toHaveLength(1)
    expect(wrapper.find('[data-test="price-form-error"]').text()).toContain('høyst to desimaler')
  })

  test('a two-letter currency is refused before the round trip', async () => {
    const wrapper = mountTimeline([])
    wrapper.setData({ form: { amount: '10', currency: 'NO', effectiveFrom: '2026-03-01T10:00' } })
    wrapper.vm.submit()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('add-price')).toBeUndefined()
    expect(wrapper.find('[data-test="price-form-error"]').text()).toContain('trebokstavskode')
  })
})

describe('MarginImportRowsPanel — the duplicate is not a failure', () => {
  function batchModel (overrides) {
    return readImportBatch(Object.assign({
      batchId: 'b-1',
      fileName: 'priser-mars.csv',
      fileSha256: 'a1b2c3d4e5f6' + '0'.repeat(52),
      state: 'Mapping',
      rowCount: 2,
      mappedCount: 1,
      skippedCount: 0,
      pendingCount: 1,
      errorCount: 1,
      uploadedAtUtc: '2026-03-01T09:00:00',
      appliedAtUtc: null,
      isDuplicateOfExistingBatch: false,
      rows: [
        { id: 'r-1', rowNumber: 1, articleNumber: '12345', name: 'Tomat', priceMinor: 4990, currency: 'NOK', unitCode: 'kg', resolution: 'Mapped', resolvedSupplierItemId: 'si-1', proposedSupplierItemId: 'si-1', rowError: null },
        { id: 'r-2', rowNumber: 2, articleNumber: '67890', name: 'Løk', priceMinor: null, currency: null, unitCode: 'kg', resolution: 'Pending', rowError: 'The currency \'KRONER\' is not a 3-letter ISO 4217 code.' }
      ]
    }, overrides))
  }

  function mountRows (overrides, extra) {
    return mount(MarginImportRowsPanel, {
      mocks,
      propsData: Object.assign({
        batch: batchModel(overrides),
        supplierItems: [{ supplierItemId: 'si-1', name: 'Tomat 10 kg', supplierArticleNumber: '12345', supplierName: 'Grossisten AS' }],
        currency: 'NOK',
        locale: 'no'
      }, extra || {})
    })
  }

  test('a re-uploaded file says plainly that nothing changed', () => {
    const wrapper = mountRows({ isDuplicateOfExistingBatch: true, state: 'Applied', pendingCount: 0, appliedAtUtc: '2026-03-01T10:00:00' })
    const notice = wrapper.find('[data-test="import-duplicate"]')

    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('er lastet opp før')
    expect(notice.text()).toContain('opprettet ingen ny import og endret ingen priser')
    // Rendered in the informational tone, not the warning one that the real refusals use.
    expect(notice.classes()).toContain('mrg-notice--info')
  })

  test('and it explains WHY the server thinks it is the same file', () => {
    const wrapper = mountRows({ isDuplicateOfExistingBatch: true, state: 'Applied', pendingCount: 0 })
    expect(wrapper.find('[data-test="import-duplicate-hash"]').text()).toContain('samme innhold er samme import')
  })

  test('an ordinary batch carries no duplicate notice at all', () => {
    expect(mountRows().find('[data-test="import-duplicate"]').exists()).toBe(false)
  })

  test('a price the parser could not read is a dash, never kr 0,00', () => {
    const wrapper = mountRows()
    const prices = wrapper.findAll('[data-test="import-row-price"]')
    expect(prices.at(0).text()).toContain('kr 49,90')
    expect(prices.at(1).text()).toContain('—')
    expect(prices.at(1).text()).not.toContain('0,00')
  })

  test('the server’s per-row prose is shown verbatim, because it names the cell', () => {
    const wrapper = mountRows()
    expect(wrapper.find('[data-test="import-row-error"]').text())
      .toBe('The currency \'KRONER\' is not a 3-letter ISO 4217 code.')
  })

  test('an error row may only be skipped, and the row says so', () => {
    const wrapper = mountRows()
    expect(wrapper.find('[data-test="import-row-skip-only"]').text()).toContain('bare hoppes over')
  })

  test('approval withheld names the condition instead of hiding the button silently', () => {
    const wrapper = mountRows()
    expect(wrapper.find('[data-test="import-approve-blocked"]').text()).toContain('1 rader er uavklart')
  })

  test('an applied batch is read-only and says the effect cannot be undone', () => {
    const wrapper = mountRows({ state: 'Applied', pendingCount: 0, appliedAtUtc: '2026-03-01T10:00:00' })
    expect(wrapper.find('[data-test="import-applied"]').text()).toContain('kan ikke gjøres om')
    expect(wrapper.find('[data-test="import-applied-at"]').exists()).toBe(true)
    // No controls on history.
    expect(wrapper.findAll('select')).toHaveLength(0)
  })

  test('the mapping payload sends every row, so what is saved is what is on screen', () => {
    const wrapper = mountRows()
    expect(wrapper.vm.mappingPayload).toEqual([
      { rowId: 'r-1', resolution: 'Mapped', resolvedSupplierItemId: 'si-1' },
      { rowId: 'r-2', resolution: 'Pending', resolvedSupplierItemId: null }
    ])
  })

  test('an error row cannot be forced to Mapped even past the disabled option', () => {
    const wrapper = mountRows()
    wrapper.vm.setResolution(wrapper.vm.batch.rows[1], 'Mapped')
    expect(wrapper.vm.editOf(wrapper.vm.batch.rows[1]).resolution).toBe('Skipped')
  })
})

describe('MarginSupplierItemPanel — the two fields that decide whether a price counts', () => {
  const items = [
    readSupplierItem({ supplierItemId: 'si-1', supplierId: 's-1', ingredientId: 'i-1', name: 'Tomat 10 kg', supplierArticleNumber: '12345', packSize: 10, purchaseUnitCode: 'kg', purchaseUnitToBaseFactor: 1000, isPreferred: true, status: 'Active', revision: 'r1' }),
    readSupplierItem({ supplierItemId: 'si-2', supplierId: 's-1', ingredientId: 'i-1', name: 'Tomat kasse', packSize: null, purchaseUnitCode: 'kasse', purchaseUnitToBaseFactor: null, isPreferred: false, status: 'Active', revision: 'r2' })
  ]

  function mountItems (props) {
    return mount(MarginSupplierItemPanel, {
      mocks,
      propsData: Object.assign({
        items,
        ingredients: [{ ingredientId: 'i-1', name: 'Tomat', baseUnit: 'Gram', status: 'Active' }],
        supplier: { supplierId: 's-1', name: 'Grossisten AS' }
      }, props || {})
    })
  }

  test('an item missing both fields is flagged on the row, where the venue is looking', () => {
    const wrapper = mountItems()
    const flags = wrapper.findAll('[data-test="item-incomplete-flag"]')
    expect(flags).toHaveLength(1)
    expect(flags.at(0).text()).toContain('Mangler både pakningsstørrelse og omregning')
  })

  test('a costable item carries no flag', () => {
    const wrapper = mountItems({ items: [items[0]] })
    expect(wrapper.find('[data-test="item-incomplete-flag"]').exists()).toBe(false)
  })

  test('a blank quantity stays null, and a typo is refused rather than saved as blank', async () => {
    const wrapper = mountItems()
    wrapper.setData({ form: { ingredientId: 'i-1', name: 'Tomat 5 kg', supplierArticleNumber: '', packSize: '', purchaseUnitCode: 'kg', purchaseUnitToBaseFactor: '1000', isPreferred: false } })
    wrapper.vm.submit()
    // Null is a value the server accepts (an item whose pack size has not been reviewed); "fem" is
    // not, and collapsing the two would save the typo as "no pack size".
    expect(wrapper.emitted('create')[0][0].packSize).toBeNull()

    wrapper.setData({ form: { ingredientId: 'i-1', name: 'Tomat 5 kg', supplierArticleNumber: '', packSize: 'fem', purchaseUnitCode: 'kg', purchaseUnitToBaseFactor: '1000', isPreferred: false } })
    wrapper.vm.submit()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.find('[data-test="item-form-error"]').text()).toContain('større enn null')
  })

  test('a comma decimal is accepted for a quantity, because a Norwegian keyboard makes one', () => {
    const wrapper = mountItems()
    wrapper.setData({ form: { ingredientId: 'i-1', name: 'Halvkilo', supplierArticleNumber: '', packSize: '0,5', purchaseUnitCode: 'kg', purchaseUnitToBaseFactor: '1000', isPreferred: false } })
    wrapper.vm.submit()
    expect(wrapper.emitted('create')[0][0].packSize).toBe(0.5)
  })

  test('with no ingredients there is no item form at all, and the reason is given', () => {
    const wrapper = mountItems({ ingredients: [] })
    expect(wrapper.find('[data-test="items-no-ingredients"]').text()).toContain('minst én råvare først')
  })

  test('an unknown supplier means no list and no form', () => {
    const wrapper = mountItems({ supplier: null })
    expect(wrapper.find('[data-test="items-no-supplier"]').exists()).toBe(true)
  })

  test('a failed item read is unknown, not empty', () => {
    const wrapper = mountItems({ items: null })
    expect(wrapper.find('[data-test="items-unknown"]').text()).toContain('ukjent — ikke tom')
    expect(wrapper.find('[data-test="items-empty"]').exists()).toBe(false)
  })
})
