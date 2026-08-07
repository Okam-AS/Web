import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MealsStatementsPage from '~/pages/admin/meals-statements.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'

// THE MONTH BILL A BUYER IS ASKED TO PAY. These tests assert the FIGURES the screen puts in front of
// a person and the SENTENCE it gives them when a read is refused — not that a panel rendered.
//
// `statement-view.js` and `refusalOf` are deliberately the REAL ones. The whole of this page's
// correctness is those two modules' output placed on screen, so stubbing either would let the page
// pass while reading and classifying nothing.

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'
const RUN = 'run-2026-07-acme'

const mockCalls = []
let mockAnswers = {}

jest.mock('~/utils/meals/meals-client', () => {
  const actual = jest.requireActual('~/utils/meals/meals-client')
  return Object.assign({}, actual, {
    MealsStoreService: class {
      ListCompanies (storeId) {
        mockCalls.push(['ListCompanies', storeId])
        return mockAnswers.ListCompanies(storeId)
      }
    }
  })
})

jest.mock('~/utils/meals/statement-client', () => ({
  MealsStatementService: class {
    Get (id) { mockCalls.push(['Get', id]); return mockAnswers.Get(id) }
    ListForCompany (id) { mockCalls.push(['ListForCompany', id]); return mockAnswers.ListForCompany(id) }
    ExportCsv (id) { mockCalls.push(['ExportCsv', id]); return mockAnswers.ExportCsv(id) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const refuse = (status, body) => () => Promise.reject(new WorkforceApiError(status, body))
const DASH = '—'

const called = name => mockCalls.filter(c => c[0] === name)

function company (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    agreementStatus: 'Active'
  }, over || {})
}

function summary (over) {
  return Object.assign({
    statementRunId: RUN,
    companyId: ACME,
    storeId: 42,
    currency: 'NOK',
    periodYear: 2026,
    periodMonth: 7,
    status: 'Finalized',
    lineCount: 2,
    totalGrossMinor: 49800,
    totalNetMinor: 39840,
    totalVatMinor: 9960,
    contentHash: 'sha256:8f21ac',
    revision: 'AAAAAAAAB9k=',
    finalizedAtUtc: '2026-08-01T06:00:00',
    createdAtUtc: '2026-07-31T22:00:00'
  }, over || {})
}

function statementPayload (over, lines) {
  return {
    summary: summary(over),
    lines: lines === undefined
      ? [
        {
          statementLineId: 'sl-1',
          allocationId: 'alloc-1',
          kind: 'Capture',
          sourceReceiptNumber: '2026-000841',
          memberDisplayRef: 'ANS-4417',
          currency: 'NOK',
          grossMinor: 24900,
          netMinor: 19920,
          vatMinor: 4980,
          orderOccurredAtUtc: '2026-07-14T11:02:00'
        },
        {
          statementLineId: 'sl-2',
          allocationId: 'alloc-2',
          kind: 'Capture',
          sourceReceiptNumber: '2026-000902',
          memberDisplayRef: 'ANS-9001',
          currency: 'NOK',
          grossMinor: 24900,
          netMinor: 19920,
          vatMinor: 4980,
          orderOccurredAtUtc: '2026-07-15T11:30:00'
        }
      ]
      : lines
  }
}

function mountPage (options) {
  const opts = options || {}
  return mount(MealsStatementsPage, {
    mocks: {
      // Interpolations are appended only when there ARE any, so a key rendered with an empty params
      // bag is indistinguishable from one rendered with none — which is what the template does.
      $i: (key, params) => (params && Object.keys(params).length ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      $route: { query: opts.query || {} },
      $store: {
        getters: { userIsLoggedIn: opts.loggedIn !== false },
        state: {
          selectedAdminStore: opts.storeId === undefined ? 42 : opts.storeId,
          currentUser: { id: 'user-1', adminIn: opts.adminIn === undefined ? [{ id: 42 }] : opts.adminIn }
        }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

// The open button is disabled until a run id is typed, and vue-test-utils will not fire a click on a
// disabled element — so the re-render has to land before the click, exactly as it does for a person.
async function openRun (w, runId) {
  w.find('[data-test="meals-statements-run-input"]').setValue(runId)
  await w.vm.$nextTick()
  w.find('[data-test="meals-statements-open"]').trigger('click')
  await settled()
}

async function opened (options) {
  const w = mountPage(options)
  await settled()
  await openRun(w, RUN)
  return w
}

const textOf = (w, test) => w.find('[data-test="' + test + '"]').text()
const has = (w, test) => w.find('[data-test="' + test + '"]').exists()

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {
    ListCompanies: () => Promise.resolve([company()]),
    ListForCompany: () => Promise.resolve({ statements: [summary()] }),
    Get: () => Promise.resolve(statementPayload()),
    ExportCsv: () => Promise.resolve({
      text: '# period,2026-07\nmember,gross\nANS-4417,249.00\n',
      fileName: 'meals-statement-2026-07-acme.csv',
      contentHash: 'sha256:8f21ac'
    })
  }
})

describe('opening a month statement by its run id', () => {
  test('the venue reads the document\'s totals, its signature and every line', async () => {
    const w = await opened()
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 49800')
    expect(textOf(w, 'meals-statement-total-net')).toBe('kr 39840')
    expect(textOf(w, 'meals-statement-total-vat')).toBe('kr 9960')
    expect(textOf(w, 'meals-statement-content-hash')).toBe('sha256:8f21ac')
    expect(w.findAll('[data-test="meals-statement-line"]').length).toBe(2)
    expect(w.findAll('[data-test="meals-statement-member-ref"]').at(0).text()).toBe('ANS-4417')
    expect(w.findAll('[data-test="meals-statement-member-ref"]').at(1).text()).toBe('ANS-9001')
  })

  test('the run asked for is the run fetched', async () => {
    await opened()
    expect(called('Get')).toEqual([['Get', RUN]])
  })

  test('an operator who has typed nothing cannot fire a read', async () => {
    const w = mountPage()
    await settled()
    expect(w.find('[data-test="meals-statements-open"]').attributes('disabled')).toBeTruthy()
    expect(called('Get').length).toBe(0)
  })

  test('a run id padded with spaces is sent trimmed, not rejected', async () => {
    const w = mountPage()
    await settled()
    await openRun(w, '  ' + RUN + '  ')
    expect(called('Get')).toEqual([['Get', RUN]])
  })

  test('a finalized run is marked frozen so nobody waits for it to change', async () => {
    const w = await opened()
    expect(has(w, 'meals-statements-frozen')).toBe(true)
    expect(has(w, 'meals-statements-still-draft')).toBe(false)
  })

  test('a draft says it is still a draft, so nobody bills a buyer off it', async () => {
    mockAnswers.Get = () => Promise.resolve(statementPayload({ status: 'Draft', finalizedAtUtc: null }))
    const w = await opened()
    expect(has(w, 'meals-statements-still-draft')).toBe(true)
    expect(has(w, 'meals-statements-frozen')).toBe(false)
  })

  test('re-reading asks for the run on screen again', async () => {
    const w = await opened()
    w.find('[data-test="meals-statements-reread"]').trigger('click')
    await settled()
    expect(called('Get')).toEqual([['Get', RUN], ['Get', RUN]])
  })

  // The screen NAMES what went wrong. An operator who mistyped a run id and an operator whose module
  // is dark get the same sentence, because the wire refuses to tell them apart — but neither gets a
  // blank screen.
  test('a run that is not there is refused in words, and puts no document on screen', async () => {
    mockAnswers.Get = refuse(404, { code: 'meals.not-found' })
    const w = await opened()
    expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_refusal_not_found')
    expect(has(w, 'meals-statement')).toBe(false)
  })

  test('a session that has expired says so rather than reading as an empty month', async () => {
    mockAnswers.Get = refuse(401, {})
    const w = await opened()
    expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_refusal_unauthenticated')
  })

  test('a refusal with no code on the problem document is admitted as unknown', async () => {
    mockAnswers.Get = refuse(400, {})
    const w = await opened()
    expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_refusal_unknown')
  })

  // A DOCUMENT LEFT ON SCREEN AFTER A FAILED READ IS A DOCUMENT SOMEBODY WILL QUOTE. The second open
  // must take the first one down.
  test('a failed second read takes the first statement off the screen', async () => {
    const w = await opened()
    expect(has(w, 'meals-statement')).toBe(true)
    mockAnswers.Get = refuse(404, { code: 'meals.not-found' })
    w.find('[data-test="meals-statements-reread"]').trigger('click')
    await settled()
    expect(has(w, 'meals-statement')).toBe(false)
    expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_refusal_not_found')
  })

  test('a read that succeeds clears the refusal the previous one left', async () => {
    mockAnswers.Get = refuse(404, { code: 'meals.not-found' })
    const w = await opened()
    expect(has(w, 'meals-statements-refusal')).toBe(true)
    mockAnswers.Get = () => Promise.resolve(statementPayload())
    await openRun(w, RUN)
    expect(has(w, 'meals-statements-refusal')).toBe(false)
  })
})

describe('the statement history, and the authority boundary across it', () => {
  // #21 is company-admin only. A venue meeting that boundary is entitled to know the list EXISTS and
  // belongs to the buyer; an empty panel would read as "no statements have ever been produced here".
  test('a venue refused the buyer\'s history is told so, not shown an empty panel', async () => {
    mockAnswers.ListForCompany = refuse(403, { code: 'meals.forbidden' })
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-history-forbidden')).toBe(true)
    expect(has(w, 'meals-statements-history-none')).toBe(false)
  })

  test('a company that has genuinely produced no statements says none, not refused', async () => {
    mockAnswers.ListForCompany = () => Promise.resolve({ statements: [] })
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-history-none')).toBe(true)
    expect(has(w, 'meals-statements-history-forbidden')).toBe(false)
  })

  test('a history read that failed for any other reason gets its own sentence', async () => {
    mockAnswers.ListForCompany = refuse(404, { code: 'meals.not-found' })
    const w = mountPage()
    await settled()
    expect(textOf(w, 'meals-statements-history-refusal')).toBe('mlst_refusal_not_found')
    expect(has(w, 'meals-statements-history-forbidden')).toBe(false)
  })

  test('a listed run can be opened straight from the history', async () => {
    const w = mountPage()
    await settled()
    // Asserted whole rather than by `toContain`: the run id itself contains the period, so a row
    // that had lost its derived `period` would still satisfy a substring check.
    expect(textOf(w, 'meals-statements-history-row')).toBe('2026-07 · Finalized · ' + RUN)
    w.find('[data-test="meals-statements-history-row"]').trigger('click')
    await settled()
    expect(called('Get')).toEqual([['Get', RUN]])
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 49800')
    // The field fills in with the run that was opened, so the operator can see WHICH run the
    // document below belongs to and can re-read it without going back to the list.
    expect(w.find('[data-test="meals-statements-run-input"]').element.value).toBe(RUN)
  })

  test('the company is named by the name a person would recognise', async () => {
    const w = mountPage()
    await settled()
    expect(w.find('.meals-statements-page__company-name').text()).toBe('Acme')
  })

  test('a company with no display name falls back to its legal name', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve([company({ displayName: null })])
    const w = mountPage()
    await settled()
    expect(w.find('.meals-statements-page__company-name').text()).toBe('Acme Industri AS')
  })

  test('a company with no name at all is headed by its id rather than by nothing', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve([company({ displayName: null, legalName: null })])
    const w = mountPage()
    await settled()
    expect(w.find('.meals-statements-page__company-name').text()).toBe(ACME)
  })

  // A history row the server sent without a run id has nothing to open. The click must do nothing
  // rather than fire a read for `undefined` and come back with a refusal the operator cannot explain.
  test('a history row carrying no run id opens nothing when it is clicked', async () => {
    mockAnswers.ListForCompany = () => Promise.resolve({ statements: [summary({ statementRunId: null })] })
    const w = mountPage()
    await settled()
    w.find('[data-test="meals-statements-history-row"]').trigger('click')
    await settled()
    expect(called('Get').length).toBe(0)
  })

  // Only a company with a live corridor here can have a statement from this venue at all, so a
  // terminated buyer is not offered as if a bill might exist.
  test('only companies with a live agreement are asked about', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve([
      company(),
      company({ companyId: BOLT, displayName: 'Bolt', agreementStatus: 'Terminated' })
    ])
    const w = mountPage()
    await settled()
    expect(called('ListForCompany')).toEqual([['ListForCompany', ACME]])
    expect(w.findAll('[data-test="meals-statements-company"]').length).toBe(1)
  })

  test('a venue with no live corridors is told there are none', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve([])
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-no-companies')).toBe(true)
    expect(has(w, 'meals-statements-directory-refusal')).toBe(false)
  })

  // "WE COULD NOT ASK" IS NOT "THERE ARE NONE". A failed directory read leaves `companies` unknown,
  // and the screen must not turn that into an answer.
  test('a directory read that failed is unknown, never reported as no companies', async () => {
    mockAnswers.ListCompanies = refuse(403, {})
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-directory-refusal')).toBe(true)
    expect(has(w, 'meals-statements-no-companies')).toBe(false)
    expect(called('ListForCompany').length).toBe(0)
    // The invariant the page states about itself: the list stays UNKNOWN on failure and never
    // becomes `[]`, which is an answer. Today the refusal sentence hides the difference on screen —
    // this pins it so a later template edit cannot turn "we could not ask" into "there are none".
    expect(w.vm.companies).toBe(null)
  })

  test('a directory that failed with an untyped error is still admitted as unknown', async () => {
    mockAnswers.ListCompanies = () => Promise.reject(new Error('offline'))
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-directory-refusal')).toBe(true)
  })

  test('a payload that is not a list is read as no companies rather than crashing', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve({ items: [] })
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-no-companies')).toBe(true)
  })

  test('a history payload without a statements array is read as none', async () => {
    mockAnswers.ListForCompany = () => Promise.resolve({})
    const w = mountPage()
    await settled()
    expect(has(w, 'meals-statements-history-none')).toBe(true)
  })
})

describe('the deep link the month-close screen will hand over', () => {
  test('a run named on the URL is opened without anyone typing it', async () => {
    const w = mountPage({ query: { run: RUN } })
    await settled()
    await settled()
    expect(called('Get')).toEqual([['Get', RUN]])
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 49800')
  })

  // The deep link works whether or not the caller may see the list, so a STORE admin — who is
  // refused #21 by design — still lands on the document the close screen sent them to.
  test('the deep link still opens for a venue that is refused the history list', async () => {
    mockAnswers.ListForCompany = refuse(403, { code: 'meals.forbidden' })
    const w = mountPage({ query: { run: RUN } })
    await settled()
    await settled()
    expect(has(w, 'meals-statements-history-forbidden')).toBe(true)
    expect(textOf(w, 'meals-statement-run-id')).toBe(RUN)
  })

  test('no run on the URL opens nothing on its own', async () => {
    mountPage()
    await settled()
    expect(called('Get').length).toBe(0)
  })
})

describe('the CSV the buyer receives', () => {
  test('the file is fetched, held, and shown before it is saved', async () => {
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(called('ExportCsv')).toEqual([['ExportCsv', RUN]])
    expect(textOf(w, 'meals-statements-export-text')).toContain('ANS-4417,249.00')
  })

  // The hash the SERVER put on the file. A hash this client derived from the body would prove
  // nothing about the document the server signed.
  test('the server\'s signature on the file is shown beside it', async () => {
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(textOf(w, 'meals-statements-export-hash')).toBe('mlst_export_hash:{"hash":"sha256:8f21ac"}')
    expect(textOf(w, 'meals-statements-export-result')).toContain('mlst_export_ready')
  })

  test('a file the browser was not allowed to read a hash for shows none', async () => {
    mockAnswers.ExportCsv = () => Promise.resolve({ text: 'x', fileName: 'a.csv', contentHash: null })
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(has(w, 'meals-statements-export-hash')).toBe(false)
  })

  // A cross-origin admin often cannot read `Content-Disposition`. The fallback name is marked as the
  // client's own rather than passed off as the server's.
  test('a file this client had to name itself is marked as such, and named for the period', async () => {
    mockAnswers.ExportCsv = () => Promise.resolve({ text: 'x', fileName: null, contentHash: 'h' })
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(has(w, 'meals-statements-export-named-here')).toBe(true)
    expect(textOf(w, 'meals-statements-export-result'))
      .toContain('mlst_export_ready:{"name":"meals-statement-2026-07.csv"}')
  })

  // A file the client had to name for a run whose period it never learned must not be offered as
  // `meals-statement-null.csv`; the gap is spelled out in the name a person will see in Downloads.
  test('a client-named file for a run with no period says unknown rather than null', async () => {
    mockAnswers.Get = () => Promise.resolve(statementPayload({ periodYear: null, periodMonth: null }))
    mockAnswers.ExportCsv = () => Promise.resolve({ text: 'x', fileName: null, contentHash: null })
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(textOf(w, 'meals-statements-export-result'))
      .toContain('mlst_export_ready:{"name":"meals-statement-unknown.csv"}')
  })

  test('a server-named file is not marked as named here', async () => {
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(has(w, 'meals-statements-export-named-here')).toBe(false)
  })

  test('a refused export says why and offers no file to save', async () => {
    mockAnswers.ExportCsv = refuse(400, { code: 'meals.export-format-unsupported' })
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_refusal_export_format')
    expect(has(w, 'meals-statements-export-result')).toBe(false)
  })

  // THE FILE SAVED IS THE FILE SHOWN. It is not re-fetched on download: a draft can be re-drafted
  // underneath, and the venue would then send a buyer a file whose figures are not the ones it read.
  test('saving writes the text already on screen and issues no second request', async () => {
    const created = []
    const clicks = []
    const originalCreate = global.URL.createObjectURL
    const originalRevoke = global.URL.revokeObjectURL
    global.URL.createObjectURL = (blob) => { created.push(blob); return 'blob:held' }
    global.URL.revokeObjectURL = (url) => { created.push(['revoked', url]) }
    const originalClick = window.HTMLAnchorElement.prototype.click
    window.HTMLAnchorElement.prototype.click = function () { clicks.push({ href: this.href, download: this.download }) }
    try {
      const w = await opened()
      w.find('[data-test="meals-statements-export"]').trigger('click')
      await settled()
      const before = called('ExportCsv').length
      w.find('[data-test="meals-statements-download"]').trigger('click')
      await settled()
      expect(called('ExportCsv').length).toBe(before)
      expect(clicks).toEqual([{ href: 'blob:held', download: 'meals-statement-2026-07-acme.csv' }])
      expect(created[0].type).toBe('text/csv;charset=utf-8')
    } finally {
      global.URL.createObjectURL = originalCreate
      global.URL.revokeObjectURL = originalRevoke
      window.HTMLAnchorElement.prototype.click = originalClick
    }
  })

  test('a browser that cannot build a file link says so instead of failing silently', async () => {
    const originalCreate = global.URL.createObjectURL
    global.URL.createObjectURL = undefined
    try {
      const w = await opened()
      w.find('[data-test="meals-statements-export"]').trigger('click')
      await settled()
      w.find('[data-test="meals-statements-download"]').trigger('click')
      await settled()
      expect(textOf(w, 'meals-statements-refusal')).toBe('mlst_err_download_unavailable')
    } finally {
      global.URL.createObjectURL = originalCreate
    }
  })

  // A HELD FILE BELONGS TO THE RUN IT WAS FETCHED FOR. Opening another run must drop it, or the
  // venue can save run A's figures while looking at run B's document.
  test('opening another run drops the file held for the previous one', async () => {
    const w = await opened()
    w.find('[data-test="meals-statements-export"]').trigger('click')
    await settled()
    expect(has(w, 'meals-statements-export-result')).toBe(true)
    await openRun(w, 'run-2026-06-acme')
    expect(has(w, 'meals-statements-export-result')).toBe(false)
  })

  // Not merely "no request went out" — an unguarded export would fault on the absent statement and
  // put a refusal sentence in front of an operator who did nothing wrong.
  test('nothing is exported, and nothing is blamed, while no statement is open', async () => {
    const w = mountPage()
    await settled()
    w.vm.exportCsv()
    await settled()
    expect(called('ExportCsv').length).toBe(0)
    expect(has(w, 'meals-statements-refusal')).toBe(false)
  })
})

describe('who the page reads for', () => {
  test('a signed-out visitor triggers no read at all', async () => {
    mountPage({ loggedIn: false })
    await settled()
    expect(mockCalls.length).toBe(0)
  })

  test('an admin with no store selected triggers no read at all', async () => {
    mountPage({ storeId: null, adminIn: [] })
    await settled()
    expect(mockCalls.length).toBe(0)
  })

  test('an admin with no explicit selection reads for the first store they administer', async () => {
    mountPage({ storeId: null, adminIn: [{ id: 77 }, { id: 78 }] })
    await settled()
    expect(called('ListCompanies')).toEqual([['ListCompanies', 77]])
  })

  test('a session whose user has not hydrated yet reads nothing rather than throwing', async () => {
    const w = mountPage()
    w.vm.$store.state.selectedAdminStore = null
    w.vm.$store.state.currentUser = null
    await w.vm.$nextTick()
    await settled()
    expect(w.vm.storeId).toBe('')
  })

  test('changing store re-reads the history for the new one', async () => {
    const w = mountPage()
    await settled()
    w.vm.$store.state.selectedAdminStore = 99
    await w.vm.$nextTick()
    await settled()
    expect(called('ListCompanies')).toEqual([['ListCompanies', 42], ['ListCompanies', 99]])
  })

  test('signing in on the page loads it without a reload', async () => {
    const w = mountPage({ loggedIn: false })
    await settled()
    expect(mockCalls.length).toBe(0)
    w.vm.$store.getters.userIsLoggedIn = true
    w.vm.$children[0].$emit('login-success')
    await settled()
    expect(called('ListCompanies').length).toBe(1)
  })
})

// The month close is a separate, IRREVERSIBLE act on a separate screen beside the exception queue
// that unblocks it. An operator hunting for it here must be told where it is, not offered a second
// control that cannot say what is blocking them.
describe('what this screen deliberately cannot do', () => {
  test('the screen says who owns the month close, and offers no draft or finalize control', async () => {
    const w = await opened()
    expect(has(w, 'meals-statements-owner')).toBe(true)
    expect(textOf(w, 'meals-statements-owner')).toBe('mlst_owner_note')
    expect(w.html()).not.toContain('data-test="meals-statements-finalize"')
    expect(w.html()).not.toContain('data-test="meals-statements-draft"')
  })

  test('every figure on screen came off the wire; the page sums nothing', async () => {
    // The lines add to 49800 by coincidence in the happy fixture, so this one deliberately does not:
    // a page that re-summed its lines would show 49800 here instead of the server's 12345.
    mockAnswers.Get = () => Promise.resolve(statementPayload({ totalGrossMinor: 12345 }))
    const w = await opened()
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 12345')
  })

  test('a line the server sent no member reference for is never given one here', async () => {
    mockAnswers.Get = () => Promise.resolve(statementPayload(null, [{
      statementLineId: 'sl-1', allocationId: 'alloc-1', kind: 'Capture', currency: 'NOK', grossMinor: 100
    }]))
    const w = await opened()
    const shown = textOf(w, 'meals-statement-member-ref')
    expect(shown).toBe(DASH)
    expect(shown).not.toContain('alloc-1')
  })
})
