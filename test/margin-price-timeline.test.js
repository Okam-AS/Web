import {
  readPriceTimeline,
  TIMELINE_UNKNOWN,
  TIMELINE_EMPTY,
  TIMELINE_PRICED
} from '~/utils/margin/price-timeline'

// The wire shape of `GET /margin/supplier-items/{id}/prices`: newest effective instant first, and
// COLUMN-LOADED stamps, which serialise BARE (no `Z`) because EF hands them back as `Unspecified`.
// The bare form is used throughout on purpose — a parser that read them as browser-local would shift
// every boundary and could show a closed row as still open.
function priceRow (overrides) {
  return Object.assign({
    id: 'p-1',
    supplierItemId: 'si-1',
    priceMinor: 4990,
    currency: 'NOK',
    effectiveFrom: '2026-03-01T10:00:00',
    effectiveTo: null,
    source: 'Manual',
    importBatchId: null,
    createdAtUtc: '2026-03-01T10:00:00'
  }, overrides)
}

describe('readPriceTimeline', () => {
  test('a read that did not answer is UNKNOWN, never an empty timeline', () => {
    expect(readPriceTimeline(null).state).toBe(TIMELINE_UNKNOWN)
    expect(readPriceTimeline(undefined).state).toBe(TIMELINE_UNKNOWN)
    expect(readPriceTimeline({ prices: [] }).state).toBe(TIMELINE_UNKNOWN)
  })

  test('an answered read with no rows is EMPTY — a different claim entirely', () => {
    expect(readPriceTimeline([]).state).toBe(TIMELINE_EMPTY)
  })

  test('THE SUPERSEDE SEAM: the closed row ends at the exact instant the open one begins', () => {
    // Journey L02: two prices dated apart, where the first closes exactly as the second opens.
    const timeline = readPriceTimeline([
      priceRow({ id: 'p-2', priceMinor: 5250, effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null }),
      priceRow({ id: 'p-1', priceMinor: 4990, effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00' })
    ])

    expect(timeline.state).toBe(TIMELINE_PRICED)
    expect(timeline.rows[0].isOpen).toBe(true)
    expect(timeline.rows[1].isOpen).toBe(false)
    // The seam, and who closed it.
    expect(timeline.rows[1].closesInto).toBe('next')
    expect(timeline.rows[1].supersededBy).toBe('p-2')
    // Exactly one price is in force, and it is the newer one.
    expect(timeline.openCount).toBe(1)
    expect(timeline.openRow.id).toBe('p-2')
  })

  test('a GAP is reported as a gap, not as a seam', () => {
    // Closed BEFORE the next opened: a stretch with no effective price at all, which is why a
    // recipe costed at such an instant is unpriced while looking priced today.
    const timeline = readPriceTimeline([
      priceRow({ id: 'p-2', effectiveFrom: '2026-04-10T00:00:00', effectiveTo: null }),
      priceRow({ id: 'p-1', effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00' })
    ])

    expect(timeline.rows[1].closesInto).toBe('gap')
    expect(timeline.rows[1].supersededBy).toBeNull()
  })

  test('the open row carries no seam of its own', () => {
    const timeline = readPriceTimeline([priceRow({})])
    expect(timeline.rows[0].closesInto).toBeNull()
    expect(timeline.rows[0].isOpen).toBe(true)
  })

  test('TWO OPEN ROWS are reported rather than tidied away', () => {
    // The price table carries no rowversion, so a write-skew can leave two open rows. The backend
    // defends itself by taking the lowest; a venue looking at two "current" prices has to be told.
    const timeline = readPriceTimeline([
      priceRow({ id: 'p-2', effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null }),
      priceRow({ id: 'p-1', effectiveFrom: '2026-03-01T00:00:00', effectiveTo: null })
    ])

    expect(timeline.openCount).toBe(2)
    // No single row is nominated as THE current price when two claim to be.
    expect(timeline.openRow).toBeNull()
  })

  test('a missing price stays null and never becomes zero', () => {
    const timeline = readPriceTimeline([priceRow({ priceMinor: null })])
    expect(timeline.rows[0].priceMinor).toBeNull()
  })

  test('a real zero survives, because a supplier can genuinely charge nothing', () => {
    const timeline = readPriceTimeline([priceRow({ priceMinor: 0 })])
    expect(timeline.rows[0].priceMinor).toBe(0)
  })

  test('provenance: an imported row names its batch, a manual one does not', () => {
    const timeline = readPriceTimeline([
      priceRow({ id: 'p-2', source: 'Import', importBatchId: 'b-1', effectiveFrom: '2026-04-01T00:00:00' }),
      priceRow({ id: 'p-1', source: 'Manual', effectiveTo: '2026-04-01T00:00:00' })
    ])

    expect(timeline.rows[0].isImported).toBe(true)
    expect(timeline.rows[0].importBatchId).toBe('b-1')
    expect(timeline.rows[1].isImported).toBe(false)
    expect(timeline.rows[1].importBatchId).toBeNull()
  })

  test('a BARE wire stamp is read as UTC, not as browser-local', () => {
    const timeline = readPriceTimeline([priceRow({ effectiveFrom: '2026-03-01T10:00:00' })])
    expect(timeline.rows[0].from.toISOString()).toBe('2026-03-01T10:00:00.000Z')
  })
})
