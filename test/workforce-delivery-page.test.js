import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforceDeliveryPage from '~/pages/admin/workforce-delivery.vue'

// WHAT A PUBLICATION ACTUALLY REACHED.
//
// `pages/admin/workforce-delivery.vue` and the two components under it carried no test at all. The
// thing this screen exists to refuse is a single bucket labelled "failed": on day one it would cry
// wolf about a push credential nobody has installed yet, and later it would bury the one worker who
// genuinely never got their shifts under a pile of rows nobody can act on. Most of what follows is
// about keeping those two apart on a rendered page.
//
// Mounted FULLY, because "the two tiers are never merged" is a claim about a screen, not a function.

const calls = []
const behaviour = {}

const problem = (status, code) => ({
  isWorkforceApiError: true, status, code, message: 'server said so', problem: { code }
})

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      if (behaviour.contextFails) { return Promise.reject(behaviour.contextFails) }
      return Promise.resolve({ capabilities: behaviour.capabilities || ['WorkforceManager'] })
    }

    ListStaff (storeId) {
      calls.push(['ListStaff', storeId])
      if (behaviour.rosterFails) { return Promise.reject(behaviour.rosterFails) }
      return Promise.resolve(behaviour.roster || [{ staffMemberId: 's-1', displayName: 'Ada Lovelace' }])
    }

    GetNotificationFailures (storeId) {
      calls.push(['GetNotificationFailures', storeId])
      if (behaviour.failuresFails) { return Promise.reject(behaviour.failuresFails) }
      return Promise.resolve(behaviour.rows === undefined ? [] : behaviour.rows)
    }
  }
}))

const row = over => Object.assign({
  notificationOutboxId: 'o-1',
  schedulePublicationId: 'pub-1',
  staffMemberId: 's-1',
  channel: 'Push',
  status: 'Failed',
  targetLabel: '[redacted]',
  attemptCount: 2,
  maxAttempts: 5,
  nextAttemptUtc: '2026-08-04T10:00:00',
  lastError: 'NoPushRegistration',
  deadLetteredAtUtc: null,
  createdAtUtc: '2026-08-03T09:00:00'
}, over || {})

function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return mount(WorkforceDeliveryPage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: {
          selectedAdminStore: 42,
          adminLocale: 'no',
          currentUser: { id: 1, adminIn: [{ id: 42 }] }
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
  await settled()
  return page
}

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }
})

// ---- who may read it ---------------------------------------------------------------------------

describe('a store admin opens the delivery report', () => {
  test('without the manager grant nothing is read and the refusal says so', async () => {
    behaviour.capabilities = ['WorkforceScheduler', 'WorkforceSelf']
    const page = await openPage()

    expect(page.find('[data-testid="wfd-refusal"]').text())
      .toContain(translations.no.wfd_no_capability)
    // Firing the read would earn a 403 and report a missing grant as a delivery problem.
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a 403 on the context read names the grant, and any other failure does not', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    let page = await openPage()
    expect(page.find('[data-testid="wfd-blocker"]').text()).toBe(translations.no.wfd_no_capability)

    behaviour.contextFails = new Error('socket hang up')
    page = await openPage()
    expect(page.find('[data-testid="wfd-blocker"]').text()).toBe(translations.no.wfd_context_failed)
  })
})

// ---- unknown is never the all-clear -------------------------------------------------------------

describe('a read that did not answer never reads as an all-clear', () => {
  test('a failed report says it could not be read, and never that nothing is outstanding', async () => {
    behaviour.failuresFails = new Error('network')
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-unknown"]').text())
      .toContain(translations.no.wf_delivery_unknown_title)
    expect(page.find('[data-testid="wf-delivery-clean"]').exists()).toBe(false)
  })

  test('a store with nothing outstanding gets a DIFFERENT sentence from one whose read failed', async () => {
    behaviour.rows = []
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-clean"]').text())
      .toContain(translations.no.wf_delivery_clean_title)
    expect(page.find('[data-testid="wf-delivery-unknown"]').exists()).toBe(false)
  })

  test('a refresh that failed takes the previous answer down rather than restating it', async () => {
    behaviour.rows = [row({ status: 'DeadLettered', deadLetteredAtUtc: '2026-08-04T10:00:00' })]
    const page = await openPage()
    expect(page.find('[data-testid="wf-delivery-gaveup"]').exists()).toBe(true)

    behaviour.failuresFails = new Error('network')
    await page.find('[data-testid="wf-delivery-refresh"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-delivery-unknown"]').exists()).toBe(true)
    expect(page.find('[data-testid="wf-delivery-gaveup"]').exists()).toBe(false)
  })
})

// ---- the judgement: two tiers, never one bucket --------------------------------------------------

describe('a store waiting for a credential is not a worker who was never told', () => {
  test('the two land in separate groups, each counting only itself', async () => {
    behaviour.roster = [
      { staffMemberId: 's-1', displayName: 'Ada Lovelace' },
      { staffMemberId: 's-2', displayName: 'Grace Hopper' }
    ]
    behaviour.rows = [
      // The store's push credential has not landed. NOTHING was attempted; the backlog survives.
      row({ notificationOutboxId: 'o-1', staffMemberId: 's-1', status: 'Withheld', lastError: 'PushNotConfigured', attemptCount: 0 }),
      // An attempt was spent against a configured hub and this named worker was not reached.
      row({ notificationOutboxId: 'o-2', staffMemberId: 's-2', status: 'DeadLettered', deadLetteredAtUtc: '2026-08-04T10:00:00' })
    ]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-waiting-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-delivery-gaveup-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-delivery-waiting"]').text()).toContain('Ada Lovelace')
    expect(page.find('[data-testid="wf-delivery-gaveup"]').text()).toContain('Grace Hopper')
    expect(page.find('[data-testid="wf-delivery-gaveup"]').text()).not.toContain('Ada Lovelace')
  })

  test('no number anywhere on the panel spans the two tiers', async () => {
    behaviour.rows = [
      row({ notificationOutboxId: 'o-1', status: 'Withheld', lastError: 'PushNotConfigured' }),
      row({ notificationOutboxId: 'o-2', status: 'DeadLettered', deadLetteredAtUtc: '2026-08-04T10:00:00' }),
      row({ notificationOutboxId: 'o-3', status: 'Failed' })
    ]
    const page = await openPage()

    // Three rows in three tiers. A "3" on this screen would be read as three failures over a store
    // that has ONE unreached worker.
    const counts = page.findAll('[data-testid$="-count"]').wrappers.map(w => w.text())
    expect(counts.sort()).toEqual(['1', '1', '1'])
  })

  test('a status this build does not know is counted on its own, never defaulted into a tier', async () => {
    behaviour.rows = [row({ status: 'Quarantined', lastError: 'SomethingNew' })]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-unrecognised-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-delivery-gaveup"]').exists()).toBe(false)
    expect(page.find('[data-testid="wf-delivery-waiting"]').exists()).toBe(false)
    expect(page.find('[data-testid="wf-delivery-retrying"]').exists()).toBe(false)
  })

  test('a spent budget says when it gave up; a live one says when it will try again', async () => {
    behaviour.rows = [
      row({ notificationOutboxId: 'o-1', status: 'DeadLettered', deadLetteredAtUtc: '2026-08-04T10:00:00' }),
      row({ notificationOutboxId: 'o-2', status: 'Failed', nextAttemptUtc: '2026-08-04T12:00:00' })
    ]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-gaveup"]').text())
      .toContain(translations.no.wf_delivery_gaveup_at.split('{')[0].trim())
    expect(page.find('[data-testid="wf-delivery-retrying"]').text())
      .toContain(translations.no.wf_delivery_next_attempt.split('{')[0].trim())
  })
})

// ---- the reason, and what may never be printed ---------------------------------------------------

describe('why a worker was not reached', () => {
  test('a code this build explains is rendered as the sentence, not as the code', async () => {
    behaviour.rows = [row({ lastError: 'NoPushRegistration' })]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-row-why"]').text())
      .toBe(translations.no.wf_delivery_reason_no_push_registration)
  })

  test('a code this build cannot explain is shown VERBATIM and said to be unexplained', async () => {
    // Adapters also fail with an exception TYPE, which is an open set. Guessing at one would be
    // worse than the code; dropping it would throw away the only evidence the row carries.
    behaviour.rows = [row({ lastError: 'SocketException' })]
    const page = await openPage()

    const why = page.find('[data-testid="wf-delivery-row-why"]').text()
    expect(why).toContain('SocketException')
    expect(why).not.toBe(translations.no.wf_delivery_reason_no_push_registration)
  })

  test('the screen says we hold no address at all, without ever printing one', async () => {
    behaviour.rows = [row({ targetLabel: '[none]', lastError: 'NoSmsTarget', channel: 'Sms' })]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-gaveup"], [data-testid="wf-delivery-retrying"]').exists()).toBe(true)
    expect(page.text()).toContain(translations.no.wf_delivery_no_address)
    // C7-adjacent: the model carries a PRESENCE label and never a phone number or an e-mail, and
    // nothing on this page reaches for one.
    expect(page.text()).not.toMatch(/\+\d{6,}|@[\w.-]+\.\w+/)
  })

  test('a row whose address is merely redacted is not reported as addressless', async () => {
    behaviour.rows = [row({ targetLabel: '[redacted]' })]
    const page = await openPage()

    expect(page.text()).not.toContain(translations.no.wf_delivery_no_address)
  })
})

// ---- the roster is a decoration, never a precondition ---------------------------------------------

describe('naming the worker', () => {
  test('a roster that failed still leaves the dead letter on screen, unnamed', async () => {
    behaviour.rosterFails = new Error('network')
    behaviour.rows = [row({ status: 'DeadLettered', deadLetteredAtUtc: '2026-08-04T10:00:00' })]
    const page = await openPage()

    // Dropping the page would hide a real dead letter behind an unrelated failure.
    expect(page.find('[data-testid="wf-delivery-gaveup-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-delivery-row-name"]').text())
      .toBe(translations.no.wf_delivery_unnamed)
  })

  test('a worker the roster cannot name is said to be unnamed, never called "Unknown"', async () => {
    behaviour.roster = [{ staffMemberId: 's-9', displayName: 'Somebody Else' }]
    behaviour.rows = [row({ staffMemberId: 's-1' })]
    const page = await openPage()

    expect(page.find('[data-testid="wf-delivery-row-name"]').text())
      .toBe(translations.no.wf_delivery_unnamed)
    expect(page.text()).not.toContain('Somebody Else')
  })
})
