import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforcePublicationsPage from '~/pages/admin/workforce-publications.vue'

// CAN THIS VENUE SHOW THAT IT TOLD THE PEOPLE ON THE PLAN?
//
// `pages/admin/workforce-publications.vue` and the two components under it carried no test at all.
// Everything below is about what a manager sees: which of the two grants opens which half of the
// screen, what a failed read is allowed to claim, and — the point of the whole surface — that a
// manager's own note that they delivered a schedule by hand is never presented as the worker having
// confirmed it.
//
// Mounted FULLY, because every claim this file makes is a claim about a sentence on a screen.

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
      return Promise.resolve({
        capabilities: behaviour.capabilities || ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    GetPublicationHistory (storeId) {
      calls.push(['GetPublicationHistory', storeId])
      if (behaviour.historyFails) { return Promise.reject(behaviour.historyFails) }
      return Promise.resolve(behaviour.history === undefined ? [publication()] : behaviour.history)
    }

    GetRecipients (storeId, publicationId) {
      calls.push(['GetRecipients', publicationId])
      if (behaviour.recipientsFails) { return Promise.reject(behaviour.recipientsFails) }
      return Promise.resolve(behaviour.recipients || [])
    }
  }
}))

const publication = over => Object.assign({
  schedulePublicationId: 'pub-1',
  publicationNumber: 4,
  publishedByActorReference: 'staff-9',
  publishedAtUtc: '2026-08-03T09:00:00Z',
  rangeStartUtc: '2026-08-04T00:00:00Z',
  rangeEndUtc: '2026-08-10T23:59:59Z',
  recipientCount: 3,
  supersedesPublicationId: null
}, over || {})

const recipient = over => Object.assign({
  publicationRecipientId: 'r-1',
  staffMemberId: 's-1',
  staffDisplayName: 'Ada Lovelace',
  claimedByApplicationUserId: 'u-1',
  channel: 'Push',
  deliveryState: 'Delivered',
  seenAtUtc: null,
  acknowledgedAtUtc: null,
  manuallyDeliveredAtUtc: null,
  createdAtUtc: '2026-08-03T09:00:01Z'
}, over || {})

function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return mount(WorkforcePublicationsPage, {
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

// ---- the two grants, which are not one grant ---------------------------------------------------

describe('the two halves of the screen open independently', () => {
  test('without the scheduler grant nothing is read and the refusal says so', async () => {
    behaviour.capabilities = ['WorkforceSelf']
    const page = await openPage()

    expect(page.find('[data-testid="wfp-refusal"]').text())
      .toContain(translations.no.wfp_no_capability)
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a scheduler sees the history but is TOLD the roster is manager-only, not shown an empty one', async () => {
    behaviour.capabilities = ['WorkforceScheduler']
    const page = await openPage()

    // The history is a scheduler call and the roster a manager call, so this state is real.
    expect(page.find('[data-testid="wf-publist-rows"]').exists()).toBe(true)
    expect(page.find('[data-testid="wfp-manager-only"]').text())
      .toContain(translations.no.wfp_manager_only)
    // An empty roster here would read as a publication that reached nobody.
    expect(page.find('[data-testid="wf-pubrec"]').exists()).toBe(false)
  })

  test('a scheduler without the manager grant never fires the recipient read behind the refusal', async () => {
    behaviour.capabilities = ['WorkforceScheduler']
    const page = await openPage()

    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    expect(calls.map(c => c[0])).not.toContain('GetRecipients')
  })

  test('a 403 on the context read names the grant, and any other failure does not', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    let page = await openPage()
    expect(page.find('[data-testid="wfp-blocker"]').text()).toBe(translations.no.wfp_no_capability)

    behaviour.contextFails = new Error('socket hang up')
    page = await openPage()
    expect(page.find('[data-testid="wfp-blocker"]').text()).toBe(translations.no.wfp_context_failed)
  })
})

// ---- unknown is never emptiness ----------------------------------------------------------------

describe('a read that did not answer says so', () => {
  test('a history read that failed never reads as "this store has never published"', async () => {
    behaviour.historyFails = new Error('network')
    const page = await openPage()

    expect(page.find('[data-testid="wf-publist-unknown"]').text())
      .toContain(translations.no.wf_pub_unknown_title)
    expect(page.find('[data-testid="wf-publist-empty"]').exists()).toBe(false)
  })

  test('a store that answered with no publications is a DIFFERENT sentence from one that failed', async () => {
    behaviour.history = []
    const page = await openPage()

    expect(page.find('[data-testid="wf-publist-empty"]').text())
      .toContain(translations.no.wf_pub_empty_title)
    expect(page.find('[data-testid="wf-publist-unknown"]').exists()).toBe(false)
  })

  test('a roster read that failed says the roster is unreadable, never that nobody was told', async () => {
    behaviour.recipientsFails = new Error('network')
    const page = await openPage()

    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-pubrec-unknown"]').text())
      .toContain(translations.no.wf_pub_rec_unknown_title)
    expect(page.find('[data-testid="wf-pubrec-empty"]').exists()).toBe(false)
  })

  test('before anything is picked the roster says so rather than showing zeroes', async () => {
    const page = await openPage()

    expect(page.find('[data-testid="wf-pubrec-idle"]').text())
      .toContain(translations.no.wf_pub_rec_idle_title)
  })
})

// ---- the judgement this whole surface exists to make --------------------------------------------

describe('a manager opens a published week to see who confirmed it', () => {
  test('a manager\'s own hand-delivery note is never counted as the worker confirming', async () => {
    behaviour.recipients = [
      recipient({ publicationRecipientId: 'r-1', staffDisplayName: 'Ada', acknowledgedAtUtc: '2026-08-03T10:00:00Z' }),
      recipient({ publicationRecipientId: 'r-2', staffDisplayName: 'Grace', manuallyDeliveredAtUtc: '2026-08-03T11:00:00Z' })
    ]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-pubrec-confirmed-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-pubrec-byhand-count"]').text()).toBe('1')
    // Grace is evidence about a manager, not about Grace. She must not appear under confirmed.
    expect(page.find('[data-testid="wf-pubrec-confirmed"]').text()).not.toContain('Grace')
  })

  test('a send every transport accepted lands with the rows that have no receipt at all', async () => {
    behaviour.recipients = [recipient({ deliveryState: 'Delivered' })]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    // `Delivered` is the hub accepting a message. It is not a person.
    expect(page.find('[data-testid="wf-pubrec-none-count"]').text()).toBe('1')
    expect(page.find('[data-testid="wf-pubrec-confirmed"]').exists()).toBe(false)
  })

  test('the roster names how many workers it could not name, rather than standing as the answer', async () => {
    // The publish wrote 3 recipient rows; the read can only name 2, because its inner join drops a
    // recipient whose staff member is gone.
    behaviour.recipients = [
      recipient({ publicationRecipientId: 'r-1', acknowledgedAtUtc: '2026-08-03T10:00:00Z' }),
      recipient({ publicationRecipientId: 'r-2', staffDisplayName: 'Grace' })
    ]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    const gap = page.find('[data-testid="wf-pubrec-short"]').text()
    expect(gap).toContain('3')
    expect(gap).toContain('2')
  })

  test('a roster that matches the publish count raises no gap', async () => {
    behaviour.history = [publication({ recipientCount: 1 })]
    behaviour.recipients = [recipient({ acknowledgedAtUtc: '2026-08-03T10:00:00Z' })]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-pubrec-short"]').exists()).toBe(false)
  })

  test('a replaced week is marked in the list AND warned about above its roster', async () => {
    behaviour.history = [
      publication({ schedulePublicationId: 'pub-2', publicationNumber: 5, supersedesPublicationId: 'pub-1' }),
      publication({ schedulePublicationId: 'pub-1', publicationNumber: 4 })
    ]
    behaviour.recipients = [recipient({ acknowledgedAtUtc: '2026-08-03T10:00:00Z' })]
    const page = await openPage()

    // EXACTLY one of the two rows. A list that marked both would tell a manager the week that is
    // actually in force has been replaced, which is the same lie one row over.
    expect(page.findAll('[data-testid="wf-publist-superseded"]').length).toBe(1)

    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    // Reading the roster first and the caveat afterwards is how a venue produces last week's
    // confirmations as this week's evidence.
    expect(page.find('[data-testid="wf-pubrec-superseded"]').text())
      .toBe(translations.no.wf_pub_rec_superseded)
  })

  test('the publication that replaced it carries no warning of its own', async () => {
    behaviour.history = [
      publication({ schedulePublicationId: 'pub-2', publicationNumber: 5, supersedesPublicationId: 'pub-1' }),
      publication({ schedulePublicationId: 'pub-1', publicationNumber: 4 })
    ]
    behaviour.recipients = [recipient({ acknowledgedAtUtc: '2026-08-03T10:00:00Z' })]
    const page = await openPage()

    await page.find('[data-testid="wf-publist-pick-pub-2"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-pubrec-superseded"]').exists()).toBe(false)
  })

  test('picking a second week asks the server about THAT week', async () => {
    behaviour.history = [publication({ schedulePublicationId: 'pub-2' }), publication()]
    const page = await openPage()

    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()
    await page.find('[data-testid="wf-publist-pick-pub-2"]').trigger('click')
    await settled()

    expect(calls.filter(c => c[0] === 'GetRecipients').map(c => c[1])).toEqual(['pub-1', 'pub-2'])
  })
})

// ---- refreshing the history ---------------------------------------------------------------------

describe('a manager refreshes the history', () => {
  test('a week that is gone from the fresh answer stops describing a roster', async () => {
    behaviour.recipients = [recipient({ acknowledgedAtUtc: '2026-08-03T10:00:00Z' })]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()
    expect(page.find('[data-testid="wf-pubrec-confirmed"]').exists()).toBe(true)

    behaviour.history = [publication({ schedulePublicationId: 'pub-9', publicationNumber: 9 })]
    await page.find('[data-testid="wf-publist-refresh"]').trigger('click')
    await settled()

    // The roster must never be left describing a publication this read did not return.
    expect(page.find('[data-testid="wf-pubrec-idle"]').exists()).toBe(true)
  })

  test('a week still present in the fresh answer keeps its roster on screen', async () => {
    behaviour.recipients = [recipient({ acknowledgedAtUtc: '2026-08-03T10:00:00Z' })]
    const page = await openPage()
    await page.find('[data-testid="wf-publist-pick-pub-1"]').trigger('click')
    await settled()

    await page.find('[data-testid="wf-publist-refresh"]').trigger('click')
    await settled()

    expect(page.find('[data-testid="wf-pubrec-confirmed"]').exists()).toBe(true)
  })
})
