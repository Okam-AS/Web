export const ADMIN_ORDER_FILTERS_STORAGE_KEY = 'okam_admin_order_filters'

export const REMAINING_ORDER_STATUS_FILTERS = [
  'Accepted',
  'Processing',
  'ReadyForPickup',
  'ReadyForDriver',
  'DriverPickedUp',
  'Served'
]

export const DEFAULT_ORDER_STATUS_FILTERS = [
  ...REMAINING_ORDER_STATUS_FILTERS,
  'Completed',
  'Canceled'
]

export const DEFAULT_STATISTICS_STATUS_FILTERS = [
  'Completed'
]

export const ALL_STATISTICS_STATUS_FILTERS = [
  'Remaining',
  'Completed',
  'Canceled'
]

export const DEFAULT_DELIVERY_TYPE_FILTERS = [
  'SelfPickup',
  'InstantHomeDelivery',
  'DineHomeDelivery',
  'WoltDelivery',
  'WoltMarketplaceDelivery',
  'TableDelivery'
]

export const DEFAULT_PAYMENT_TYPE_FILTERS = [
  'PayInStore',
  'Stripe',
  'Vipps',
  'Giftcard',
  'Dintero',
  'DinteroVipps',
  'DinteroBillie',
  'DinteroKlarna',
  'DinteroKravia',
  'WoltMarketplace'
]

export const CUSTOM_DATE_FILTER = 'Custom'

export function getAdminDateFilterRange (dateFilter, referenceDate = new Date()) {
  const today = new Date(referenceDate)

  switch (dateFilter) {
  case 'Today':
    return {
      from: formatDate(today),
      to: formatDate(today)
    }
  case 'Yesterday': {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      from: formatDate(yesterday),
      to: formatDate(yesterday)
    }
  }
  case 'Last7Days': {
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return {
      from: formatDate(sevenDaysAgo),
      to: formatDate(today)
    }
  }
  case 'ThisMonth': {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return {
      from: formatDate(firstDay),
      to: formatDate(lastDay)
    }
  }
  case 'LastMonth': {
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    return {
      from: formatDate(lastMonthStart),
      to: formatDate(lastMonthEnd)
    }
  }
  case 'ThisYear': {
    const yearStart = new Date(today.getFullYear(), 0, 1)
    return {
      from: formatDate(yearStart),
      to: formatDate(today)
    }
  }
  default:
    return null
  }
}

export function normalizeAdminDateFilterForRange (selectedDateFilter, dateFrom, dateTo, referenceDate = new Date()) {
  const normalizedDateFrom = getAdminSavedDateValue(dateFrom)
  const normalizedDateTo = getAdminSavedDateValue(dateTo)
  const hasDateRange = normalizedDateFrom !== '' || normalizedDateTo !== ''

  if (selectedDateFilter === CUSTOM_DATE_FILTER) {
    return hasDateRange ? CUSTOM_DATE_FILTER : null
  }

  const dateFilterRange = getAdminDateFilterRange(selectedDateFilter, referenceDate)
  if (
    dateFilterRange &&
    dateFilterRange.from === normalizedDateFrom &&
    dateFilterRange.to === normalizedDateTo
  ) {
    return selectedDateFilter
  }

  return hasDateRange ? CUSTOM_DATE_FILTER : null
}

export function getAdminSavedDateValue (value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getCompleteAdminDateRange (dateFrom, dateTo) {
  const from = getAdminSavedDateValue(dateFrom)
  const to = getAdminSavedDateValue(dateTo)

  if (!isAdminDateValue(from) || !isAdminDateValue(to) || from > to) {
    return null
  }

  return { from, to }
}

export function readAdminOrderFilters () {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(ADMIN_ORDER_FILTERS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : readLegacyOrderFilters()
  } catch (_) {
    return null
  }
}

export function saveAdminOrderFilters (filters) {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const current = readAdminOrderFilters() || {}
    const next = {
      ...current,
      ...removeUndefinedValues(filters),
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem(ADMIN_ORDER_FILTERS_STORAGE_KEY, JSON.stringify(next))
    return next
  } catch (_) {
    return null
  }
}

export function filterValidValues (values, validValues, fallbackValues) {
  if (!Array.isArray(values)) {
    return [...fallbackValues]
  }

  return values.filter(value => validValues.includes(value))
}

export function orderStatusesToStatisticsStatuses (orderStatuses) {
  if (!Array.isArray(orderStatuses)) {
    return [...DEFAULT_STATISTICS_STATUS_FILTERS]
  }

  const selectedStatuses = []

  if (orderStatuses.some(status => REMAINING_ORDER_STATUS_FILTERS.includes(status))) {
    selectedStatuses.push('Remaining')
  }

  if (orderStatuses.includes('Completed')) {
    selectedStatuses.push('Completed')
  }

  if (orderStatuses.includes('Canceled')) {
    selectedStatuses.push('Canceled')
  }

  return selectedStatuses
}

export function statisticsStatusesToOrderStatuses (statisticsStatuses) {
  if (!Array.isArray(statisticsStatuses)) {
    return [...DEFAULT_ORDER_STATUS_FILTERS]
  }

  const selectedStatuses = []

  if (statisticsStatuses.includes('Remaining')) {
    selectedStatuses.push(...REMAINING_ORDER_STATUS_FILTERS)
  }

  if (statisticsStatuses.includes('Completed')) {
    selectedStatuses.push('Completed')
  }

  if (statisticsStatuses.includes('Canceled')) {
    selectedStatuses.push('Canceled')
  }

  return selectedStatuses
}

export function resolveOrderStatuses (filters, fallbackStatuses = DEFAULT_ORDER_STATUS_FILTERS) {
  if (!filters) {
    return [...fallbackStatuses]
  }

  const statuses = Array.isArray(filters.orderStatuses)
    ? filters.orderStatuses
    : statisticsStatusesToOrderStatuses(filters.statisticsStatuses)

  return filterValidValues(statuses, DEFAULT_ORDER_STATUS_FILTERS, fallbackStatuses)
}

export function resolveStatisticsStatuses (filters, fallbackStatuses = DEFAULT_STATISTICS_STATUS_FILTERS) {
  if (!filters) {
    return [...fallbackStatuses]
  }

  const statuses = Array.isArray(filters.statisticsStatuses)
    ? filters.statisticsStatuses
    : orderStatusesToStatisticsStatuses(filters.orderStatuses)

  return filterValidValues(statuses, ALL_STATISTICS_STATUS_FILTERS, fallbackStatuses)
}

function removeUndefinedValues (object) {
  return Object.keys(object).reduce((result, key) => {
    if (object[key] !== undefined) {
      result[key] = object[key]
    }
    return result
  }, {})
}

function formatDate (date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isAdminDateValue (value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function readLegacyOrderFilters () {
  const legacyFilters = {}

  const storeIds = readJsonValue('ordersPageStoreIds')
  if (Array.isArray(storeIds)) {
    legacyFilters.storeIds = storeIds
  }

  const orderStatuses = readJsonValue('ordersPageStatuses')
  if (Array.isArray(orderStatuses)) {
    legacyFilters.orderStatuses = orderStatuses
    legacyFilters.statisticsStatuses = orderStatusesToStatisticsStatuses(orderStatuses)
  }

  const deliveryTypes = readJsonValue('ordersPageDeliveryTypes')
  if (Array.isArray(deliveryTypes)) {
    legacyFilters.deliveryTypes = deliveryTypes
  }

  const paymentTypes = readJsonValue('ordersPagePaymentTypes')
  if (Array.isArray(paymentTypes)) {
    legacyFilters.paymentTypes = paymentTypes
  }

  return Object.keys(legacyFilters).length > 0 ? legacyFilters : null
}

function readJsonValue (key) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    return null
  }
}
