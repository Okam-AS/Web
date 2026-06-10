import {
  CUSTOM_DATE_FILTER,
  DEFAULT_ORDER_STATUS_FILTERS,
  DEFAULT_STATISTICS_STATUS_FILTERS,
  filterValidValues,
  getAdminDateFilterRange,
  getCompleteAdminDateRange,
  normalizeAdminDateFilterForRange,
  resolveOrderStatuses,
  resolveStatisticsStatuses
} from '~/helpers/admin-order-filters'

describe('admin order filter date metadata', () => {
  const referenceDate = new Date(2026, 5, 10, 12)

  test('uses full calendar months for month quick filters', () => {
    expect(getAdminDateFilterRange('ThisMonth', referenceDate)).toEqual({
      from: '2026-06-01',
      to: '2026-06-30'
    })

    expect(getAdminDateFilterRange('LastMonth', referenceDate)).toEqual({
      from: '2026-05-01',
      to: '2026-05-31'
    })
  })

  test('requires complete ordered date ranges for statistics restoration', () => {
    expect(getCompleteAdminDateRange('', '2026-05-31')).toBeNull()
    expect(getCompleteAdminDateRange('2026-06-10', '')).toBeNull()
    expect(getCompleteAdminDateRange('not-a-date', '2026-05-31')).toBeNull()
    expect(getCompleteAdminDateRange('2026-06-10', '2026-05-31')).toBeNull()
    expect(getCompleteAdminDateRange('2026-05-01', '2026-05-31')).toEqual({
      from: '2026-05-01',
      to: '2026-05-31'
    })
  })

  test('keeps a quick filter when persisted dates still match it', () => {
    const thisYearRange = getAdminDateFilterRange('ThisYear', referenceDate)

    expect(
      normalizeAdminDateFilterForRange(
        'ThisYear',
        thisYearRange.from,
        thisYearRange.to,
        referenceDate
      )
    ).toBe('ThisYear')
  })

  test('treats stale quick filter metadata as a custom range', () => {
    expect(
      normalizeAdminDateFilterForRange(
        'ThisYear',
        '2026-05-01',
        '2026-05-31',
        referenceDate
      )
    ).toBe(CUSTOM_DATE_FILTER)
  })

  test('clears quick filter metadata when dates are cleared', () => {
    expect(
      normalizeAdminDateFilterForRange(
        'ThisYear',
        '',
        '',
        referenceDate
      )
    ).toBeNull()
  })
})

describe('admin order filter restored selections', () => {
  test('falls back when restored filter arrays are empty or invalid', () => {
    expect(filterValidValues([], ['one', 'two'], ['one', 'two'])).toEqual(['one', 'two'])
    expect(filterValidValues(['stale'], ['one', 'two'], ['one'])).toEqual(['one'])
    expect(filterValidValues(['one', 'stale'], ['one', 'two'], ['two'])).toEqual(['one'])
  })

  test('restores order statuses from statistics status metadata when order statuses are empty', () => {
    expect(
      resolveOrderStatuses({
        orderStatuses: [],
        statisticsStatuses: ['Completed']
      })
    ).toEqual(['Completed'])
  })

  test('restores statistics statuses from order status metadata when statistics statuses are empty', () => {
    expect(
      resolveStatisticsStatuses({
        statisticsStatuses: [],
        orderStatuses: ['Accepted', 'Completed']
      })
    ).toEqual(['Remaining', 'Completed'])
  })

  test('uses defaults when restored status filters contain no valid values', () => {
    expect(resolveOrderStatuses({ orderStatuses: ['stale'] })).toEqual(DEFAULT_ORDER_STATUS_FILTERS)
    expect(resolveStatisticsStatuses({ statisticsStatuses: ['stale'] })).toEqual(DEFAULT_STATISTICS_STATUS_FILTERS)
  })
})
