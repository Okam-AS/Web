import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforceTimesheetsPage from '~/pages/admin/workforce-timesheets.vue'

// THE PAGE A FORTNIGHT OF SOMEBODY'S WAGES IS FROZEN FROM.
//
// `pages/admin/workforce-timesheets.vue` carried no test at all. Everything below is about what a
// manager sees and does: which reads fire behind a capability gate, what a refusal says, what the
// two writes leave on screen afterwards, and what the download hands to the browser. The panel and
// the batch list have their own file (`workforce-timesheet-components.test.js`); this one is the
// PAGE — the part that owns the clients, the writes and the re-reads.
//
// Mounted FULLY rather than shallow, on purpose. The one defect this file found is a sentence the
// panel prints from a prop the page computes, and a shallow mount cannot see a sentence.

const calls = []
const behaviour = {}

// A refusal exactly as `WorkforceApiError` arrives, without importing the class into a file whose
// subject is how the page reacts to one.
const problem = (status, code) => ({
  isWorkforceApiError: true, status, code, message: 'server said so', problem: { code }
})

// A fake backend that HOLDS ITS OWN TRUTH: the list echoes the range it was ASKED for, which is what
// the server does (it synthesises the Open row for the requested range). A fixture with hard-coded
// dates would silently stop matching the page's own default range and every assertion behind
// `periodFor` would pass for the wrong reason.
const periodFor = (from, to, over) => Object.assign({
  timesheetPeriodId: 'p-1',
  fromBusinessDate: from,
  toBusinessDate: to,
  status: 'Open',
  lineCount: 8,
  complete: false,
  incompleteRowCount: 0,
  paidMinutes: 2445,
  unpaidBreakMinutes: 30,
  approvedByActorReference: null,
  approvedAtUtc: null,
  snapshotSha256: null,
  succeededExportCount: 0,
  failedExportCount: 0,
  adjustmentBatchCount: 0
}, over || {})

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      if (behaviour.contextFails) { return Promise.reject(behaviour.contextFails) }
      return Promise.resolve({
        capabilities: behaviour.capabilities || ['WorkforceManager', 'WorkforcePayrollApprover']
      })
    }
  }
}))

jest.mock('~/utils/workforce/timesheet-client', () => ({
  WorkforceTimesheetService: class {
    ListTimesheets (_storeId, from, to) {
      calls.push(['ListTimesheets', from, to])
      if (behaviour.listFailsAfter !== undefined && behaviour.listCount >= behaviour.listFailsAfter) {
        behaviour.listCount += 1
        return Promise.reject(behaviour.listError || new Error('network'))
      }
      behaviour.listCount += 1
      if (behaviour.listFails) { return Promise.reject(behaviour.listFails) }
      return Promise.resolve({
        exportEnabled: behaviour.exportEnabled !== false,
        periods: behaviour.periods
          ? behaviour.periods(from, to)
          : [periodFor(from, to, behaviour.periodOver)]
      })
    }

    GetTimesheet (_storeId, periodId) {
      calls.push(['GetTimesheet', periodId])
      if (behaviour.detailFails) { return Promise.reject(behaviour.detailFails) }
      return Promise.resolve({
        period: periodFor(behaviour.lastFrom, behaviour.lastTo, behaviour.detailPeriodOver),
        batches: behaviour.batches || []
      })
    }

    ApproveTimesheet (_storeId, periodId, request) {
      calls.push(['ApproveTimesheet', periodId, request])
      return behaviour.approveFails ? Promise.reject(behaviour.approveFails) : Promise.resolve({})
    }

    CreateTimesheetExport (_storeId, periodId, request) {
      calls.push(['CreateTimesheetExport', periodId, request])
      return behaviour.exportFails
        ? Promise.reject(behaviour.exportFails)
        : Promise.resolve({ fileName: 'okam-timesheet-42.csv' })
    }

    DownloadTimesheetExport (_storeId, periodId, batchId) {
      calls.push(['DownloadTimesheetExport', periodId, batchId])
      return behaviour.downloadFails
        ? Promise.reject(behaviour.downloadFails)
        : Promise.resolve({ fileName: 'server-named.csv', text: 'col\nvalue\n' })
    }
  }
}))

// The REAL Norwegian dictionary, so a key this page names but nobody translated fails here instead
// of shipping as a raw `wft_…` on screen.
function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return mount(WorkforceTimesheetsPage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: behaviour.loggedIn !== false },
        state: {
          selectedAdminStore: behaviour.selectedStore === undefined ? 42 : behaviour.selectedStore,
          adminLocale: 'no',
          currentUser: { id: 1, adminIn: behaviour.adminIn || [{ id: 42 }] }
        }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, NuxtLink: true }
  })
}

async function openPage () {
  const page = mountPage()
  await settled()
  // The page's own default range, so a fixture can answer the question that was actually asked.
  behaviour.lastFrom = page.vm.fromBusinessDate
  behaviour.lastTo = page.vm.toBusinessDate
  await settled()
  return page
}

// The browser side of the download, stubbed for every test rather than one: jsdom implements
// neither `createObjectURL` nor navigation, and an un-stubbed anchor click logs a navigation error
// from a timer AFTER the test that caused it has finished — noise attributed to the wrong test.
const objectUrls = []
let anchorClick

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }
  behaviour.listCount = 0
  objectUrls.length = 0
  window.URL.createObjectURL = blob => { objectUrls.push(blob); return 'blob:x' }
  window.URL.revokeObjectURL = jest.fn()
  anchorClick = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => { anchorClick.mockRestore() })

// ---- who is allowed in, and what is asked for on their behalf ---------------------------------

describe('a manager arrives at the timesheet screen', () => {
  test('a manager without the payroll grant is told so, and no wage record is read on their behalf', async () => {
    behaviour.capabilities = ['WorkforceManager', 'WorkforceScheduler']
    const page = await openPage()

    expect(page.find('[data-testid="wft-refusal"]').text())
      .toContain(translations.no.wft_no_payroll_capability)
    // Every timesheet route resolves the payroll grant, INCLUDING the reads. Firing them would earn
    // five 403s and report a wage record as unreadable rather than as withheld.
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a payroll approver gets the period AND the batches, because only the detail read carries them', async () => {
    behaviour.batches = [{
      batchId: 'b-1', outcome: 'Succeeded', fileName: 'okam-timesheet-42.csv',
      providerKey: 'okam-csv', lineCount: 8, isAdjustment: false,
      requestedByActorReference: 'staff-9', createdAtUtc: '2026-08-04T20:40:17Z',
      contentType: 'text/csv;charset=utf-8', payloadSha256: 'b'.repeat(64), failureReason: null
    }]
    const page = await openPage()

    expect(page.find('[data-testid="wft-refusal"]').exists()).toBe(false)
    expect(calls.map(c => c[0])).toEqual(['GetContext', 'ListTimesheets', 'GetTimesheet'])
    expect(page.find('[data-testid="wft-download"]').exists()).toBe(true)
  })

  test('a 403 on the context read says the grant is missing, not that the timesheet is broken', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    const page = await openPage()

    expect(page.find('[data-testid="wft-blocker"]').text())
      .toBe(translations.no.wft_no_payroll_capability)
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a context read that fell over says so, and does not accuse the caller of lacking a grant', async () => {
    behaviour.contextFails = new Error('socket hang up')
    const page = await openPage()

    expect(page.find('[data-testid="wft-blocker"]').text())
      .toBe(translations.no.wft_context_failed)
  })

  test('the default fortnight ends before today, so nobody is offered a period still being worked', async () => {
    const page = await openPage()

    const today = new Date().toISOString().slice(0, 10)
    expect(page.vm.toBusinessDate < today).toBe(true)
    const span = (Date.parse(page.vm.toBusinessDate) - Date.parse(page.vm.fromBusinessDate)) / 86400000
    expect(span).toBe(13)
  })
})

// ---- the freeze -------------------------------------------------------------------------------

describe('a manager freezes the fortnight', () => {
  test('the unknown-hours decision the manager ticked is the one sent to the server', async () => {
    behaviour.periodOver = { incompleteRowCount: 2 }
    const page = await openPage()

    await page.find('[data-testid="wft-allow-incomplete"]').setChecked(true)
    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    const approve = calls.find(c => c[0] === 'ApproveTimesheet')
    expect(approve[2].allowIncomplete).toBe(true)
    // The range travels with the write: the server checks it against the period id and refuses a
    // mismatch rather than freezing a fortnight nobody asked about.
    expect(approve[2].fromBusinessDate).toBe(page.vm.fromBusinessDate)
    expect(approve[2].toBusinessDate).toBe(page.vm.toBusinessDate)
  })

  test('a frozen period is re-read from BOTH calls, so the batches do not vanish behind the notice', async () => {
    const page = await openPage()
    calls.length = 0

    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-notice"]').text()).toBe(translations.no.wft_approved_notice)
    // The approve RESPONSE builds its detail inline and never populates `batches`; adopting it whole
    // would show a freshly approved period as having sent nothing.
    expect(calls.map(c => c[0])).toEqual(['ApproveTimesheet', 'ListTimesheets', 'GetTimesheet'])
  })

  test('a second freeze earns the server refusal rather than being swallowed by the screen', async () => {
    behaviour.approveFails = problem(409, 'workforce.timesheet-period-already-approved')
    const page = await openPage()

    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_refusal_already_approved)
    expect(page.find('[data-testid="wft-refusal-code"]').text())
      .toBe('workforce.timesheet-period-already-approved')
    expect(page.find('[data-testid="wft-notice"]').exists()).toBe(false)
  })

  test('a refusal this build has no sentence for still arrives on screen, with its code', async () => {
    behaviour.approveFails = problem(409, 'workforce.some-refusal-shipped-next-quarter')
    const page = await openPage()

    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    // Swallowing it into "something went wrong" would hide exactly the refusal a future backend adds.
    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_refusal_unknown)
    expect(page.find('[data-testid="wft-refusal-code"]').text())
      .toBe('workforce.some-refusal-shipped-next-quarter')
  })

  test('a network failure is reported as the act that failed, and quotes no code it never received', async () => {
    behaviour.approveFails = new Error('socket hang up')
    const page = await openPage()

    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_approve_failed)
    expect(page.find('[data-testid="wft-refusal-code"]').exists()).toBe(false)
  })

  test('a refused freeze still re-reads, because `already-approved` means the screen is the stale one', async () => {
    behaviour.approveFails = problem(409, 'workforce.timesheet-period-already-approved')
    const page = await openPage()
    calls.length = 0

    await page.find('[data-testid="wft-approve"]').trigger('click')
    await settled()

    expect(calls.map(c => c[0])).toEqual(['ApproveTimesheet', 'ListTimesheets', 'GetTimesheet'])
  })
})

// ---- the export and the bytes behind it --------------------------------------------------------

describe('a manager sends the fortnight to payroll and fetches back what was sent', () => {
  test('the confirmation names the file the SERVER said it wrote', async () => {
    behaviour.periodOver = { status: 'Approved' }
    const page = await openPage()

    await page.find('[data-testid="wft-export"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-notice"]').text())
      .toContain('okam-timesheet-42.csv')
  })

  test('the download hands over the exact bytes under the server\'s own file name', async () => {
    behaviour.periodOver = { status: 'Exported' }
    behaviour.batches = [{
      batchId: 'b-1', outcome: 'Succeeded', fileName: 'client-guess.csv',
      providerKey: 'okam-csv', lineCount: 8, isAdjustment: false,
      requestedByActorReference: 'staff-9', createdAtUtc: '2026-08-04T20:40:17Z',
      contentType: 'text/csv;charset=utf-8', payloadSha256: 'b'.repeat(64), failureReason: null
    }]
    const page = await openPage()
    await page.find('[data-testid="wft-download"]').trigger('click')
    await settled()

    // The route is `[Authorize]`; a plain navigation carries no bearer token, so the bytes are
    // FETCHED and handed to the browser rather than linked to.
    expect(calls.map(c => c[0])).toContain('DownloadTimesheetExport')
    expect(objectUrls.length).toBe(1)
    expect(anchorClick).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
    // The server names the file; the batch's own name is the fallback, not the answer.
    expect(page.find('[data-testid="wft-notice"]').text()).toContain('server-named.csv')
  })

  test('a download that failed says so and leaves no half-written file claim on screen', async () => {
    behaviour.periodOver = { status: 'Exported' }
    behaviour.batches = [{
      batchId: 'b-1', outcome: 'Succeeded', fileName: 'client-guess.csv',
      providerKey: 'okam-csv', lineCount: 8, isAdjustment: false,
      requestedByActorReference: 'staff-9', createdAtUtc: '2026-08-04T20:40:17Z',
      contentType: 'text/csv;charset=utf-8', payloadSha256: 'b'.repeat(64), failureReason: null
    }]
    behaviour.downloadFails = new Error('gone')

    const page = await openPage()
    await page.find('[data-testid="wft-download"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_download_failed)
    expect(page.find('[data-testid="wft-notice"]').exists()).toBe(false)
  })
})

// ---- a second click ------------------------------------------------------------------------------

describe('a manager clicks twice', () => {
  // A promise the test decides when to settle, so a write can genuinely still be in flight while
  // the second click happens.
  const deferred = () => {
    let settle
    const promise = new Promise(resolve => { settle = resolve })
    return { promise, settle }
  }

  test('a second Approve while the first is still in flight is not a second freeze', async () => {
    const gate = deferred()
    behaviour.approveFails = null
    const page = await openPage()
    // Hold the write open.
    const service = page.vm._timesheets
    service.ApproveTimesheet = () => { calls.push(['ApproveTimesheet']); return gate.promise }

    page.vm.approve({ allowIncomplete: false })
    page.vm.approve({ allowIncomplete: false })
    gate.settle({})
    await settled()

    // A freeze is what turns hours into a payroll artifact somebody must later explain; two of them
    // is two idempotency keys spent on one fortnight.
    expect(calls.filter(c => c[0] === 'ApproveTimesheet').length).toBe(1)
  })

  test('a second Download while the first is still in flight is not a second fetch', async () => {
    const gate = deferred()
    behaviour.periodOver = { status: 'Exported' }
    const batch = {
      batchId: 'b-1', outcome: 'Succeeded', fileName: 'f.csv', providerKey: 'okam-csv',
      lineCount: 8, isAdjustment: false, requestedByActorReference: 'staff-9',
      createdAtUtc: '2026-08-04T20:40:17Z', contentType: 'text/csv', payloadSha256: 'b'.repeat(64),
      failureReason: null
    }
    behaviour.batches = [batch]
    const page = await openPage()
    page.vm._timesheets.DownloadTimesheetExport = () => {
      calls.push(['DownloadTimesheetExport'])
      return gate.promise
    }

    page.vm.download(batch)
    page.vm.download(batch)
    gate.settle({ fileName: 'f.csv', text: 'x' })
    await settled()

    expect(calls.filter(c => c[0] === 'DownloadTimesheetExport').length).toBe(1)
  })

  test('an export refused by the server is reported by its code, exactly as a refused freeze is', async () => {
    behaviour.periodOver = { status: 'Approved' }
    behaviour.exportFails = problem(409, 'workforce.timesheet-nothing-to-reconcile')
    const page = await openPage()

    await page.find('[data-testid="wft-export"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_refusal_nothing_to_reconcile)
    expect(page.find('[data-testid="wft-refusal-code"]').text())
      .toBe('workforce.timesheet-nothing-to-reconcile')
  })

  test('a detail read that failed says the batches are unread, never that nothing was sent', async () => {
    behaviour.detailFails = new Error('network')
    const page = await openPage()

    // "No batch has been sent" and "we could not read what was sent" are different answers, and
    // only one of them means an accountant is still waiting.
    expect(page.find('[data-testid="wft-batches-unknown"]').exists()).toBe(true)
    expect(page.find('[data-testid="wft-batches-empty"]').exists()).toBe(false)
  })
})

// ---- what the screen must never claim ----------------------------------------------------------

describe('the screen never claims more than it read', () => {
  test('a reload that failed says the period could not be read, and shows no period at all', async () => {
    const page = await openPage()
    expect(page.find('[data-testid="wft-paid-hours"]').exists()).toBe(true)

    behaviour.listFails = new Error('network')
    await page.find('[data-testid="wft-load"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-refusal-text"]').text())
      .toBe(translations.no.wft_load_failed)
    // The previous fortnight must not stay on screen under the new range.
    expect(page.find('[data-testid="wft-unknown"]').text()).toBe(translations.no.wft_period_unknown)
  })

  test('the flag-off banner is shown only once the server has actually answered about the flag', async () => {
    behaviour.exportEnabled = false
    const page = await openPage()
    expect(page.find('[data-testid="wft-flag-off"]').exists()).toBe(true)

    behaviour.listFails = new Error('network')
    await page.find('[data-testid="wft-load"]').trigger('click')
    await settled()

    // The read did not answer, so the store's switch is UNKNOWN — and an unread switch must not be
    // reported as an off one.
    expect(page.find('[data-testid="wft-flag-off"]').exists()).toBe(false)
  })

  // ---- DEFECT (left failing on purpose) --------------------------------------------------------
  //
  // The banner above gets this right; the withheld-reason beside the Approve button does not.
  //
  // `exportEnabled` collapses "the list has not answered" into `false`, and `approveAvailability`
  // tests the flag BEFORE it tests the period — so the moment the list read fails while the DETAIL
  // read succeeds (which `refresh()` reaches on every single write, success or refusal, because it
  // calls `readDetail` regardless of what `ListTimesheets` did), the period is still on screen and
  // the manager is told "Eksport er slått av for denne butikken." — a statement about the store's
  // configuration that this page has never read. `wft_gate_no_period` exists for the unread case and
  // is unreachable behind the flag test.
  test('does not tell a manager the export flag is off when the flag was never read', async () => {
    behaviour.periodOver = { status: 'Approved' }
    const page = await openPage()
    expect(page.find('[data-testid="wft-export-why"]').exists()).toBe(false)

    // The write lands; the list re-read behind it does not. `readDetail` still answers, so the
    // period stays on screen and the gates keep rendering.
    behaviour.listFailsAfter = behaviour.listCount
    await page.find('[data-testid="wft-export"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wft-paid-hours"]').exists()).toBe(true)
    expect(page.find('[data-testid="wft-approve-why"]').text())
      .not.toBe(translations.no.wft_gate_flag_off)
  })
})
