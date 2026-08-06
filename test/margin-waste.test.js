import { mount } from '@vue/test-utils'
import MarginWastePanel from '~/components/admin/margin/MarginWastePanel.vue'
import MarginCoveragePanel from '~/components/admin/margin/MarginCoveragePanel.vue'
import { readCoverage, readWasteEntries, readWasteSummary } from '~/utils/margin/statement-view'
import { MarginWasteService } from '~/utils/margin/waste-client'

// Sign-blind money mocks, like the sibling statement suite: a component that leaked a raw negative
// into the formatter shows it here rather than being papered over by a smarter fake.
const mocks = {
  $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
  priceLabel: minor => 'kr ' + minor,
  wholeAmount: minor => String(Math.trunc(minor / 100)),
  fractionAmount: minor => String(Math.abs(minor) % 100).padStart(2, '0')
}

const DASH = '—'

function wasteResponse (overrides) {
  return Object.assign({
    storeId: 92001,
    fromDate: '2026-07-06T00:00:00Z',
    toDate: '2026-07-12T00:00:00Z',
    currency: 'NOK',
    entries: [
      {
        wasteEntryId: 'w-1',
        wasteDate: '2026-07-08T00:00:00Z',
        reason: 'Spoilage',
        ingredientId: 'i-1',
        ingredientName: 'Tomat',
        quantity: 2500,
        description: null,
        valueMinor: 3000,
        currency: 'NOK',
        valuationSource: 'PriceBook',
        note: null,
        frozen: false,
        revision: 'wrev-1'
      },
      {
        wasteEntryId: 'w-2',
        wasteDate: '2026-07-09T00:00:00Z',
        reason: 'Breakage',
        ingredientId: null,
        ingredientName: null,
        quantity: null,
        description: 'A crate of glasses',
        valueMinor: null,
        currency: 'NOK',
        valuationSource: 'Unvalued',
        note: null,
        frozen: false,
        revision: 'wrev-2'
      }
    ]
  }, overrides || {})
}

function panel (props) {
  return mount(MarginWastePanel, {
    mocks,
    propsData: Object.assign({
      entries: readWasteEntries(wasteResponse()),
      ingredients: [{ id: 'i-1', name: 'Tomat', baseUnit: 'Gram' }],
      frozen: false,
      defaultDate: '2026-07-06',
      currency: 'NOK',
      locale: 'no'
    }, props || {})
  })
}

describe('readWasteEntries / readWasteSummary', () => {
  test('an unvalued entry keeps a NULL value and is never coerced to zero', () => {
    const entries = readWasteEntries(wasteResponse())
    expect(entries[1].valueMinor).toBeNull()
    expect(entries[1].valuationSource).toBe('Unvalued')
  })

  test('a failed read is null — never an empty list, which claims nothing was thrown away', () => {
    expect(readWasteEntries(null)).toBeNull()
    expect(readWasteEntries({})).toBeNull()
  })

  // FLIPPED, NOT DELETED. This test used to assert the opposite — that an absent block reads as three
  // zeros — and it is the reason the defect survived: the fabrication had a green test blessing it, so
  // every later reader was told on good authority that "nobody said anything about waste" and "the
  // kitchen threw nothing away" were the same fact. They are not, and the assertion that said so is
  // kept here inverted rather than removed, so the behaviour it protected can never come back quietly.
  test('an absent summary block is NULL — never three zeros, which claim a measurement nobody made', () => {
    expect(readWasteSummary(undefined)).toBeNull()
    expect(readWasteSummary(null)).toBeNull()
  })

  // A block that is not an object is unreadable, not empty. Withheld under the same copy as an absent
  // one, because a venue cannot act differently on the two and a zero would be wrong for both.
  test('an unreadable summary block is null rather than empty', () => {
    expect(readWasteSummary('nope')).toBeNull()
    expect(readWasteSummary(7)).toBeNull()
    expect(readWasteSummary(false)).toBeNull()
  })

  // THE CASE THE NULL MUST NOT SWALLOW. A block that ARRIVED saying zero is a real measurement — the
  // server looked at the week and found nothing — and it stays a counted zero.
  test('a block that arrived stating zero stays a counted zero', () => {
    const summary = readWasteSummary({ valuedMinor: 0, entryCount: 0, unvaluedEntryCount: 0, byReason: [] })
    expect(summary).not.toBeNull()
    expect(summary.entryCount).toBe(0)
    expect(summary.valuedMinor).toBe(0)
  })

  // No `|| 0` anywhere: a field the server withheld reaches the panel as null and renders as the
  // unknown mark, rather than as a confident kr 0,00 beside a non-zero count.
  test('a withheld field inside a block that arrived stays null rather than coercing to zero', () => {
    const summary = readWasteSummary({ entryCount: 4, byReason: [{ reason: 'Spoilage' }] })
    expect(summary.valuedMinor).toBeNull()
    expect(summary.unvaluedEntryCount).toBeNull()
    expect(summary.entryCount).toBe(4)
    expect(summary.byReason[0].entryCount).toBeNull()
    expect(summary.byReason[0].valuedMinor).toBeNull()
  })

  test('the per-reason lines keep the server order and are not re-sorted', () => {
    const summary = readWasteSummary({
      valuedMinor: 1100,
      entryCount: 3,
      unvaluedEntryCount: 0,
      byReason: [
        { reason: 'Spoilage', valuedMinor: 900, entryCount: 1, unvaluedEntryCount: 0 },
        { reason: 'Breakage', valuedMinor: 100, entryCount: 1, unvaluedEntryCount: 0 },
        { reason: 'StaffMeal', valuedMinor: 100, entryCount: 1, unvaluedEntryCount: 0 }
      ]
    })
    expect(summary.byReason.map(l => l.reason)).toEqual(['Spoilage', 'Breakage', 'StaffMeal'])
  })
})

describe('MarginWastePanel', () => {
  test('an entry nothing could price shows the unknown mark, never a zero amount', () => {
    const w = panel()
    const values = w.findAll('[data-test="waste-row-value"]')
    expect(values.at(0).text()).toBe('kr 3000')
    expect(values.at(1).text()).toBe(DASH)
    expect(w.find('[data-test="waste-floor"]').exists()).toBe(true)
  })

  test('a failed read says so instead of claiming the venue threw nothing away', () => {
    const w = panel({ entries: null })
    expect(w.find('[data-test="waste-unknown"]').exists()).toBe(true)
    expect(w.find('[data-test="waste-empty"]').exists()).toBe(false)
  })

  test('a frozen week renders NO form at all, not a disabled one', () => {
    const w = panel({ frozen: true })
    expect(w.find('[data-test="waste-frozen"]').exists()).toBe(true)
    expect(w.find('[data-test="waste-record"]').exists()).toBe(false)
    expect(w.find('[data-test="waste-date"]').exists()).toBe(false)
  })

  test('a frozen ENTRY loses its remove control while an open one keeps it', () => {
    const response = wasteResponse()
    response.entries[0].frozen = true
    const w = panel({ entries: readWasteEntries(response) })
    // The list can legitimately span both sides of a freeze, so the control is per row.
    expect(w.findAll('[data-test="waste-remove"]')).toHaveLength(1)
  })

  test('recording an ingredient loss with no amount asks the server to price it', async () => {
    const w = panel()
    w.find('[data-test="waste-ingredient"]').setValue('i-1')
    await w.vm.$nextTick()
    w.find('[data-test="waste-quantity"]').setValue('2500')
    await w.vm.$nextTick()
    w.find('[data-test="waste-record"]').trigger('click')

    const emitted = w.emitted().record[0][0]
    expect(emitted.ingredientId).toBe('i-1')
    expect(emitted.quantity).toBe(2500)
    expect(emitted.valueMinor).toBeNull()
    expect(emitted.description).toBeNull()
  })

  test('a stated amount travels as integer minor units, parsed rather than multiplied', async () => {
    const w = panel()
    w.find('[data-test="waste-description"]').setValue('A crate of glasses')
    w.find('[data-test="waste-value"]').setValue('19,99')
    await w.vm.$nextTick()
    w.find('[data-test="waste-record"]').trigger('click')

    // 1999, not 1998: `19.99 * 100` is 1998.9999999999998 in IEEE-754, which is exactly why the
    // shared parser rearranges digits as text instead of multiplying.
    expect(w.emitted().record[0][0].valueMinor).toBe(1999)
  })

  test('a value with three decimals is refused rather than truncated, and nothing is emitted', async () => {
    const w = panel()
    w.find('[data-test="waste-description"]').setValue('A crate')
    w.find('[data-test="waste-value"]').setValue('235,555')
    await w.vm.$nextTick()
    w.find('[data-test="waste-record"]').trigger('click')
    await w.vm.$nextTick()

    expect(w.find('[data-test="waste-error"]').exists()).toBe(true)
    expect(w.emitted().record).toBeUndefined()
  })

  test('free text with no amount cannot be recorded, because nothing could price it', async () => {
    const w = panel()
    w.find('[data-test="waste-description"]').setValue('A crate')
    await w.vm.$nextTick()
    expect(w.find('[data-test="waste-record"]').attributes('disabled')).toBeTruthy()
  })

  test('a reason code this build has no word for prints as the code, never as Other', () => {
    const response = wasteResponse()
    response.entries[0].reason = 'Shrinkage'
    const w = panel({ entries: readWasteEntries(response) })
    expect(w.findAll('[data-test="waste-row"]').at(0).text()).toContain('Shrinkage')
    expect(w.findAll('[data-test="waste-row"]').at(0).text()).not.toContain('mrgs_waste_reason_other')
  })
})

describe('MarginCoveragePanel — the waste bucket', () => {
  const response = {
    fromDate: '2026-07-06T00:00:00Z',
    toDate: '2026-07-12T00:00:00Z',
    coveragePercent: 160.98,
    netFoodSalesMinor: 16400,
    coveredNetSalesMinor: 26400,
    uncoveredNetSalesMinor: -10000,
    currency: 'NOK',
    uncoveredTopSellers: [],
    brokenLinks: [],
    priceFreshness: [],
    projectionWatermark: 9,
    waste: {
      valuedMinor: 3000,
      entryCount: 2,
      unvaluedEntryCount: 1,
      byReason: [
        { reason: 'Spoilage', valuedMinor: 3000, entryCount: 1, unvaluedEntryCount: 0 },
        { reason: 'Breakage', valuedMinor: 0, entryCount: 1, unvaluedEntryCount: 1 }
      ]
    }
  }

  function coverage (value) {
    return mount(MarginCoveragePanel, { mocks, propsData: { coverage: value, currency: 'NOK', locale: 'no' } })
  }

  test('the reason-coded buckets land on the coverage panel in the server order', () => {
    const w = coverage(readCoverage(response))
    const rows = w.findAll('[data-test="waste-row"]')
    expect(rows).toHaveLength(2)
    expect(rows.at(0).text()).toContain('mrgs_waste_reason_spoilage')
    expect(rows.at(1).text()).toContain('mrgs_waste_reason_breakage')
  })

  test('a total with an unpriced entry behind it is declared a floor', () => {
    const w = coverage(readCoverage(response))
    expect(w.find('[data-test="waste-unvalued"]').text()).toContain('"count":1')
  })

  test('a window with no waste says so and prints no total', () => {
    const bare = Object.assign({}, response, { waste: { valuedMinor: 0, entryCount: 0, unvaluedEntryCount: 0, byReason: [] } })
    const w = coverage(readCoverage(bare))
    expect(w.find('[data-test="waste-none"]').exists()).toBe(true)
    expect(w.find('[data-test="waste-total"]').exists()).toBe(false)
  })

  test('the waste bucket enters none of the coverage figures', () => {
    const w = coverage(readCoverage(response))
    // The panel renders what the server sent; the point of this pin is that adding waste to the
    // response cannot move the covered/uncovered split it is shown beside.
    expect(w.find('[data-test="coverage-covered"]').text()).toBe('kr 26400')
    expect(w.find('[data-test="coverage-uncovered"]').text()).toBe('−kr 10000')
  })
})

describe('MarginWasteService', () => {
  let sent

  function service () {
    const s = new MarginWasteService({ bearerToken: 'tok-123' })
    global.fetch = jest.fn((url, options) => {
      sent.push({ url, options })
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ entries: [] }))
      })
    })
    return s
  }

  beforeEach(() => { sent = [] })

  test('the window travels as the store calendar dates, never as an instant', () => {
    service().ListWaste(92001, '2026-07-06', '2026-07-12')
    expect(sent[0].url).toBe('/margin/waste?from=2026-07-06&to=2026-07-12&storeId=92001')
  })

  test('a DateTime for the waste date is refused at the door rather than coerced', () => {
    expect(() => service().RecordWaste(92001, { wasteDate: '2026-07-08T00:00:00Z', reason: 'Spoilage' }))
      .toThrow(TypeError)
  })

  test('an omitted amount is sent as an explicit null, which is what asks the server to price it', () => {
    service().RecordWaste(92001, { wasteDate: '2026-07-08', reason: 'Spoilage', ingredientId: 'i-1', quantity: 2500 })
    const body = JSON.parse(sent[0].options.body)
    expect(body.valueMinor).toBeNull()
    expect(body.quantity).toBe(2500)
  })

  test('the delete carries the entry revision in If-Match and no body', () => {
    service().DeleteWaste(92001, 'w-1', 'wrev-1')
    expect(sent[0].options.method).toBe('DELETE')
    expect(sent[0].options.headers['If-Match']).toBe('"wrev-1"')
    expect(sent[0].options.body).toBeUndefined()
  })

  test('a mutation with no revision rejects before the request rather than sending an unguarded write', async () => {
    const s = service()
    await expect(s.DeleteWaste(92001, 'w-1', null)).rejects.toBeTruthy()
    expect(sent).toHaveLength(0)
  })
})
