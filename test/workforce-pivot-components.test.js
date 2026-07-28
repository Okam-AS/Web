import { mount } from '@vue/test-utils'
import WorkforceRoleGrid from '~/components/admin/workforce/WorkforceRoleGrid.vue'
import WorkforceMonthGrid from '~/components/admin/workforce/WorkforceMonthGrid.vue'
import { buildRoleGrid } from '~/utils/workforce/week-grid'
import { buildMonthGrid } from '~/utils/workforce/month-grid'
import { weekRange, monthRange } from '~/utils/workforce/week-range'
import translations from '~/translations'

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026
const JULY = monthRange(OSLO, new Date('2026-07-15T09:00:00Z'))

const KOKK = 'aaaaaaaa-0000-0000-0000-000000000001'
const BAR = 'bbbbbbbb-0000-0000-0000-000000000002'
const ANNA = '11111111-1111-1111-1111-111111111111'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so a missing key
// fails the test rather than rendering its own name.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function role (over) {
  return Object.assign({
    roleId: KOKK,
    name: 'Kokk',
    station: 'Kjøkken',
    color: '#111111',
    sortOrder: 1,
    effectiveFromUtc: '2026-01-01T00:00:00Z',
    effectiveToUtc: null
  }, over)
}

function shift (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleId: KOKK,
    roleName: 'Kokk',
    startsUtc: '2026-07-28T06:00:00',
    endsUtc: '2026-07-28T14:00:00',
    localBusinessDate: '2026-07-28T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 0,
    state: 'Draft'
  }, over)
}

const countedWeek = assignments => ({
  view: 'draft', scheduleRevisionId: 'rev', state: 'Draft', timeZoneId: OSLO, assignments
})

function renderRoles (options) {
  const grid = buildRoleGrid(Object.assign({
    days: WEEK.days, windowStartUtc: WEEK.startUtc, windowEndUtc: WEEK.endUtc
  }, options || {}))
  return mount(WorkforceRoleGrid, { propsData: { grid }, mocks: { $i } })
}

function renderMonth (weekRanges) {
  const grid = buildMonthGrid({ month: JULY, weekRanges })
  return mount(WorkforceMonthGrid, { propsData: { grid }, mocks: { $i } })
}

describe('WorkforceRoleGrid', () => {
  test('renders one row per role, and the cell names the PERSON', () => {
    const wrapper = renderRoles({
      roles: [role(), role({ roleId: BAR, name: 'Bar', sortOrder: 2 })],
      range: countedWeek([shift()])
    })

    expect(wrapper.findAll('tbody .wf-roles__row')).toHaveLength(2)
    expect(wrapper.findAll('.wf-roles__role-name').at(0).text()).toBe('Kokk')
    expect(wrapper.find('.wf-roles__shift-who').text()).toBe('Anna Haugen')
  })

  test('AN EMPTY ROLE RENDERS ITS ZEROS — "0t" and "0 vakter", not an em dash', () => {
    const wrapper = renderRoles({
      roles: [role({ roleId: BAR, name: 'Bar' })],
      range: countedWeek([])
    })
    const nums = wrapper.findAll('tbody .wf-roles__num')
    expect(nums.at(0).text()).toBe('0t')
    expect(nums.at(1).text()).toBe('0')
    expect(nums.at(2).text()).toBe('0')
  })

  test('...but the same empty role renders the unknown mark when the week never resolved', () => {
    const wrapper = renderRoles({ roles: [role({ roleId: BAR, name: 'Bar' })], range: null })
    const nums = wrapper.findAll('tbody .wf-roles__num')
    expect(nums.at(0).text()).toBe('—')
    expect(nums.at(1).text()).toBe('—')
  })

  test('an unresolved role is labelled and flagged, never shown as a bare id', () => {
    const wrapper = renderRoles({
      roles: [],
      range: countedWeek([shift({ roleId: 'gone-1', roleName: 'Oppvask' })])
    })
    expect(wrapper.find('.wf-roles__role-name').text()).toBe('Oppvask')
    expect(wrapper.find('.wf-roles__role-flag').text()).toBe('Ikke i funksjonslisten')
    expect(wrapper.text()).not.toContain('gone-1')
  })

  test('an unresolved role with no name says "Ukjent funksjon" rather than inventing one', () => {
    const wrapper = renderRoles({
      roles: [],
      range: countedWeek([shift({ roleId: 'gone-2', roleName: null })])
    })
    expect(wrapper.find('.wf-roles__role-name').text()).toBe('Ukjent funksjon')
    expect(wrapper.find('.wf-roles__role-name').classes()).toContain('is-unknown')
  })

  test('"Uten funksjon" is its own row and is not the same thing as an unresolved role', () => {
    const wrapper = renderRoles({
      roles: [role()],
      range: countedWeek([shift({ shiftAssignmentId: 'z', roleId: null, roleName: null })])
    })
    expect(wrapper.find('.wf-roles__row--norole').exists()).toBe(true)
    expect(wrapper.text()).toContain('Uten funksjon')
  })

  test('an unread role list produces its own caveat, not an empty store', () => {
    const wrapper = renderRoles({ roles: null, range: countedWeek([shift()]) })
    expect(wrapper.text()).toContain('Funksjonslisten er ikke hentet')
    // And it must NOT also claim the role is missing from a list nobody managed to read.
    expect(wrapper.find('.wf-roles__role-flag').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('peker på funksjoner som ikke ligger')
  })

  test('hidden retired roles are named in a caveat rather than silently omitted', () => {
    const wrapper = renderRoles({
      roles: [role({ roleId: BAR, name: 'Bar', effectiveToUtc: '2025-01-01T00:00:00Z' })],
      range: countedWeek([])
    })
    expect(wrapper.text()).toContain('Én utgått funksjon uten vakter denne uken vises ikke.')
  })

  // The wage column is ABSENT rather than empty. A column of nothing but em dashes would promise a
  // figure that can never arrive: the cost overlay totals per shift, per day and per range, so a
  // per-role wage could only be a sum of rounded chips — the sum that disagrees with the employee
  // tab's footer for the same week. The caveat is what keeps the absence from reading as a failure.
  test('there is no wage column, and a sentence says why instead of a column of dashes', () => {
    // The response carries a FULL, complete cost overlay — the pivot still prints none of it.
    const range = countedWeek([shift()])
    range.cost = {
      costComplete: true,
      totalMinor: 123450,
      currency: 'NOK',
      days: [{
        localBusinessDate: '2026-07-28',
        costComplete: true,
        totalMinor: 123450,
        currency: 'NOK',
        shifts: [{ shiftAssignmentId: 'a1', costComplete: true, totalMinor: 123450, currency: 'NOK' }]
      }]
    }
    const wrapper = renderRoles({ roles: [role()], range })
    expect(wrapper.find('.wf-roles__num--cost').exists()).toBe(false)
    expect(wrapper.findAll('thead th')).toHaveLength(11)
    expect(wrapper.text()).toContain('Lønn summeres per dag og per uke, ikke per funksjon')
    // And nothing anywhere in the pivot prints a money amount.
    expect(wrapper.text()).not.toMatch(/\bkr\b/)
  })
})

describe('WorkforceMonthGrid', () => {
  const fullMonth = () => JULY.weeks.map(() => ({
    view: 'draft', scheduleRevisionId: 'rev', state: 'Draft', timeZoneId: OSLO, assignments: []
  }))

  test('renders one row per ISO week and seven weekday columns', () => {
    const wrapper = renderMonth(fullMonth())
    expect(wrapper.findAll('tbody .wf-month__row')).toHaveLength(5)
    expect(wrapper.findAll('.wf-month__head--day')).toHaveLength(7)
  })

  test('days outside the month are structural blanks, not a data state', () => {
    const wrapper = renderMonth(fullMonth())
    // Two leading (29–30 Jun) and two trailing (1–2 Aug).
    expect(wrapper.findAll('.wf-month__cell.is-blank')).toHaveLength(4)
    expect(wrapper.findAll('.wf-month__daynum')).toHaveLength(31)
  })

  test('THE WEEKDAY BAND: a whole column shows its total and its average', () => {
    const weeks = fullMonth()
    weeks[1] = {
      view: 'draft',
      scheduleRevisionId: 'rev',
      state: 'Draft',
      timeZoneId: OSLO,
      assignments: [shift({
        localBusinessDate: '2026-07-06T00:00:00',
        startsUtc: '2026-07-06T06:00:00',
        endsUtc: '2026-07-06T10:00:00'
      })]
    }
    const wrapper = renderMonth(weeks)
    const monday = wrapper.findAll('.wf-month__colcell').at(0)
    expect(monday.find('.wf-month__coltotal').text()).toBe('4t')
    expect(monday.classes()).not.toContain('is-partial')
    // Four Mondays, four hours: an average of one.
    expect(monday.find('.wf-month__colavg').text()).toBe('Snitt 1t')
  })

  test('A PARTIAL COLUMN NEVER SHOWS A BARE NUMBER — the denominator is rendered beside it', () => {
    const weeks = fullMonth()
    weeks[2] = null // 13–19 Jul did not load: one of the four Mondays is unknown.
    const wrapper = renderMonth(weeks)
    const monday = wrapper.findAll('.wf-month__colcell').at(0)

    expect(monday.classes()).toContain('is-partial')
    expect(monday.find('.wf-month__coldenom').text()).toBe('3 av 4 dager')
    expect(monday.find('.wf-month__colavg').exists()).toBe(false)
    // And the title spells the arithmetic out, distinguishing unread from unplanned.
    expect(monday.attributes('title')).toContain('Summen dekker 3 av 4 dager')
    expect(monday.attributes('title')).toContain('1 dager vi ikke fikk hentet')
  })

  test('a column with nothing counted shows the unknown mark rather than 0t', () => {
    const wrapper = renderMonth(JULY.weeks.map(() => null))
    expect(wrapper.findAll('.wf-month__coltotal').at(0).text()).toBe('—')
    expect(wrapper.text()).toContain('uker ble ikke hentet')
  })

  test('an unplanned month says "ingen plan", which is a different sentence from unread', () => {
    const wrapper = renderMonth(JULY.weeks.map(() => ({ view: 'draft', assignments: [] })))
    expect(wrapper.text()).toContain('uker har ingen plan')
    expect(wrapper.text()).not.toContain('ble ikke hentet')
  })

  test('a fully counted month carries no partial-total caveat', () => {
    const wrapper = renderMonth(fullMonth())
    expect(wrapper.text()).not.toContain('Månedssummen dekker')
    expect(wrapper.findAll('.wf-month__coldenom')).toHaveLength(0)
  })
})
