import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceSchedulePage from '~/pages/admin/workforce-schedule.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// The AUTHORING surface, driven end to end through the page: what a manager can put on the schedule,
// what the server is asked for, and — the load-bearing part — what happens when two managers edit the
// same week. The concurrency case is the ordinary one at a venue with more than one planner, so the
// refusal is driven with the document the backend actually renders rather than a stand-in.

const calls = []
let mockBatchResult = null
let mockRangeBody = null

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    ListStaff () { calls.push(['ListStaff']); return Promise.resolve(staffRoster()) }
    ListRoles () { calls.push(['ListRoles']); return Promise.resolve(roleList()) }
    GetExternalCommitments () { calls.push(['GetExternalCommitments']); return Promise.resolve({ items: [], timeZoneId: 'Europe/Oslo' }) }

    GetRange (_storeId, from, to, view) {
      calls.push(['GetRange', from, to, view])
      return Promise.resolve(mockRangeBody || { view, assignments: [] })
    }

    BatchAssignments (storeId, revisionId, etag, request) {
      calls.push(['BatchAssignments', storeId, revisionId, etag, request])
      return typeof mockBatchResult === 'function' ? mockBatchResult() : Promise.resolve(mockBatchResult)
    }
  }
}))

// The absence markers moved to the requests client with the decision inbox. Mocked so the page's
// reads stay hermetic.
jest.mock('~/utils/workforce/requests-client', () => ({
  WorkforceRequestsService: class {
    ListRequests () { calls.push(['ListRequests']); return Promise.resolve({ items: [] }) }
  }
}))

const ANNA = '11111111-1111-1111-1111-111111111111'
const BJORN = '22222222-2222-2222-2222-222222222222'
const ROLE_COOK = '33333333-3333-3333-3333-333333333333'

const staffRoster = () => [
  { staffMemberId: ANNA, displayName: 'Anna Haugen', isActive: true },
  { staffMemberId: BJORN, displayName: 'Bjørn Ek', isActive: true }
]
const roleList = () => [{ roleId: ROLE_COOK, name: 'Kokk' }]

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// The real Norwegian dictionary, so a missing key fails the test rather than rendering its own name.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function mountPage () {
  return shallowMount(WorkforceSchedulePage, {
    mocks: {
      $i,
      priceLabel: minor => 'kr ' + minor,
      formatDate: value => String(value),
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

// A draft week holding one of Anna's shifts, priced. The chips and the totals are deliberately made
// to DISAGREE by an øre, which is exactly the backend's rounding law: each shift rounds once, and the
// day and the week round once over the UNROUNDED sum. Anything that adds the chips shows 100 001.
function shiftRow (dayKey, over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleId: ROLE_COOK,
    roleName: 'Kokk',
    startsUtc: dayKey + 'T06:00:00',
    endsUtc: dayKey + 'T14:00:00',
    localBusinessDate: dayKey + 'T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 10,
    unpaidBreakMinutes: 30,
    note: 'Bar',
    state: 'Draft'
  }, over)
}

function totals (over) {
  return Object.assign({
    costComplete: true,
    totalMinor: 0,
    currency: 'NOK',
    incompleteCode: null,
    incompleteDetail: null,
    pricedShiftCount: 0,
    unpricedShiftCount: 0,
    openShiftCount: 0,
    openShiftMinutes: 0
  }, over)
}

function draft (dayKey, over) {
  return Object.assign({
    view: 'draft',
    scheduleRevisionId: 'rev-1',
    revisionNumber: 2,
    state: 'Draft',
    timeZoneId: 'Europe/Oslo',
    asOfUtc: '2026-07-29T09:00:00Z',
    eTag: 'sha-mine',
    assignments: [shiftRow(dayKey)],
    cost: Object.assign(totals({ totalMinor: 100000, pricedShiftCount: 1 }), {
      days: [Object.assign(totals({ totalMinor: 100000, pricedShiftCount: 1 }), {
        localBusinessDate: dayKey + 'T00:00:00',
        shifts: [{ shiftAssignmentId: 'a1', isOpenShift: false, costComplete: true, totalMinor: 100001, currency: 'NOK' }]
      })]
    })
  }, over)
}

// The document `WorkforceProblemException.StaleRevision` renders, verbatim in shape.
const staleRevision = () => Promise.reject(new WorkforceApiError(409, {
  type: 'https://okam.no/problems/workforce/stale-revision',
  title: 'Conflict',
  status: 409,
  detail: 'The submitted base revision is stale; the resource has since changed.',
  code: 'workforce.stale-revision',
  conflictKind: 'stale-revision',
  aggregateId: 'rev-1',
  submittedBaseRevision: 'sha-mine',
  currentRevision: 'sha-theirs',
  changedFieldPaths: [],
  retryable: true,
  latestResourceRef: 'workforce/stores/42/schedules/rev-1'
}))

const batchCalls = () => calls.filter(c => c[0] === 'BatchAssignments')

async function pageWithDraft () {
  const wrapper = mountPage()
  await settled()
  mockRangeBody = draft(wrapper.vm.week.days[1].isoDate)
  await wrapper.vm.load()
  await settled()
  return wrapper
}

describe('authoring — who may write, and to what', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  test('a scheduler on a resolved draft may author', async () => {
    const wrapper = await pageWithDraft()
    expect(wrapper.vm.canAuthor).toBe(true)
    expect(wrapper.vm.grid.etag).toBe('sha-mine')
  })

  // The read answers a placeholder checksum for a week with no revision. Without a real token there
  // is nothing to write against, so the affordance is withheld rather than offered and refused.
  test('no revision means no token means no authoring', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.grid.scheduleRevisionId).toBeNull()
    expect(wrapper.vm.grid.etag).toBeNull()
    expect(wrapper.vm.canAuthor).toBe(false)
  })

  test('a response with no eTag disables authoring instead of writing without a precondition', async () => {
    const wrapper = mountPage()
    await settled()
    mockRangeBody = draft(wrapper.vm.week.days[1].isoDate, { eTag: undefined })
    await wrapper.vm.load()
    expect(wrapper.vm.grid.scheduleRevisionId).toBe('rev-1')
    expect(wrapper.vm.canAuthor).toBe(false)
  })

  // The backend answers `workforce.revision-not-editable` for a published revision; the UI agrees
  // with that rule up front rather than discovering it through the 409.
  test('the published view is frozen', async () => {
    const wrapper = await pageWithDraft()
    wrapper.setData({ view: 'published' })
    expect(wrapper.vm.canAuthor).toBe(false)
  })

  test('a published revision is frozen even if it somehow reached the draft view', async () => {
    const wrapper = await pageWithDraft()
    wrapper.setData({ range: draft(wrapper.vm.week.days[1].isoDate, { state: 'Published' }) })
    expect(wrapper.vm.canAuthor).toBe(false)
  })

  test('a caller without the scheduler capability may not author', async () => {
    const wrapper = await pageWithDraft()
    wrapper.setData({ capabilities: ['WorkforceManager'] })
    expect(wrapper.vm.canAuthor).toBe(false)
  })

  test('the month pivot spans several revisions, so it authors none', async () => {
    const wrapper = await pageWithDraft()
    wrapper.setData({ pivot: 'month' })
    expect(wrapper.vm.canAuthor).toBe(false)
    expect(wrapper.vm.canAuthorHere).toBe(false)
  })
})

describe('authoring — the five things a manager can now do', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  test('create: an empty cell becomes one shift, sent with the week\'s own token', async () => {
    const wrapper = await pageWithDraft()
    const day = wrapper.vm.week.days[2].isoDate

    wrapper.vm.openCreate({ isoDate: day, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00', unpaidBreakMinutes: 30 })

    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate, { eTag: 'sha-next' })
    await wrapper.vm.saveShift()

    const [, storeId, revisionId, etag, body] = batchCalls()[0]
    expect(storeId).toBe(42)
    expect(revisionId).toBe('rev-1')
    expect(etag).toBe('sha-mine')
    expect(body.assignments).toEqual([{
      shiftAssignmentId: null,
      delete: false,
      staffMemberId: BJORN,
      roleId: null,
      localStart: day + 'T10:00:00',
      localEnd: day + 'T18:00:00',
      startOffsetMinutes: null,
      endOffsetMinutes: null,
      paidBreakMinutes: 0,
      unpaidBreakMinutes: 30,
      note: null
    }])
    // The next write uses the token the WRITE answered — no extra read to get it.
    expect(wrapper.vm.grid.etag).toBe('sha-next')
    expect(wrapper.vm.editor).toBeNull()
  })

  test('assign: an open cell can be created straight onto a person, or left open', async () => {
    const wrapper = await pageWithDraft()
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[3].isoDate, staffMemberId: null, isOpenRow: true })
    expect(wrapper.vm.editor.staffMemberId).toBeNull()

    Object.assign(wrapper.vm.editor, { start: '09:00', end: '17:00' })
    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate)
    await wrapper.vm.saveShift()
    expect(batchCalls()[0][4].assignments[0].staffMemberId).toBeNull()
  })

  test('move: a drop changes the day and the person, and nothing else', async () => {
    const wrapper = await pageWithDraft()
    const shift = wrapper.vm.grid.rows[0].cells[1].shifts[0]
    const target = wrapper.vm.week.days[4].isoDate

    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate)
    await wrapper.vm.moveShift({ shift, isoDate: target, staffMemberId: BJORN, isOpenRow: false })

    expect(batchCalls()[0][4].assignments[0]).toEqual({
      shiftAssignmentId: 'a1',
      delete: false,
      staffMemberId: BJORN,
      roleId: ROLE_COOK,
      localStart: target + 'T08:00:00',
      localEnd: target + 'T16:00:00',
      // The clock moved to a different day, so the stored fold offset would be a guess.
      startOffsetMinutes: null,
      endOffsetMinutes: null,
      // Carried, not defaulted: the item is a full replace, and a dropped break would lengthen the
      // paid time — and the wage the backend prices from it.
      paidBreakMinutes: 10,
      unpaidBreakMinutes: 30,
      note: 'Bar'
    })
  })

  test('unassign: dropping on the open row takes the person off the shift', async () => {
    const wrapper = await pageWithDraft()
    const shift = wrapper.vm.grid.rows[0].cells[1].shifts[0]

    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate)
    await wrapper.vm.moveShift({ shift, isoDate: shift.startWall.slice(0, 10), staffMemberId: null, isOpenRow: true })

    expect(batchCalls()[0][4].assignments[0].staffMemberId).toBeNull()
    expect(batchCalls()[0][4].assignments[0].shiftAssignmentId).toBe('a1')
  })

  test('delete: a removal references the existing id and carries no times', async () => {
    const wrapper = await pageWithDraft()
    const shift = wrapper.vm.grid.rows[0].cells[1].shifts[0]
    wrapper.vm.openEdit({ shift, isoDate: wrapper.vm.week.days[1].isoDate })

    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate, { assignments: [] })
    await wrapper.vm.deleteShift()

    expect(batchCalls()[0][4].assignments).toEqual([{ shiftAssignmentId: 'a1', delete: true }])
  })

  test('editing an existing shift keeps its breaks and its resolved fold offset', async () => {
    const wrapper = await pageWithDraft()
    const shift = wrapper.vm.grid.rows[0].cells[1].shifts[0]
    wrapper.vm.openEdit({ shift, isoDate: wrapper.vm.week.days[1].isoDate })

    // Only the note changes; the clock is untouched.
    wrapper.vm.editor.note = 'Kjøkken'
    mockBatchResult = draft(wrapper.vm.week.days[1].isoDate)
    await wrapper.vm.saveShift()

    const item = batchCalls()[0][4].assignments[0]
    expect(item.paidBreakMinutes).toBe(10)
    expect(item.unpaidBreakMinutes).toBe(30)
    expect(item.startOffsetMinutes).toBe(120)
    expect(item.note).toBe('Kjøkken')
  })

  test('a shift with unusable times is not moved on a guess', async () => {
    const wrapper = await pageWithDraft()
    wrapper.setData({
      range: draft(wrapper.vm.week.days[1].isoDate, {
        assignments: [shiftRow(wrapper.vm.week.days[1].isoDate, { startsUtc: null, endsUtc: null })]
      })
    })
    const shift = wrapper.vm.grid.rows[0].cells[1].shifts[0]

    await wrapper.vm.moveShift({ shift, isoDate: wrapper.vm.week.days[3].isoDate, staffMemberId: ANNA, isOpenRow: false })
    expect(batchCalls()).toHaveLength(0)
    expect(wrapper.vm.toast.type).toBe('error')
  })

  // The role axis is not read on every load of the employee pivot — only once a shift is authored.
  test('the role list is fetched lazily, when the editor opens', async () => {
    const wrapper = await pageWithDraft()
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(0)

    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: ANNA, isOpenRow: false })
    await settled()
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(1)
    expect(wrapper.vm.rolesKnown).toBe(true)
  })
})

describe('the money law survives a write', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  test('the week total is the response\'s own node, not the sum of the chips', async () => {
    const wrapper = await pageWithDraft()
    const day = wrapper.vm.week.days[1].isoDate

    // The response prices the week at 100 000 øre while its one chip reads 100 001 — the backend's
    // rounding law made visible. Only the node is true.
    mockBatchResult = draft(day, { eTag: 'sha-next' })
    wrapper.vm.openCreate({ isoDate: day, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.grid.totals.cost.totalMinor).toBe(100000)
    expect(wrapper.vm.grid.rows[0].cells[1].shifts[0].cost.totalMinor).toBe(100001)
    // And no total was manufactured for the row, where the API states none.
    expect(wrapper.vm.grid.rows[0].totals.cost).toBeNull()
  })

  test('the totals come from the write itself — no second read is issued to find them', async () => {
    const wrapper = await pageWithDraft()
    const day = wrapper.vm.week.days[1].isoDate
    calls.length = 0

    mockBatchResult = draft(day, { eTag: 'sha-next', cost: Object.assign(totals({ totalMinor: 250000 }), { days: [] }) })
    wrapper.vm.openCreate({ isoDate: day, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    // A refetch would answer a LATER moment and could pair this week's footer with a set of shifts
    // nobody wrote together.
    expect(calls.filter(c => c[0] === 'GetRange')).toHaveLength(0)
    expect(wrapper.vm.grid.totals.cost.totalMinor).toBe(250000)
  })

  test('a refused write leaves every figure exactly as it was read', async () => {
    const wrapper = await pageWithDraft()
    const before = wrapper.vm.grid.totals.cost.totalMinor
    const shiftsBefore = wrapper.vm.grid.totals.shiftCount

    mockBatchResult = staleRevision
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.grid.totals.cost.totalMinor).toBe(before)
    expect(wrapper.vm.grid.totals.shiftCount).toBe(shiftsBefore)
    expect(wrapper.vm.grid.etag).toBe('sha-mine')
  })
})

// ---------------------------------------------------------------------------------------------
// TWO MANAGERS, ONE WEEK. The whole point of the If-Match.
// ---------------------------------------------------------------------------------------------

describe('a stale write', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  async function refusedSave () {
    const wrapper = await pageWithDraft()
    // Only what happens FROM HERE is under test; the setup's own reads are not evidence.
    calls.length = 0
    mockBatchResult = staleRevision
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00', note: 'Sen vakt' })
    await wrapper.vm.saveShift()
    return wrapper
  }

  test('is refused by the server and surfaced as a refusal, not a failure', async () => {
    const wrapper = await refusedSave()
    expect(wrapper.vm.staleWrite).toBe(true)
    expect(wrapper.vm.conflictHeadline).toBe('Endringen ble ikke lagret')
    // A sentence with a next step in it, not a status code.
    expect(wrapper.vm.conflictDetail).toContain('Hent uken på nytt')
    expect(wrapper.vm.conflictDetail).toContain('ikke lagret')
    expect(wrapper.vm.conflictDetail).toContain('ingenting er overskrevet')
  })

  // The refusal hands back `currentRevision` — the fresh checksum. Resubmitting against it would take
  // the other manager's week as the base for an edit written against the week they replaced: the
  // overwrite the precondition exists to prevent, performed automatically.
  test('is NOT retried, and the fresh checksum never becomes the next If-Match', async () => {
    const wrapper = await refusedSave()
    expect(batchCalls()).toHaveLength(1)
    expect(batchCalls()[0][3]).toBe('sha-mine')
    expect(wrapper.vm.grid.etag).toBe('sha-mine')

    // Even on a second, deliberate attempt: the token is still the one this page actually read, and
    // the server refuses again. Nothing anywhere adopts `currentRevision`.
    await wrapper.vm.saveShift()
    expect(batchCalls()).toHaveLength(2)
    expect(batchCalls()[1][3]).toBe('sha-mine')
    expect(wrapper.vm.staleWrite).toBe(true)
  })

  test('does not silently re-read the week and overwrite the other manager', async () => {
    const wrapper = await refusedSave()
    // No read was issued in response to the refusal. Re-reading by itself would be harmless; doing it
    // and then re-sending would not be, and neither happens without the manager asking.
    expect(calls.filter(c => c[0] === 'GetRange')).toHaveLength(0)
    expect(wrapper.vm.range.eTag).toBe('sha-mine')
  })

  test('keeps the manager\'s unsaved edit on screen', async () => {
    const wrapper = await refusedSave()
    expect(wrapper.vm.editor).not.toBeNull()
    expect(wrapper.vm.editor.note).toBe('Sen vakt')
    expect(wrapper.vm.editor.staffMemberId).toBe(BJORN)
  })

  test('does not put the unwritten shift on the grid', async () => {
    const wrapper = await refusedSave()
    const thursday = wrapper.vm.grid.rows.find(r => r.staffMemberId === BJORN).cells[2]
    expect(thursday.shifts).toEqual([])
    expect(wrapper.vm.grid.totals.shiftCount).toBe(1)
  })

  test('is resolved only by an explicit re-read, which the manager triggers', async () => {
    const wrapper = await refusedSave()
    // The other manager's week, with their token.
    mockRangeBody = draft(wrapper.vm.week.days[1].isoDate, { eTag: 'sha-theirs' })
    await wrapper.vm.reloadAfterStale()
    await settled()

    expect(calls.filter(c => c[0] === 'GetRange')).toHaveLength(1)
    expect(wrapper.vm.grid.etag).toBe('sha-theirs')
    expect(wrapper.vm.staleWrite).toBe(false)
    expect(wrapper.vm.editor).toBeNull()
    // And no write rode along with the re-read.
    expect(batchCalls()).toHaveLength(1)
  })

  test('a frozen revision and a stale one are different sentences', async () => {
    const wrapper = await pageWithDraft()
    mockBatchResult = () => Promise.reject(new WorkforceApiError(409, {
      status: 409,
      code: 'workforce.revision-not-editable',
      conflictKind: 'revision-not-editable',
      aggregateId: 'rev-1',
      retryable: false
    }))
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.staleWrite).toBe(false)
    expect(wrapper.vm.conflictHeadline).toBe('Uken er publisert')
  })

  // The write path's cross-store refusal names no store, and neither may anything downstream of it.
  test('a cross-store conflict stays opaque on the authoring path too', async () => {
    const wrapper = await pageWithDraft()
    mockBatchResult = () => Promise.reject(new WorkforceApiError(409, {
      status: 409,
      code: 'workforce.hidden-engagement-conflict',
      conflictKind: 'hidden-engagement-conflict',
      retryable: false
    }))
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.conflict.conflictingAssignmentId).toBeNull()
    expect(wrapper.vm.conflictDetail).toBe(translations.no.wf_conflict_hidden)
    expect(wrapper.vm.conflictDetail).toContain('oppgir verken butikk eller tidspunkt')
  })
})

describe('an edit and the validation receipt', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  // Editing a Validated revision sends it back to Draft server-side, so the receipt on screen was
  // produced against a revision that no longer exists.
  test('a successful edit drops the receipt, and publishing closes with it', async () => {
    const wrapper = mountPage()
    await settled()
    const day = wrapper.vm.week.days[1].isoDate
    mockRangeBody = draft(day, { state: 'Validated' })
    await wrapper.vm.load()
    await settled()
    wrapper.setData({ validation: { isValid: true, ruleResults: [] } })

    expect(wrapper.vm.canPublish).toBe(true)

    mockBatchResult = draft(day, { state: 'Draft', eTag: 'sha-next' })
    wrapper.vm.openCreate({ isoDate: day, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.validation).toBeNull()
    expect(wrapper.vm.grid.state).toBe('Draft')
    expect(wrapper.vm.canPublish).toBe(false)
  })

  test('a refused edit leaves the receipt alone — nothing changed to invalidate it', async () => {
    const wrapper = mountPage()
    await settled()
    const day = wrapper.vm.week.days[1].isoDate
    mockRangeBody = draft(day, { state: 'Validated' })
    await wrapper.vm.load()
    await settled()
    wrapper.setData({ validation: { isValid: true, ruleResults: [] } })

    mockBatchResult = staleRevision
    wrapper.vm.openCreate({ isoDate: day, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()

    expect(wrapper.vm.validation).not.toBeNull()
    expect(wrapper.vm.grid.state).toBe('Validated')
  })
})

describe('the editor is really on the page', () => {
  beforeEach(() => { calls.length = 0; mockBatchResult = null; mockRangeBody = null })

  test('renders its fields, and the day it was opened on is the day it is set to', async () => {
    const wrapper = await pageWithDraft()
    const day = wrapper.vm.week.days[2].isoDate

    expect(wrapper.find('.wf-editor').exists()).toBe(false)
    wrapper.vm.openCreate({ isoDate: day, staffMemberId: ANNA, isOpenRow: false })
    await settled()

    expect(wrapper.find('.wf-editor').exists()).toBe(true)
    expect(wrapper.findAll('.wf-editor__field')).toHaveLength(7)
    expect(wrapper.find('.wf-editor__fields select').element.value).toBe(ANNA)
    // Seven day options, one per column, so a shift cannot be placed outside the week on screen.
    expect(wrapper.findAll('.wf-editor__field').at(2).findAll('option')).toHaveLength(7)
    expect(wrapper.vm.editor.dayKey).toBe(day)
    // Nothing may be saved until the hours exist: an incomplete time is not a payload.
    expect(wrapper.vm.canSaveShift).toBe(false)
  })

  test('a new shift has no delete button — there is nothing yet to remove', async () => {
    const wrapper = await pageWithDraft()
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: ANNA, isOpenRow: false })
    await settled()
    expect(wrapper.find('.wf-page__btn--danger').exists()).toBe(false)

    wrapper.vm.openEdit({ shift: wrapper.vm.grid.rows[0].cells[1].shifts[0], isoDate: wrapper.vm.week.days[1].isoDate })
    await settled()
    expect(wrapper.find('.wf-page__btn--danger').exists()).toBe(true)
  })

  test('the refusal and its one action are rendered where the manager is looking', async () => {
    const wrapper = await pageWithDraft()
    mockBatchResult = staleRevision
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: BJORN, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '10:00', end: '18:00' })
    await wrapper.vm.saveShift()
    await settled()

    expect(wrapper.find('.wf-editor__stale').text()).toContain('Hent uken på nytt')
    // Said once, not twice: the banner above stands down while the editor carries the same refusal.
    expect(wrapper.find('.wf-page__conflict').exists()).toBe(false)
  })

  test('says which day an overnight shift will be filed under', async () => {
    const wrapper = await pageWithDraft()
    wrapper.vm.openCreate({ isoDate: wrapper.vm.week.days[2].isoDate, staffMemberId: ANNA, isOpenRow: false })
    Object.assign(wrapper.vm.editor, { start: '22:00', end: '02:00' })
    await settled()

    expect(wrapper.vm.editorCrossesMidnight).toBe(true)
    expect(wrapper.text()).toContain('hører til dagen du la den på')
  })
})
