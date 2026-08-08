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
//
// Every stub call is RECORDED, and `mountPage` returns the log beside the wrapper, so a test can prove
// the stub was reached rather than assume it. That assumption is exactly what went wrong above: the
// real service also throws, into the same branch, so "the error state rendered" is evidence of nothing
// on its own.
function mountPage (service, code = 'OFF-1', proposal = PROPOSAL) {
  const calls = []
  const record = (name, fn) => (...args) => { calls.push(name); return fn(...args) }
  const base = {
    GetByCode: () => Promise.resolve(proposal),
    MarkAsRead: () => Promise.resolve(true),
    SendVerificationToken: () => Promise.resolve(true),
    AcceptOfferWithVerification: () => Promise.resolve({ ...proposal, accepted: '2026-08-07T12:00:00Z' }),
    ...service
  }
  const stub = Object.keys(base).reduce((acc, k) => ({ ...acc, [k]: record(k, base[k]) }), { calls })
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

// The wrapper's own view of which stub methods ran. `wrapper.vm._offerProposalService` IS the stub when
// the computed override took effect, and is the real service when it silently did not.
const callsOf = wrapper => wrapper.vm._offerProposalService.calls

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

// -------------------------------------------------------------------------------------------------
// The two remaining untruths, and one of them accuses the guest.
// -------------------------------------------------------------------------------------------------

const NO_PHONE = { ...PROPOSAL, clientPhoneNumber: null }

describe('an offer the venue left a phone number off', () => {
  test('the stub is genuinely the service under test, not the real one failing alike', async () => {
    // Inherited near-miss, asserted rather than assumed: `_offerProposalService` is a COMPUTED on the
    // global mixin and `mocks` cannot override a computed, so the REAL service runs, throws on
    // `currentUser`, and lands in the same error branch — two earlier tests passed exactly that way.
    // If the override ever stops taking effect, this reds instead of everything quietly still passing.
    const wrapper = mountPage({}, 'OFF-1', NO_PHONE)
    await flush()

    expect(callsOf(wrapper)).toContain('GetByCode')
    expect(wrapper.find('[data-test="offer-document"]').exists()).toBe(true)
    wrapper.destroy()
  })

  test('she is told before she acts, and told what to do instead', async () => {
    const wrapper = mountPage({}, 'OFF-1', NO_PHONE)
    await flush()

    const block = wrapper.find('[data-test="offer-no-phone"]')
    expect(block.exists()).toBe(true)
    // The WORDS, not the marker: a marker-shaped assertion on a page whose markers this lane added
    // survives the copy being replaced by anything at all, including the accusation.
    expect(block.text()).toContain('kan ikke bekreftes med SMS')
    expect(block.text()).toContain('Kontakt oss')
    // And the thing she is asked to quote is on screen, not only in the URL she arrived from.
    expect(wrapper.find('[data-test="offer-no-phone-code"]').text()).toContain('OFF-1')
    wrapper.destroy()
  })

  test('the button that could only ever fail is not offered', async () => {
    const wrapper = mountPage({}, 'OFF-1', NO_PHONE)
    await flush()

    // `Bekreft` starts a send that cannot succeed: there is no number to send to.
    expect(wrapper.text()).not.toContain('Bekreft')
    expect(wrapper.find('.acceptance-checkbox').exists()).toBe(false)
    wrapper.destroy()
  })

  test('pressing send anyway raises no TypeError and reaches no service call', async () => {
    // The dereference that threw: `clientPhoneNumber.replace(...)`. The guard makes it impossible
    // rather than merely unreached, so the method is called directly here, past the template.
    const wrapper = mountPage({}, 'OFF-1', NO_PHONE)
    await flush()
    wrapper.setData({ termsAccepted: true })

    await expect(wrapper.vm.sendVerification()).resolves.toBeUndefined()

    expect(callsOf(wrapper)).not.toContain('SendVerificationToken')
    expect(wrapper.vm.errorMessage).not.toContain('TypeError')
    expect(wrapper.vm.errorMessage).toContain('mobilnummer')
    wrapper.destroy()
  })

  test('and accepting anyway does not tell her the code was wrong', async () => {
    // THE ACCUSATION. The TypeError landed in acceptOffer's catch, which set errorWrongCode — so a
    // guest who typed her code correctly was told she had not, over a blank field the venue owns and
    // she has never seen.
    const wrapper = mountPage({}, 'OFF-1', NO_PHONE)
    await flush()
    wrapper.setData({ verificationSent: true, verificationCode: '123456' })

    await expect(wrapper.vm.acceptOffer()).resolves.toBeUndefined()

    expect(callsOf(wrapper)).not.toContain('AcceptOfferWithVerification')
    expect(wrapper.vm.errorMessage).not.toContain('Koden ble ikke godtatt')
    expect(wrapper.vm.errorMessage).not.toContain('Feil verifiseringskode')
    expect(wrapper.vm.errorMessage).toContain('mobilnummer')
    wrapper.destroy()
  })

  test('a number that is only whitespace is an absent one', async () => {
    const wrapper = mountPage({}, 'OFF-1', { ...PROPOSAL, clientPhoneNumber: '   ' })
    await flush()

    expect(wrapper.find('[data-test="offer-no-phone"]').exists()).toBe(true)
    wrapper.destroy()
  })

  test('an offer that HAS a number is still offered the confirm button', async () => {
    // The converse, so the fix cannot be satisfied by never offering acceptance again.
    const wrapper = mountPage({})
    await flush()

    expect(wrapper.find('[data-test="offer-no-phone"]').exists()).toBe(false)
    expect(wrapper.find('.acceptance-checkbox').exists()).toBe(true)
    expect(wrapper.text()).toContain('Bekreft')
    wrapper.destroy()
  })
})

describe('a failed send is not an English stack-trace string', () => {
  test('core’s developer-facing message never reaches the guest', async () => {
    const wrapper = mountPage({
      SendVerificationToken: () => Promise.reject(new Error('Failed to send verification token'))
    })
    await flush()
    wrapper.setData({ termsAccepted: true })
    await wrapper.vm.sendVerification()
    await wrapper.vm.$nextTick()

    expect(callsOf(wrapper)).toContain('SendVerificationToken')
    expect(wrapper.vm.errorMessage).not.toContain('Failed to send verification token')
    // The localised sentence that was sitting beside it the whole time, and a next step.
    expect(wrapper.vm.errorMessage).toContain('Kunne ikke sende verifiseringskode')
    expect(wrapper.find('.error-message').text()).toBe(wrapper.vm.errorMessage)
    wrapper.destroy()
  })

  test('nor does a TypeError thrown inside the send path', async () => {
    const wrapper = mountPage({
      SendVerificationToken: () => { throw new TypeError('Cannot read properties of null (reading ‘x’)') }
    })
    await flush()
    wrapper.setData({ termsAccepted: true })
    await wrapper.vm.sendVerification()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.errorMessage).not.toContain('Cannot read properties')
    expect(wrapper.vm.errorMessage).not.toContain('TypeError')
    wrapper.destroy()
  })

  test('a refused acceptance says what she can do, without asserting why it failed', async () => {
    // Core collapses a wrong code, a 500 and a dead connection into one untyped Error, so "wrong code"
    // was a guess at a cause this page cannot know — the same rule the previous lane established.
    const wrapper = mountPage({
      AcceptOfferWithVerification: () => Promise.reject(new Error('Failed to accept offer proposal'))
    })
    await flush()
    wrapper.setData({ verificationSent: true, verificationCode: '000000' })
    await wrapper.vm.acceptOffer()
    await wrapper.vm.$nextTick()

    expect(callsOf(wrapper)).toContain('AcceptOfferWithVerification')
    expect(wrapper.vm.errorMessage).not.toContain('Failed to accept')
    expect(wrapper.vm.errorMessage).not.toContain('Feil verifiseringskode')
    expect(wrapper.vm.errorMessage).toContain('Kontakt oss')
    wrapper.destroy()
  })
})
