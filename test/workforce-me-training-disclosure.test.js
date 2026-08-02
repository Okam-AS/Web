import { mount } from '@vue/test-utils'
import WorkforceMePage from '~/pages/admin/workforce-me.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// THE WORKER REACHING THEIR OWN DISCLOSURE LOG, through the page rather than through the client.
//
// The route existing is one thing; a person being able to get to it is another, and the estate has
// shipped the first without the second four times. These tests drive the page: the tab is offered,
// the button calls the read, and the read is made with NO person named — because the subject branch
// resolves the person from the token and sending an id instead would take the store-admin branch a
// worker does not hold.

const calls = []
let mockDisclosures = null
let mockDisclosureFailure = null

jest.mock('~/utils/workforce-me/me-client', () => ({
  WorkforceMeService: class {
    GetMemberships () {
      return Promise.resolve([{
        staffMemberId: 'sm-1',
        storeId: 42,
        displayName: 'Anna Haugen',
        isActive: true,
        capabilityGrants: ['WorkforceSelf'],
        roleNames: ['Kokk']
      }])
    }

    GetSchedule () { return Promise.resolve({ items: [] }) }
    GetInbox () { return Promise.resolve({ items: [] }) }
    GetOpenAssignments () { return Promise.resolve({ items: [] }) }
    GetStoreContext () { return Promise.resolve({ timeZone: { id: 'Europe/Oslo' }, capabilities: ['WorkforceSelf'] }) }
  }
}))

jest.mock('~/utils/training/training-client', () => ({
  TrainingStoreService: class {
    GetDisclosures (storeId, personRef) {
      calls.push(['GetDisclosures', storeId, personRef])
      return mockDisclosureFailure ? Promise.reject(mockDisclosureFailure) : Promise.resolve(mockDisclosures)
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function mountPage () {
  return mount(WorkforceMePage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { adminLocale: 'no', currentUser: { id: 1, adminIn: [] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  calls.length = 0
  mockDisclosureFailure = null
  mockDisclosures = {
    storeId: 42,
    personRef: '44444444-4444-4444-4444-444444444444',
    readAsSubject: true,
    asOfUtc: '2026-08-02T10:00:00Z',
    disclosures: [
      {
        eventType: 'evidence.read',
        actorReference: 'manager-one',
        actorIsSubject: false,
        occurredAtUtc: '2026-08-01T09:00:00Z',
        payloadSnapshotJson: '{"disclosedCertificates":"1","disclosedCompletions":"2"}'
      },
      {
        eventType: 'disclosure-log.read',
        actorReference: 'manager-two',
        actorIsSubject: false,
        occurredAtUtc: '2026-08-01T11:00:00Z',
        payloadSnapshotJson: '{"disclosedDisclosures":"1"}'
      }
    ]
  }
})

async function openTheTab (wrapper) {
  wrapper.setData({ tab: 'training' })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('the worker page reaches the training disclosure log', () => {
  test('the tab is offered and nothing is read until the worker asks', async () => {
    const wrapper = await openTheTab(mountPage())
    await settled()

    expect(wrapper.vm.tabs.map(t => t.key)).toContain('training')
    expect(wrapper.find('[data-test="wfme-training-load"]').exists()).toBe(true)

    // Opening the log APPENDS a row to the log, so a tab that fetched on open would grow this
    // worker's own access record every time they clicked past it.
    expect(calls).toEqual([])
    expect(wrapper.find('[data-test="disclosure-idle"]').exists()).toBe(true)
  })

  test('the read names the store and NO person, and renders what came back', async () => {
    const wrapper = await openTheTab(mountPage())
    await settled()

    wrapper.find('[data-test="wfme-training-load"]').trigger('click')
    await settled()
    await wrapper.vm.$nextTick()

    // Undefined, not the worker's own id: naming yourself takes the store-admin branch and is refused.
    expect(calls).toEqual([['GetDisclosures', 42, undefined]])

    const rows = wrapper.findAll('[data-test="disclosure-row"]')
    expect(rows).toHaveLength(2)
    expect(wrapper.find('[data-test="disclosure-summary"]').text()).toBe('2 oppslag, av 2 forskjellige.')
    expect(rows.at(1).text()).toContain(translations.no.trn_disclosure_event_log)

    // The worker's surface never offers a person field, so it cannot be aimed at a colleague.
    expect(wrapper.find('[data-test="disclosure-form"]').exists()).toBe(false)
  })

  test('a refusal is shown as a refusal, never as "nobody has looked at your record"', async () => {
    mockDisclosureFailure = new WorkforceApiError(403, { code: 'training.forbidden', detail: 'prose' })

    const wrapper = await openTheTab(mountPage())
    await settled()
    wrapper.find('[data-test="wfme-training-load"]').trigger('click')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="disclosure-refused"]').text())
      .toBe(translations.no.trn_disclosure_refused)
    expect(wrapper.find('[data-test="disclosure-empty"]').exists()).toBe(false)
  })

  test('an answered-and-empty log is its own screen: nobody has looked, and it says so', async () => {
    mockDisclosures = { storeId: 42, readAsSubject: true, disclosures: [] }

    const wrapper = await openTheTab(mountPage())
    await settled()
    wrapper.find('[data-test="wfme-training-load"]').trigger('click')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="disclosure-empty"]').text()).toBe(translations.no.trn_disclosure_empty)
    expect(wrapper.find('[data-test="disclosure-refused"]').exists()).toBe(false)
  })
})
