import { shallowMount, mount } from '@vue/test-utils'
import ReservationsPage from '~/pages/admin/reservations.vue'
import ReservationModal from '~/components/admin/reservations/ReservationModal.vue'
import ReservationTimeline from '~/components/admin/reservations/ReservationTimeline.vue'

// A reservation may hold SEVERAL tables (the L3c combination): `fromApi` reads them off `r.tables`
// into `tableIds`/`extraTableIds` and `toApi` sends the whole set back as `tableIds`. Conflict
// detection has to answer for every one of them, in both directions:
//
//   • the tables an EXISTING booking occupies — a combined 1+2 must make table 2 busy, not only 1;
//   • the tables the DRAFT would occupy — a new 4+3 must be refused when 3 is already taken.
//
// Comparing a single `tableId` on either side lets an operator seat two parties on the same table
// with no warning at all. The server does refuse the save (see the lane note), so what is at stake
// is the operator's last honest moment before it: the timeline drops the block, the modal keeps
// Save enabled, and the refusal arrives as "no longer available" with the modal already closed and
// the draft gone.
//
// Both call sites are covered, because they are separate wirings of the same method
// (reservations.vue:79 passes `conflictForDay` to the timeline, :119 passes `checkConflict` to the
// modal) and fixing one of them is the natural half-fix.

const DAY = '2026-08-20'

const $i = (key, params) => (params ? key + ':' + JSON.stringify(params) : key)

function apiTable (id, number, min, max) {
  return {
    id,
    zoneId: 1,
    tableNumber: number,
    name: 'Bord ' + number,
    shape: 'Square',
    posX: 0,
    posY: 0,
    width: 80,
    height: 80,
    rotation: 0,
    seats: max,
    seatsAuto: true,
    minCapacity: min,
    maxCapacity: max,
    isActive: true
  }
}

const FLOOR_PLAN = {
  zones: [{ id: 1, name: 'Sal', isActive: true, sortOrder: 1 }],
  tables: [
    apiTable(1, 1, 1, 4),
    apiTable(2, 2, 1, 4),
    apiTable(3, 3, 1, 4),
    apiTable(4, 4, 1, 4),
    apiTable(5, 5, 1, 4)
  ]
}

const hhmm = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0')

// The wire shape the day endpoint returns. `tableIds` may name several tables; the first is the
// primary, exactly as the server's ApplyTables writes them (table-number order).
function apiReservation (reservationId, tableIds, startMin, durationMin, overrides) {
  return Object.assign({
    reservationId,
    tableId: tableIds[0],
    tables: tableIds.map((tableId, i) => ({ tableId, tableName: 'Bord ' + tableId, sortOrder: i })),
    startTime: DAY + 'T' + hhmm(startMin) + ':00',
    endTime: DAY + 'T' + hhmm(startMin + durationMin) + ':00',
    partySize: 2,
    customerName: 'Hansen',
    customerPhone: '',
    comment: '',
    status: 'Confirmed',
    isWalkIn: false,
    createdByAdmin: true,
    createdAt: DAY + 'T09:00:00'
  }, overrides)
}

// The real page, with the two services it reads through replaced. Nothing here stubs the mapping or
// the conflict rule — `fromApi` and `checkConflict` are the code under test.
function mountPage (dayReservations) {
  const wrapper = shallowMount(ReservationsPage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, isPowerUser: true, adminIn: [{ id: 42 }] } }
      },
      $router: { push () {} },
      _tableService: {
        GetFloorPlan: () => Promise.resolve(FLOOR_PLAN),
        GetReservationSettings: () => Promise.resolve(null)
      },
      _reservationService: {
        GetForDay: () => Promise.resolve([]),
        Suggest: () => Promise.resolve({ tableId: null })
      }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
  wrapper.setData({
    dateKey: DAY,
    zones: FLOOR_PLAN.zones,
    tables: FLOOR_PLAN.tables.map(wrapper.vm.mapTable),
    reservations: dayReservations.map(wrapper.vm.fromApi)
  })
  return wrapper
}

describe('what the page reads off a combined booking', () => {
  test('a combined booking carries every table it holds, not only the primary', () => {
    const wrapper = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])
    const block = wrapper.vm.reservations[0]

    expect(block.tableId).toBe(1)
    expect(block.tableIds).toEqual([1, 2])
    expect(block.extraTableIds).toEqual([2])
    wrapper.destroy()
  })
})

describe('conflict detection sees every table a reservation holds', () => {
  // Direction one: the tables the EXISTING booking occupies.
  test('a booking on the secondary table of a combined 1+2 is a conflict', () => {
    const wrapper = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])

    // The primary was never in doubt.
    expect(wrapper.vm.checkConflict(null, 1, 19 * 60, 90, DAY)).toBe(true)
    // The secondary is the defect: table 2 is held by the same party for the same two hours.
    expect(wrapper.vm.checkConflict(null, 2, 19 * 60, 90, DAY)).toBe(true)
    wrapper.destroy()
  })

  test('a table the combined booking does NOT hold stays free', () => {
    const wrapper = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])

    expect(wrapper.vm.checkConflict(null, 3, 19 * 60, 90, DAY)).toBe(false)
    wrapper.destroy()
  })

  // Direction two: the tables the DRAFT would occupy.
  test('a draft that combines onto an already-booked table is a conflict', () => {
    const wrapper = mountPage([apiReservation(1, [3], 18 * 60, 120)])

    // Primary 4 is free; the extra table 3 is not, so the draft as a whole conflicts.
    expect(wrapper.vm.checkConflict(null, [4, 3], 19 * 60, 90, DAY)).toBe(true)
    // …and a combination that touches nothing booked still does not.
    expect(wrapper.vm.checkConflict(null, [4, 5], 19 * 60, 90, DAY)).toBe(false)
    wrapper.destroy()
  })

  test('a reservation never conflicts with itself on any of its own tables', () => {
    const wrapper = mountPage([apiReservation(7, [1, 2], 18 * 60, 120)])

    expect(wrapper.vm.checkConflict(7, [1, 2], 18 * 60, 120, DAY)).toBe(false)
    expect(wrapper.vm.checkConflict(7, 2, 18 * 60, 120, DAY)).toBe(false)
    wrapper.destroy()
  })

  test('the rules that already held still hold across the whole combination', () => {
    const cancelled = apiReservation(1, [1, 2], 18 * 60, 120, { status: 'Cancelled' })
    const otherDay = apiReservation(2, [3, 4], 18 * 60, 120, {
      startTime: '2026-08-21T18:00:00', endTime: '2026-08-21T20:00:00'
    })
    const wrapper = mountPage([cancelled, otherDay])

    // A cancelled booking releases its extras, not only its primary.
    expect(wrapper.vm.checkConflict(null, 2, 19 * 60, 90, DAY)).toBe(false)
    // And another day's extras do not block this one.
    expect(wrapper.vm.checkConflict(null, 4, 19 * 60, 90, DAY)).toBe(false)
    wrapper.destroy()
  })

  test('an empty table selection is not a conflict', () => {
    const wrapper = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])

    expect(wrapper.vm.checkConflict(null, [], 19 * 60, 90, DAY)).toBe(false)
    expect(wrapper.vm.checkConflict(null, null, 19 * 60, 90, DAY)).toBe(false)
    wrapper.destroy()
  })
})

// --- entry point 1: the modal --------------------------------------------------------------------

function mountModal (page, draft) {
  return mount(ReservationModal, {
    propsData: {
      reservation: draft,
      isNew: true,
      zoneGroups: page.vm.zoneGroups,
      tables: page.vm.flatTables,
      // The same wiring as reservations.vue:119.
      checkConflict: page.vm.checkConflict
    },
    mocks: { $i }
  })
}

function draftOn (primary, extras, startMin, durationMin) {
  return {
    id: 'new-1',
    tableId: primary,
    tableIds: [primary].concat(extras),
    extraTableIds: extras.slice(),
    dateKey: DAY,
    startMin,
    durationMin,
    partySize: 2,
    name: 'Ny gjest',
    phone: '',
    comment: '',
    status: 'confirmed',
    isWalkIn: false,
    createdAt: 0
  }
}

describe('the modal refuses a draft whose extra table is taken', () => {
  test('the conflict line shows and Save is blocked when only the EXTRA table overlaps', () => {
    const page = mountPage([apiReservation(1, [3], 18 * 60, 120)])
    const modal = mountModal(page, draftOn(4, [3], 19 * 60, 90))

    expect(modal.vm.conflictNow).toBe(true)
    expect(modal.vm.canSave).toBe(false)
    expect(modal.find('.rm-error').exists()).toBe(true)
    modal.destroy()
    page.destroy()
  })

  test('a draft whose combination is entirely free still saves', () => {
    const page = mountPage([apiReservation(1, [3], 18 * 60, 120)])
    const modal = mountModal(page, draftOn(4, [5], 19 * 60, 90))

    expect(modal.vm.conflictNow).toBe(false)
    expect(modal.vm.canSave).toBe(true)
    modal.destroy()
    page.destroy()
  })

  test('the table list marks the secondary table of a combined booking as busy', () => {
    const page = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])
    const modal = mountModal(page, draftOn(4, [], 19 * 60, 90))

    expect(modal.vm.isBusy(1)).toBe(true)
    expect(modal.vm.isBusy(2)).toBe(true)
    expect(modal.vm.isBusy(5)).toBe(false)
    modal.destroy()
    page.destroy()
  })

  test('a combinable table that is already booked says so before it is picked', () => {
    const page = mountPage([apiReservation(1, [1, 2], 18 * 60, 120)])
    const modal = mountModal(page, draftOn(4, [], 19 * 60, 90))

    const busy = modal.findAll('.rm-combine-chip').filter(c => c.attributes('data-table-id') === '2')
    expect(busy.length).toBe(1)
    expect(busy.at(0).classes()).toContain('is-busy')

    const free = modal.findAll('.rm-combine-chip').filter(c => c.attributes('data-table-id') === '5')
    expect(free.length).toBe(1)
    expect(free.at(0).classes()).not.toContain('is-busy')
    modal.destroy()
    page.destroy()
  })
})

// --- entry point 2: the timeline -----------------------------------------------------------------

const HEADER_H = 34
const ZONE_H = 30
const ROW_H = 52
// The clientY that lands on a given table row of the single zone, per `tableIdAtY`.
const yOfRow = index => HEADER_H + ZONE_H + ROW_H * index + ROW_H / 2

function mountTimeline (page) {
  return mount(ReservationTimeline, {
    propsData: {
      zoneGroups: page.vm.zoneGroups,
      reservations: page.vm.timelineReservations,
      rangeStart: 600,
      rangeEnd: 1380,
      pxPerHour: 140,
      nowMin: null,
      // The same wiring as reservations.vue:79.
      checkConflict: page.vm.conflictForDay
    },
    mocks: { $i }
  })
}

describe('the timeline refuses a drag whose extra table is taken', () => {
  // Table 5 is booked 18:00–19:00 by someone else. The dragged booking is a 4+5 combination
  // sitting at 12:00; dragging it six hours to the right lands its EXTRA table on top of that.
  const world = () => [
    apiReservation(91, [5], 18 * 60, 60),
    apiReservation(92, [4, 5], 12 * 60, 60)
  ]

  test('the drop is refused and the move is never emitted', () => {
    const page = mountPage(world())
    const timeline = mountTimeline(page)
    const dragged = page.vm.timelineReservations.find(r => r.id === 92)

    // Table 4 is row index 3 of [t1, t2, t3, t4, t5].
    const y = yOfRow(3)
    timeline.vm.startDrag(dragged, 'move', { preventDefault () {}, clientX: 0, clientY: y })
    timeline.vm.onPointerMove({ clientX: 840, clientY: y }) // 6 h at 140 px/h

    expect(timeline.vm.drag.curStart).toBe(18 * 60)
    expect(timeline.vm.drag.curTable).toBe(4)
    expect(timeline.vm.drag.conflict).toBe(true)

    timeline.vm.onPointerUp()
    expect(timeline.emitted('conflict')).toBeTruthy()
    expect(timeline.emitted('block-move')).toBeFalsy()
    timeline.destroy()
    page.destroy()
  })

  test('the same drag onto a free slot still lands', () => {
    const page = mountPage(world())
    const timeline = mountTimeline(page)
    const dragged = page.vm.timelineReservations.find(r => r.id === 92)

    const y = yOfRow(3)
    timeline.vm.startDrag(dragged, 'move', { preventDefault () {}, clientX: 0, clientY: y })
    timeline.vm.onPointerMove({ clientX: 700, clientY: y }) // 5 h → 17:00–18:00, nothing held

    expect(timeline.vm.drag.curStart).toBe(17 * 60)
    expect(timeline.vm.drag.conflict).toBe(false)

    timeline.vm.onPointerUp()
    expect(timeline.emitted('conflict')).toBeFalsy()
    expect(timeline.emitted('block-move')[0][0]).toEqual({ id: 92, tableId: 4, startMin: 17 * 60 })
    timeline.destroy()
    page.destroy()
  })

  test('a resize that stretches a combination over a booking on its extra table is refused', () => {
    const page = mountPage([
      apiReservation(91, [5], 19 * 60, 60),
      apiReservation(92, [4, 5], 18 * 60, 30)
    ])
    const timeline = mountTimeline(page)
    const dragged = page.vm.timelineReservations.find(r => r.id === 92)

    const y = yOfRow(3)
    timeline.vm.startDrag(dragged, 'resize-r', { preventDefault () {}, clientX: 0, clientY: y })
    timeline.vm.onPointerMove({ clientX: 210, clientY: y }) // +90 min → 18:00–20:00

    expect(timeline.vm.drag.curDur).toBe(120)
    expect(timeline.vm.drag.conflict).toBe(true)

    timeline.vm.onPointerUp()
    expect(timeline.emitted('conflict')).toBeTruthy()
    expect(timeline.emitted('block-resize')).toBeFalsy()
    timeline.destroy()
    page.destroy()
  })
})
