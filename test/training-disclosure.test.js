import { mount } from '@vue/test-utils'
import TrainingDisclosurePanel from '~/components/admin/training/TrainingDisclosurePanel.vue'
import { TrainingStoreService } from '~/utils/training/training-client'
import { readDisclosures, disclosureRow, distinctReaders } from '~/utils/training/disclosure'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// WHO HAS LOOKED AT MY TRAINING RECORD — the surface for a fact the system has always captured and
// never been able to produce.
//
// Every world below has MORE THAN ONE READER and MORE THAN ONE KIND OF ENTRY. A screen tested
// against a log with a single row cannot tell "renders the log" from "renders the first thing it was
// given", and a reader count tested against one reader cannot tell a distinct count from a length.

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}
const mocks = { $i }

const STORE = 42
const PERSON = '44444444-4444-4444-4444-444444444444'

const evidenceRead = (actor, at, isSubject) => ({
  eventType: 'evidence.read',
  actorReference: actor,
  actorIsSubject: !!isSubject,
  occurredAtUtc: at,
  payloadSnapshotJson: '{"disclosedCertificates":"2","disclosedCompletions":"3","personRef":"' + PERSON + '"}'
})

const logRead = (actor, at, isSubject) => ({
  eventType: 'disclosure-log.read',
  actorReference: actor,
  actorIsSubject: !!isSubject,
  occurredAtUtc: at,
  payloadSnapshotJson: '{"disclosedDisclosures":"7","personRef":"' + PERSON + '"}'
})

const answered = disclosures => readDisclosures(
  { storeId: STORE, personRef: PERSON, readAsSubject: false, disclosures, asOfUtc: '2026-08-02T10:00:00Z' },
  null
)

describe('TrainingStoreService.GetDisclosures — the route, and the one parameter that must not be sent', () => {
  const originalFetch = global.fetch

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body))
    })
  }

  afterEach(() => { global.fetch = originalFetch })

  test('a named subject is asked for by id; an unnamed one sends NO parameter at all', async () => {
    const service = new TrainingStoreService({ bearerToken: 'tok-123' })

    respondWith(200, {})
    await service.GetDisclosures(STORE, PERSON)
    expect(global.fetch.mock.calls[0][0])
      .toBe('/training/stores/42/evidence/disclosures?personRef=' + PERSON)

    // The self-read. An empty `?personRef=` would bind Guid.Empty and take the store-admin branch,
    // which is precisely the branch a worker does not hold — so the parameter must be ABSENT.
    respondWith(200, {})
    await service.GetDisclosures(STORE)
    expect(global.fetch.mock.calls[0][0]).toBe('/training/stores/42/evidence/disclosures')
  })

  test('it is a read: no Idempotency-Key is minted for it', async () => {
    respondWith(200, {})
    await new TrainingStoreService({ bearerToken: 'tok-123' }).GetDisclosures(STORE)
    const [, init] = global.fetch.mock.calls[0]
    expect(init.method).toBe('GET')
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })
})

describe('readDisclosures — a refusal is never an empty log', () => {
  test('403 is REFUSED, and carries the code rather than an empty entry list', () => {
    const read = readDisclosures(null, new WorkforceApiError(403, { code: 'training.forbidden' }))
    expect(read.state).toBe('refused')
    expect(read.code).toBe('training.forbidden')
    expect(read.entries).toBeNull()
  })

  test('a transport failure is UNKNOWN — distinct from the refusal above and from an empty answer', () => {
    expect(readDisclosures(null, new Error('network')).state).toBe('unknown')
    expect(readDisclosures({ disclosures: [] }, null).state).toBe('answered')
    expect(readDisclosures({ disclosures: [] }, null).entries).toEqual([])
  })

  test('the counts come out of the ledger snapshot, and an unparseable one is null rather than zero', () => {
    const rows = readDisclosures({
      disclosures: [
        evidenceRead('u-1', '2026-08-01T09:00:00Z'),
        logRead('u-2', '2026-08-01T10:00:00Z'),
        { eventType: 'evidence.read', actorReference: 'u-3', payloadSnapshotJson: 'not json' }
      ]
    }, null).entries

    expect(rows[0].counts).toEqual({ completions: 3, certificates: 2, disclosures: null })
    expect(rows[1].counts).toEqual({ completions: null, certificates: null, disclosures: 7 })
    expect(rows[2].counts).toBeNull()
  })

  test('a zero in the snapshot survives as 0 — the string contract must not collapse it to absent', () => {
    const row = disclosureRow({ payloadSnapshotJson: '{"disclosedDisclosures":"0"}' })
    expect(row.counts.disclosures).toBe(0)
  })
})

describe('distinctReaders — how many people, not how many rows', () => {
  test('four rows by two people are two readers', () => {
    const entries = answered([
      evidenceRead('u-1', '2026-08-01T09:00:00Z'),
      evidenceRead('u-1', '2026-08-01T09:30:00Z'),
      evidenceRead('u-2', '2026-08-01T10:00:00Z'),
      logRead('u-2', '2026-08-01T11:00:00Z')
    ]).entries
    expect(entries).toHaveLength(4)
    expect(distinctReaders(entries)).toBe(2)
  })

  test('an entry with no actor is not counted as an unknown reader', () => {
    expect(distinctReaders([{ actorReference: 'u-1' }, { actorReference: null }])).toBe(1)
  })
})

describe('TrainingDisclosurePanel — what a person is shown, and what they are not', () => {
  const mountPanel = (log, props) => mount(TrainingDisclosurePanel, {
    mocks, propsData: Object.assign({ log }, props || {})
  })

  test('the log renders one row per entry, naming WHEN, the kind, and the size', () => {
    const wrapper = mountPanel(answered([
      evidenceRead('reader-one', '2026-08-01T09:00:00Z'),
      logRead('reader-two', '2026-08-01T10:00:00Z')
    ]))

    const rows = wrapper.findAll('[data-test="disclosure-row"]')
    expect(rows).toHaveLength(2)
    expect(rows.at(0).text()).toContain(translations.no.trn_disclosure_event_evidence)
    expect(rows.at(0).text()).toContain('3 gjennomføringer, 2 sertifikater')
    expect(rows.at(1).text()).toContain(translations.no.trn_disclosure_event_log)
    expect(rows.at(1).text()).toContain('7 oppføringer')

    expect(wrapper.find('[data-test="disclosure-summary"]').text()).toBe('2 oppslag, av 2 forskjellige.')
  })

  test('the actor is printed as the reference the ledger holds and is NEVER resolved to a name', () => {
    const wrapper = mountPanel(answered([evidenceRead('user-id-9f3', '2026-08-01T09:00:00Z')]))
    const actors = wrapper.findAll('[data-test="disclosure-actor"]')
    expect(actors).toHaveLength(1)
    expect(actors.at(0).text()).toBe('user-id-9f3')
    // The standing refusal, stated on screen rather than only in a code comment.
    expect(wrapper.find('[data-test="disclosure-no-names"]').text())
      .toBe(translations.no.trn_disclosure_no_names)
  })

  test('the one derived distinction: a read BY the subject is marked, and everyone else is not', () => {
    const wrapper = mountPanel(answered([
      evidenceRead('somebody-else', '2026-08-01T09:00:00Z', false),
      evidenceRead('the-subject', '2026-08-01T10:00:00Z', true)
    ]))
    expect(wrapper.findAll('[data-test="disclosure-actor-self"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="disclosure-actor-self"]').text())
      .toBe(translations.no.trn_disclosure_actor_self)
    expect(wrapper.findAll('[data-test="disclosure-actor"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="disclosure-actor"]').text()).toBe('somebody-else')
  })

  test('an unparseable snapshot prints the dash, never a zero', () => {
    const wrapper = mountPanel(answered([
      { eventType: 'evidence.read', actorReference: 'u-1', payloadSnapshotJson: 'not json' }
    ]))
    const cells = wrapper.find('[data-test="disclosure-row"]').findAll('td')
    expect(cells.at(3).text()).toBe('—')
  })

  test('A REFUSAL AND AN EMPTY LOG ARE DIFFERENT SCREENS, and the refusal says what it means', () => {
    const refused = mountPanel(readDisclosures(null, new WorkforceApiError(403, { code: 'training.forbidden' })))
    expect(refused.find('[data-test="disclosure-empty"]').exists()).toBe(false)
    expect(refused.find('[data-test="disclosure-refused"]').text())
      .toBe(translations.no.trn_disclosure_refused)

    const empty = mountPanel(answered([]))
    expect(empty.find('[data-test="disclosure-refused"]').exists()).toBe(false)
    expect(empty.find('[data-test="disclosure-empty"]').text()).toBe(translations.no.trn_disclosure_empty)

    const unknown = mountPanel(readDisclosures(null, new Error('network')))
    expect(unknown.find('[data-test="disclosure-unknown"]').text())
      .toBe(translations.no.trn_disclosure_unknown)
  })

  test('the worker surface offers no person field at all, so it cannot be pointed at a colleague', () => {
    const own = mountPanel(answered([]), { asksForAPerson: false })
    expect(own.find('[data-test="disclosure-form"]').exists()).toBe(false)
    expect(own.find('[data-test="disclosure-lookup"]').exists()).toBe(false)
    expect(own.find('.trn-disclosure__title').text()).toBe(translations.no.trn_disclosure_title_own)

    // The manager surface does, and it is the only difference between the two mounts.
    const manager = mountPanel(answered([]))
    expect(manager.find('[data-test="disclosure-form"]').exists()).toBe(true)
    expect(manager.find('.trn-disclosure__title').text()).toBe(translations.no.trn_disclosure_title)
  })

  test('the lookup refuses a malformed reference and emits nothing for it', async () => {
    const wrapper = mountPanel({ state: 'idle' })
    wrapper.setData({ personRef: 'not-a-guid' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="disclosure-person-malformed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="disclosure-lookup"]').attributes('disabled')).toBeTruthy()
    wrapper.find('[data-test="disclosure-form"]').trigger('submit')
    expect(wrapper.emitted('lookup')).toBeUndefined()

    wrapper.setData({ personRef: PERSON })
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="disclosure-form"]').trigger('submit')
    expect(wrapper.emitted('lookup')).toEqual([[PERSON]])
  })

  test('idle is a fourth state: nobody has asked yet, which is not a read that failed', () => {
    const wrapper = mountPanel({ state: 'idle' })
    expect(wrapper.find('[data-test="disclosure-idle"]').text()).toBe(translations.no.trn_disclosure_prompt)
    expect(wrapper.find('[data-test="disclosure-unknown"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="disclosure-answer"]').exists()).toBe(false)
  })
})
