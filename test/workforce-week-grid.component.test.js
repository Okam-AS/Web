import { mount } from '@vue/test-utils'
import WorkforceWeekGrid from '~/components/admin/workforce/WorkforceWeekGrid.vue'
import { buildWeekGrid, markersFromRequests } from '~/utils/workforce/week-grid'
import { weekRange } from '~/utils/workforce/week-range'
import translations from '~/translations'

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026

const ANNA = '11111111-1111-1111-1111-111111111111'
const BJORN = '22222222-2222-2222-2222-222222222222'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so the test asserts
// the copy a manager actually sees — and fails if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const staff = [
  { staffMemberId: ANNA, displayName: 'Anna Haugen', isActive: true, employmentNumber: '104' },
  { staffMemberId: BJORN, displayName: 'Bjørn Ek', isActive: true, employmentNumber: '108' }
]

function shift (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleName: 'Kokk',
    startsUtc: '2026-07-28T06:00:00',
    endsUtc: '2026-07-28T14:00:00',
    localBusinessDate: '2026-07-28T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 30,
    state: 'Draft'
  }, over)
}

function draftRange (assignments) {
  return {
    view: 'draft',
    scheduleRevisionId: 'rev-1',
    revisionNumber: 2,
    state: 'Draft',
    timeZoneId: OSLO,
    asOfUtc: '2026-07-29T09:00:00Z',
    assignments
  }
}

function render (options) {
  const grid = buildWeekGrid(Object.assign({ days: WEEK.days, staff, markers: [] }, options || {}))
  return mount(WorkforceWeekGrid, { propsData: { grid }, mocks: { $i } })
}

describe('WorkforceWeekGrid', () => {
  test('renders seven day columns plus person, hours, shifts and wage', () => {
    const wrapper = render({ range: draftRange([shift()]) })

    expect(wrapper.findAll('thead th')).toHaveLength(11)
    expect(wrapper.findAll('.wf-grid__head--day')).toHaveLength(7)
  })

  test('the day header carries the shift count for that day', () => {
    const wrapper = render({
      range: draftRange([
        shift(),
        shift({ shiftAssignmentId: 'a2' }),
        shift({ shiftAssignmentId: 'a3', localBusinessDate: '2026-07-29T00:00:00' })
      ])
    })
    const counts = wrapper.findAll('.wf-grid__day-count').wrappers.map(w => w.text())

    expect(counts[0]).toBe('0 vakter')
    expect(counts[1]).toBe('2 vakter')
    expect(counts[2]).toBe('1 vakt')
  })

  test('an unread week shows the unknown mark in every day header, never a zero', () => {
    const wrapper = render({ range: null })
    const counts = wrapper.findAll('.wf-grid__day-count').wrappers.map(w => w.text())

    expect(counts).toEqual(['—', '—', '—', '—', '—', '—', '—'])
    expect(counts).not.toContain('0 vakter')
  })

  test('a week with no revision shows the unknown mark too — no plan is not an empty plan', () => {
    const wrapper = render({ range: { view: 'draft', scheduleRevisionId: null, assignments: [] } })

    expect(wrapper.findAll('.wf-grid__day-count').wrappers.map(w => w.text()))
      .toEqual(['—', '—', '—', '—', '—', '—', '—'])
  })

  test('a shift renders as a local time range in its person-day cell', () => {
    const wrapper = render({ range: draftRange([shift()]) })
    const annaRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Anna Haugen'))
    const tuesday = annaRow.findAll('.wf-grid__cell').at(1)

    expect(tuesday.find('.wf-grid__shift-time').text()).toBe('08:00–16:00')
    expect(tuesday.find('.wf-grid__shift-role').text()).toBe('Kokk')
    expect(annaRow.findAll('.wf-grid__shift')).toHaveLength(1)
  })

  test('the open-shift row is the first row and holds unassigned shifts', () => {
    const open = shift({ shiftAssignmentId: 'open-1', staffMemberId: null, staffDisplayName: null, isOpenShift: true })
    const wrapper = render({ range: draftRange([open]) })
    const firstRow = wrapper.findAll('tbody tr').at(0)

    expect(firstRow.classes()).toContain('wf-grid__row--open')
    expect(firstRow.text()).toContain('Ledig vakt')
    expect(firstRow.findAll('.wf-grid__shift--open')).toHaveLength(1)
  })

  test('an employee with no shifts keeps a visible, empty row', () => {
    const wrapper = render({ range: draftRange([shift()]) })
    const bjornRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Bjørn Ek'))

    expect(bjornRow).toBeDefined()
    expect(bjornRow.findAll('.wf-grid__shift')).toHaveLength(0)
    expect(bjornRow.findAll('.wf-grid__num').at(0).text()).toBe('0t')
  })

  test('an unavailable day renders Utilgjengelig', () => {
    const markers = markersFromRequests([{
      kind: 'availability-exception',
      staffMemberId: BJORN,
      availabilityKind: 'Unavailable',
      localStartDate: '2026-07-29T00:00:00',
      localEndDate: '2026-07-29T00:00:00'
    }])
    const wrapper = render({ range: draftRange([shift()]), markers })
    const bjornRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Bjørn Ek'))
    const marker = bjornRow.find('.wf-grid__marker')

    expect(marker.text()).toBe('Utilgjengelig')
    expect(marker.classes()).toContain('wf-grid__marker--unavailable')
    expect(bjornRow.findAll('.wf-grid__cell').at(2).findAll('.wf-grid__marker')).toHaveLength(1)
    expect(bjornRow.findAll('.wf-grid__cell').at(1).findAll('.wf-grid__marker')).toHaveLength(0)
  })

  test('an approved absence renders Fri, a requested one renders as requested', () => {
    const markers = markersFromRequests([
      { kind: 'time-off', staffMemberId: ANNA, status: 'Approved', localStartDate: '2026-07-27T00:00:00', localEndDate: '2026-07-27T00:00:00' },
      { kind: 'time-off', staffMemberId: BJORN, status: 'UnderReview', localStartDate: '2026-07-27T00:00:00', localEndDate: '2026-07-27T00:00:00' }
    ])
    const wrapper = render({ range: draftRange([]), markers })
    const annaRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Anna Haugen'))
    const bjornRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Bjørn Ek'))

    expect(annaRow.find('.wf-grid__marker').text()).toBe('Fri')
    expect(bjornRow.find('.wf-grid__marker').text()).toBe('Fri – søkt')
  })

  test('when absences were not loaded the grid says so instead of implying everyone is free', () => {
    const wrapper = render({ range: draftRange([shift()]), markers: null })

    expect(wrapper.find('.wf-grid__caveat').exists()).toBe(true)
    expect(wrapper.find('.wf-grid__caveat').text()).toContain('ikke hentet')
  })

  test('a shift the API called a double booking is rendered distinctly', () => {
    const wrapper = render({
      range: draftRange([shift()]),
      conflict: { conflictKind: 'assignment-overlap', conflictingAssignmentId: 'a1' }
    })
    const annaRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Anna Haugen'))

    expect(annaRow.classes()).toContain('is-conflict')
    expect(annaRow.find('.wf-grid__shift').classes()).toContain('is-conflict')
    expect(annaRow.findAll('.wf-grid__cell').at(1).classes()).toContain('is-conflict')
    expect(annaRow.find('.wf-grid__shift').attributes('title')).toContain('Dobbeltbooking')
  })

  test('a cross-store conflict marks no shift, because the API names none', () => {
    const wrapper = render({
      range: draftRange([shift()]),
      conflict: { conflictKind: 'hidden-engagement-conflict' }
    })

    expect(wrapper.findAll('.wf-grid__shift.is-conflict')).toHaveLength(0)
    expect(wrapper.findAll('.wf-grid__cell.is-conflict')).toHaveLength(0)
  })

  test('the wage column and the band hold their place and show no figure', () => {
    const wrapper = render({ range: draftRange([shift()]) })
    const band = wrapper.find('.wf-grid__band')

    expect(wrapper.findAll('.wf-grid__num--cost').wrappers.every(w => w.text() === '—')).toBe(true)
    expect(band.findAll('.wf-grid__num').at(0).text()).toBe('7t 30m')
    expect(band.findAll('.wf-grid__num').at(1).text()).toBe('1')
    expect(band.findAll('.wf-grid__num').at(2).text()).toBe('—')
    expect(band.text()).toContain('Lønn og lønnsprosent kommer')
  })

  test('the band totals read as unknown while the week is unread', () => {
    const wrapper = render({ range: null })
    const band = wrapper.find('.wf-grid__band')

    expect(band.findAll('.wf-grid__num').at(0).text()).toBe('—')
    expect(band.findAll('.wf-grid__num').at(1).text()).toBe('—')
  })

  test('an off-roster person keeps their shifts and is flagged', () => {
    const ghost = shift({ shiftAssignmentId: 'ghost', staffMemberId: 'deadbeef', staffDisplayName: 'Kari Utmeldt' })
    const wrapper = render({ range: draftRange([ghost]) })
    const row = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Kari Utmeldt'))

    expect(row.find('.wf-grid__person-flag').text()).toBe('Ikke på ansattlisten')
    expect(row.findAll('.wf-grid__shift')).toHaveLength(1)
  })

  test('an empty roster states it rather than rendering as a staffed store with nothing on', () => {
    const wrapper = render({ range: draftRange([]), staff: [] })

    expect(wrapper.find('.wf-grid__row--empty').text()).toContain('Ingen ansatte er registrert')
  })
})
