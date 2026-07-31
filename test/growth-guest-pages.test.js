import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the pages are
// imported, and `jest.mock` is hoisted above imports while a page import is not.
import SignupPage from '~/pages/subscribe/_store.vue'
import ConfirmPage from '~/pages/subscribe/confirm.vue'
import PreferencesPage from '~/pages/preferences/communications.vue'
import UnsubscribePage from '~/pages/preferences/unsubscribe.vue'
import translations from '~/translations'

const mockCalls = []
let mockAnswers = {}

// The pages build their client in `created`, so the MODULE is mocked rather than an instance. Every
// call is recorded so a test can assert which requests a step issues — the part of these pages that
// is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/growth/growth-guest-client', () => {
  const record = name => (...args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (typeof answer === 'function') { return answer(...args) }
    return Promise.resolve(answer === undefined ? null : answer)
  }
  class MockGuestService {}
  for (const name of [
    'GetConsentText', 'Subscribe', 'Confirm', 'OpenPreferenceSession',
    'GetPreferences', 'UpdatePreference', 'Unsubscribe', 'FilePrivacyRequest'
  ]) {
    MockGuestService.prototype[name] = record(name)
  }
  return { GrowthGuestService: MockGuestService, default: MockGuestService, CSRF_HEADER: 'X-Growth-Csrf' }
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
const { GrowthApiError } = jest.requireActual('~/utils/growth/api-client')

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const refuse = (status, code) => () => Promise.reject(new GrowthApiError(status, { error: { code, message: 'refused' } }))
const no = key => translations.no[key]

const CONSENT_TEXT = {
  consentTextVersionId: 41,
  locale: 'nb-NO',
  version: 1,
  text: 'Ja, jeg vil motta nyhetsbrev med tilbud og nyheter på e-post fra denne virksomheten. Du kan melde deg av når som helst med lenken nederst i hver e-post.',
  coversOpenMeasurement: false,
  effectiveAt: '2026-07-01T00:00:00+00:00'
}

const SESSION = {
  csrfToken: 'csrf-abc',
  storeId: 7,
  channel: 'Email',
  purpose: 'Newsletter',
  expiresAt: '2026-07-31T12:30:00+00:00'
}

const preference = over => Object.assign(
  { channel: 'Email', purpose: 'Newsletter', reachable: true, consented: true, suppressed: false },
  over || {})

function mountPage (Page, params) {
  return mount(Page, {
    mocks: {
      $route: { params: params || {} },
      $i18n: { locale: 'no' }
    }
  })
}

// The three token pages read `window.location` in `mounted`. jsdom gives them a real one; this puts
// the fragment on it and restores it afterwards so no test leaks a token into the next.
function withFragment (fragment, search) {
  window.history.replaceState(null, '', '/test' + (search || '') + (fragment || ''))
}

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {}
  withFragment('')
})

// -------------------------------------------------------------------------------------------------

describe('the signup page, which is the only way a contact point is ever created', () => {
  test('the consent text is read first, and the form renders the served wording VERBATIM', async () => {
    mockAnswers.GetConsentText = CONSENT_TEXT
    const page = mountPage(SignupPage, { store: '7' })
    await settled()

    expect(mockCalls).toEqual([['GetConsentText', 7]])
    // Verbatim, not paraphrased: the receipt pins this exact string by version id.
    expect(page.find('[data-test="consent"]').text()).toContain(CONSENT_TEXT.text)
    expect(page.find('[data-test="consent-provenance"]').text()).toContain('versjon 1')
    page.destroy()
  })

  test('the consent box is NOT pre-ticked, and a capture cannot be posted without it', async () => {
    mockAnswers.GetConsentText = CONSENT_TEXT
    const page = mountPage(SignupPage, { store: '7' })
    await settled()

    expect(page.find('[data-test="consent"] input').element.checked).toBe(false)

    page.setData({ form: { email: 'guest@example.no', consented: false } })
    page.find('form').trigger('submit')
    await settled()

    // No capture was attempted; a pre-ticked box is not an affirmative action (art. 4(11)).
    expect(mockCalls.filter(c => c[0] === 'Subscribe')).toHaveLength(0)
    expect(page.find('[data-test="problems"]').text()).toBe(no('gr_guest_signup_needs_consent'))
    page.destroy()
  })

  test('the capture pins the version id from the SAME response whose text was shown', async () => {
    mockAnswers.GetConsentText = CONSENT_TEXT
    mockAnswers.Subscribe = { status: 'pending_confirmation' }
    const page = mountPage(SignupPage, { store: '7' })
    await settled()

    page.setData({ form: { email: '  guest@example.no  ', consented: true } })
    page.find('form').trigger('submit')
    await settled()

    expect(mockCalls).toContainEqual(['Subscribe', 7, {
      email: 'guest@example.no',
      consentTextVersionId: 41,
      captureSource: 'web-signup'
    }])
    page.destroy()
  })

  test('the acknowledgement never claims an email was sent, and says what to do if none arrives', async () => {
    mockAnswers.GetConsentText = CONSENT_TEXT
    mockAnswers.Subscribe = { status: 'pending_confirmation' }
    const page = mountPage(SignupPage, { store: '7' })
    await settled()
    page.setData({ form: { email: 'guest@example.no', consented: true } })
    page.find('form').trigger('submit')
    await settled()

    const text = page.find('[data-test="accepted"]').text()
    // The mail provider is bound to an in-memory fake, and the 202 is an anti-oracle: neither fact
    // permits "check your inbox". These four assertions are the guard on that.
    expect(text).not.toMatch(/innboksen din nå|sjekk innboks|har sendt|vi sendte/i)
    expect(text).toContain(no('gr_guest_signup_accepted_nothing_arrives'))
    expect(text).toContain(no('gr_guest_signup_accepted_no_oracle'))
    // The address is not echoed back onto a page that may be left open on a shared phone.
    expect(text).not.toContain('guest@example.no')
    page.destroy()
  })

  test('a dark or unknown store gets ONE sentence and no form, because no capture could succeed', async () => {
    mockAnswers.GetConsentText = refuse(404, 'growth.not_found')
    const page = mountPage(SignupPage, { store: '7' })
    await settled()

    expect(page.find('[data-test="unavailable"]').exists()).toBe(true)
    expect(page.find('form').exists()).toBe(false)
    page.destroy()
  })

  test('a slug is resolved through the one anonymous store route, and a miss shows the same sentence', async () => {
    mockAnswers.ResolveIdBySlug = null
    const page = mountPage(SignupPage, { store: 'lyststedet' })
    await settled()

    expect(mockCalls).toEqual([['ResolveIdBySlug', 'lyststedet']])
    expect(page.find('[data-test="unavailable"]').exists()).toBe(true)
    page.destroy()
  })

  test('it is the one guest page that stays indexable, and it drops the Meta Pixel like the rest', () => {
    const page = mountPage(SignupPage, { store: '7' })
    const head = page.vm.$options.head.call(page.vm)
    expect(head.meta.find(m => m.hid === 'robots')).toBeUndefined()
    expect(head.script.find(s => s.hid === 'fb-pixel').innerHTML).toBe('')
    page.destroy()
  })
})

// -------------------------------------------------------------------------------------------------

describe('the confirm landing that ConfirmBaseUrl has been pointing at', () => {
  test('it spends the fragment token on arrival and strips it from the address bar', async () => {
    withFragment('#token=v41~opaque-token')
    mockAnswers.Confirm = { status: 'confirmed' }
    const page = mountPage(ConfirmPage)
    await settled()

    expect(mockCalls).toEqual([['Confirm', 'v41~opaque-token']])
    expect(window.location.hash).toBe('')
    expect(page.find('[data-test="confirmed"]').exists()).toBe(true)
    page.destroy()
  })

  test('the 410 offers all three reasons rather than asserting one, because the wire conflates them', async () => {
    withFragment('#token=dead')
    mockAnswers.Confirm = refuse(410, 'growth.token_invalid')
    const page = mountPage(ConfirmPage)
    await settled()

    const text = page.find('[data-test="token-dead"]').text()
    expect(text).toContain(no('gr_guest_confirm_dead_used'))
    expect(text).toContain(no('gr_guest_confirm_dead_expired'))
    expect(text).toContain(no('gr_guest_confirm_dead_superseded'))
    page.destroy()
  })

  test('a link that lost its fragment says so instead of posting nothing at the API', async () => {
    const page = mountPage(ConfirmPage)
    await settled()

    expect(mockCalls).toHaveLength(0)
    expect(page.find('[data-test="no-token"]').exists()).toBe(true)
    page.destroy()
  })

  test('a transport failure claims nothing about the subscription and keeps the retry', async () => {
    withFragment('#token=abc')
    mockAnswers.Confirm = () => Promise.reject(new Error('offline'))
    const page = mountPage(ConfirmPage)
    await settled()

    expect(page.find('[data-test="unknown"]').text()).toContain(no('gr_guest_confirm_unknown_body'))
    expect(page.find('[data-test="unknown"] button').attributes('disabled')).toBeUndefined()
    page.destroy()
  })

  test('it is noindex, because the URL it is reached by carries a credential', () => {
    const page = mountPage(ConfirmPage)
    const head = page.vm.$options.head.call(page.vm)
    expect(head.meta.find(m => m.hid === 'robots').content).toBe('noindex, nofollow')
    page.destroy()
  })
})

// -------------------------------------------------------------------------------------------------

describe('the preference centre, the only door to spec §5 endpoints 3-5 and 7', () => {
  const openPage = async (prefs) => {
    withFragment('#token=link-token')
    mockAnswers.OpenPreferenceSession = SESSION
    mockAnswers.GetPreferences = prefs || preference()
    const page = mountPage(PreferencesPage)
    await settled()
    return page
  }

  test('the link token opens a session, is then dropped, and the state is read under it', async () => {
    const page = await openPage()

    expect(mockCalls).toEqual([
      ['OpenPreferenceSession', 'link-token'],
      ['GetPreferences', 'csrf-abc']
    ])
    expect(window.location.hash).toBe('')
    expect(page.vm.token).toBeNull()
    expect(page.find('[data-test="standing"]').text()).toBe(no('gr_guest_standing_on'))
    page.destroy()
  })

  test('it says plainly that it does not hold the address, rather than leaving a blank', async () => {
    const page = await openPage()
    expect(page.text()).toContain(no('gr_guest_prefs_no_address'))
    page.destroy()
  })

  test('stopping echoes the session scope back and renders the state that CAME BACK', async () => {
    const page = await openPage()
    mockAnswers.UpdatePreference = preference({ consented: false, suppressed: true })

    page.find('[data-test="stop"]').trigger('click')
    await settled()

    expect(mockCalls).toContainEqual(['UpdatePreference', 'csrf-abc', 'Email', 'Newsletter', false])
    expect(page.find('[data-test="stopped"]').text()).toBe(no('gr_guest_prefs_stopped_note'))
    expect(page.find('[data-test="standing"]').text()).toBe(no('gr_guest_standing_suppressed'))
    page.destroy()
  })

  test('a resume the server did not honour is EXPLAINED, not silently reverted', async () => {
    // The backend records a re-consent receipt but never lifts a suppression. A toggle that sprang
    // back with no sentence is how a guest concludes the page is broken.
    const page = await openPage(preference({ consented: false, suppressed: true }))
    mockAnswers.UpdatePreference = preference({ consented: true, suppressed: true })

    page.find('[data-test="resume"]').trigger('click')
    await settled()

    expect(page.find('[data-test="reconsent-blocked"]').text()).toBe(no('gr_guest_prefs_resume_blocked'))
    expect(page.find('[data-test="standing"]').text()).toBe(no('gr_guest_standing_suppressed'))
    page.destroy()
  })

  test('art. 15 is one press, and the answer never claims a copy was delivered', async () => {
    const page = await openPage()
    mockAnswers.FilePrivacyRequest = {
      requestId: 12,
      contactPointId: 3,
      requestType: 'Access',
      state: 'Received',
      receivedAt: '2026-07-31T10:00:00+00:00',
      resolvedAt: null
    }

    page.find('[data-test="file-access"]').trigger('click')
    await settled()

    expect(mockCalls).toContainEqual(['FilePrivacyRequest', 'csrf-abc', 'Access'])
    const text = page.find('[data-test="access-filed"]').text()
    expect(text).toContain(no('gr_guest_access_filed_body'))
    expect(text).toContain(no('gr_guest_request_deadline'))
    expect(text).toMatch(/12/)
    page.destroy()
  })

  test('erasure is described in full and confirmed BEFORE anything is filed', async () => {
    const page = await openPage()

    page.find('[data-test="erasure-open"]').trigger('click')
    await settled()

    // Opening the explanation files nothing.
    expect(mockCalls.filter(c => c[0] === 'FilePrivacyRequest')).toHaveLength(0)

    const warning = page.find('.gg-card--grave').text()
    expect(warning).toContain(no('gr_guest_erasure_irreversible'))
    expect(warning).toContain(no('gr_guest_erasure_step_now')) // suppression is immediate
    expect(warning).toContain(no('gr_guest_erasure_step_later')) // destruction is not
    expect(warning).toContain(no('gr_guest_erasure_step_kept')) // the ledger cannot be deleted
    expect(warning).toContain(no('gr_guest_erasure_step_shared')) // ref-counted shred may defer it
    expect(page.find('[data-test="erasure-cancel"]').exists()).toBe(true)
    page.destroy()
  })

  test('cancelling an erasure files nothing and puts the page back', async () => {
    const page = await openPage()
    page.find('[data-test="erasure-open"]').trigger('click')
    await settled()
    page.find('[data-test="erasure-cancel"]').trigger('click')
    await settled()

    expect(mockCalls.filter(c => c[0] === 'FilePrivacyRequest')).toHaveLength(0)
    expect(page.find('[data-test="erasure-open"]').exists()).toBe(true)
    page.destroy()
  })

  test('a filed erasure separates what happened now from what has not happened yet', async () => {
    const page = await openPage()
    mockAnswers.FilePrivacyRequest = {
      requestId: 88,
      contactPointId: 3,
      requestType: 'Erasure',
      state: 'Received',
      receivedAt: '2026-07-31T10:00:00+00:00',
      resolvedAt: null
    }
    mockAnswers.GetPreferences = preference({ consented: false, suppressed: true })

    page.find('[data-test="erasure-open"]').trigger('click')
    await settled()
    page.find('[data-test="erasure-confirm"]').trigger('click')
    await settled()

    expect(mockCalls).toContainEqual(['FilePrivacyRequest', 'csrf-abc', 'Erasure'])
    const text = page.find('[data-test="erasure-filed"]').text()
    expect(text).toContain(no('gr_guest_erasure_filed_now'))
    expect(text).toContain(no('gr_guest_erasure_filed_later'))
    // It must never read as done.
    expect(text).not.toMatch(/er slettet|ble slettet/i)
    // And the standing shown afterwards is the one the server now holds, re-read rather than assumed.
    expect(page.find('[data-test="standing"]').text()).toBe(no('gr_guest_standing_suppressed'))
    page.destroy()
  })

  test('a 401 mid-session replaces the page rather than leaving controls that cannot work', async () => {
    const page = await openPage()
    mockAnswers.UpdatePreference = refuse(401, 'growth.session_invalid')

    page.find('[data-test="stop"]').trigger('click')
    await settled()

    expect(page.find('[data-test="session-dead"]').exists()).toBe(true)
    expect(page.find('[data-test="stop"]').exists()).toBe(false)
    // And it names the trap: the link that got them here cannot be spent again.
    expect(page.find('[data-test="session-dead"]').text()).toContain(no('gr_guest_prefs_session_dead_next'))
    page.destroy()
  })

  test('a spent or expired link says which two things it could be, and where a live one is', async () => {
    withFragment('#token=dead')
    mockAnswers.OpenPreferenceSession = refuse(410, 'growth.token_invalid')
    const page = mountPage(PreferencesPage)
    await settled()

    const text = page.find('[data-test="token-dead"]').text()
    expect(text).toContain(no('gr_guest_prefs_dead_used'))
    expect(text).toContain(no('gr_guest_prefs_dead_expired'))
    expect(text).toContain(no('gr_guest_prefs_dead_next'))
    page.destroy()
  })
})

// -------------------------------------------------------------------------------------------------

describe('the one-click unsubscribe landing', () => {
  test('one click means one click: it unsubscribes on arrival and asks nothing first', async () => {
    withFragment('#token=unsub-token')
    mockAnswers.Unsubscribe = preference({ consented: false, suppressed: true })
    const page = mountPage(UnsubscribePage)
    await settled()

    expect(mockCalls).toEqual([['Unsubscribe', 'unsub-token']])
    expect(page.find('[data-test="done"]').exists()).toBe(true)
    // No control at all in the page's own content — RFC 8058 §1 and GDPR art. 7(3) both forbid an
    // "are you sure?" here. (The shell's three language buttons are outside `.gg-card`.)
    expect(page.findAll('.gg-card button').length).toBe(0)
    page.destroy()
  })

  test('it accepts the RFC 8058 query form, which is the shape that reaches a browser', async () => {
    withFragment('', '?token=from-query')
    mockAnswers.Unsubscribe = preference({ consented: false, suppressed: true })
    const page = mountPage(UnsubscribePage)
    await settled()

    expect(mockCalls).toEqual([['Unsubscribe', 'from-query']])
    expect(window.location.search).toBe('')
    page.destroy()
  })

  test('a failed unsubscribe says the guest is probably NOT unsubscribed', async () => {
    withFragment('#token=abc')
    mockAnswers.Unsubscribe = () => Promise.reject(new Error('offline'))
    const page = mountPage(UnsubscribePage)
    await settled()

    expect(page.find('[data-test="unknown"]').text()).toContain(no('gr_guest_unsub_unknown_body'))
    page.destroy()
  })
})

// -------------------------------------------------------------------------------------------------

describe('the copy exists in all three languages', () => {
  test('every gr_guest_* key Norwegian carries is also in English and German', () => {
    const keys = Object.keys(translations.no).filter(k => k.startsWith('gr_guest_'))
    expect(keys.length).toBeGreaterThan(80)

    const missing = { en: [], de: [] }
    for (const key of keys) {
      for (const lang of ['en', 'de']) {
        if (typeof translations[lang][key] !== 'string') { missing[lang].push(key) }
      }
    }
    expect(missing).toEqual({ en: [], de: [] })
  })

  test('no dictionary carries a gr_guest_* key the Norwegian source does not', () => {
    const source = new Set(Object.keys(translations.no).filter(k => k.startsWith('gr_guest_')))
    for (const lang of ['en', 'de']) {
      const orphans = Object.keys(translations[lang])
        .filter(k => k.startsWith('gr_guest_') && !source.has(k))
      expect(orphans).toEqual([])
    }
  })
})
