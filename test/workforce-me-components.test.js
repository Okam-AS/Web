import { mount } from '@vue/test-utils'
import WorkforceOpenShiftCard from '~/components/admin/workforce-me/WorkforceOpenShiftCard.vue'
import WorkforcePublicationNotice from '~/components/admin/workforce-me/WorkforcePublicationNotice.vue'
import WorkforceShiftCard from '~/components/admin/workforce-me/WorkforceShiftCard.vue'
import translations from '~/translations'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo. Under
// TZ=UTC a browser-local parse and a UTC parse agree on every value below, so a green run would
// prove nothing at all. See the header of `utils/workforce-me/shift-view.js`.

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so a missing key
// fails the test rather than silently rendering the key name.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// BARE stamps: the shape #33 and #39 actually put on the wire. See the fixture note in
// `test/workforce-me-shift-view.test.js`.
const shift = over => Object.assign({
  shiftAssignmentId: 'a1',
  timeZoneId: 'Europe/Oslo',
  roleName: 'Kokk',
  publicationNumber: 4,
  startsUtc: '2026-07-28T06:00:00',
  endsUtc: '2026-07-28T14:00:00',
  localBusinessDate: '2026-07-28T00:00:00',
  unpaidBreakMinutes: 30,
  note: null
}, over)

const openShift = over => Object.assign({
  shiftAssignmentId: 'o1',
  roleName: 'Kokk',
  startsUtc: '2026-07-28T06:00:00',
  endsUtc: '2026-07-28T14:00:00',
  localBusinessDate: '2026-07-28T00:00:00',
  unpaidBreakMinutes: 30,
  alreadyRequested: false,
  exchangeId: null,
  candidateCount: 0,
  note: null
}, over)

describe('WorkforceShiftCard renders the store wall clock off a bare wire stamp', () => {
  const render = over => mount(WorkforceShiftCard, {
    propsData: { shift: shift(over), locale: 'nb-NO' },
    mocks: { $i }
  })

  test('06:00 on the wire is 08:00 in Oslo, not 06:00', () => {
    // The whole finding, at the surface the worker actually looks at. Parsed as browser-local on an
    // Oslo phone this card read "06:00–14:00" — the server's UTC digits shown as a wall clock.
    expect(render().find('.wfme-shift__range').text()).toBe('08:00–16:00')
  })

  test('the paid-time figure is the real duration', () => {
    expect(render().find('.wfme-shift__paid').text()).toContain('7t 30m')
  })

  test('a known zone carries no UTC warning', () => {
    expect(render().find('.wfme-shift__flag--warn').exists()).toBe(false)
  })

  test('an unknown zone is flagged and the times fall back to UTC', () => {
    const wrapper = render({ timeZoneId: null })
    expect(wrapper.find('.wfme-shift__flag--warn').text()).toBe(translations.no.wfme_zone_unknown)
    expect(wrapper.find('.wfme-shift__range').text()).toBe('06:00–14:00')
  })
})

describe('WorkforceOpenShiftCard is as honest about an unknown zone as the shift card', () => {
  const render = (over, timeZoneId) => mount(WorkforceOpenShiftCard, {
    propsData: {
      assignment: openShift(over),
      timeZoneId: timeZoneId === undefined ? 'Europe/Oslo' : timeZoneId,
      locale: 'nb-NO'
    },
    mocks: { $i }
  })

  test('a known zone renders the store wall clock off a bare stamp', () => {
    expect(render().find('.wfme-open__range').text()).toBe('08:00–16:00')
  })

  test('a known zone carries no UTC flag', () => {
    expect(render(undefined, 'Europe/Oslo').find('.wfme-open__flag').exists()).toBe(false)
  })

  test('a null zone renders UTC and SAYS so', () => {
    // The page's rule: when the store zone is unknown the card says the times are UTC rather than
    // quietly showing a wall clock it cannot stand behind. The zone is null exactly for a worker
    // with no published shift at that store in the window — the very person browsing open shifts —
    // so an unflagged card here is the honest-state failure at its most likely moment.
    const wrapper = render(undefined, null)
    expect(wrapper.find('.wfme-open__range').text()).toBe('06:00–14:00')
    expect(wrapper.find('.wfme-open__flag').text()).toBe(translations.no.wfme_zone_unknown)
  })

  test('a zone the runtime cannot resolve is flagged too, not just a missing one', () => {
    const wrapper = render(undefined, 'Not/AZone')
    expect(wrapper.find('.wfme-open__range').text()).toBe('06:00–14:00')
    expect(wrapper.find('.wfme-open__flag').exists()).toBe(true)
  })
})

describe('WorkforcePublicationNotice parses UTC and renders local', () => {
  const render = () => mount(WorkforcePublicationNotice, {
    propsData: {
      items: [{ inboxItemId: 'i1', schedulePublicationId: 'p1', createdAtUtc: '2026-07-20T08:00:00' }],
      receipts: { p1: { occurredAtUtc: '2026-07-20T09:00:00', alreadyAcknowledged: false } },
      locale: 'nb-NO'
    },
    mocks: { $i }
  })

  // These two instants are RENDERED in the runtime's own zone by design — an arrival time is not a
  // rostered wall clock. So the expectation is computed from the correct instant rather than
  // hard-coded to Oslo: hard-coding "10:00" would make the test fail under TZ=UTC even on correct
  // code, which is a test that lies. Under TZ=Europe/Oslo this resolves to 10:00 and the old
  // browser-local parse produced 08:00; under TZ=UTC the two parses coincide and it cannot
  // discriminate, which is the whole reason this suite is run under TZ=Europe/Oslo.
  const localLabel = utcIso => new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(utcIso))

  test('"published at" is the reader\'s local time, converted rather than relabelled', () => {
    // `createdAtUtc` is column-loaded, so it arrives bare. The old code read the bare string as
    // local and printed the UTC clock wearing a local label.
    expect(render().find('.wfme-pub__when').text()).toContain(localLabel('2026-07-20T08:00:00Z'))
  })

  test('the acknowledgement receipt time is converted the same way', () => {
    expect(render().find('.wfme-pub__receipt').text()).toContain(localLabel('2026-07-20T09:00:00Z'))
  })
})

describe('WorkforcePublicationNotice stops calling a confirmed row new', () => {
  // A row is kept on screen after it is acknowledged so the receipt has somewhere to render — see
  // `publicationsForNotice`. It arrives back from the server `isRead: true`, and the heading, the
  // lede, the unread dot and the mark-as-read button are all claims about an UNREAD row. This is the
  // component half only; that a worker actually sees the receipt is the workforce-week-run walk.
  const row = isRead => ({
    inboxItemId: 'i1', schedulePublicationId: 'p1', createdAtUtc: '2026-07-20T08:00:00', isRead
  })
  const render = (items, receipts) => mount(WorkforcePublicationNotice, {
    propsData: { items, receipts: receipts || {}, locale: 'nb-NO' },
    mocks: { $i }
  })

  const confirmed = () => render(
    [row(true)],
    { p1: { occurredAtUtc: '2026-07-20T09:00:00', alreadyAcknowledged: false } }
  )

  test('an acknowledged row still renders its receipt', () => {
    expect(confirmed().find('.wfme-pub__receipt').text()).toContain('Bekreftet mottatt')
  })

  test('the heading names the confirmation rather than announcing a new plan', () => {
    expect(confirmed().find('.wfme-pub__title').text()).toBe('Vaktplanen er bekreftet')
    expect(render([row(false)]).find('.wfme-pub__title').text()).toBe('Ny vaktplan publisert')
  })

  test('"you have not opened this yet" is withheld once nothing is unread', () => {
    expect(confirmed().find('.wfme-pub__lede').exists()).toBe(false)
    expect(render([row(false)]).find('.wfme-pub__lede').exists()).toBe(true)
  })

  test('the unread dot and the mark-as-read button go with the unread state', () => {
    const done = confirmed()
    expect(done.find('.wfme-pub__dot').exists()).toBe(false)
    expect(done.find('.wfme-pub__btn--ghost').exists()).toBe(false)
    const fresh = render([row(false)])
    expect(fresh.find('.wfme-pub__dot').exists()).toBe(true)
    expect(fresh.find('.wfme-pub__btn--ghost').exists()).toBe(true)
  })

  test('the acknowledge button stays, so the idempotent replay has a caller', () => {
    const buttons = confirmed().findAll('.wfme-pub__btn:not(.wfme-pub__btn--ghost)')
    expect(buttons.length).toBe(1)
  })

  test('the control on a confirmed row says it would confirm again, not confirm', () => {
    // A worker can hold two unread publications and every row carries this button. While both read
    // "Bekreft mottatt" the control that writes a FIRST acknowledgement of a week and the control
    // that only replays one were the same word — so a press could not be read before it was made.
    expect(confirmed().find('.wfme-pub__btn:not(.wfme-pub__btn--ghost)').text()).toBe('Bekreft på nytt')
    expect(render([row(false)]).find('.wfme-pub__btn:not(.wfme-pub__btn--ghost)').text())
      .toBe('Bekreft mottatt')
  })

  test('with one week confirmed and one not, exactly one control offers a first confirmation', () => {
    // The two-unread world, at the component. Whichever row a finger lands on, its own button says
    // which of the two acts it is.
    const items = [row(true), Object.assign(row(false), { inboxItemId: 'i2', schedulePublicationId: 'p2' })]
    const labels = render(items, { p1: { occurredAtUtc: '2026-07-20T09:00:00', alreadyAcknowledged: false } })
      .findAll('.wfme-pub__btn:not(.wfme-pub__btn--ghost)').wrappers.map(w => w.text())
    expect(labels).toEqual(['Bekreft på nytt', 'Bekreft mottatt'])
  })

  test('the wording follows the receipt, never the row\'s read state', () => {
    // `isRead` does not mean acknowledged — marking read does not imply confirmed — so a read row
    // this session holds no receipt for must still offer the FIRST confirmation.
    expect(render([row(true)]).find('.wfme-pub__btn:not(.wfme-pub__btn--ghost)').text())
      .toBe('Bekreft mottatt')
  })

  test('the count in the heading is the unread ones, not the ones on screen', () => {
    // Two rows, one of them already confirmed: announcing "2 nye" would count a plan the worker has
    // just confirmed as something they have not looked at.
    const items = [row(true), Object.assign(row(false), { inboxItemId: 'i2', schedulePublicationId: 'p2' })]
    expect(render(items).find('.wfme-pub__title').text()).toBe('Ny vaktplan publisert')
  })
})
