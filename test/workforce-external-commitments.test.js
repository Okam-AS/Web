import { mount } from '@vue/test-utils'
import WorkforceWeekGrid from '~/components/admin/workforce/WorkforceWeekGrid.vue'
import { buildWeekGrid, placeExternalCommitments, EXTERNAL_PUBLISHED_SHIFT } from '~/utils/workforce/week-grid'
import { weekRange } from '~/utils/workforce/week-range'
import translations from '~/translations'

// The cross-store overlay (`GET /schedules/external-commitments`). Two laws are on trial here:
//
//   1. THE OTHER STORE IS NEVER NAMED. The write path refuses a cross-store clash with an opaque
//      `workforce.hidden-engagement-conflict` that carries no store, so this read — which answers the
//      same question earlier — may not disclose more than the refusal does.
//   2. PLACEMENT IS BY `startsUtc` IN THE ROUTE STORE'S ZONE. Each item's `localBusinessDate` is the
//      OTHER store's business day; keying the grid on it would put the marker in the wrong column.

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026

const ANNA = '11111111-1111-1111-1111-111111111111'
const BJORN = '22222222-2222-2222-2222-222222222222'

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const staff = [
  { staffMemberId: ANNA, displayName: 'Anna Haugen', isActive: true, employmentNumber: '104' },
  { staffMemberId: BJORN, displayName: 'Bjørn Ek', isActive: true, employmentNumber: '108' }
]

function commitment (over) {
  return Object.assign({
    staffMemberId: ANNA,
    kind: EXTERNAL_PUBLISHED_SHIFT,
    startsUtc: '2026-07-28T06:00:00',
    endsUtc: '2026-07-28T14:00:00',
    localBusinessDate: '2026-07-28T00:00:00'
  }, over)
}

function response (items, over) {
  return Object.assign({
    storeId: 42,
    rangeStartUtc: '2026-07-26T22:00:00',
    rangeEndUtc: '2026-08-02T22:00:00',
    timeZoneId: OSLO,
    asOfUtc: '2026-07-29T09:00:00Z',
    items
  }, over)
}

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
    unpaidBreakMinutes: 0,
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
    assignments: assignments || []
  }
}

function build (options) {
  return buildWeekGrid(Object.assign({ days: WEEK.days, staff, markers: [] }, options || {}))
}

const rowFor = (grid, id) => grid.rows.find(r => r.key === id)
const cellFor = (grid, id, day) => rowFor(grid, id).cells.find(c => c.isoDate === day)

describe('placement — by startsUtc in the ROUTE store zone, never by localBusinessDate', () => {
  test('the other store\'s business date does not decide the column', () => {
    // 22:30 UTC on Sunday is 00:30 Monday in Oslo. The other store attributes it to ITS Sunday.
    // The route store's grid must show Monday, because that is the day the person is unavailable
    // here — reading `localBusinessDate` would put the marker one whole column early.
    const grid = build({
      external: response([commitment({
        startsUtc: '2026-07-27T22:30:00',
        endsUtc: '2026-07-28T04:00:00',
        localBusinessDate: '2026-07-27T00:00:00'
      })])
    })

    expect(cellFor(grid, ANNA, '2026-07-27').external).toHaveLength(0)
    expect(cellFor(grid, ANNA, '2026-07-28').external).toHaveLength(1)
    expect(cellFor(grid, ANNA, '2026-07-28').external[0].start).toBe('00:30')
  })

  test('a commitment spanning local midnight occupies BOTH days it covers', () => {
    // 20:00–23:00 UTC is 22:00–01:00 in Oslo. Showing it on Tuesday only would tell a manager that
    // Wednesday morning is free, which it is not.
    const grid = build({
      external: response([commitment({
        startsUtc: '2026-07-28T20:00:00',
        endsUtc: '2026-07-28T23:00:00',
        localBusinessDate: '2026-07-30T00:00:00' // deliberately a third, unrelated day
      })])
    })

    const tue = cellFor(grid, ANNA, '2026-07-28').external
    const wed = cellFor(grid, ANNA, '2026-07-29').external
    const thu = cellFor(grid, ANNA, '2026-07-30').external

    expect(tue).toHaveLength(1)
    expect(wed).toHaveLength(1)
    expect(thu).toHaveLength(0) // the localBusinessDate day — never used
    expect(tue[0].crossesMidnight).toBe(true)
    expect(tue[0].continuesIntoNextDay).toBe(true)
    expect(wed[0].continuesFromPreviousDay).toBe(true)
    expect(tue[0].start + '–' + tue[0].end).toBe('22:00–01:00')
  })

  test('an end at exactly local midnight does not bleed into the next day', () => {
    const grid = build({
      external: response([commitment({ startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T22:00:00' })])
    })

    expect(cellFor(grid, ANNA, '2026-07-28').external).toHaveLength(1)
    expect(cellFor(grid, ANNA, '2026-07-29').external).toHaveLength(0)
  })

  test('the offset is resolved AT the instant, so a DST weekend keeps its column', () => {
    // Oslo leaves CEST at 2026-10-25T01:00Z. 22:30Z on the 24th is therefore 00:30 on the 25th —
    // using the winter offset would draw it at 23:30 on the 24th, in the previous column.
    const dstWeek = weekRange(OSLO, new Date('2026-10-21T09:00:00Z')) // Mon 19 – Sun 25 Oct
    const grid = buildWeekGrid({
      days: dstWeek.days,
      staff,
      markers: [],
      external: response([commitment({
        startsUtc: '2026-10-24T22:30:00',
        endsUtc: '2026-10-25T02:00:00'
      })])
    })

    expect(cellFor(grid, ANNA, '2026-10-24').external).toHaveLength(0)
    const sunday = cellFor(grid, ANNA, '2026-10-25').external
    expect(sunday).toHaveLength(1)
    expect(sunday[0].start).toBe('00:30')
    expect(sunday[0].end).toBe('03:00') // 02:00Z, now CET (+1)
  })

  test('a commitment starting before the week still marks the days it covers inside it', () => {
    const grid = build({
      external: response([commitment({
        startsUtc: '2026-07-26T20:00:00', // Sunday, before the grid's Monday
        endsUtc: '2026-07-27T04:00:00'
      })])
    })

    expect(cellFor(grid, ANNA, '2026-07-27').external).toHaveLength(1)
  })

  test('an open shift row never carries a commitment — there is no person on it', () => {
    const grid = build({ external: response([commitment()]) })
    expect(grid.openRow.cells.every(c => c.external.length === 0)).toBe(true)
  })

  test('commitments land on the person they belong to and nobody else', () => {
    const grid = build({ external: response([commitment({ staffMemberId: BJORN })]) })
    expect(rowFor(grid, ANNA).externalCount).toBe(0)
    expect(rowFor(grid, BJORN).externalCount).toBe(1)
  })

  test('one commitment drawn on two days is still ONE commitment in the count', () => {
    const grid = build({
      external: response([commitment({ startsUtc: '2026-07-28T20:00:00', endsUtc: '2026-07-28T23:00:00' })])
    })
    expect(rowFor(grid, ANNA).cells.filter(c => c.external.length).length).toBe(2)
    expect(rowFor(grid, ANNA).externalCount).toBe(1)
  })
})

describe('unknown is not empty', () => {
  test('no answer at all leaves the overlay UNKNOWN, and counts nothing', () => {
    const grid = build({ external: null })
    expect(grid.externalKnown).toBe(false)
    expect(grid.externalUnplaced).toBeNull()
    expect(grid.externalClashCount).toBeNull()
    expect(rowFor(grid, ANNA).externalCount).toBeNull()
  })

  test('an answer with no items is a real, countable zero', () => {
    const grid = build({ external: response([]) })
    expect(grid.externalKnown).toBe(true)
    expect(grid.externalUnplaced).toBe(0)
    expect(grid.externalClashCount).toBe(0)
    expect(rowFor(grid, ANNA).externalCount).toBe(0)
  })

  test('items without the route zone are UNKNOWN, not empty — nothing can be placed honestly', () => {
    const grid = build({ external: response([commitment()], { timeZoneId: null }) })
    expect(grid.externalKnown).toBe(false)
    expect(cellFor(grid, ANNA, '2026-07-28').external).toHaveLength(0)
  })

  test('an item that cannot be placed is counted, never silently dropped', () => {
    const grid = build({
      external: response([
        commitment(),
        commitment({ startsUtc: null }),
        commitment({ startsUtc: '2026-07-28T10:00:00', endsUtc: '2026-07-28T10:00:00' })
      ])
    })
    expect(grid.externalKnown).toBe(true)
    expect(grid.externalUnplaced).toBe(2)
    expect(rowFor(grid, ANNA).externalCount).toBe(1)
  })

  test('a commitment for someone with no row on screen is counted rather than hidden', () => {
    // Roster read failed AND the person has no shift here, so no row exists to hang it on.
    const grid = buildWeekGrid({
      days: WEEK.days,
      staff: null,
      markers: [],
      range: draftRange([]),
      external: response([commitment()])
    })
    expect(grid.externalKnown).toBe(true)
    expect(grid.externalUnplaced).toBe(1)
  })

  test('an off-screen OVERNIGHT commitment is counted once, not once per day it would have spanned', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      staff: null,
      markers: [],
      range: draftRange([]),
      external: response([commitment({ startsUtc: '2026-07-28T20:00:00', endsUtc: '2026-07-28T23:00:00' })])
    })
    expect(grid.externalUnplaced).toBe(1)
  })
})

describe('the clash the guard would refuse at publish, seen while planning', () => {
  test('an overlapping planned shift is flagged on both sides', () => {
    const grid = build({
      range: draftRange([shift({ startsUtc: '2026-07-28T06:00:00', endsUtc: '2026-07-28T14:00:00' })]),
      external: response([commitment({ startsUtc: '2026-07-28T12:00:00', endsUtc: '2026-07-28T16:00:00' })])
    })

    const cell = cellFor(grid, ANNA, '2026-07-28')
    expect(cell.shifts[0].hasExternalClash).toBe(true)
    expect(cell.external[0].isClashing).toBe(true)
    expect(cell.hasExternalClash).toBe(true)
    expect(rowFor(grid, ANNA).hasExternalClash).toBe(true)
    expect(grid.externalClashCount).toBe(1)
  })

  test('touching but not overlapping is not a clash', () => {
    const grid = build({
      range: draftRange([shift({ startsUtc: '2026-07-28T06:00:00', endsUtc: '2026-07-28T14:00:00' })]),
      external: response([commitment({ startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T18:00:00' })])
    })
    expect(grid.externalClashCount).toBe(0)
    expect(cellFor(grid, ANNA, '2026-07-28').external[0].isClashing).toBe(false)
  })

  test('the clash is decided on instants, so a mismatched business date cannot hide it', () => {
    // The shift is bucketed under Tuesday by its stored business date; the commitment is bucketed
    // under Wednesday by its route-local start. They still overlap in real time.
    const grid = build({
      range: draftRange([shift({
        startsUtc: '2026-07-28T20:00:00',
        endsUtc: '2026-07-29T02:00:00',
        localBusinessDate: '2026-07-28T00:00:00'
      })]),
      external: response([commitment({ startsUtc: '2026-07-28T23:00:00', endsUtc: '2026-07-29T05:00:00' })])
    })

    expect(grid.externalClashCount).toBe(1)
    expect(cellFor(grid, ANNA, '2026-07-28').shifts[0].hasExternalClash).toBe(true)
  })

  test('another person\'s commitment never clashes with this person\'s shift', () => {
    const grid = build({
      range: draftRange([shift()]),
      external: response([commitment({ staffMemberId: BJORN })])
    })
    expect(grid.externalClashCount).toBe(0)
  })

  test('a clash is counted once per planned shift, not once per overlapping commitment', () => {
    const grid = build({
      range: draftRange([shift({ startsUtc: '2026-07-28T06:00:00', endsUtc: '2026-07-28T18:00:00' })]),
      external: response([
        commitment({ startsUtc: '2026-07-28T07:00:00', endsUtc: '2026-07-28T09:00:00' }),
        commitment({ startsUtc: '2026-07-28T13:00:00', endsUtc: '2026-07-28T15:00:00' })
      ])
    })
    expect(grid.externalClashCount).toBe(1)
  })
})

describe('placeExternalCommitments in isolation', () => {
  test('a malformed envelope is unknown rather than an empty answer', () => {
    expect(placeExternalCommitments(undefined, ['2026-07-27']).known).toBe(false)
    expect(placeExternalCommitments({ timeZoneId: OSLO }, ['2026-07-27']).known).toBe(false)
    expect(placeExternalCommitments({ items: [] }, ['2026-07-27']).known).toBe(false)
  })
})

describe('rendering — kind and times, never a store', () => {
  function render (options) {
    return mount(WorkforceWeekGrid, { propsData: { grid: build(options), locale: 'no' }, mocks: { $i } })
  }

  test('the chip states that a commitment exists elsewhere, with its times', () => {
    const wrapper = render({ external: response([commitment()]) })
    const chip = wrapper.find('.wf-grid__external')

    expect(chip.exists()).toBe(true)
    expect(chip.text()).toContain('08:00–16:00')
    expect(chip.text()).toContain('Opptatt annet sted')
  })

  test('the tooltip says a store is not disclosed rather than implying one', () => {
    const wrapper = render({ external: response([commitment()]) })
    const title = wrapper.find('.wf-grid__external').attributes('title')

    expect(title).toContain('en annen butikk')
    expect(title).toContain('Hvilken butikk det gjelder, oppgis ikke.')
  })

  test('NOTHING resembling a store identity reaches the DOM, even if the payload grew one', () => {
    // An adversarial payload: today's contract carries none of these, and if it ever did, the grid
    // still may not draw them — the write path's refusal names no store either.
    // The numeric ids are DISTINCTIVE on purpose. A plausible id like 99 cannot be asserted on: it
    // occurs incidentally in a rendered week (in a time, a percentage, a generated class), so the
    // assertion would pass or fail for reasons unrelated to disclosure. Six-digit and distinct per
    // field, a hit names both the leak and the field it came from.
    const wrapper = render({
      external: response([Object.assign(commitment(), {
        storeId: 987001,
        storeName: 'Kafé Sør',
        otherStoreId: 987002,
        shiftAssignmentId: 'foreign-assignment-1',
        scheduleRevisionId: 'foreign-revision-1',
        engagementId: 'foreign-engagement-1',
        roleName: 'Bartender',
        note: 'Fast vakt på Sør'
      })])
    })

    const html = wrapper.html()

    // Positive control: the overlay really did render this commitment. Without it every assertion
    // below is satisfied just as well by a grid that drew nothing at all.
    expect(html).toContain('Opptatt annet sted')

    for (const secret of ['987001', '987002', 'Kafé Sør', 'foreign-assignment-1', 'foreign-revision-1', 'foreign-engagement-1', 'Bartender', 'Fast vakt på Sør']) {
      expect(html).not.toContain(secret)
    }
  })

  test('an unrecognised kind is described vaguely rather than called a published shift', () => {
    const wrapper = render({ external: response([commitment({ kind: 'something-new' })]) })
    const title = wrapper.find('.wf-grid__external').attributes('title')

    expect(title).toContain('registrert forpliktelse')
    expect(title).not.toContain('publisert vakt')
  })

  test('a clash reads as a collision and marks the planned shift too', () => {
    const wrapper = render({
      range: draftRange([shift({ startsUtc: '2026-07-28T06:00:00', endsUtc: '2026-07-28T14:00:00' })]),
      external: response([commitment({ startsUtc: '2026-07-28T12:00:00', endsUtc: '2026-07-28T16:00:00' })])
    })

    expect(wrapper.find('.wf-grid__external').classes()).toContain('is-clash')
    expect(wrapper.find('.wf-grid__external').text()).toContain('kolliderer')
    expect(wrapper.find('.wf-grid__shift').classes()).toContain('is-external-clash')
    expect(wrapper.find('.wf-grid__shift').attributes('title')).toContain('Overlapper en vakt du har lagt inn her.')
  })

  test('an unanswered overlay says so; an answered empty one says nothing', () => {
    const unknown = render({ external: null })
    expect(unknown.text()).toContain('Vi fikk ikke sjekket om noen er opptatt i en annen butikk')

    const empty = render({ external: response([]) })
    expect(empty.text()).not.toContain('Vi fikk ikke sjekket om noen er opptatt i en annen butikk')
    expect(empty.find('.wf-grid__external').exists()).toBe(false)
  })

  test('items that could not be placed are admitted to, in the right number', () => {
    const one = render({ external: response([commitment({ startsUtc: null })]) })
    expect(one.text()).toContain('Én forpliktelse fra en annen butikk kunne ikke plasseres')

    const two = render({ external: response([commitment({ startsUtc: null }), commitment({ endsUtc: null })]) })
    expect(two.text()).toContain('2 forpliktelser fra en annen butikk kunne ikke plasseres')
  })
})

describe('the page-level warning copy', () => {
  // The page owns the banner; these assert the sentences it is built from exist and are opaque.
  test('the clash notice names a count and a consequence, never a store', () => {
    expect(translations.no.wf_external_clash_notice_one).toContain('avvist ved publisering')
    expect(translations.no.wf_external_clash_notice).toContain('{count}')
    for (const locale of ['no', 'en', 'de']) {
      for (const key of Object.keys(translations[locale]).filter(k => k.indexOf('wf_external_') === 0)) {
        expect(typeof translations[locale][key]).toBe('string')
      }
    }
  })

  test('every wf_external_ key exists in all three dictionaries', () => {
    const keys = Object.keys(translations.no).filter(k => k.indexOf('wf_external_') === 0)
    expect(keys.length).toBeGreaterThan(10)
    for (const key of keys) {
      expect(translations.en[key]).toBeDefined()
      expect(translations.de[key]).toBeDefined()
    }
  })
})
