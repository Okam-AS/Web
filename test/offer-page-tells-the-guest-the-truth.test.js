import { mount } from '@vue/test-utils'
import { globalMixin } from '~/plugins/global-mixin'
import OfferCodePage from '~/pages/offer/_code.vue'

// The SHIPPED price formatter, borrowed rather than re-implemented: OfferDocument renders every
// amount through `priceLabel`, and a hand-written stub would let this file pass against a formatter
// the guest never sees (the trap price-absence.test.js was written for). The mixin is not installed
// wholesale because it declares `_offerProposalService` as a COMPUTED, which `mocks` cannot override
// — Vue warns "assigned to but it has no setter" and the real service runs instead of the stub.
const priceLabel = globalMixin.methods.priceLabel

// The one page in this product operated by someone who has never seen it. She arrives from a link,
// cannot log in, cannot navigate anywhere useful, and cannot recover from a wrong state — so every
// sentence it prints has to be one it can actually stand behind.
//
// WHAT THE SERVER ACTUALLY TELLS THIS PAGE, because both defects come from over-reading it.
// `GET /offerproposals/{code}` answers 404 for an anonymous guest when the offer is expired, OR
// withdrawn, OR registered, OR accepted more than an hour ago, OR simply unknown
// (Services/OfferProposalService.cs:104-123 → Controllers/OfferProposalsController.cs:85). Core's
// `TryParseResponse` then collapses 404, 500 and "the request never reached the server" into
// `undefined`, and `GetByCode` turns that into `new Error('Failed to get offer proposal')`. Six
// causes arrive as one untyped error carrying no status.
//
// So the page CANNOT know why a load failed, and the fix is not to guess better — it is to stop
// guessing. Expiry is claimed only where it is provable: on an offer that loaded, carrying an
// `expiration` that has passed.

const PROPOSAL = {
  offerProposalId: 'op-1',
  code: 'OFF-1',
  clientPhoneNumber: '+47 400 00 001',
  expiration: '2999-01-01T00:00:00',
  accepted: null,
  lineItems: [{ name: 'Kassaterminal', quantity: 1, monthlyFee: 49900, onetimeFee: 0 }]
}

// `_offerProposalService` is a COMPUTED on the global mixin, so it must be overridden as a computed:
// `mocks` cannot replace one (Vue warns "assigned to but it has no setter") and the REAL service runs
// instead — which fails on `currentUser` and lands in the very error branch these tests assert. Two of
// them passed that way before this was fixed, for entirely the wrong reason.
function mountPage (service, code = 'OFF-1') {
  const stub = {
    GetByCode: () => Promise.resolve(PROPOSAL),
    MarkAsRead: () => Promise.resolve(true),
    SendVerificationToken: () => Promise.resolve(true),
    AcceptOfferWithVerification: () => Promise.resolve({ ...PROPOSAL, accepted: '2026-08-07T12:00:00Z' }),
    ...service
  }
  return mount(OfferCodePage, {
    computed: { _offerProposalService: () => stub },
    mocks: {
      $route: { params: { code } },
      $store: { dispatch: () => {}, subscribe: () => {} },
      priceLabel
    },
    stubs: { TermsModal: true }
  })
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('a load failure is not an expired offer', () => {
  test('a network blip does not tell the guest the offer expired', async () => {
    // The blip: axios rejects before the request reaches the server, and core hands the page an
    // untyped Error. Today this rendered "Tilbudet er utløpt", so a guest phoned the venue to have a
    // LIVE offer reissued and the venue had no way to know the offer had been fine all along.
    const wrapper = mountPage({ GetByCode: () => Promise.reject(new Error('Network Error')) })
    await flush()

    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="offer-expired"]').exists()).toBe(false)

    const shown = wrapper.find('[data-test="offer-load-failed"]').text()
    expect(shown).toContain('Vi klarte ikke å laste tilbudet')
    expect(shown).not.toContain('Tilbudet er utløpt')
    // It names both possibilities and asserts neither, which is exactly what the server licenses.
    expect(shown).toContain('nettforbindelsen')
    wrapper.destroy()
  })

  test('a 404 is not read as an expiry either, because five other things answer 404', async () => {
    const wrapper = mountPage({ GetByCode: () => Promise.reject(new Error('Failed to get offer proposal')) })
    await flush()

    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="offer-expired"]').exists()).toBe(false)
    // The WORDS, not just the marker. Asserting only the data-test survives a mutation that puts the
    // expiry copy straight back inside the same element, which is the defect returning intact.
    expect(wrapper.text()).not.toContain('Tilbudet er utløpt')
    expect(wrapper.text()).not.toContain('kontakt oss for å få et nytt tilbud')
    wrapper.destroy()
  })

  test('the failure offers a way out, because this guest has no other one', async () => {
    // She cannot log in and has nothing but the link she was sent. A retry that costs one tap is the
    // whole recovery path, and the second attempt is allowed to succeed.
    let attempt = 0
    const wrapper = mountPage({
      GetByCode: () => {
        attempt += 1
        return attempt === 1 ? Promise.reject(new Error('Network Error')) : Promise.resolve(PROPOSAL)
      }
    })
    await flush()
    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(true)

    wrapper.find('[data-test="offer-retry"]').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(false)
    wrapper.destroy()
  })

  test('the detail the page computed is rendered instead of being thrown away', async () => {
    const wrapper = mountPage({ GetByCode: () => Promise.reject(new Error('Network Error')) })
    await flush()

    expect(wrapper.find('[data-test="offer-load-failed-detail"]').text()).toBe('Network Error')
    wrapper.destroy()
  })

  test('an offer that DID load and has lapsed is the one place expiry is claimed', async () => {
    // Reachable: a KAM or PowerUser session is served an expired proposal rather than a 404, and any
    // offer can lapse while the page is open. The claim is made from the offer's own expiration.
    const wrapper = mountPage({
      GetByCode: () => Promise.resolve({ ...PROPOSAL, expiration: '2020-01-01T00:00:00' })
    })
    await flush()

    expect(wrapper.find('[data-test="offer-expired"]').text()).toContain('Tilbudet er utløpt')
    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(false)
    // Told, not locked out: an offer that lapses mid-acceptance must not swap the page out from
    // under her, and the document she was reading is still there.
    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    wrapper.destroy()
  })

  test('a live offer says nothing about expiry at all', async () => {
    const wrapper = mountPage({})
    await flush()

    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="offer-expired"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="offer-load-failed"]').exists()).toBe(false)
    wrapper.destroy()
  })
})

describe('accepting an offer cannot blank the page after the order is placed', () => {
  // The ordering is what makes this a blocker rather than a cosmetic bug: the damage lands on the far
  // side of the money. AcceptOfferWithVerification throws on anything but a 200 whose body parsed, so
  // reaching the assignment AT ALL means the server accepted the offer and the order exists.
  async function acceptWith (accepted) {
    const wrapper = mountPage({ AcceptOfferWithVerification: () => Promise.resolve(accepted) })
    await flush()
    wrapper.setData({ verificationSent: true, verificationCode: '123456' })
    await wrapper.vm.$nextTick()
    wrapper.vm.acceptOffer()
    await flush()
    await wrapper.vm.$nextTick()
    return wrapper
  }

  test('a 200 with an empty body confirms the order instead of erasing the page', async () => {
    // `response.data` of '' parses to '', which is not undefined, so core returns it and the page
    // assigned it. offerProposal became '' — falsy — and every branch of the template fell through:
    // no document, no confirmation, no error, nothing at all, with the order already placed.
    const wrapper = await acceptWith('')

    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ordren er bekreftet!')
    expect(wrapper.text().trim()).not.toBe('')
    wrapper.destroy()
  })

  test.each([
    ['an empty string', ''],
    ['null', null],
    ['false', false],
    ['a bare number', 0],
    ['a string body', 'OK']
  ])('%s never replaces the proposal', async (_label, body) => {
    const wrapper = await acceptWith(body)

    expect(typeof wrapper.vm.offerProposal).toBe('object')
    expect(wrapper.vm.offerProposal).not.toBeNull()
    expect(wrapper.vm.offerProposal.offerProposalId).toBe('op-1')
    expect(wrapper.vm.offerProposal.accepted).toBeTruthy()
    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    wrapper.destroy()
  })

  test('a real proposal body is still taken as the new truth', async () => {
    // The guard must not swallow the happy path: when the server does return the updated document,
    // that document is what the page shows.
    const wrapper = await acceptWith({ ...PROPOSAL, accepted: '2026-08-07T12:00:00Z', code: 'OFF-UPDATED' })

    expect(wrapper.vm.offerProposal.code).toBe('OFF-UPDATED')
    expect(wrapper.text()).toContain('Ordren er bekreftet!')
    wrapper.destroy()
  })

  test('a refused acceptance is still an error and does not claim the order went through', async () => {
    const wrapper = mountPage({
      AcceptOfferWithVerification: () => Promise.reject(new Error('Failed to accept offer proposal'))
    })
    await flush()
    wrapper.setData({ verificationSent: true, verificationCode: '000000' })
    await wrapper.vm.$nextTick()
    wrapper.vm.acceptOffer()
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.offerProposal.accepted).toBeFalsy()
    expect(wrapper.text()).not.toContain('Ordren er bekreftet!')
    wrapper.destroy()
  })
})
