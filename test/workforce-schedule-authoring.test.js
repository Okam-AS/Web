import { WorkforceScheduleService } from '~/utils/workforce/schedule-client'
import { isWorkforceApiError } from '~/utils/workforce/api-client'
import {
  buildWeekGrid,
  readETag,
  toAssignmentInput,
  toDeleteInput,
  isAuthorable,
  wallClockStamp
} from '~/utils/workforce/week-grid'
import { weekRange } from '~/utils/workforce/week-range'

// Putting a shift on the schedule — endpoint 18 and the ETag/If-Match discipline that guards it.
//
// The load-bearing case here is TWO MANAGERS ON ONE WEEK, which is ordinary rather than exotic. The
// tests below drive the server's actual refusal document and pin what the surface may and may not do
// with it: never resubmit against the checksum the refusal handed back, never quietly re-read and
// overwrite, never leave the grid showing a shift that was not written.

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026
const TUESDAY = WEEK.days[1].isoDate // 2026-07-28
const WEDNESDAY = WEEK.days[2].isoDate

const ANNA = '11111111-1111-1111-1111-111111111111'
const ROLE_COOK = '33333333-3333-3333-3333-333333333333'

describe('endpoint 18 — the batch assignment write', () => {
  const originalFetch = global.fetch
  const originalCrypto = global.crypto

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  const service = () => new WorkforceScheduleService({ bearerToken: 'tok-123' })

  beforeEach(() => { global.crypto = { randomUUID: () => 'idem-key' } })
  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  test('PUTs the literal `assignments:batch` route with both preconditions', async () => {
    respondWith(200, { view: 'draft', assignments: [] })
    await service().BatchAssignments(42, 'rev-1', 'abc123', { assignments: [{ delete: false }] })

    const [url, init] = global.fetch.mock.calls[0]
    // The colon is a path segment the controller routes on, not an escape — encoding it 404s.
    expect(url).toBe('/workforce/stores/42/schedules/rev-1/assignments:batch')
    expect(init.method).toBe('PUT')
    // Both preconditions, on one request: the surface rejects a mutation without either.
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    expect(init.headers['If-Match']).toBe('"abc123"')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    expect(JSON.parse(init.body)).toEqual({ assignments: [{ delete: false }] })
  })

  test('a fresh Idempotency-Key per call — the key is hashed WITH the If-Match, so reuse is a 409', async () => {
    let n = 0
    global.crypto = { randomUUID: () => 'key-' + (++n) }

    respondWith(200, {})
    await service().BatchAssignments(42, 'rev-1', 'etag-1', { assignments: [] })
    respondWith(200, {})
    await service().BatchAssignments(42, 'rev-1', 'etag-2', { assignments: [] })

    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('key-2')
    expect(n).toBe(2)
  })

  // The exact document `WorkforceProblemException.StaleRevision` renders.
  test('a stale write arrives typed, and the client does not retry it', async () => {
    respondWith(409, {
      type: 'https://okam.no/problems/workforce/stale-revision',
      title: 'Conflict',
      status: 409,
      detail: 'The submitted base revision is stale; the resource has since changed.',
      code: 'workforce.stale-revision',
      conflictKind: 'stale-revision',
      aggregateId: 'rev-1',
      submittedBaseRevision: 'mine',
      currentRevision: 'theirs',
      changedFieldPaths: [],
      retryable: true,
      latestResourceRef: 'workforce/stores/42/schedules/rev-1'
    })

    expect.assertions(5)
    try {
      await service().BatchAssignments(42, 'rev-1', 'mine', { assignments: [] })
    } catch (e) {
      expect(isWorkforceApiError(e)).toBe(true)
      expect(e.status).toBe(409)
      expect(e.conflictKind).toBe('stale-revision')
      expect(e.code).toBe('workforce.stale-revision')
      // `retryable:true` describes the OPERATION, not this request. One call went out and one only.
      expect(global.fetch).toHaveBeenCalledTimes(1)
    }
  })

  test('a published revision refuses the edit as its own kind, not as a stale one', async () => {
    respondWith(409, {
      status: 409,
      detail: 'The revision is published and immutable; create a successor draft to make changes.',
      code: 'workforce.revision-not-editable',
      conflictKind: 'revision-not-editable',
      aggregateId: 'rev-1',
      retryable: false
    })

    expect.assertions(2)
    try {
      await service().BatchAssignments(42, 'rev-1', 'abc', { assignments: [] })
    } catch (e) {
      expect(e.conflictKind).toBe('revision-not-editable')
      expect(e.retryable).toBe(false)
    }
  })

  // 422, and the field is on the problem document rather than guessed from the detail prose.
  test('a domain-invalid item comes back as a typed 422 naming the field', async () => {
    respondWith(422, {
      status: 422,
      detail: 'The breaks do not fit inside the assignment.',
      code: 'workforce.assignment-invalid',
      conflictKind: 'assignment-invalid',
      itemIndex: 0,
      field: 'breaks',
      retryable: false
    })

    expect.assertions(3)
    try {
      await service().BatchAssignments(42, 'rev-1', 'abc', { assignments: [] })
    } catch (e) {
      expect(e.status).toBe(422)
      expect(e.conflictKind).toBe('assignment-invalid')
      expect(e.problem.field).toBe('breaks')
    }
  })
})

describe('the If-Match token', () => {
  // Newtonsoft camel-cases `ETag` to `eTag`, not `etag`: the strategy lowercases the leading run of
  // capitals only up to the one followed by a lowercase letter.
  test('is read off the body as `eTag`', () => {
    expect(readETag({ eTag: 'abc' })).toBe('abc')
  })

  test('is null rather than empty when the response carries none', () => {
    expect(readETag({})).toBeNull()
    expect(readETag(null)).toBeNull()
    expect(readETag({ eTag: '' })).toBeNull()
  })

  test('is withheld when no revision resolved — a placeholder checksum is not a base state', () => {
    // The range read answers `Sha256Hex("empty")` for a week with no revision. Echoing it would
    // assert a base state that does not exist.
    const grid = buildWeekGrid({
      days: WEEK.days,
      range: { view: 'draft', scheduleRevisionId: null, eTag: '2e1cfa82b035c26cbbbdae632cea07051', assignments: [] }
    })
    expect(grid.dataState).toBe('no-plan')
    expect(grid.etag).toBeNull()
  })

  test('is carried on the grid when a revision did resolve', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([], 'sha-1') })
    expect(grid.etag).toBe('sha-1')
    expect(grid.scheduleRevisionId).toBe('rev-1')
  })
})

function shiftRow (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleId: ROLE_COOK,
    roleName: 'Kokk',
    startsUtc: TUESDAY + 'T06:00:00',
    endsUtc: TUESDAY + 'T14:00:00',
    localBusinessDate: TUESDAY + 'T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 10,
    unpaidBreakMinutes: 30,
    note: 'Bar',
    state: 'Draft'
  }, over)
}

function draftRange (assignments, etag, over) {
  return Object.assign({
    view: 'draft',
    scheduleRevisionId: 'rev-1',
    revisionNumber: 2,
    state: 'Draft',
    timeZoneId: OSLO,
    asOfUtc: '2026-07-29T09:00:00Z',
    eTag: etag || 'sha-1',
    assignments,
    cost: null
  }, over)
}

const firstShift = range => buildWeekGrid({ days: WEEK.days, range }).rows[0].cells[1].shifts[0]

describe('what a shift carries so it can be edited', () => {
  test('the breaks survive the round trip — an item is a full replace, not a patch', () => {
    const shift = firstShift(draftRange([shiftRow()]))
    expect(shift.paidBreakMinutes).toBe(10)
    expect(shift.unpaidBreakMinutes).toBe(30)
  })

  test('the wall clock is the STORE zone, from the offset the server stamped', () => {
    const shift = firstShift(draftRange([shiftRow()]))
    // 06:00Z at +120 is 08:00 in Oslo.
    expect(shift.startWall).toBe(TUESDAY + 'T08:00:00')
    expect(shift.endWall).toBe(TUESDAY + 'T16:00:00')
    expect(shift.start).toBe('08:00')
  })

  // The batch response mixes the two serialisations on ONE document: a row this edit created is
  // `DateTimeKind.Utc` and carries a `Z`; a row loaded from the column is `Unspecified` and does not.
  test('a bare stamp and a Z stamp for the same instant place identically', () => {
    const bare = firstShift(draftRange([shiftRow()]))
    const zed = firstShift(draftRange([shiftRow({
      startsUtc: TUESDAY + 'T06:00:00Z',
      endsUtc: TUESDAY + 'T14:00:00Z'
    })]))
    expect(zed.startWall).toBe(bare.startWall)
    expect(zed.start).toBe('08:00')
  })

  test('an overnight shift stays on its business date and says it crosses midnight', () => {
    const shift = firstShift(draftRange([shiftRow({
      startsUtc: TUESDAY + 'T20:00:00',
      endsUtc: WEDNESDAY + 'T00:30:00'
    })]))
    expect(shift.crossesMidnight).toBe(true)
    expect(shift.startWall).toBe(TUESDAY + 'T22:00:00')
    expect(shift.endWall).toBe(WEDNESDAY + 'T02:30:00')
  })

  test('an unusable instant pair yields no wall clock rather than a fabricated one', () => {
    const shift = firstShift(draftRange([shiftRow({ startsUtc: null, endsUtc: null })]))
    expect(shift.startWall).toBeNull()
    expect(shift.endWall).toBeNull()
    expect(wallClockStamp(null, 120)).toBeNull()
  })
})

describe('the payload a manager builds', () => {
  const base = { dayKey: TUESDAY, start: '08:00', end: '16:00' }

  test('times are STORE-LOCAL wall clock, never UTC', () => {
    // Sending the UTC instant instead would move the shift a whole offset AND file it under the
    // wrong business date, since the server takes the business date from the submitted start.
    const input = toAssignmentInput(Object.assign({ staffMemberId: ANNA }, base))
    expect(input.localStart).toBe(TUESDAY + 'T08:00:00')
    expect(input.localEnd).toBe(TUESDAY + 'T16:00:00')
    expect(input.localStart).not.toMatch(/Z$/)
  })

  test('an end that is not after the start rolls to the NEXT local date', () => {
    const input = toAssignmentInput(Object.assign({}, base, { start: '22:00', end: '02:00' }))
    expect(input.localStart).toBe(TUESDAY + 'T22:00:00')
    expect(input.localEnd).toBe(WEDNESDAY + 'T02:00:00')
  })

  test('a null person IS the open shift, not a missing value', () => {
    expect(toAssignmentInput(Object.assign({ staffMemberId: null }, base)).staffMemberId).toBeNull()
  })

  test('a create carries no id — the server mints it and only the response knows it', () => {
    const input = toAssignmentInput(base)
    expect(input.shiftAssignmentId).toBeNull()
    expect(input.delete).toBe(false)
  })

  test('a removal is a delete flag on an existing id', () => {
    expect(toDeleteInput('a1')).toEqual({ shiftAssignmentId: 'a1', delete: true })
  })

  // The one case the server consults an explicit offset for is a wall time that occurs twice.
  test('the stored fold offset is echoed only while the wall clock is unchanged', () => {
    const shift = firstShift(draftRange([shiftRow()]))

    const untouched = toAssignmentInput({
      shiftAssignmentId: shift.id,
      dayKey: TUESDAY,
      start: '08:00',
      end: '16:00',
      current: shift
    })
    expect(untouched.startOffsetMinutes).toBe(120)
    expect(untouched.endOffsetMinutes).toBe(120)

    // Moved: the offset would now be a guess about which of the fold's two hours was meant, so it is
    // dropped and the server asks rather than picking one.
    const moved = toAssignmentInput({
      shiftAssignmentId: shift.id,
      dayKey: WEDNESDAY,
      start: '08:00',
      end: '16:00',
      current: shift
    })
    expect(moved.startOffsetMinutes).toBeNull()
    expect(moved.endOffsetMinutes).toBeNull()
  })

  test('a half-typed time is not a payload', () => {
    expect(isAuthorable({ dayKey: TUESDAY, start: '08:00', end: '16:00' })).toBe(true)
    expect(isAuthorable({ dayKey: TUESDAY, start: '8:0', end: '16:00' })).toBe(false)
    expect(isAuthorable({ dayKey: TUESDAY, start: '', end: '16:00' })).toBe(false)
    expect(isAuthorable({ dayKey: null, start: '08:00', end: '16:00' })).toBe(false)
    // Equal endpoints are not a zero-length shift the server would accept; it refuses them.
    expect(isAuthorable({ dayKey: TUESDAY, start: '08:00', end: '08:00' })).toBe(false)
  })

  test('no field of the payload is money', () => {
    const input = toAssignmentInput(Object.assign({ staffMemberId: ANNA, roleId: ROLE_COOK }, base))
    expect(Object.keys(input).sort()).toEqual([
      'delete', 'endOffsetMinutes', 'localEnd', 'localStart', 'note', 'paidBreakMinutes',
      'roleId', 'shiftAssignmentId', 'staffMemberId', 'startOffsetMinutes', 'unpaidBreakMinutes'
    ])
  })
})

// ---------------------------------------------------------------------------------------------
// The affordance itself. The grid emits INTENT and performs nothing — no request, no optimistic
// chip — so a refused write cannot leave a shift on screen that was never written.
// ---------------------------------------------------------------------------------------------

const { mount } = require('@vue/test-utils')
const WorkforceWeekGrid = require('~/components/admin/workforce/WorkforceWeekGrid.vue').default
const translations = require('~/translations').default

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function renderGrid (options) {
  const opts = options || {}
  const grid = buildWeekGrid({
    days: WEEK.days,
    range: opts.range === undefined ? draftRange([shiftRow()]) : opts.range,
    staff: [{ staffMemberId: ANNA, displayName: 'Anna Haugen', isActive: true }],
    markers: []
  })
  return mount(WorkforceWeekGrid, {
    propsData: {
      grid,
      currency: 'NOK',
      canAuthor: opts.canAuthor !== false,
      busy: !!opts.busy
    },
    mocks: { $i, priceLabel: minor => 'kr ' + minor, wholeAmount: m => String(m), fractionAmount: () => '00' }
  })
}

describe('the week grid as an authoring surface', () => {
  test('offers a create affordance in every cell of every row, including the open row', () => {
    const wrapper = renderGrid()
    // Seven days × (the open row + Anna's row).
    expect(wrapper.findAll('.wf-grid__add')).toHaveLength(14)
  })

  test('draws no affordance at all when the week may not be written to', () => {
    const wrapper = renderGrid({ canAuthor: false })
    expect(wrapper.findAll('.wf-grid__add')).toHaveLength(0)
    // Still the plain span it always was, so the tooltip carrying the paid time, the note and the
    // clash sentences survives a week that merely cannot be edited.
    expect(wrapper.find('.wf-grid__shift').element.tagName).toBe('SPAN')
    expect(wrapper.find('.wf-grid__shift').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.wf-grid__shift').attributes('title')).toContain('Betalt tid')
    expect(wrapper.find('.wf-grid__shift').attributes('draggable')).toBe('false')
  })

  test('the plus button names the row and the day it was pressed in', () => {
    const wrapper = renderGrid()
    // Row 1 is Anna (the open row is drawn first), column index 2 is Wednesday.
    wrapper.findAll('tbody tr').at(1).findAll('.wf-grid__add').at(2).trigger('click')

    expect(wrapper.emitted().create[0][0]).toEqual({
      isoDate: WEDNESDAY,
      staffMemberId: ANNA,
      isOpenRow: false,
      rowName: 'Anna Haugen'
    })
  })

  test('the open row creates an UNASSIGNED shift — a null person, not a missing one', () => {
    const wrapper = renderGrid()
    wrapper.findAll('tbody tr').at(0).findAll('.wf-grid__add').at(0).trigger('click')
    expect(wrapper.emitted().create[0][0].staffMemberId).toBeNull()
    expect(wrapper.emitted().create[0][0].isOpenRow).toBe(true)
  })

  test('a chip opens the editor for that shift on that day', () => {
    const wrapper = renderGrid()
    wrapper.find('.wf-grid__shift').trigger('click')

    const event = wrapper.emitted().edit[0][0]
    expect(event.shift.id).toBe('a1')
    expect(event.isoDate).toBe(TUESDAY)
  })

  test('dragging a chip onto another cell asks for a move, with the target coordinates', () => {
    const wrapper = renderGrid()
    const shiftChip = wrapper.find('.wf-grid__shift')
    shiftChip.trigger('dragstart')

    const target = wrapper.findAll('tbody tr').at(1).findAll('.wf-grid__cell').at(4)
    target.trigger('dragover')
    target.trigger('drop')

    const event = wrapper.emitted().move[0][0]
    expect(event.shift.id).toBe('a1')
    expect(event.isoDate).toBe(WEEK.days[4].isoDate)
    expect(event.staffMemberId).toBe(ANNA)
  })

  test('dropping on the open row is how a shift is unassigned', () => {
    const wrapper = renderGrid()
    wrapper.find('.wf-grid__shift').trigger('dragstart')

    const openCell = wrapper.findAll('tbody tr').at(0).findAll('.wf-grid__cell').at(1)
    openCell.trigger('dragover')
    openCell.trigger('drop')

    expect(wrapper.emitted().move[0][0].staffMemberId).toBeNull()
    expect(wrapper.emitted().move[0][0].isOpenRow).toBe(true)
  })

  test('a drop with nothing being dragged asks for nothing', () => {
    const wrapper = renderGrid()
    wrapper.findAll('.wf-grid__cell').at(3).trigger('drop')
    expect(wrapper.emitted().move).toBeUndefined()
  })

  // While a write is in flight the grid is inert: a second, racing edit would be sent against an
  // If-Match the first one is about to replace.
  test('a write in flight closes every affordance', () => {
    const wrapper = renderGrid({ busy: true })
    wrapper.find('.wf-grid__shift').trigger('dragstart')
    const target = wrapper.findAll('.wf-grid__cell').at(3)
    target.trigger('dragover')
    target.trigger('drop')

    expect(wrapper.emitted().move).toBeUndefined()
    expect(wrapper.find('.wf-grid__add').attributes('disabled')).toBe('disabled')
  })

  test('an empty week is still authorable — day one at a venue is the whole point', () => {
    const wrapper = renderGrid({ range: draftRange([]) })
    expect(wrapper.findAll('.wf-grid__add')).toHaveLength(14)
    expect(wrapper.findAll('.wf-grid__shift')).toHaveLength(0)
  })
})
