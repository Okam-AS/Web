import { mount } from '@vue/test-utils'
import OfferCodePage from '~/pages/offer/_code.vue'

// THE PAGE AT THE END OF A LINK IN AN OFFER.
//
// Whoever operates this screen has never seen the product, cannot sign in, and has no way back if it
// puts them in a state they did not intend — so every test here is named for what the PERSON does and
// asserts what they are told, not which method ran. The act at the end of it is a person confirming a
// binding order over an SMS code, which is why the refusal paths get as much attention as the happy
// one.
//
// This page carries NO `data-test` attributes — unlike the Meals statement surface beside it — so the
// selectors below ride on styling classes. That is recorded as a finding rather than fixed here: a
// restyle can break these tests without the product having changed.

const CODE = 'ORD-4417'
const PROPOSAL_ID = 91

const calls = []
let answers = {}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function proposal (over) {
  return Object.assign({
    offerProposalId: PROPOSAL_ID,
    code: CODE,
    accepted: false,
    clientName: 'Kari Nordmann',
    clientPhoneNumber: '+47 900 12 345',
    companyLegalName: 'Nordmann Kafe AS',
    expiration: '2026-09-30T00:00:00',
    lineItems: []
  }, over || {})
}

const service = {
  GetByCode (code) { calls.push(['GetByCode', code]); return answers.GetByCode(code) },
  MarkAsRead (id) { calls.push(['MarkAsRead', id]); return answers.MarkAsRead(id) },
  SendVerificationToken (id, model) { calls.push(['SendVerificationToken', id, model]); return answers.SendVerificationToken(id, model) },
  AcceptOfferWithVerification (id, model) { calls.push(['AcceptOfferWithVerification', id, model]); return answers.AcceptOfferWithVerification(id, model) }
}

const called = name => calls.filter(c => c[0] === name)

function mountPage (options) {
  const opts = options || {}
  return mount(OfferCodePage, {
    mocks: {
      $route: { params: { code: opts.code === undefined ? CODE : opts.code } },
      isCh: !!opts.isCh,
      _offerProposalService: service
    },
    stubs: {
      Loading: { template: '<div class="loading-stub" />' },
      TermsModal: {
        props: ['isVisible'],
        template: '<div class="terms-modal-stub" :class="{ open: isVisible }" />'
      },
      // The document itself is `components/shared/OfferDocument.vue`; this page's job is to hand it
      // the proposal and to hang the acceptance step in its slot, so the stub keeps the slot.
      OfferDocument: {
        props: ['offerProposal'],
        template: '<div class="offer-document-stub"><slot /></div>'
      }
    }
  })
}

async function loaded (options) {
  const w = mountPage(options)
  await settled()
  return w
}

// Ticks the box the way a person does, and lets the re-render land so the button beside it is live.
async function acceptTerms (w) {
  w.find('#accept-terms-confirm').setChecked(true)
  await w.vm.$nextTick()
}

async function press (w, selector) {
  w.find(selector).trigger('click')
  await settled()
}

async function reachCodeStep (w) {
  await acceptTerms(w)
  await press(w, '.btn-approve')
  return w
}

let scrolls
let originalScrollTo
let consoleError

beforeEach(() => {
  // The page logs its own failures. That is not what is under test here, and every refusal case
  // below deliberately produces one — so the tier's output stays readable.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  calls.length = 0
  answers = {
    GetByCode: () => Promise.resolve(proposal()),
    MarkAsRead: () => Promise.resolve(proposal()),
    SendVerificationToken: () => Promise.resolve(true),
    AcceptOfferWithVerification: () => Promise.resolve(proposal({ accepted: true }))
  }
  scrolls = []
  originalScrollTo = window.scrollTo
  window.scrollTo = opts => scrolls.push(opts)
})

afterEach(() => {
  window.scrollTo = originalScrollTo
  consoleError.mockRestore()
})

describe('a guest opening the link in their offer', () => {
  test('the order they were sent is on screen, and no acceptance has been claimed for them', async () => {
    const w = await loaded()
    expect(called('GetByCode')).toEqual([['GetByCode', CODE]])
    expect(w.find('.offer-document-stub').exists()).toBe(true)
    expect(w.findComponent({ name: 'OfferDocument' }).props('offerProposal').code).toBe(CODE)
    expect(w.find('.acceptance-container').exists()).toBe(true)
    expect(w.find('.acceptance-confirmed').exists()).toBe(false)
  })

  test('opening the link records that the offer was read, once', async () => {
    await loaded()
    expect(called('MarkAsRead')).toEqual([['MarkAsRead', PROPOSAL_ID]])
  })

  test('the guest waits on a spinner rather than an empty page while the offer is fetched', () => {
    let release
    answers.GetByCode = () => new Promise((resolve) => { release = resolve })
    const w = mountPage()
    expect(w.find('.loading-stub').exists()).toBe(true)
    expect(w.find('.error-container').exists()).toBe(false)
    release(proposal())
  })

  // A read receipt is not the offer. Failing to record it must not take the order away from the
  // person who was sent it.
  test('an offer that loaded is still readable when the read receipt fails', async () => {
    answers.MarkAsRead = () => Promise.reject(new Error('mark failed'))
    const w = await loaded()
    expect(w.find('.offer-document-stub').exists()).toBe(true)
    expect(w.find('.error-container').exists()).toBe(false)
  })

  test('an offer with no id on it is not reported as read', async () => {
    answers.GetByCode = () => Promise.resolve(proposal({ offerProposalId: null }))
    await loaded()
    expect(called('MarkAsRead').length).toBe(0)
  })

  test('an offer already accepted shows the confirmation and offers no second acceptance', async () => {
    answers.GetByCode = () => Promise.resolve(proposal({ accepted: true }))
    const w = await loaded()
    expect(w.find('.acceptance-confirmed').exists()).toBe(true)
    expect(w.find('.acceptance-container').exists()).toBe(false)
    expect(w.find('.btn-approve').exists()).toBe(false)
    expect(w.find('.success-message h2').text()).toBe('Ordren er bekreftet!')
  })
})

describe('the terms a guest is asked to confirm they have read', () => {
  test('pressing confirm without ticking the box refuses, and sends no SMS', async () => {
    const w = await loaded()
    await press(w, '.btn-approve')
    expect(w.find('.terms-warning').text()).toBe('Du må godta vilkårene og betingelsene før du kan fortsette')
    expect(called('SendVerificationToken').length).toBe(0)
    expect(w.find('.verification-step').exists()).toBe(false)
  })

  test('ticking the box takes the warning away again', async () => {
    const w = await loaded()
    await press(w, '.btn-approve')
    expect(w.find('.terms-warning').exists()).toBe(true)
    await acceptTerms(w)
    expect(w.find('.terms-warning').exists()).toBe(false)
  })

  test('the terms link opens the terms and does not tick the box for the guest', async () => {
    const w = await loaded()
    expect(w.find('.terms-modal-stub').classes()).not.toContain('open')
    await press(w, '.terms-link')
    expect(w.find('.terms-modal-stub').classes()).toContain('open')
    expect(w.find('#accept-terms-confirm').element.checked).toBe(false)
    expect(called('SendVerificationToken').length).toBe(0)
  })

  test('closing the terms leaves the guest where they were', async () => {
    const w = await loaded()
    await press(w, '.terms-link')
    w.findComponent({ name: 'TermsModal' }).vm.$emit('close')
    await w.vm.$nextTick()
    expect(w.find('.terms-modal-stub').classes()).not.toContain('open')
    expect(w.find('.acceptance-container').exists()).toBe(true)
  })
})

describe('the SMS code', () => {
  test('confirming sends the code to the number printed on the offer', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    expect(called('SendVerificationToken')).toEqual([
      ['SendVerificationToken', PROPOSAL_ID, { phoneNumber: '+47900 12345'.replace(/\s/g, '') }]
    ])
  })

  // The number is sent without its spacing. A guest reads `+47 900 12 345` on the offer; the API is
  // handed the number, not the way it was typeset.
  test('the number is sent without the spacing it is printed with', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    expect(called('SendVerificationToken')[0][2]).toEqual({ phoneNumber: '+4790012345' })
  })

  test('the guest is then shown which number the code went to', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    expect(w.find('.verification-step').exists()).toBe(true)
    expect(w.find('.verification-title').text()).toContain('+47 900 12 345')
    expect(w.find('.acceptance-container').exists()).toBe(false)
  })

  // On a phone the next field is below the fold. The page moves the guest to it rather than leaving
  // them looking at a button that appears to have done nothing.
  test('the guest is carried down to the field they now have to fill in', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    expect(scrolls.length).toBe(1)
    expect(scrolls[0].behavior).toBe('smooth')
  })

  test('the guest cannot submit until they have typed a code', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    expect(w.find('.btn-verify').attributes('disabled')).toBeTruthy()
    await press(w, '.btn-verify')
    expect(called('AcceptOfferWithVerification').length).toBe(0)
  })

  test('a guest who did not get the SMS can ask for it again without starting over', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    await press(w, '.btn-resend')
    expect(called('SendVerificationToken').length).toBe(2)
    expect(w.find('.verification-step').exists()).toBe(true)
  })

  // A server that answered but did not send leaves the guest ON the first step, told to try later —
  // never advanced to a code field for a message that is not coming.
  test('a code the server declined to send leaves the guest able to try again', async () => {
    answers.SendVerificationToken = () => Promise.resolve(false)
    const w = await loaded()
    await reachCodeStep(w)
    expect(w.find('.verification-step').exists()).toBe(false)
    expect(w.find('.acceptance-container .error-message').text())
      .toBe('Kunne ikke sende verifiseringskode. Vennligst prøv igjen senere.')
    expect(w.find('.btn-approve').exists()).toBe(true)
  })

  // The two send failures now say the SAME thing, and that is the fix rather than a regression. This
  // page used to distinguish a server that declined (`errorCouldNotSendCodeRetry`) from a request that
  // threw (`errorCouldNotSendCode`, the short one) — a distinction drawn from the shape of the failure
  // rather than from anything the guest can act on. Both mean "no code is coming, try later", so both
  // now carry the sentence that says so. This arm's own claim, that the guest is left on the first
  // step, is unchanged and still asserted.
  test('a send that failed outright also leaves the guest on the first step', async () => {
    answers.SendVerificationToken = () => Promise.reject(new Error(''))
    const w = await loaded()
    await reachCodeStep(w)
    expect(w.find('.verification-step').exists()).toBe(false)
    expect(w.find('.error-message').text())
      .toBe('Kunne ikke sende verifiseringskode. Vennligst prøv igjen senere.')
    expect(w.find('.btn-approve').exists()).toBe(true)
  })

  // A DOUBLE TAP ON A PHONE, modelled honestly: both taps land before Vue can re-render the button
  // into its disabled state, so the `disabled` binding cannot be what stops the second one. Two SMS
  // for one tap is the visible cost, and the guest is billed for neither but confused by both.
  test('a double tap sends one SMS, not two', async () => {
    let release
    answers.SendVerificationToken = () => new Promise((resolve) => { release = resolve })
    const w = await loaded()
    await acceptTerms(w)
    const button = w.find('.btn-approve')
    button.trigger('click')
    button.trigger('click')
    await w.vm.$nextTick()
    expect(called('SendVerificationToken').length).toBe(1)
    release(true)
    await settled()
  })
})

describe('confirming the order', () => {
  test('the code the guest typed is submitted with their number', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(called('AcceptOfferWithVerification')).toEqual([
      ['AcceptOfferWithVerification', PROPOSAL_ID, { phoneNumber: '+4790012345', verificationCode: '884120' }]
    ])
  })

  test('a correct code confirms the order and says so', async () => {
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(w.find('.acceptance-confirmed').exists()).toBe(true)
    expect(w.find('.success-message h2').text()).toBe('Ordren er bekreftet!')
    expect(w.find('.verification-step').exists()).toBe(false)
  })

  // THE ONE A GUEST CANNOT RECOVER FROM IF IT GOES WRONG. A mistyped code must leave them on the
  // code field with the code they typed still there, not send them back to the start and not claim
  // the order was confirmed.
  test('a wrong code is refused in place, and the guest can correct it', async () => {
    answers.AcceptOfferWithVerification = () => Promise.reject(new Error('400'))
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('000000')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(w.find('.verification-step').exists()).toBe(true)
    // The wording moved with this lane and the reason is the lane's whole subject: the old sentence
    // asserted the code was WRONG, which is a claim about the guest. It is also what a guest whose
    // code was right was told when the request failed for any other reason. The replacement says what
    // is known — the code was not accepted — and gives the two things she can do about it.
    expect(w.find('.verification-actions .error-message').text())
      .toBe('Koden ble ikke godtatt. Sjekk at den er riktig skrevet og prøv igjen. Kontakt oss med ordrenummeret ditt hvis det fortsetter.')
    expect(w.find('.acceptance-confirmed').exists()).toBe(false)
    expect(w.find('#verification-code').element.value).toBe('000000')
    expect(w.find('.btn-verify').attributes('disabled')).toBeFalsy()
  })

  test('a corrected code goes through and clears the earlier refusal', async () => {
    answers.AcceptOfferWithVerification = () => Promise.reject(new Error('400'))
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('000000')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(w.find('.error-message').exists()).toBe(true)
    answers.AcceptOfferWithVerification = () => Promise.resolve(proposal({ accepted: true }))
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(w.find('.acceptance-confirmed').exists()).toBe(true)
    expect(w.find('.error-message').exists()).toBe(false)
  })

  // While the corrected code is being checked, the guest must not still be reading "wrong code"
  // about the code they have already replaced. The stale refusal comes down when the retry starts,
  // not when it finishes.
  test('the refusal comes down the moment the guest retries, not when the retry answers', async () => {
    answers.AcceptOfferWithVerification = () => Promise.reject(new Error('400'))
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('000000')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(w.find('.error-message').exists()).toBe(true)

    let release
    answers.AcceptOfferWithVerification = () => new Promise((resolve) => { release = resolve })
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    w.find('.btn-verify').trigger('click')
    await w.vm.$nextTick()
    expect(called('AcceptOfferWithVerification').length).toBe(2)
    expect(w.find('.error-message').exists()).toBe(false)
    release(proposal({ accepted: true }))
    await settled()
  })

  // The same double tap on the button that PLACES THE ORDER. Both taps land in one tick, so the
  // disabled binding has not rendered yet and the guard is the only thing between one acceptance and
  // two.
  test('a double tap on confirm places one order, not two', async () => {
    let release
    answers.AcceptOfferWithVerification = () => new Promise((resolve) => { release = resolve })
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    const button = w.find('.btn-verify')
    button.trigger('click')
    button.trigger('click')
    await w.vm.$nextTick()
    expect(called('AcceptOfferWithVerification').length).toBe(1)
    release(proposal({ accepted: true }))
    await settled()
  })
})

describe('an offer the guest cannot open', () => {
  test('a link with no order number on it asks nothing of the server', async () => {
    const w = await loaded({ code: '' })
    expect(calls.length).toBe(0)
    expect(w.find('.loading-stub').exists()).toBe(false)
  })

  // THIS ARM USED TO ASSERT THE DEFECT. A server refusal is a load failure, not an expiry, and the
  // page said "Tilbudet er utløpt" to both — the exact thing `THE DEFECT: every load failure tells the
  // guest the offer EXPIRED` named one block below. The arm's own title is what gives it away: a page
  // the guest can ACT ON is not one telling her to ask for a new offer she does not need. It now
  // asserts the page that names the failure and offers the retry.
  test('an offer the server refuses puts up a page the guest can act on', async () => {
    answers.GetByCode = () => Promise.reject(new Error('Failed to get offer proposal'))
    const w = await loaded()
    expect(w.find('.error-container').exists()).toBe(true)
    expect(w.find('.error-container h2').text()).toBe('Vi klarte ikke å laste tilbudet')
    expect(w.find('.error-container').text()).toContain('Prøv igjen')
    expect(w.find('.offer-document-stub').exists()).toBe(false)
    expect(w.find('.loading-stub').exists()).toBe(false)
  })
})

// ---- THE FIVE FINDINGS, NOW ASSERTING THE FIX --------------------------------------------------
//
// These five were written as `THE DEFECT:` pins asserting the behaviour the page had at the time. The
// convention is that such a pin reds on the day the defect is fixed, and that day was `40ab62d` — so
// each has been CONVERTED here rather than deleted, and now asserts the corrected behaviour. Each
// keeps the description of what was wrong, because that is the part a reader needs to understand why
// the assertion below it is worth having.
//
// The five reds were expected. Four other arms in this file also redded, and those were not defect
// pins: two of them turned out to be asserting this same expired-for-everything defect from the
// outside, and two pinned wording the fix deliberately replaced. Their rulings are recorded beside
// them.
describe('the five findings, now fixed', () => {
  // WAS: the page composed a diagnosis for every load failure — `errorCouldNotLoad`, and
  // `errorNoOrderNumber` for a link with no code — assigned it to `error`, then rendered a DIFFERENT,
  // unconditional sentence: "the offer has expired, contact us for a new one". A guest whose network
  // dropped was told her offer expired; she asked the venue to reissue an offer that never expired.
  //
  // NOW: the failure is named for what it was, the diagnosis the page built actually reaches a pixel,
  // and the guest is offered the retry that is the only thing she can usefully do.
  test('a load failure says the offer could not be loaded, and shows what went wrong', async () => {
    answers.GetByCode = () => Promise.reject(new Error('Network Error'))
    const w = await loaded()
    expect(w.find('.error-container h2').text()).toBe('Vi klarte ikke å laste tilbudet')
    expect(w.find('.error-container').text()).not.toContain('Tilbudet er utløpt')
    // The diagnosis is no longer built and then thrown away — it is on screen.
    expect(w.vm.error).toBe('Network Error')
    expect(w.find('.error-container').text()).toContain('Network Error')
    expect(w.find('.error-container').text()).toContain('Prøv igjen')
  })

  // WAS: a link that had lost its code read as an expired offer, and the one sentence that said what
  // had actually happened was withheld. NOW: the same load-failure page, with the reason shown.
  test('a link with no order number says so instead of reading as an expired offer', async () => {
    const w = await loaded({ code: '' })
    expect(w.find('.error-container h2').text()).toBe('Vi klarte ikke å laste tilbudet')
    expect(w.find('.error-container').text()).not.toContain('Tilbudet er utløpt')
    expect(w.vm.error).toBe('Ingen ordrenummer oppgitt')
    expect(w.find('.error-container').text()).toContain('Ingen ordrenummer oppgitt')
  })

  // WAS: `acceptOffer` assigned the accept response straight onto `offerProposal` with no guard. The
  // service only throws when the parsed body is `undefined`; a 200 whose body is empty parses to `''`
  // and was returned. The guest had just confirmed a binding order, the server had recorded it, and
  // the page rendered NOTHING AT ALL — no confirmation, no error, no way back.
  //
  // NOW: the order is placed exactly once and the guest is shown the confirmation. This is the arm
  // that matters most of the five — it is the only one where the guest is left not knowing whether
  // she is committed to a binding order.
  test('an acceptance answered with an empty body still confirms the order on screen', async () => {
    answers.AcceptOfferWithVerification = () => Promise.resolve('')
    const w = await loaded()
    await reachCodeStep(w)
    w.find('#verification-code').setValue('884120')
    await w.vm.$nextTick()
    await press(w, '.btn-verify')
    expect(called('AcceptOfferWithVerification').length).toBe(1)
    expect(w.find('.acceptance-confirmed').exists()).toBe(true)
    expect(w.find('.error-message').exists()).toBe(false)
    expect(w.find('.error-container').exists()).toBe(false)
    expect(w.find('.loading-stub').exists()).toBe(false)
    expect(w.find('.offer-container').text()).not.toBe('')
  })

  // WAS: `sendVerification` rendered `error.message` verbatim when the send failed. Every message the
  // service throws is untranslated English written for a developer, and it went on screen in front of
  // a Norwegian- or German-speaking guest, in place of the localised sentence sitting beside it in
  // `copy`. NOW: the guest reads the localised sentence, and the English never appears.
  test('a failed send shows the guest a localised sentence, not the exception text', async () => {
    answers.SendVerificationToken = () => Promise.reject(new Error('Failed to send verification token'))
    const w = await loaded()
    await reachCodeStep(w)
    expect(w.find('.error-message').text())
      .toBe('Kunne ikke sende verifiseringskode. Vennligst prøv igjen senere.')
    expect(w.text()).not.toContain('Failed to send verification token')
  })

  // WAS: a proposal whose phone number the API omitted faulted inside the try, and the TypeError's
  // message was handed to the guest by the same path — the product blaming her for a blank field she
  // has never seen and cannot fix.
  //
  // NOW: the page refuses BEFORE the guest invests anything. There is no terms box and no confirm
  // button to press, so the fault is unreachable rather than merely caught, and she is told the one
  // useful thing: this offer cannot be confirmed by SMS, contact us.
  test('an offer with no phone number says it cannot be confirmed by SMS, and offers nothing to press', async () => {
    answers.GetByCode = () => Promise.resolve(proposal({ clientPhoneNumber: null }))
    const w = await loaded()
    expect(w.find('.no-phone').exists()).toBe(true)
    expect(w.text()).toContain('Dette tilbudet kan ikke bekreftes med SMS')
    expect(w.text()).not.toMatch(/Cannot read propert/)
    // The guard is the absence of the controls, not a caught exception behind them.
    expect(w.find('#accept-terms-confirm').exists()).toBe(false)
    expect(w.find('.btn-approve').exists()).toBe(false)
    expect(called('SendVerificationToken').length).toBe(0)
  })
})

// ---- DEAD MEMBERS, RECORDED RATHER THAN DECORATED ---------------------------------------------
//
// `totalMonthlyFee`, `totalOnetimeFee`, `hasMonthlyFees`, `hasOnetimeFees`, `isExpiryClose`,
// `formatDate` and `getExpiryDate` are declared on this page and referenced by NOTHING: the template
// uses none of them, and the only child that could is `OfferDocument`, which is handed one prop and
// declares its own `isExpiryClose` and `formatDate`. They are roughly a fifth of this file's
// statements and they are left uncovered on purpose — invoking them from a test would raise the
// number without a person ever reaching the code. This test pins the claim so it cannot rot.
describe('code on this page that nothing can reach', () => {
  test('the document is rendered by OfferDocument, not by figures this page derives', async () => {
    const w = await loaded({})
    const doc = w.findComponent({ name: 'OfferDocument' })
    expect(doc.exists()).toBe(true)
    expect(Object.keys(doc.props())).toEqual(['offerProposal'])
    const template = OfferCodePage.render.toString()
    for (const dead of ['totalMonthlyFee', 'totalOnetimeFee', 'hasMonthlyFees',
      'hasOnetimeFees', 'isExpiryClose', 'formatDate', 'getExpiryDate']) {
      expect(template).not.toContain(dead)
    }
  })
})

describe('a guest on the Swiss market', () => {
  test('the whole acceptance step is in German', async () => {
    const w = await loaded({ isCh: true })
    expect(w.find('.acceptance-text').text()).toContain('Ich bestätige')
    expect(w.find('.terms-link').text()).toBe('die Vertragsbedingungen der Okam AG')
    expect(w.find('.btn-approve').text()).toBe('Bestätigen')
  })

  test('a Swiss guest is refused in German too', async () => {
    const w = await loaded({ isCh: true })
    await press(w, '.btn-approve')
    expect(w.find('.terms-warning').text())
      .toBe('Sie müssen die Geschäftsbedingungen akzeptieren, bevor Sie fortfahren können')
  })

  test('a Swiss guest who confirms reaches a German confirmation', async () => {
    answers.GetByCode = () => Promise.resolve(proposal({ accepted: true }))
    const w = await loaded({ isCh: true })
    expect(w.find('.success-message h2').text()).toBe('Die Bestellung ist bestätigt!')
  })

  // The claim in the title — told so IN GERMAN — never moved. What moved is what "so" is: this arm
  // also carried the expired-for-everything defect, in German. The retry line is asserted with it,
  // because a German page that names the failure and then offers no way forward would satisfy the
  // title and still strand the guest.
  test('a Swiss guest whose offer will not load is told so in German', async () => {
    answers.GetByCode = () => Promise.reject(new Error('boom'))
    const w = await loaded({ isCh: true })
    expect(w.find('.error-container h2').text()).toBe('Das Angebot konnte nicht geladen werden')
    expect(w.find('.error-container').text()).toContain('Erneut versuchen')
  })
})
