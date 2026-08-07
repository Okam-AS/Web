import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforcePublicationList from '~/components/admin/workforce/WorkforcePublicationList.vue'
import WorkforcePublicationRecipients from '~/components/admin/workforce/WorkforcePublicationRecipients.vue'
import WorkforcePublicationReceiptGroup from '~/components/admin/workforce/WorkforcePublicationReceiptGroup.vue'
import WorkforceDeliveryGroup from '~/components/admin/workforce/WorkforceDeliveryGroup.vue'
import WorkforceDeliveryPanel from '~/components/admin/workforce/WorkforceDeliveryPanel.vue'
import { listPublications, summariseRecipients, decorateRecipient } from '~/utils/workforce/publication-receipts'
import { summarise, decorate } from '~/utils/workforce/delivery-failures'

// The five publication/delivery components, at the level the PAGE tests cannot reach: what each one
// renders for a field the wire could not vouch for. Every fixture below is built by the SAME
// decorator the page uses, so a component pinned here cannot be pinned against a row shape the
// product never produces — the divergence this estate has paid for more than once.
//
// TIMEZONE: the stamp assertions are meaningful only under a non-UTC TZ, which is the convention
// this suite already runs under (see `workforce-rates-page.test.js`).

function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const mocks = { $i }

// ---- the history list ---------------------------------------------------------------------------

describe('a publication whose own fields the history could not vouch for', () => {
  const listOf = over => mount(WorkforcePublicationList, {
    mocks,
    propsData: {
      history: listPublications([Object.assign({
        schedulePublicationId: 'pub-1',
        publicationNumber: 4,
        publishedByActorReference: 'staff-9',
        publishedAtUtc: '2026-08-03T09:00:00Z',
        rangeStartUtc: '2026-08-04T00:00:00Z',
        rangeEndUtc: '2026-08-10T23:59:59Z',
        recipientCount: 3
      }, over || {})]),
      selectedId: null,
      loading: false
    }
  })

  test('a week whose dates are unreadable says so, rather than rendering as covering nothing', () => {
    const list = listOf({ rangeStartUtc: null, rangeEndUtc: null })
    expect(list.text()).toContain(translations.no.wf_pub_range_unknown)
  })

  test('a publication with no published-at says the time is unknown', () => {
    const list = listOf({ publishedAtUtc: null })
    expect(list.text()).toContain(translations.no.wf_pub_published_unknown)
  })

  test('a publication nobody is named for says so, and is not signed by a generic system', () => {
    // C4: a publication with no actor is not evidence, and this says which of the two it is.
    const list = listOf({ publishedByActorReference: null })
    expect(list.find('[data-testid="wf-publist-actor-pub-1"]').text())
      .toBe(translations.no.wf_pub_by_nobody)
  })

  test('a publication that names its actor prints the reference the server stamped', () => {
    const list = listOf()
    expect(list.find('[data-testid="wf-publist-actor-pub-1"]').text()).toContain('staff-9')
  })

  test('an unknown recipient count is said to be unknown, never rendered as nobody', () => {
    const list = listOf({ recipientCount: null })
    expect(list.find('[data-testid="wf-publist-addressed-pub-1"]').text())
      .toBe(translations.no.wf_pub_addressed_unknown)
    expect(list.find('[data-testid="wf-publist-addressed-pub-1"]').text()).not.toContain('0')
  })

  test('the count is ADDRESSED TO, never "reached" — writing a row is not reaching a person', () => {
    const list = listOf()
    expect(list.find('[data-testid="wf-publist-addressed-pub-1"]').text())
      .toBe(translations.no.wf_pub_addressed + ' 3')
  })

  test('the picked row is the one marked as picked, for a screen reader as well as an eye', () => {
    const list = mount(WorkforcePublicationList, {
      mocks,
      propsData: {
        history: listPublications([
          { schedulePublicationId: 'pub-1', publicationNumber: 4, recipientCount: 1 },
          { schedulePublicationId: 'pub-2', publicationNumber: 5, recipientCount: 1 }
        ]),
        selectedId: 'pub-2',
        loading: false
      }
    })
    expect(list.find('[data-testid="wf-publist-pick-pub-2"]').attributes('aria-pressed')).toBe('true')
    expect(list.find('[data-testid="wf-publist-pick-pub-1"]').attributes('aria-pressed')).toBe('false')
  })

  test('the refresh control is withheld while a read is already in flight', () => {
    const list = mount(WorkforcePublicationList, {
      mocks,
      propsData: { history: listPublications([]), selectedId: null, loading: true }
    })
    expect(list.find('[data-testid="wf-publist-refresh"]').attributes('disabled')).toBeDefined()
  })
})

// ---- the roster --------------------------------------------------------------------------------

describe('the roster for one publication', () => {
  test('a publication whose dates are unreadable is still named, without inventing a week', () => {
    const panel = mount(WorkforcePublicationRecipients, {
      mocks,
      propsData: {
        publication: { id: 'pub-1', superseded: false, addressed: 1, rangeStartUtc: null, rangeEndUtc: null },
        summary: summariseRecipients([], 0),
        loading: false
      }
    })
    expect(panel.find('[data-testid="wf-pubrec-for"]').text())
      .toContain(translations.no.wf_pub_range_unknown)
  })

  test('while the roster is being read it says so, rather than showing an empty one', () => {
    const panel = mount(WorkforcePublicationRecipients, {
      mocks,
      propsData: {
        publication: { id: 'pub-1', superseded: false, addressed: 3, rangeStartUtc: null, rangeEndUtc: null },
        summary: summariseRecipients([], 3),
        loading: true
      }
    })
    expect(panel.find('[data-testid="wf-pubrec-loading"]').exists()).toBe(true)
    expect(panel.find('[data-testid="wf-pubrec-empty"]').exists()).toBe(false)
  })
})

describe('one attestation bucket', () => {
  const groupOf = (rows, tone) => mount(WorkforcePublicationReceiptGroup, {
    mocks,
    propsData: {
      tone: tone || 'good',
      testid: 'wf-pubrec-confirmed',
      title: 'T',
      body: 'B',
      rows: rows.map(decorateRecipient)
    }
  })

  test('a worker who never claimed a login is marked, so an empty row is not read as indifference', () => {
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: null,
      deliveryState: 'Delivered'
    }])
    expect(group.find('[data-testid="wf-pubrec-confirmed-unclaimed"]').text())
      .toBe(translations.no.wf_pub_rec_unclaimed)
  })

  test('a worker who did claim a login carries no such excuse', () => {
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: 'u-1',
      deliveryState: 'Delivered'
    }])
    expect(group.find('[data-testid="wf-pubrec-confirmed-unclaimed"]').exists()).toBe(false)
  })

  test('a recipient the backend could not name is said to be unnamed, never called "Unknown"', () => {
    const group = groupOf([{ publicationRecipientId: 'r-1', staffDisplayName: null, claimedByApplicationUserId: 'u-1' }])
    expect(group.text()).toContain(translations.no.wf_pub_rec_unnamed)
  })

  test('a delivery state this build does not know is shown VERBATIM and marked as unrecognised', () => {
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: 'u-1',
      deliveryState: 'Quarantined'
    }])
    // Defaulting it into a state this build understands would let a future value read as a send
    // that went fine.
    expect(group.text()).toContain('Quarantined')
    expect(group.text()).toContain(translations.no.wf_pub_rec_send_unrecognised)
  })

  test('a known delivery state is translated and NOT marked unrecognised', () => {
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: 'u-1',
      deliveryState: 'Delivered'
    }])
    expect(group.text()).toContain(translations.no.wf_pub_rec_send_delivered)
    expect(group.text()).not.toContain(translations.no.wf_pub_rec_send_unrecognised)
  })

  test('the timestamp shown is the one that put the row in THIS bucket, not the newest one', () => {
    // A confirmed row that was ALSO hand-delivered later shows the confirmation. Showing the
    // manager's own later note would quietly restate a worker's confirmation as a manager's.
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: 'u-1',
      acknowledgedAtUtc: '2026-08-03T10:00:00Z',
      manuallyDeliveredAtUtc: '2026-08-05T10:00:00Z'
    }])
    expect(group.text()).toContain(new Date('2026-08-03T10:00:00Z').toLocaleString())
    expect(group.text()).not.toContain(new Date('2026-08-05T10:00:00Z').toLocaleString())
  })

  test('a row nobody attested anything about carries no timestamp at all', () => {
    const group = groupOf([{
      publicationRecipientId: 'r-1', staffDisplayName: 'Ada', claimedByApplicationUserId: 'u-1',
      deliveryState: 'Delivered'
    }], 'stop')
    expect(group.text()).not.toMatch(/\d{1,2}[./]\d{1,2}[./]\d{4}/)
  })
})

// ---- the delivery groups --------------------------------------------------------------------------

describe('one tier of undelivered notifications', () => {
  const groupOf = (rows, roster) => mount(WorkforceDeliveryGroup, {
    mocks,
    propsData: {
      title: 'T', body: 'B', tone: 'stop', testid: 'wf-delivery-gaveup',
      rows: rows.map(r => decorate(r, roster || null))
    }
  })

  test('a bare UTC stamp is read as UTC, not as the reader\'s own clock', () => {
    // The backend sends `DateTime` without a designator on this model. A bare parse would put a
    // next attempt an hour away an hour in the PAST for a Norwegian reader.
    const group = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', attemptCount: 1, maxAttempts: 5,
      nextAttemptUtc: '2026-08-04T10:00:00', lastError: 'NoPushRegistration'
    }])
    expect(group.text()).toContain(new Date('2026-08-04T10:00:00Z').toLocaleString())
  })

  test('a stamp that already names its zone is not shifted a second time', () => {
    const group = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', attemptCount: 1, maxAttempts: 5,
      nextAttemptUtc: '2026-08-04T10:00:00Z', lastError: 'NoPushRegistration'
    }])
    expect(group.text()).toContain(new Date('2026-08-04T10:00:00Z').toLocaleString())
  })

  test('a stamp that cannot be parsed is shown as it arrived, rather than as an invalid date', () => {
    const group = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', attemptCount: 1, maxAttempts: 5,
      nextAttemptUtc: 'not-a-date', lastError: 'NoPushRegistration'
    }])
    expect(group.text()).toContain('not-a-date')
    expect(group.text()).not.toContain('Invalid Date')
  })

  test('a row with no reason at all still says it is unexplained rather than saying nothing', () => {
    const group = groupOf([{
      notificationOutboxId: 'o-1', status: 'DeadLettered', attemptCount: 5, maxAttempts: 5,
      deadLetteredAtUtc: '2026-08-04T10:00:00', lastError: null
    }])
    expect(group.find('[data-testid="wf-delivery-row-why"]').text().length).toBeGreaterThan(0)
  })

  test('the attempt budget is printed only when BOTH halves of it are known', () => {
    const known = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', attemptCount: 2, maxAttempts: 5,
      lastError: 'NoPushRegistration'
    }])
    expect(known.text()).toContain($i('wf_delivery_attempts', { count: 2, max: 5 }))

    // Half a budget is not a budget. "Forsøk 2 av {max}" on screen is worse than no line at all, so
    // the assertion is on the sentence's own opening rather than on the fully-filled string — which
    // an unfilled `{max}` would satisfy while the hole was still showing.
    const unknown = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', attemptCount: 2, maxAttempts: null,
      lastError: 'NoPushRegistration'
    }])
    expect(unknown.text()).not.toContain(translations.no.wf_delivery_attempts.split('{')[0].trim())
    expect(unknown.text()).not.toContain('{max}')
  })

  test('the channel a send was attempted on is shown beside the worker', () => {
    const group = groupOf([{
      notificationOutboxId: 'o-1', status: 'Failed', channel: 'Sms', attemptCount: 1, maxAttempts: 5,
      lastError: 'NoSmsTarget', staffMemberId: 's-1'
    }], [{ staffMemberId: 's-1', name: 'Ada Lovelace' }])
    expect(group.text()).toContain('Sms')
    // `name` is the second roster shape the decorator accepts; a component pinned only against
    // `displayName` would pass while half the real rosters rendered unnamed.
    expect(group.find('[data-testid="wf-delivery-row-name"]').text()).toBe('Ada Lovelace')
  })
})

describe('the delivery panel', () => {
  test('the refresh control is withheld while a read is already in flight', () => {
    const panel = mount(WorkforceDeliveryPanel, {
      mocks,
      propsData: { summary: summarise([], null), loading: true }
    })
    expect(panel.find('[data-testid="wf-delivery-refresh"]').attributes('disabled')).toBeDefined()
  })

  test('the refresh control asks the page to re-read, rather than reading itself', async () => {
    const panel = mount(WorkforceDeliveryPanel, {
      mocks,
      propsData: { summary: summarise([], null), loading: false }
    })
    await panel.find('[data-testid="wf-delivery-refresh"]').trigger('click')
    expect(panel.emitted().reload.length).toBe(1)
  })
})
