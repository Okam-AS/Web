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

// The admin's money formatter lives on the global mixin (plugins/global-mixin.js), which resolves
// `priceLabel` out of `~/core/helpers/tools` — a git submodule this repo carries no checkout of, so
// it cannot be imported here. These stand-ins reproduce its shape exactly (minor units in, "kr "
// prefix, space-grouped whole part, comma, two-digit fraction) so the assertions below read as the
// strings a manager sees. What is under test is WHICH figure is rendered, never the grouping.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

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

function draftRange (assignments, cost) {
  return {
    view: 'draft',
    scheduleRevisionId: 'rev-1',
    revisionNumber: 2,
    state: 'Draft',
    timeZoneId: OSLO,
    asOfUtc: '2026-07-29T09:00:00Z',
    assignments,
    cost: cost || null
  }
}

function render (options) {
  const opts = options || {}
  const grid = buildWeekGrid(Object.assign({ days: WEEK.days, staff, markers: [] }, opts))
  return mount(WorkforceWeekGrid, {
    propsData: { grid, currency: opts.currency === undefined ? 'NOK' : opts.currency },
    mocks: { $i, priceLabel, wholeAmount, fractionAmount }
  })
}

// A complete W2 cost node. `totalMinor` is present ONLY when `costComplete` — the wire nulls it
// otherwise, and so does every fixture here.
function totals (over) {
  return Object.assign({
    costComplete: true,
    totalMinor: 0,
    currency: 'NOK',
    incompleteCode: null,
    incompleteDetail: null,
    paidMinutes: 0,
    pricedShiftCount: 0,
    unpricedShiftCount: 0,
    openShiftCount: 0,
    openShiftMinutes: 0
  }, over)
}

function cost (over, days) {
  return Object.assign(totals(over), { days: days || [] })
}

function costDay (date, over, shifts) {
  return Object.assign(totals(over), { localBusinessDate: date, shifts: shifts || [] })
}

function shiftCost (id, over) {
  return Object.assign({
    shiftAssignmentId: id,
    staffMemberId: ANNA,
    roleId: null,
    isOpenShift: false,
    costComplete: true,
    totalMinor: 0,
    currency: 'NOK',
    paidMinutes: 450,
    refusalCode: null,
    refusalDetail: null,
    refusedFromUtc: null,
    refusedToUtc: null
  }, over)
}

const TUESDAY = '2026-07-28T00:00:00'

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

  test('a week with no cost overlay keeps the wage column blank rather than zero', () => {
    const wrapper = render({ range: draftRange([shift()]) })
    const band = wrapper.find('.wf-grid__band')

    expect(band.find('.wf-grid__band-hours').text()).toBe('7t 30m')
    expect(band.find('.wf-grid__band-shifts').text()).toBe('1')
    expect(band.find('.wf-grid__band-cost').text()).toBe('—')
    expect(band.text()).not.toContain('kr ')
  })

  test('the band totals read as unknown while the week is unread', () => {
    const wrapper = render({ range: null })
    const band = wrapper.find('.wf-grid__band')

    expect(band.find('.wf-grid__band-hours').text()).toBe('—')
    expect(band.find('.wf-grid__band-shifts').text()).toBe('—')
    expect(band.find('.wf-grid__band-cost').text()).toBe('—')
  })

  test('the footer still refuses to name a wage percentage, a revenue or a variance', () => {
    const priced = { totalMinor: 124000, pricedShiftCount: 1, paidMinutes: 450 }
    const wrapper = render({
      range: draftRange([shift()], cost(priced, [
        costDay(TUESDAY, priced, [shiftCost('a1', { totalMinor: 124000 })])
      ]))
    })

    const text = wrapper.text()
    expect(text).not.toMatch(/%/)
    expect(text).not.toContain('Omsetning')
    expect(text).not.toContain('Forskjell til mål')
    // The caption now claims only what is genuinely still missing — it no longer says Lønn is.
    expect(text).toContain('Lønnsprosent, omsetning og forskjell til mål kommer')
    expect(text).toContain('Grunnsats')
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

describe('WorkforceWeekGrid — money', () => {
  test('the week total is the API figure, formatted by the admin money formatter', () => {
    const priced = { totalMinor: 124000, pricedShiftCount: 1, paidMinutes: 450 }
    const wrapper = render({
      range: draftRange([shift()], cost(priced, [
        costDay(TUESDAY, priced, [shiftCost('a1', { totalMinor: 124000 })])
      ]))
    })

    expect(wrapper.find('.wf-grid__band-cost').text()).toBe('kr 1 240,00')
  })

  // THE REGRESSION THIS LANE MOST NEEDS TO PREVENT. Each shift is rounded once; the day and the week
  // are rounded once over the UNROUNDED amounts. Two shifts of exactly 1000.5 øre each therefore
  // round to 1001 apiece while their day is 2001 — the chips add up to 2002 and the footer says
  // 2001, and the footer is the true one. A UI that summed the chips would show 20,02 here.
  test('the footer is the API total, not the sum of the chips', () => {
    const twoShifts = [shift(), shift({ shiftAssignmentId: 'a2', startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T22:00:00' })]
    const chips = [shiftCost('a1', { totalMinor: 1001 }), shiftCost('a2', { totalMinor: 1001 })]
    const dayAndWeek = { totalMinor: 2001, pricedShiftCount: 2, paidMinutes: 900 }

    const wrapper = render({
      range: draftRange(twoShifts, cost(dayAndWeek, [costDay(TUESDAY, dayAndWeek, chips)]))
    })

    const sumOfChips = chips.reduce((sum, c) => sum + c.totalMinor, 0)
    expect(sumOfChips).toBe(2002)

    const tuesday = wrapper.findAll('.wf-grid__band-day').at(1)
    expect(wrapper.findAll('.wf-grid__shift-cost').wrappers.map(w => w.text())).toEqual(['kr 10,01', 'kr 10,01'])
    expect(tuesday.text()).toBe('kr 20,01')
    expect(wrapper.find('.wf-grid__band-cost').text()).toBe('kr 20,01')

    expect(tuesday.text()).not.toBe(priceLabel(sumOfChips))
    expect(wrapper.find('.wf-grid__band-cost').text()).not.toBe(priceLabel(sumOfChips))
  })

  test('an incomplete cost shows the refusal and the count, never a partial total and never a zero', () => {
    const refused = {
      costComplete: true,
      totalMinor: null,
      pricedShiftCount: 1,
      paidMinutes: 900
    }
    // costComplete:false is what the wire sends; totalMinor is null beside it.
    const incomplete = Object.assign({}, refused, {
      costComplete: false,
      unpricedShiftCount: 2,
      incompleteCode: 'workforce.rate-unresolved',
      incompleteDetail: 'No rate for staff member 1111 over 2026-07-28T06:00:00 – 2026-07-28T14:00:00.'
    })

    const wrapper = render({
      range: draftRange([shift(), shift({ shiftAssignmentId: 'a2' })], cost(incomplete, [
        costDay(TUESDAY, incomplete, [
          shiftCost('a1', { totalMinor: 124000 }),
          shiftCost('a2', { costComplete: false, totalMinor: null, currency: null, refusalCode: 'workforce.rate-unresolved', refusalDetail: 'No rate.' })
        ])
      ]))
    })

    const band = wrapper.find('.wf-grid__band-cost')
    expect(band.text()).toBe('Ingen sum')
    expect(band.text()).not.toContain('kr ')
    expect(band.text()).not.toContain('0')
    expect(band.classes()).toContain('is-refused')
    // The day is refused too, and shows the same refusal rather than the one priced shift's amount.
    expect(wrapper.findAll('.wf-grid__band-day').at(1).text()).toBe('Ingen sum')

    const notice = wrapper.find('.wf-grid__caveat--warn')
    expect(notice.text()).toContain('2 vakter mangler sats')
    expect(notice.text()).toContain('ingen lønnssum')
    // The server's own detail names the exact window, so it rides along rather than being discarded.
    expect(notice.attributes('title')).toContain('2026-07-28T06:00:00')
    // The one shift that DID price still shows its own figure: a week without a sum is not a week
    // without facts.
    expect(wrapper.findAll('.wf-grid__shift-cost').wrappers.map(w => w.text()))
      .toEqual(['kr 1 240,00', 'Mangler sats'])
  })

  test('a currency mismatch is its own sentence, and the unaffected days still total', () => {
    const clash = {
      costComplete: false,
      totalMinor: null,
      pricedShiftCount: 2,
      unpricedShiftCount: 0,
      incompleteCode: 'workforce.cost-currency-mismatch',
      incompleteDetail: 'The shifts in this range are priced in different currencies (NOK, CHF).'
    }
    const monday = { totalMinor: 90000, pricedShiftCount: 1, paidMinutes: 450 }

    const wrapper = render({
      range: draftRange([shift({ shiftAssignmentId: 'a0', localBusinessDate: '2026-07-27T00:00:00' }), shift()], cost(clash, [
        costDay('2026-07-27T00:00:00', monday, [shiftCost('a0', { totalMinor: 90000 })]),
        costDay(TUESDAY, clash, [shiftCost('a1', { totalMinor: 50000, currency: 'CHF' })])
      ]))
    })

    expect(wrapper.find('.wf-grid__caveat--warn').text()).toBe('Vaktene i uken er priset i ulike valutaer, så uken kan ikke summeres.')
    expect(wrapper.find('.wf-grid__band-cost').text()).toBe('Ingen sum')
    // A range-level refusal does not erase the days that DID total.
    expect(wrapper.findAll('.wf-grid__band-day').at(0).text()).toBe('kr 900,00')
    expect(wrapper.findAll('.wf-grid__band-day').at(1).text()).toBe('Ingen sum')
    // The franc figure keeps its own code rather than being relabelled as kroner.
    expect(wrapper.findAll('.wf-grid__shift-cost').at(1).text()).toBe('500,00 CHF')
  })

  test('an unfilled vacancy reads as a floor — not as a defect, and not as free labour', () => {
    const open = shift({ shiftAssignmentId: 'open-1', staffMemberId: null, staffDisplayName: null, isOpenShift: true })
    const floor = {
      totalMinor: 124000,
      pricedShiftCount: 1,
      paidMinutes: 450,
      openShiftCount: 1,
      openShiftMinutes: 450
    }

    const wrapper = render({
      range: draftRange([shift(), open], cost(floor, [
        costDay(TUESDAY, floor, [
          shiftCost('a1', { totalMinor: 124000 }),
          shiftCost('open-1', { staffMemberId: null, isOpenShift: true, costComplete: false, totalMinor: null, currency: null })
        ])
      ]))
    })

    const band = wrapper.find('.wf-grid__band-cost')
    // A real sum, qualified as a minimum. Not withheld, not zeroed, not estimated upward.
    expect(band.text()).toBe('minst kr 1 240,00')
    expect(band.classes()).toContain('is-floor')
    expect(band.classes()).not.toContain('is-refused')

    // An open shift is NOT an incompleteness, so there is no refusal banner.
    expect(wrapper.find('.wf-grid__caveat--warn').exists()).toBe(false)
    const notice = wrapper.findAll('.wf-grid__caveat').wrappers.find(w => w.text().includes('minimum'))
    expect(notice.text()).toContain('1 ledig vakt (7t 30m)')
    expect(notice.text()).toContain('Summen øker når den blir tildelt')

    // The vacancy's own chip says it is unpriced rather than showing 0.
    const openRow = wrapper.find('.wf-grid__row--open')
    expect(openRow.find('.wf-grid__shift-cost').text()).toBe('Ikke priset')
    expect(openRow.find('.wf-grid__num--cost').text()).toBe('Ikke priset')
    expect(openRow.text()).not.toContain('kr 0')
  })

  test('a week of nothing but vacancies never reads as free labour', () => {
    const open = shift({ shiftAssignmentId: 'open-1', staffMemberId: null, staffDisplayName: null, isOpenShift: true })
    const nothingPriced = { totalMinor: 0, currency: null, pricedShiftCount: 0, paidMinutes: 0, openShiftCount: 1, openShiftMinutes: 450 }

    const wrapper = render({
      range: draftRange([open], cost(nothingPriced, [
        costDay(TUESDAY, nothingPriced, [
          shiftCost('open-1', { staffMemberId: null, isOpenShift: true, costComplete: false, totalMinor: null, currency: null })
        ])
      ]))
    })

    // The zero is real — no assigned shift exists — but it is never left standing alone as "kr 0".
    expect(wrapper.find('.wf-grid__band-cost').text()).toBe('minst kr 0,00')
    expect(wrapper.findAll('.wf-grid__caveat').wrappers.some(w => w.text().includes('minimum'))).toBe(true)
  })

  test('a day with no shifts is an honest zero once the money is known, and unknown before', () => {
    const priced = { totalMinor: 124000, pricedShiftCount: 1, paidMinutes: 450 }
    const withCost = render({
      range: draftRange([shift()], cost(priced, [costDay(TUESDAY, priced, [shiftCost('a1', { totalMinor: 124000 })])]))
    })

    expect(withCost.findAll('.wf-grid__band-day').at(0).text()).toBe('kr 0,00')
    expect(withCost.findAll('.wf-grid__band-day').at(1).text()).toBe('kr 1 240,00')

    const withoutCost = render({ range: draftRange([shift()]) })
    expect(withoutCost.findAll('.wf-grid__band-day').wrappers.every(w => w.text() === '—')).toBe(true)
  })

  test('no per-employee wage figure is manufactured from a row of chips', () => {
    const twoShifts = [shift(), shift({ shiftAssignmentId: 'a2', startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T22:00:00' })]
    const dayAndWeek = { totalMinor: 2001, pricedShiftCount: 2, paidMinutes: 900 }
    const wrapper = render({
      range: draftRange(twoShifts, cost(dayAndWeek, [
        costDay(TUESDAY, dayAndWeek, [shiftCost('a1', { totalMinor: 1001 }), shiftCost('a2', { totalMinor: 1001 })])
      ]))
    })

    const annaRow = wrapper.findAll('.wf-grid__row').wrappers.find(w => w.text().includes('Anna Haugen'))
    const cell = annaRow.find('.wf-grid__num--cost')

    expect(cell.text()).toBe('—')
    expect(cell.attributes('title')).toBe('Lønn summeres per dag og for hele uken, ikke per ansatt.')
  })

  test('a week with a plan the API did not resolve shows no money at all', () => {
    // The range read carries a cost even with no revision (0 over no days). Rendering it would turn
    // "there is no plan" into "the plan costs nothing".
    const wrapper = render({
      range: { view: 'draft', scheduleRevisionId: null, assignments: [], cost: cost({ totalMinor: 0 }, []) }
    })

    expect(wrapper.find('.wf-grid__band-cost').text()).toBe('—')
    expect(wrapper.findAll('.wf-grid__band-day').wrappers.every(w => w.text() === '—')).toBe(true)
  })
})
