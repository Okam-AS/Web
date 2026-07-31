import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the pages are
// imported, and `jest.mock` is hoisted above imports while a page import is not.
import ProposalPage from '~/pages/events/proposal/_token.vue'
import DepositPage from '~/pages/events/deposit/_token.vue'
import InquiryPage from '~/pages/events/inquiry/_store.vue'
import translations from '~/translations'

const mockCalls = []
let mockAnswers = {}

// The pages build their client in `created`, so the MODULE is mocked rather than an instance. Every
// call is recorded so a test can assert which requests a step issues, which is the part of these
// pages that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/events/events-guest-client', () => {
  const record = name => (...args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (typeof answer === 'function') { return answer(...args) }
    return Promise.resolve(answer === undefined ? null : answer)
  }
  class MockGuestService {}
  for (const name of ['GetProposal', 'AcceptProposal', 'DeclineProposal', 'GetDeposit', 'CreateInquiry']) {
    MockGuestService.prototype[name] = record(name)
  }
  return { EventsGuestService: MockGuestService, default: MockGuestService }
})

jest.mock('~/utils/public-store-client', () => {
  class MockStoreService {
    ResolveIdBySlug (slug) {
      mockCalls.push(['ResolveIdBySlug', slug])
      const answer = mockAnswers.ResolveIdBySlug
      return Promise.resolve(answer === undefined ? null : answer)
    }
  }
  return { PublicStoreService: MockStoreService, default: MockStoreService }
})

// eslint-disable-next-line import/order -- must come after the jest.mock above for the real class.
const { EventsApiError } = jest.requireActual('~/utils/events/events-client')

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const refuse = (status, body) => () => Promise.reject(new EventsApiError(status, body))
const no = key => translations.no[key]

const TOKEN = 'b0000000-0000-0000-0000-000000000001'

function proposal (overrides) {
  return Object.assign({
    token: TOKEN,
    eventTitle: 'Julebord',
    eventDate: '2026-12-05T00:00:00',
    guestCountPlanned: 40,
    versionNo: 2,
    status: 'Sent',
    currencyCode: 'NOK',
    totalMinor: 4500000,
    minimumSpendMinor: 0,
    roomFeeMinor: 250000,
    depositRequiredMinor: 1000000,
    termsText: 'Avbestilling senest 14 dager før.',
    expiresAtUtc: '2026-11-01T10:00:00',
    contentHash: 'a1b2c3d4e5f6',
    isActionable: true,
    isAmendment: false,
    lines: [
      { lineNo: 1, kind: 'Package', description: 'Julemeny', quantity: 40, unitPriceMinor: 100000, amountMinor: 4000000, vatRate: 0.25 },
      { lineNo: 2, kind: 'AddOn', description: 'Velkomstdrink', quantity: 40, unitPriceMinor: 12500, amountMinor: 500000, vatRate: 0.25 }
    ]
  }, overrides || {})
}

function mountProposal (params) {
  return mount(ProposalPage, {
    mocks: {
      $route: { params: Object.assign({ token: TOKEN }, params || {}) },
      $i18n: { locale: 'no' }
    }
  })
}

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {}
})

describe('the proposal a guest can answer', () => {
  test('the offer is drawn from what was sent, and the controls are offered', async () => {
    mockAnswers.GetProposal = proposal()
    const wrapper = mountProposal()
    await settled()

    const text = wrapper.text()
    expect(text).toContain('Julebord')
    expect(text).toContain('Julemeny')
    expect(text).toContain('40')
    expect(text).toContain('a1b2c3d4e5f6')
    expect(text).toContain(no('ev_guest_accept_heading'))
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(true)
  })

  // EV-02. The page renders the payload and computes no figure of its own, so the same answer draws
  // the same document every time. Two mounts of one payload must be indistinguishable.
  test('the same answer renders the same document twice over', async () => {
    mockAnswers.GetProposal = proposal()
    const first = mountProposal()
    await settled()
    const second = mountProposal()
    await settled()

    expect(second.text()).toBe(first.text())
  })

  test('the four money columns are shown side by side and never added up', async () => {
    mockAnswers.GetProposal = proposal()
    const wrapper = mountProposal()
    await settled()

    const text = wrapper.text()
    expect(text).toContain(no('ev_guest_total_lines'))
    expect(text).toContain(no('ev_guest_room_fee'))
    expect(text).toContain(no('ev_guest_deposit'))
    // 45 000 + 2 500 + 10 000 would be 57 500. No such figure is produced anywhere.
    expect(text).not.toContain('57')
  })

  test('a zero deposit reads as a venue that asks for none, not as a missing figure', async () => {
    mockAnswers.GetProposal = proposal({ depositRequiredMinor: 0 })
    const wrapper = mountProposal()
    await settled()
    expect(wrapper.text()).toContain(no('ev_guest_deposit_none'))
  })

  test('an amendment says so before the numbers', async () => {
    mockAnswers.GetProposal = proposal({ isAmendment: true })
    const wrapper = mountProposal()
    await settled()
    expect(wrapper.find('[data-test="amendment"]').text()).toBe(no('ev_guest_amendment'))
  })

  test('accepting sends the name and email, then re-reads rather than trusting its own answer', async () => {
    mockAnswers.GetProposal = proposal()
    mockAnswers.AcceptProposal = {
      publicId: 'e1',
      eventStatus: 'DepositPending',
      acceptedVersionNo: 2,
      proposalContentHash: 'a1b2c3d4e5f6',
      acceptedAtUtc: '2026-10-01T09:00:00',
      wasAmendment: false
    }
    const wrapper = mountProposal()
    await settled()

    wrapper.findAll('input').at(0).setValue('Kari Nordmann')
    wrapper.findAll('input').at(1).setValue('kari@example.no')
    wrapper.find('form').trigger('submit')
    await settled()

    const accept = mockCalls.find(c => c[0] === 'AcceptProposal')
    expect(accept[1]).toBe(TOKEN)
    expect(accept[2]).toEqual({ acceptorName: 'Kari Nordmann', acceptorEmail: 'kari@example.no' })
    expect(mockCalls.filter(c => c[0] === 'GetProposal').length).toBe(2)

    expect(wrapper.find('[data-test="accepted"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('a1b2c3d4e5f6')
  })

  test('an acceptance with no name is not sent at all', async () => {
    mockAnswers.GetProposal = proposal()
    const wrapper = mountProposal()
    await settled()

    wrapper.findAll('input').at(1).setValue('kari@example.no')
    wrapper.find('form').trigger('submit')
    await settled()

    expect(mockCalls.filter(c => c[0] === 'AcceptProposal').length).toBe(0)
    expect(wrapper.find('[data-test="accept-problems"]').text()).toBe(no('ev_guest_accept_needs_name'))
  })

  test('declining sends the note and reports it back', async () => {
    mockAnswers.GetProposal = proposal()
    mockAnswers.DeclineProposal = { publicId: 'e1', eventStatus: 'Lost', versionStatus: 'Declined', wasAmendment: false }
    const wrapper = mountProposal()
    await settled()

    wrapper.findAll('.eg-btn--ghost').at(0).trigger('click')
    await settled()
    wrapper.find('textarea').setValue('Vi fant et annet sted.')
    wrapper.findAll('form').at(1).trigger('submit')
    await settled()

    const decline = mockCalls.find(c => c[0] === 'DeclineProposal')
    expect(decline[2]).toEqual({ note: 'Vi fant et annet sted.' })
    expect(wrapper.find('[data-test="declined"]').exists()).toBe(true)
  })
})

describe('a proposal a guest can no longer answer', () => {
  // EV-03, the whole of it: the old link neither 404s nor shows new numbers. It shows what was sent
  // and says a newer offer exists, and it offers no control.
  test('a superseded token shows what was sent and says so, with no accept control', async () => {
    mockAnswers.GetProposal = proposal({ status: 'Superseded', isActionable: false })
    const wrapper = mountProposal()
    await settled()

    const text = wrapper.text()
    expect(text).toContain('Julemeny')
    expect(wrapper.find('[data-test="closed"]').text()).toContain(no('ev_guest_stance_superseded_heading'))
    expect(text).toContain(no('ev_guest_stance_superseded_body'))
    expect(text).not.toContain(no('ev_guest_accept_button'))
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })

  test('an expired token says the deadline passed, and offers nothing', async () => {
    mockAnswers.GetProposal = proposal({ status: 'Expired', isActionable: false })
    const wrapper = mountProposal()
    await settled()

    expect(wrapper.find('[data-test="closed"]').text()).toContain(no('ev_guest_stance_expired_heading'))
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })

  test('a version the sweep has not stamped yet is expired too, not open', async () => {
    mockAnswers.GetProposal = proposal({ status: 'Sent', isActionable: false })
    const wrapper = mountProposal()
    await settled()

    expect(wrapper.find('[data-test="closed"]').text()).toContain(no('ev_guest_stance_expired_heading'))
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })

  test('an already accepted token reports the guest\'s own act', async () => {
    mockAnswers.GetProposal = proposal({ status: 'Accepted', isActionable: false })
    const wrapper = mountProposal()
    await settled()

    expect(wrapper.find('[data-test="closed"]').text()).toContain(no('ev_guest_stance_accepted_heading'))
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })

  test('a status this page does not know offers nothing and quotes it verbatim', async () => {
    mockAnswers.GetProposal = proposal({ status: 'Marinating', isActionable: false })
    const wrapper = mountProposal()
    await settled()

    const closed = wrapper.find('[data-test="closed"]')
    expect(closed.text()).toContain(no('ev_guest_stance_unknown_heading'))
    expect(closed.text()).toContain('Marinating')
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })
})

describe('a refusal reaches the guest with its reason', () => {
  test('a supersede that happens between the read and the click is explained, not swallowed', async () => {
    let answered = 0
    mockAnswers.GetProposal = () => {
      answered += 1
      return Promise.resolve(answered === 1
        ? proposal()
        : proposal({ status: 'Superseded', isActionable: false }))
    }
    mockAnswers.AcceptProposal = refuse(409, {
      code: 'EVENTS_PROPOSAL_SUPERSEDED',
      detail: 'A newer version has been sent.'
    })

    const wrapper = mountProposal()
    await settled()
    wrapper.findAll('input').at(0).setValue('Kari')
    wrapper.findAll('input').at(1).setValue('kari@example.no')
    wrapper.find('form').trigger('submit')
    await settled()

    const refusal = wrapper.find('[data-test="refusal"]')
    expect(refusal.text()).toContain(no('ev_guest_refused_superseded'))
    // The server's own words, verbatim, beneath our sentence.
    expect(refusal.text()).toContain('A newer version has been sent.')
    // And the re-read has already replaced the page with the state that caused the refusal.
    expect(wrapper.find('.eg-btn--primary').exists()).toBe(false)
  })

  test('a wrong link and a dark module are two different pages', async () => {
    mockAnswers.GetProposal = refuse(404, { code: 'EVENTS_PROPOSAL_NOT_FOUND', detail: 'No such proposal.' })
    const missing = mountProposal()
    await settled()
    expect(missing.find('[data-test="not-found"]').exists()).toBe(true)

    mockAnswers.GetProposal = refuse(404, { code: 'EVENTS_DISABLED', detail: 'Events is not enabled.' })
    const dark = mountProposal()
    await settled()
    expect(dark.find('[data-test="unavailable"]').exists()).toBe(true)
    expect(dark.find('[data-test="not-found"]').exists()).toBe(false)
  })

  test('a read that fell over says so and offers a retry, and claims nothing about the offer', async () => {
    mockAnswers.GetProposal = () => Promise.reject(new Error('network down'))
    const wrapper = mountProposal()
    await settled()

    const unknown = wrapper.find('[data-test="unknown"]')
    expect(unknown.exists()).toBe(true)
    expect(unknown.text()).toContain('network down')
    expect(wrapper.text()).not.toContain('Julebord')
  })
})

describe('the deposit page', () => {
  const mountDeposit = () => mount(DepositPage, {
    mocks: { $route: { params: { token: TOKEN } }, $i18n: { locale: 'no' } }
  })

  test('an unpaid deposit with a provider link offers exactly that link', async () => {
    mockAnswers.GetDeposit = {
      status: 'Requested',
      amountMinor: 1000000,
      currencyCode: 'NOK',
      paymentType: 'Vipps',
      isExpired: false,
      providerRedirectUrl: 'https://vipps.example/pay/1',
      stripeClientSecret: null
    }
    const wrapper = mountDeposit()
    await settled()

    const pay = wrapper.find('[data-test="pay"]')
    expect(pay.attributes('href')).toBe('https://vipps.example/pay/1')
    expect(pay.text()).toContain('Vipps')
    expect(wrapper.find('[data-test="stance"]').text()).toBe(no('ev_guest_deposit_payable'))
  })

  test('a paid deposit says paid and offers no second payment', async () => {
    mockAnswers.GetDeposit = {
      status: 'Paid',
      amountMinor: 1000000,
      currencyCode: 'NOK',
      paymentType: 'Vipps',
      isExpired: true,
      providerRedirectUrl: 'https://vipps.example/pay/1'
    }
    const wrapper = mountDeposit()
    await settled()

    expect(wrapper.find('[data-test="stance"]').text()).toBe(no('ev_guest_deposit_paid'))
    expect(wrapper.find('[data-test="pay"]').exists()).toBe(false)
  })

  test('a Stripe secret renders no form, and says where to go instead', async () => {
    mockAnswers.GetDeposit = {
      status: 'Requested',
      amountMinor: 1000000,
      currencyCode: 'NOK',
      paymentType: 'Stripe',
      isExpired: false,
      stripeClientSecret: 'pi_1_secret_x'
    }
    const wrapper = mountDeposit()
    await settled()

    expect(wrapper.find('[data-test="stance"]').text()).toBe(no('ev_guest_deposit_rail_unsupported'))
    expect(wrapper.find('[data-test="pay"]').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('pi_1_secret_x')
  })

  // Every state the machine can reach is said in words a guest can act on, so the enum name adds
  // nothing. A state this page has no wording for is the exception: the word itself is what the
  // guest quotes to the venue.
  test('the raw status is printed only when there is no sentence for it', async () => {
    mockAnswers.GetDeposit = {
      status: 'Requested',
      amountMinor: 1000000,
      currencyCode: 'NOK',
      paymentType: 'Vipps',
      providerRedirectUrl: 'https://vipps.example/pay/1'
    }
    const plain = mountDeposit()
    await settled()
    expect(plain.find('[data-test="status-verbatim"]').exists()).toBe(false)

    mockAnswers.GetDeposit = { status: 'Marinating', amountMinor: 1000000, currencyCode: 'NOK' }
    const strange = mountDeposit()
    await settled()
    expect(strange.find('[data-test="status-verbatim"]').text()).toContain('Marinating')
    expect(strange.find('[data-test="stance"]').text()).toBe(no('ev_guest_deposit_status_unknown'))
  })

  test('a deposit link that matches nothing is its own sentence', async () => {
    mockAnswers.GetDeposit = refuse(404, { code: 'EVENTS_DEPOSIT_NOT_FOUND', detail: 'No such deposit.' })
    const wrapper = mountDeposit()
    await settled()
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })
})

describe('the public enquiry form', () => {
  const mountInquiry = store => mount(InquiryPage, {
    mocks: { $route: { params: { store } }, $i18n: { locale: 'no' } }
  })

  test('a numeric route parameter is the store id, and costs no lookup', async () => {
    const wrapper = mountInquiry('42')
    await settled()

    expect(mockCalls.filter(c => c[0] === 'ResolveIdBySlug').length).toBe(0)
    expect(wrapper.text()).toContain(no('ev_guest_inquiry_title'))
  })

  test('a slug is resolved through the one route that answers with an id and nothing else', async () => {
    mockAnswers.ResolveIdBySlug = 7
    const wrapper = mountInquiry('lyststedet')
    await settled()

    expect(mockCalls.find(c => c[0] === 'ResolveIdBySlug')[1]).toBe('lyststedet')
    expect(wrapper.text()).toContain(no('ev_guest_inquiry_title'))
  })

  test('a link with no venue shows no form at all', async () => {
    mockAnswers.ResolveIdBySlug = null
    const wrapper = mountInquiry('ingen-slik')
    await settled()

    expect(wrapper.find('[data-test="store-unknown"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  test('the store id is sent from the route and from nowhere else', async () => {
    mockAnswers.CreateInquiry = { publicId: 'p-1', status: 'Inquiry', message: 'Thanks' }
    const wrapper = mountInquiry('42')
    await settled()

    wrapper.setData({
      form: {
        title: 'Julebord',
        eventDate: '2026-12-05',
        startTime: '18:00',
        endTime: '23:00',
        guestCountPlanned: 40,
        contactName: 'Kari',
        contactEmail: 'kari@example.no',
        contactPhone: '',
        companyName: '',
        message: 'Vi er 40 stykker.'
      }
    })
    await settled()
    wrapper.find('form').trigger('submit')
    await settled()

    const sent = mockCalls.find(c => c[0] === 'CreateInquiry')[1]
    expect(sent.storeId).toBe(42)
    expect(sent.contactName).toBe('Kari')
    expect(sent.startTime).toBe('18:00')
    expect(sent.contactPhone).toBeNull()
    expect(wrapper.find('[data-test="sent"]').text()).toContain(no('ev_guest_inquiry_sent_heading'))
  })

  test('an incomplete enquiry is not sent', async () => {
    const wrapper = mountInquiry('42')
    await settled()
    wrapper.find('form').trigger('submit')
    await settled()

    expect(mockCalls.filter(c => c[0] === 'CreateInquiry').length).toBe(0)
    expect(wrapper.find('[data-test="problems"]').text()).toBe(no('ev_guest_inquiry_needs'))
  })

  // The rate limiter mockAnswers 429 with `{ message }` and no problem+json code. The client gives it
  // one, and the page tells the guest to wait rather than that their form was wrong.
  test('a throttled enquiry says to wait, not that the form was wrong', async () => {
    mockAnswers.CreateInquiry = refuse(429, { code: 'RATE_LIMITED', detail: 'Too many inquiries.' })
    const wrapper = mountInquiry('42')
    await settled()

    wrapper.setData({
      form: {
        title: '',
        eventDate: '2026-12-05',
        startTime: '',
        endTime: '',
        guestCountPlanned: 40,
        contactName: 'Kari',
        contactEmail: 'kari@example.no',
        contactPhone: '',
        companyName: '',
        message: ''
      }
    })
    await settled()
    wrapper.find('form').trigger('submit')
    await settled()

    const refusal = wrapper.find('[data-test="refusal"]')
    expect(refusal.text()).toContain(no('ev_guest_refused_rate_limited'))
    expect(refusal.text()).toContain('Too many inquiries.')
  })
})

describe('the guest reads in their own language', () => {
  test('switching language redraws the copy without touching the offer', async () => {
    mockAnswers.GetProposal = proposal()
    const wrapper = mountProposal()
    await settled()
    expect(wrapper.text()).toContain(no('ev_guest_accept_button'))

    wrapper.findAll('.eg-shell__lang').at(1).trigger('click')
    await settled()

    expect(wrapper.text()).toContain(translations.en.ev_guest_accept_button)
    expect(wrapper.text()).toContain('Julebord')
  })
})
