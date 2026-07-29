import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceRatesPage from '~/pages/admin/workforce-rates.vue'
import { RATE_EMPTY, RATE_UNKNOWN } from '~/utils/workforce-rates/rate-timeline'
import { ATTENDANCE_UNKNOWN } from '~/utils/workforce-rates/attendance-view'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.

const calls = []
const behaviour = {}

// Both clients are mocked at the module, because the page builds them in computeds. Every call is
// recorded so the tests can assert WHICH reads and writes the page issues — the part of a page that
// is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    GetContext (_storeId) {
      calls.push(['GetContext', _storeId])
      if (behaviour.contextFails) { return Promise.reject(behaviour.contextFails) }
      return Promise.resolve({
        timeZone: { id: behaviour.timeZoneId === undefined ? 'Europe/Oslo' : behaviour.timeZoneId },
        capabilities: behaviour.capabilities || ['WorkforceManager', 'WorkforcePayrollApprover']
      })
    }

    ListStaff () {
      calls.push(['ListStaff'])
      return behaviour.staffFails ? Promise.reject(behaviour.staffFails) : Promise.resolve(behaviour.staff || [])
    }

    ListRoles () {
      calls.push(['ListRoles'])
      return Promise.resolve(behaviour.roles || [])
    }

    GetAttendance (_storeId, from, to) {
      calls.push(['GetAttendance', from, to])
      return behaviour.attendanceFails
        ? Promise.reject(behaviour.attendanceFails)
        : Promise.resolve(behaviour.attendance || { timeZoneId: 'Europe/Oslo', asOfUtc: '2026-09-03T11:04:00Z', rows: [] })
    }
  }
}))

jest.mock('~/utils/workforce-rates/rates-client', () => ({
  WorkforceRatesService: class {
    GetEngagementRates (_storeId, staffMemberId) {
      calls.push(['GetEngagementRates', staffMemberId])
      return behaviour.ratesFail ? Promise.reject(behaviour.ratesFail) : Promise.resolve(behaviour.rates || { storeId: 42, source: 'EngagementOverride', timeZoneId: 'Europe/Oslo', versions: [] })
    }

    GetRoleRates (_storeId, roleId) {
      calls.push(['GetRoleRates', roleId])
      return behaviour.ratesFail ? Promise.reject(behaviour.ratesFail) : Promise.resolve(behaviour.rates || { storeId: 42, source: 'EngagementOverride', timeZoneId: 'Europe/Oslo', versions: [] })
    }

    SetEngagementRate (_storeId, staffMemberId, request) {
      calls.push(['SetEngagementRate', staffMemberId, request])
      return behaviour.setFails ? Promise.reject(behaviour.setFails) : Promise.resolve({ applied: {} })
    }

    SetRoleRate (_storeId, roleId, request) {
      calls.push(['SetRoleRate', roleId, request])
      return behaviour.setFails ? Promise.reject(behaviour.setFails) : Promise.resolve({ applied: {} })
    }

    GetHoursExport (_storeId, from, to) {
      calls.push(['GetHoursExport', from, to])
      return behaviour.exportFails
        ? Promise.reject(behaviour.exportFails)
        : Promise.resolve({ text: behaviour.exportCsv || '# version=1\n# complete=true\n# rowCount=4\ncol\n', fileName: 'server-named.csv' })
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// A typed workforce failure as `api-client` constructs it, without importing the class into a file
// whose whole subject is how the page reacts to one.
const problem = (status, code, extra) => Object.assign({
  isWorkforceApiError: true, status, code, message: 'server said so', problem: { code }
}, extra)

function mountPage () {
  return shallowMount(WorkforceRatesPage, {
    mocks: {
      $i: (key, params) => (params ? key + ' ' + JSON.stringify(params) : key),
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }
})

describe('the page cannot render a store it could not resolve', () => {
  test('a 403 on the context read blocks the page with a capability message', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wfrt_no_capability')
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a context WITHOUT a timezone blocks rather than falling back to the browser\'s', async () => {
    // Every date on the page — the week, the venue's today, the day a rate starts — is the store's.
    behaviour.timeZoneId = null
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wfrt_context_failed')
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })
})

describe('the capability gate — one refusal, and no read fired behind it', () => {
  // Pay is WorkforcePayrollApprover ON TOP OF WorkforceManager, on the READ as much as the write.
  test.each([
    [['WorkforceManager']],
    [['WorkforcePayrollApprover']],
    [['WorkforceScheduler', 'WorkforceSelf']]
  ])('%p cannot read rates, and the page does not try', async (capabilities) => {
    behaviour.capabilities = capabilities
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canReadRates).toBe(false)
    expect(wrapper.find('.wfrt-page__refusal').text()).toContain('wfrt_rate_no_capability')
    // The roster reads behind the picker are not fired either — there is nothing to pick a rate for.
    expect(calls.map(c => c[0])).not.toContain('ListStaff')
    expect(calls.map(c => c[0])).not.toContain('GetEngagementRates')
  })

  // POSITIVE CONTROL: with BOTH capabilities the section renders and the reads do fire, so the
  // assertions above are about the gate rather than about a page that never loads anything.
  test('both capabilities together open the section and fire the reads', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canReadRates).toBe(true)
    expect(wrapper.find('.wfrt-page__refusal').exists()).toBe(false)
    expect(calls.map(c => c[0])).toContain('ListStaff')
    expect(calls.map(c => c[0])).toContain('ListRoles')
  })

  test('the refusal names the requirement but never which half the caller lacks', async () => {
    behaviour.capabilities = ['WorkforceManager']
    const wrapper = mountPage()
    await settled()

    const text = wrapper.find('.wfrt-page__refusal').text()
    // The server answers the same 403 either way, so the screen must not claim to know more.
    expect(text).toContain('wfrt_rate_no_capability')
    expect(text).not.toMatch(/mangler|missing/i)
  })

  test('the attendance read has its OWN gate, and a caller without it is told so', async () => {
    behaviour.capabilities = ['WorkforcePayrollApprover']
    const wrapper = mountPage()
    await settled()

    // `GET /attendance` is WorkforceManager. Without it the page does not ask — and must not then
    // render "we could not read the hours", which would be a claim about the data.
    expect(calls.map(c => c[0])).not.toContain('GetAttendance')
    expect(wrapper.text()).toContain('wfrt_att_no_capability')
  })

  test('the export is gated on its own capability, independently of the rate section', async () => {
    behaviour.capabilities = ['WorkforcePayrollApprover']
    const wrapper = mountPage()
    await settled()

    // `GetHoursExport` requires WorkforcePayrollApprover alone; the rate reads need both.
    expect(wrapper.vm.hasPayrollApprover).toBe(true)
    expect(wrapper.vm.canReadRates).toBe(false)
  })
})

describe('the rate timeline', () => {
  test('an unread scope is UNKNOWN, and stays unknown when the read fails', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    behaviour.ratesFail = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.timeline.state).toBe(RATE_UNKNOWN)

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.loadTimeline()
    await settled()

    // A failed read must never spend a frame claiming this person has no rate.
    expect(wrapper.vm.timeline.state).toBe(RATE_UNKNOWN)
    expect(wrapper.vm.timeline.state).not.toBe(RATE_EMPTY)
  })

  test('a successful read of an empty timeline is EMPTY, which is the other claim', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.loadTimeline()
    expect(wrapper.vm.timeline.state).toBe(RATE_EMPTY)
    expect(calls).toContainEqual(['GetEngagementRates', 'sm-1'])
  })

  test('the role tab reads the ROLE route, not the staff one', async () => {
    behaviour.roles = [{ roleId: 'role-9', name: 'Kokk' }]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.selectScopeKind('role')
    wrapper.vm.scopeId = 'role-9'
    await wrapper.vm.loadTimeline()

    expect(calls).toContainEqual(['GetRoleRates', 'role-9'])
    expect(calls.map(c => c[0])).not.toContain('GetEngagementRates')
  })

  test('switching scope kind clears the previous scope\'s timeline rather than carrying it over', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    behaviour.rates = { storeId: 42, timeZoneId: 'Europe/Oslo', versions: [{ rateVersionId: 'rv-1', effectiveFromLocalDate: '2026-09-01', effectiveFromUtc: '2026-08-31T22:00:00', effectiveToUtc: null, hourlyRateMinor: 23550, currency: 'NOK' }] }
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.loadTimeline()
    expect(wrapper.vm.timeline.rows.length).toBe(1)

    wrapper.vm.selectScopeKind('role')
    expect(wrapper.vm.scopeId).toBeNull()
    expect(wrapper.vm.timeline.state).toBe(RATE_UNKNOWN)
  })

  test('an ENDED engagement and a RETIRED role are listed but marked, never silently current', async () => {
    behaviour.staff = [
      { staffMemberId: 'sm-1', displayName: 'Ida Berg', isActive: true },
      { staffMemberId: 'sm-2', displayName: 'Jonas Lie', isActive: false }
    ]
    // `effectiveToUtc` arrives BARE off the column, as every stamp on these surfaces does.
    behaviour.roles = [
      { roleId: 'role-1', name: 'Kokk', effectiveToUtc: null },
      { roleId: 'role-2', name: 'Oppvask', effectiveToUtc: '2020-01-01T00:00:00' }
    ]
    const wrapper = mountPage()
    await settled()

    // The rate timeline of an ended engagement is still worth reading, so it is marked, not hidden.
    expect(wrapper.vm.scopeOptions.map(o => o.label))
      .toEqual(['Ida Berg', 'wfrt_scope_ended {"label":"Jonas Lie"}'])

    wrapper.vm.selectScopeKind('role')
    expect(wrapper.vm.scopeOptions.map(o => o.label))
      .toEqual(['Kokk', 'wfrt_scope_ended {"label":"Oppvask"}'])
  })

  test('a scope list that failed to load is null — not an empty picker', async () => {
    behaviour.staffFails = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.staff).toBeNull()
    expect(wrapper.vm.scopeOptions).toBeNull()
    expect(wrapper.find('.wfrt-page__scope-unknown').exists()).toBe(true)
    expect(wrapper.find('.wfrt-page__scope-empty').exists()).toBe(false)
  })

  // POSITIVE CONTROL for the line above: a store that genuinely has nobody reaches the other branch.
  test('and a store that genuinely has nobody says exactly that', async () => {
    behaviour.staff = []
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.scopeOptions).toEqual([])
    expect(wrapper.find('.wfrt-page__scope-empty').exists()).toBe(true)
    expect(wrapper.find('.wfrt-page__scope-unknown').exists()).toBe(false)
  })
})

describe('stating a rate', () => {
  const statement = { effectiveFromLocalDate: '2026-10-01', hourlyRateMinor: 25000, currency: 'NOK' }

  test('the statement reaches the append route unchanged, and the timeline is re-read', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.setRate(statement)
    await settled()

    expect(calls).toContainEqual(['SetEngagementRate', 'sm-1', statement])
    // The date is still a calendar date at the page boundary — nothing here converted it.
    expect(typeof statement.effectiveFromLocalDate).toBe('string')
    // The timeline is re-read afterwards, so what is on screen is what the server now holds.
    expect(calls.filter(c => c[0] === 'GetEngagementRates').length).toBe(1)
  })

  test('the 409 marks the statement already in force and re-reads the timeline', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    behaviour.setFails = problem(409, 'workforce.rate-version-exists', { aggregateId: 'rv-77', retryable: false })
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.setRate(statement)
    await settled()

    expect(wrapper.vm.conflictRateVersionId).toBe('rv-77')
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.toast.message).toBe('wfrt_rate_conflict_toast')
    // Somebody else may have appended the colliding statement since this page loaded.
    expect(calls.filter(c => c[0] === 'GetEngagementRates').length).toBe(1)
  })

  test('a 403 on the write reports the same undisclosing refusal as the read', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    behaviour.setFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    await wrapper.vm.setRate(statement)

    expect(wrapper.vm.toast.message).toBe('wfrt_rate_no_capability')
    expect(wrapper.vm.conflictRateVersionId).toBeNull()
  })

  test('a previous conflict is cleared before the next attempt', async () => {
    behaviour.staff = [{ staffMemberId: 'sm-1', displayName: 'Ida Berg' }]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.scopeId = 'sm-1'
    wrapper.vm.conflictRateVersionId = 'rv-77'
    await wrapper.vm.setRate(statement)

    expect(wrapper.vm.conflictRateVersionId).toBeNull()
  })
})

describe('THE two units on one page', () => {
  // The attendance read takes UTC INSTANTS and the hours export takes the venue's CALENDAR DATES.
  // Mixing them is a 400 or, worse, a silently different window — so this asserts the page sends
  // each endpoint its own shape, and that the two shapes are provably different.
  test('attendance is asked in instants; the export is asked in calendar dates', async () => {
    const wrapper = mountPage()
    await settled()

    const attendance = calls.find(c => c[0] === 'GetAttendance')
    expect(attendance[1]).toBeInstanceOf(Date)
    expect(attendance[2]).toBeInstanceOf(Date)

    await wrapper.vm.runExport()
    const exported = calls.find(c => c[0] === 'GetHoursExport')
    expect(typeof exported[1]).toBe('string')
    expect(exported[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(exported[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // The control that makes those regexes mean something: an instant would carry a time.
    expect(exported[1]).not.toMatch(/T\d{2}:/)
    expect(attendance[1].toISOString()).toMatch(/T\d{2}:/)
  })

  test('the attendance window is the STORE\'s week, and stepping moves it', async () => {
    const wrapper = mountPage()
    await settled()

    const first = calls.find(c => c[0] === 'GetAttendance')
    // A whole ISO week: Monday 00:00 store-local to the following Monday 00:00.
    expect(first[2].getTime() - first[1].getTime()).toBe(7 * 86400000)

    await wrapper.vm.stepWeek(-1)
    const second = calls.filter(c => c[0] === 'GetAttendance')[1]
    expect(first[1].getTime() - second[1].getTime()).toBe(7 * 86400000)
  })

  test('the export range defaults to the VENUE\'s fortnight and does not move with the week grid', async () => {
    const wrapper = mountPage()
    await settled()

    const seededFrom = wrapper.vm.exportFrom
    const seededTo = wrapper.vm.exportTo
    expect(seededFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(wrapper.vm.exportRangeError).toBeNull()

    await wrapper.vm.stepWeek(-4)
    expect(wrapper.vm.exportFrom).toBe(seededFrom)
    expect(wrapper.vm.exportTo).toBe(seededTo)
  })

  test('a failed attendance read leaves the table UNKNOWN, never empty', async () => {
    behaviour.attendanceFails = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.attendance.state).toBe(ATTENDANCE_UNKNOWN)
    expect(wrapper.vm.toast.type).toBe('error')
  })
})

describe('the hours export', () => {
  test('the returned file is parsed from the SERVER\'s preamble', async () => {
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.runExport()
    expect(wrapper.vm.exportResult.meta.complete).toBe(true)
    expect(wrapper.vm.exportResult.meta.rowCount).toBe(4)
    expect(wrapper.vm.exportResult.fileName).toBe('server-named.csv')
  })

  test('a name the server did not expose falls back to a local one built from the request', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm._ratesService.GetHoursExport = (_storeId, from, to) => {
      calls.push(['GetHoursExport', from, to])
      return Promise.resolve({ text: '# version=1\ncol\n', fileName: null })
    }

    await wrapper.vm.runExport()
    expect(wrapper.vm.exportResult.fileName)
      .toBe('okam-hours-42-' + wrapper.vm.exportFrom + '-' + wrapper.vm.exportTo + '.csv')
  })

  test('an invalid range never reaches the network', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.exportTo = wrapper.vm.exportFrom
    wrapper.vm.exportFrom = '2027-01-01'
    expect(wrapper.vm.exportRangeError).toBe('reversed')

    await wrapper.vm.runExport()
    expect(calls.map(c => c[0])).not.toContain('GetHoursExport')
  })

  test('the download hands over the BYTES already fetched — it never re-asks the server', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.runExport()

    const created = []
    const clicked = []
    global.URL.createObjectURL = (blob) => { created.push(blob); return 'blob:x' }
    global.URL.revokeObjectURL = jest.fn()
    const anchor = { click: () => clicked.push([anchor.href, anchor.download]) }
    jest.spyOn(document, 'createElement').mockReturnValue(anchor)

    const before = calls.filter(c => c[0] === 'GetHoursExport').length
    wrapper.vm.downloadExport()

    // A second fetch could answer differently — a punch closed in between — and the verdict on
    // screen would then belong to a file the manager is not the one downloading.
    expect(calls.filter(c => c[0] === 'GetHoursExport').length).toBe(before)
    expect(created.length).toBe(1)
    expect(clicked[0]).toEqual(['blob:x', 'server-named.csv'])

    document.createElement.mockRestore()
    delete global.URL.createObjectURL
    delete global.URL.revokeObjectURL
  })

  test('a browser that cannot download says so instead of failing silently', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.runExport()

    // jsdom implements no `createObjectURL`, which is exactly the guarded case.
    wrapper.vm.downloadExport()
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.toast.message).toBe('wfrt_exp_download_unavailable')
  })
})
