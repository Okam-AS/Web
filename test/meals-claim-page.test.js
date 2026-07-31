import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while a page import is not.
import JoinPage from '~/pages/meals/join.vue'
import translations from '~/translations'
import {
  claimRefusal,
  CLAIM_ACTION_RETRY,
  CLAIM_ACTION_SIGN_IN,
  CLAIM_ACTION_SWITCH_ACCOUNT
} from '~/utils/meals/refusal-copy'

const mockCalls = []
let mockAnswers = {}

// The page builds its client in `created`, so the MODULE is mocked. Every call is recorded, because
// WHICH request this page issues — and with which token and which idempotency key — is the part of
// it that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/meals/claim-client', () => {
  const record = name => (...args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (typeof answer === 'function') { return answer(...args) }
    return Promise.resolve(answer === undefined ? null : answer)
  }
  class MockClaimService {}
  MockClaimService.prototype.CreateSession = record('CreateSession')
  MockClaimService.prototype.Claim = record('Claim')
  return { MealsClaimService: MockClaimService, default: MockClaimService }
})

// eslint-disable-next-line import/order -- must follow the jest.mock above so the class is the real one.
const { WorkforceApiError } = jest.requireActual('~/utils/workforce/api-client')

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const no = key => translations.no[key]
const refuse = (status, body) => () => Promise.reject(new WorkforceApiError(status, body))

const TOKEN = 'mealsinv_abc123def456'

const SESSION = {
  sessionToken: 'mis1.aaaa.1800000000.sig',
  expiresAtUtc: '2026-08-01T10:00:00',
  companyId: '11111111-1111-1111-1111-111111111111',
  companyDisplayName: 'Acme',
  intendedRole: 'Employee'
}

const MEMBERSHIP = {
  membershipId: '99999999-9999-9999-9999-999999999999',
  companyId: SESSION.companyId,
  applicationUserId: 'user-1',
  role: 'Employee',
  state: 'Active',
  claimedFromInvitationId: 'inv-1',
  createdAtUtc: '2026-07-31T09:00:00'
}

// The page reads `window.location.hash` in `mounted` and scrubs it. jsdom gives a real location and
// a real history, so both halves are exercised rather than stubbed.
function setHash (hash) {
  window.history.replaceState(null, '', '/meals/join' + (hash || ''))
}

function mountPage (options) {
  const opts = options || {}
  return mount(JoinPage, {
    mocks: {
      $i18n: { locale: opts.locale || 'no' },
      $store: {
        getters: { userIsLoggedIn: opts.signedIn !== false ? 'user-1' : null },
        state: { currentUser: opts.signedIn !== false ? { id: 'user-1', token: 't' } : {} }
      },
      _coreInitializer: { bearerToken: 't' }
    },
    stubs: { LoginModal: true }
  })
}

// `newGuid` reaches for the platform `crypto`, which jsdom does not provide here. A COUNTER rather
// than a constant, because half of what these tests assert about the idempotency key is when it
// stays the same and when it must not — a fixed value would satisfy both.
const originalCrypto = global.crypto
let minted = 0

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {}
  minted = 0
  global.crypto = { randomUUID: () => 'idem-key-' + (++minted) }
  setHash('')
})

afterEach(() => { global.crypto = originalCrypto })

describe('arriving with a code', () => {
  test('a code in the fragment is taken up and looked up straight away', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    expect(mockCalls).toEqual([['CreateSession', TOKEN]])
    expect(wrapper.find('[data-test="preview"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Acme')
  })

  test('`token=` in the fragment is accepted too, because a person building the link will write it', async () => {
    setHash('#token=' + TOKEN)
    mockAnswers.CreateSession = SESSION
    mountPage()
    await settled()
    expect(mockCalls).toEqual([['CreateSession', TOKEN]])
  })

  // The whole reason the token rides the fragment rather than the path. If it survived in the
  // address bar it would be in the back stack, in any screenshot, and in whatever the reader shares.
  test('the address bar no longer holds the code once the page has read it', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain(TOKEN)
    // Held, though — the page can still act on it.
    expect(wrapper.vm.token).toBe(TOKEN)
  })

  test('with no code at all the page asks for one and issues no request', async () => {
    const wrapper = mountPage()
    await settled()

    expect(mockCalls).toEqual([])
    expect(wrapper.find('[data-test="paste"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(no('meals_claim_paste_title'))
  })

  test('a pasted code is taken into memory and cleared out of the field', async () => {
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    wrapper.find('[data-test="code-input"]').setValue('  ' + TOKEN + '  ')
    wrapper.find('[data-test="paste"] form').trigger('submit')
    await settled()

    expect(mockCalls).toEqual([['CreateSession', TOKEN]])
    expect(wrapper.vm.pasted).toBe('')
  })

  test('an empty paste is refused by the page and never sent', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.find('[data-test="paste"] form').trigger('submit')
    await settled()

    expect(mockCalls).toEqual([])
    expect(wrapper.find('[data-test="paste-empty"]').text()).toBe(no('meals_claim_paste_empty'))
  })
})

describe('arriving before signing in', () => {
  // Both invitee routes sit behind the controller's class-level `[Authorize]`, so there is no
  // anonymous preview to offer and the page must not imply there is one.
  test('a held code with nobody signed in issues NO request and says why', async () => {
    setHash('#' + TOKEN)
    const wrapper = mountPage({ signedIn: false })
    await settled()

    expect(mockCalls).toEqual([])
    expect(wrapper.find('[data-test="sign-in"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(no('meals_claim_signin_body'))
  })

  // The round trip that is not a round trip: the modal is mounted INSIDE this page, so nothing
  // navigates and the code is simply still in memory afterwards. This is what the route design buys.
  test('the code survives signing in, and is never written into a URL to get there', async () => {
    setHash('#' + TOKEN)
    const wrapper = mountPage({ signedIn: false })
    await settled()

    wrapper.find('[data-test="sign-in-button"]').trigger('click')
    await settled()
    expect(wrapper.vm.showLogin).toBe(true)
    expect(window.location.href).not.toContain(TOKEN)

    // The modal reports a successful login exactly as `LoginModal` emits it.
    mockAnswers.CreateSession = SESSION
    wrapper.vm.$store.getters.userIsLoggedIn = 'user-1'
    wrapper.vm.$store.state.currentUser = { id: 'user-1', token: 't' }
    wrapper.vm.closeLogin(true)
    await settled()

    expect(mockCalls).toEqual([['CreateSession', TOKEN]])
    expect(window.location.href).not.toContain(TOKEN)
  })

  test('the code is not left anywhere a later visitor to this browser could read it', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    mountPage()
    await settled()

    expect(window.sessionStorage.getItem('token')).toBeNull()
    expect(JSON.stringify(window.sessionStorage)).not.toContain(TOKEN)
    expect(JSON.stringify(window.localStorage)).not.toContain(TOKEN)
  })
})

describe('what the invitation is allowed to say', () => {
  test('the company, the role and the expiry — the whole of what the session carries', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    const text = wrapper.text()
    expect(text).toContain('Acme')
    expect(text).toContain(no('meals_claim_role_employee'))
    expect(text).toContain(no('meals_claim_field_expires'))
  })

  // THE HONESTY OBLIGATION. `MealsInvitationSessionModel` has no allowance, no venue and no inviter
  // on it. A claim page that quietly omitted them would read as "there is no budget attached"; this
  // one says it does not know, in as many words.
  test('it states that the allowance, the venues and the inviter are NOT things it can show', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="unknowns"]').text()).toContain(no('meals_claim_unknowns_body'))
    // Positive control on the claim itself: no figure and no currency is printed anywhere.
    expect(wrapper.text()).not.toMatch(/\bkr\b|NOK|CHF/)
  })

  test('a company the server named nothing for gets a title that does not invent one', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = Object.assign({}, SESSION, { companyDisplayName: null })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.text()).toContain(no('meals_claim_preview_title_unnamed'))
    expect(wrapper.text()).not.toContain(SESSION.companyId)
  })

  test('a role outside the enum is printed verbatim rather than mapped onto one we know', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = Object.assign({}, SESSION, { intendedRole: 'Auditor' })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.text()).toContain('Auditor')
    expect(wrapper.text()).not.toContain(no('meals_claim_role_employee'))
  })
})

describe('claiming', () => {
  async function preview () {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()
    return wrapper
  }

  test('the claim sends the RAW token, so a slow reader is not refused by an expired session', async () => {
    const wrapper = await preview()
    mockAnswers.Claim = MEMBERSHIP

    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    const claim = mockCalls.find(c => c[0] === 'Claim')
    expect(claim[1]).toBe(TOKEN)
    expect(claim[1]).not.toBe(SESSION.sessionToken)
  })

  // The idempotency key is the caller's ONE command, not one per press. A retry after a response
  // that never arrived must replay it — otherwise the second attempt is refused as
  // `invitation-not-claimable` against the caller's own first success.
  test('a retry after a lost response replays the SAME command rather than issuing a second', async () => {
    const wrapper = await preview()
    mockAnswers.Claim = () => Promise.reject(new Error('network down'))

    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    mockAnswers.Claim = MEMBERSHIP
    wrapper.find('[data-test="refusal-retry"]').trigger('click')
    await settled()

    const keys = mockCalls.filter(c => c[0] === 'Claim').map(c => c[2])
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    expect(keys[0]).toEqual(expect.any(String))
  })

  test('signing in as somebody else mints a new key, so the old command is not resubmitted', async () => {
    const wrapper = await preview()
    mockAnswers.Claim = () => Promise.reject(new Error('network down'))
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    const firstKey = mockCalls.find(c => c[0] === 'Claim')[2]

    wrapper.vm.$store.state.currentUser = { id: 'user-2', token: 't2' }
    mockAnswers.Claim = MEMBERSHIP
    wrapper.vm.closeLogin(true)
    await settled()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    const keys = mockCalls.filter(c => c[0] === 'Claim').map(c => c[2])
    expect(keys[keys.length - 1]).not.toBe(firstKey)
  })

  test('the membership is shown, with the reference the company statements will name them by', async () => {
    const wrapper = await preview()
    mockAnswers.Claim = MEMBERSHIP
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    const receipt = wrapper.find('[data-test="claimed"]')
    expect(receipt.exists()).toBe(true)
    expect(receipt.text()).toContain('Acme')
    // MIG-17: the identifier itself, plus what it is for. Told AFTER the claim, never before.
    expect(receipt.text()).toContain(MEMBERSHIP.membershipId)
    expect(receipt.text()).toContain(no('meals_claim_ref_body'))
  })

  test('nothing warns about the missing employee reference BEFORE the claim, where it could not be acted on', async () => {
    const wrapper = await preview()
    expect(wrapper.find('[data-test="claimed"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(no('meals_claim_ref_body'))
    expect(wrapper.text()).not.toContain(no('meals_claim_ref_label'))
  })

  test('the invitation is not re-read after a claim, so a consumed one cannot paint over the receipt', async () => {
    const wrapper = await preview()
    mockAnswers.Claim = MEMBERSHIP
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    expect(mockCalls.filter(c => c[0] === 'CreateSession')).toHaveLength(1)
    expect(wrapper.find('[data-test="claimed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="refusal"]').exists()).toBe(false)
  })

  test('the button cannot be pressed twice into two commands', async () => {
    const wrapper = await preview()
    let release
    mockAnswers.Claim = () => new Promise((resolve) => { release = resolve })

    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    release(MEMBERSHIP)
    await settled()

    expect(mockCalls.filter(c => c[0] === 'Claim')).toHaveLength(1)
  })
})

describe('the refusals, which is most of what this page does', () => {
  async function refusedClaim (status, body) {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()
    mockAnswers.Claim = refuse(status, body)
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    return wrapper
  }

  test('a code the server does not recognise names BOTH possibilities and asserts neither', async () => {
    const wrapper = await refusedClaim(404, { code: 'meals.not-found', detail: 'The requested Company Meals resource was not found.' })

    const card = wrapper.find('[data-test="refusal"]')
    expect(card.text()).toContain(no('meals_claim_unknown_title'))
    // The 404 conflates "no such invitation" with "module switched off" — `_authorization.NotFound()`
    // and `RequireVisible()` mint the identical document — so the copy must offer both.
    expect(no('meals_claim_unknown_body')).toContain('brukt opp')
    expect(no('meals_claim_unknown_body')).toContain('slått på')
  })

  // Three states behind one code, and three different conversations for the employee.
  test('an already-used code, a withdrawn one and an expired one are three different sentences', async () => {
    const used = await refusedClaim(409, { code: 'meals.invitation-not-claimable', currentState: 'Claimed' })
    expect(used.find('[data-test="refusal"]').text()).toContain(no('meals_claim_used_title'))

    const gone = await refusedClaim(409, { code: 'meals.invitation-not-claimable', currentState: 'Revoked' })
    expect(gone.find('[data-test="refusal"]').text()).toContain(no('meals_claim_withdrawn_title'))

    const old = await refusedClaim(409, { code: 'meals.invitation-not-claimable', currentState: 'Expired' })
    expect(old.find('[data-test="refusal"]').text()).toContain(no('meals_claim_expired_title'))
  })

  test('a state this client has not heard of gets a neutral sentence, not one of the three', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.invitation-not-claimable', currentState: 'Quarantined' })
    expect(wrapper.find('[data-test="refusal"]').text()).toContain(no('meals_claim_closed_title'))
  })

  // The one that must be KIND and must WITHHOLD. `MealsProblemCodes.InvitationContactMismatch` makes
  // not echoing the intended contact the server's rule; this is the client keeping it.
  test('the wrong-person refusal blames nobody, names no address, and offers the way out', async () => {
    const wrapper = await refusedClaim(403, {
      code: 'meals.invitation-contact-mismatch',
      detail: 'This invitation was issued to a different contact. Sign in with the account the company invited.'
    })

    const card = wrapper.find('[data-test="refusal"]')
    expect(card.text()).toContain(no('meals_claim_wrong_account_title'))
    expect(card.find('[data-test="switch-account"]').exists()).toBe(true)

    // Nothing in the copy names or hints at a contact, and the sentence says it is withholding on
    // purpose rather than being vague by accident.
    const body = no('meals_claim_wrong_account_body')
    expect(body).not.toMatch(/@/)
    expect(body).toContain('Vi sier ikke hvilken')
    // Not scolding: it opens by saying the code itself is fine.
    expect(body).toContain('Koden er i orden')
  })

  test('a person who is already a member is told they are in, not that something failed', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.already-member' })
    const card = wrapper.find('[data-test="refusal"]')
    expect(card.text()).toContain(no('meals_claim_already_member_title'))
    expect(no('meals_claim_already_member_body')).toContain('trenger ikke gjøre noe mer')
  })

  test('an expired invitation sends them to the one person who can fix it', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.invitation-expired' })
    expect(wrapper.find('[data-test="refusal"]').text()).toContain(no('meals_claim_expired_title'))
  })

  test('a 401 offers sign-in and promises the code is still here', async () => {
    const wrapper = await refusedClaim(401, {})
    const card = wrapper.find('[data-test="refusal"]')
    expect(card.text()).toContain(no('meals_claim_signed_out_title'))
    expect(card.find('[data-test="refusal-sign-in"]').exists()).toBe(true)
    expect(wrapper.vm.token).toBe(TOKEN)
  })

  test('an unrouted 404 claims nothing about the invitation at all', async () => {
    const wrapper = await refusedClaim(404, null)
    expect(wrapper.find('[data-test="refusal"]').text()).toContain(no('meals_claim_no_module_title'))
  })

  test('the server\'s own words are shown BESIDE the sentence and never instead of it', async () => {
    const wrapper = await refusedClaim(403, {
      code: 'meals.invitation-contact-mismatch',
      detail: 'This invitation was issued to a different contact.'
    })
    const card = wrapper.find('[data-test="refusal"]')
    expect(card.text()).toContain(no('meals_claim_wrong_account_title'))
    expect(card.find('[data-test="refusal-detail"]').text()).toContain('This invitation was issued to a different contact.')
  })

  // No dead controls: the server will refuse the identical command again, so the button goes.
  test('a final refusal takes the claim button away and offers a different code instead', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.invitation-not-claimable', currentState: 'Claimed' })
    expect(wrapper.find('[data-test="claim-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="other-code-button"]').exists()).toBe(true)

    wrapper.find('[data-test="other-code-button"]').trigger('click')
    await settled()
    expect(wrapper.find('[data-test="paste"]').exists()).toBe(true)
  })

  test('a refusal that MIGHT not have landed keeps the button and says so', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.idempotency-in-progress' })
    expect(wrapper.find('[data-test="refusal-retry"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="other-code-button"]').exists()).toBe(false)
  })

  // The retry the collision refusal offers can only work if the next attempt carries a fresh key.
  test('an idempotency collision drops the key, so the offered retry can actually succeed', async () => {
    const wrapper = await refusedClaim(409, { code: 'meals.idempotency-payload-mismatch' })
    const firstKey = mockCalls.find(c => c[0] === 'Claim')[2]

    mockAnswers.Claim = MEMBERSHIP
    wrapper.find('[data-test="refusal-retry"]').trigger('click')
    await settled()

    const keys = mockCalls.filter(c => c[0] === 'Claim').map(c => c[2])
    expect(keys[1]).not.toBe(firstKey)
    expect(wrapper.find('[data-test="claimed"]').exists()).toBe(true)
  })

  test('a refusal earned by one account is not left on screen next to another', async () => {
    const wrapper = await refusedClaim(403, { code: 'meals.invitation-contact-mismatch' })
    expect(wrapper.find('[data-test="refusal"]').exists()).toBe(true)

    mockAnswers.CreateSession = SESSION
    wrapper.vm.$store.state.currentUser = { id: 'user-2', token: 't2' }
    wrapper.vm.closeLogin(true)
    await settled()

    expect(wrapper.find('[data-test="refusal"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="preview"]').exists()).toBe(true)
  })

  // Every sentence on this page has to leave a non-technical reader with something to do. The
  // classifier is where that is enforceable, so it is checked over the whole family at once.
  test('every refusal this page can produce has its own heading and body, in all three languages', () => {
    const errors = [
      new WorkforceApiError(404, { code: 'meals.not-found' }),
      new WorkforceApiError(404, null),
      new WorkforceApiError(401, {}),
      new WorkforceApiError(403, { code: 'meals.invitation-contact-mismatch' }),
      new WorkforceApiError(403, { code: 'meals.forbidden' }),
      new WorkforceApiError(409, { code: 'meals.already-member' }),
      new WorkforceApiError(409, { code: 'meals.invitation-expired' }),
      new WorkforceApiError(409, { code: 'meals.invitation-not-claimable', currentState: 'Claimed' }),
      new WorkforceApiError(409, { code: 'meals.invitation-not-claimable', currentState: 'Revoked' }),
      new WorkforceApiError(409, { code: 'meals.invitation-not-claimable', currentState: 'Expired' }),
      new WorkforceApiError(409, { code: 'meals.invitation-not-claimable', currentState: 'Nonsense' }),
      new WorkforceApiError(409, { code: 'meals.idempotency-in-progress' }),
      new WorkforceApiError(409, { code: 'meals.idempotency-payload-mismatch' }),
      new WorkforceApiError(400, { code: 'meals.validation' }),
      new WorkforceApiError(500, {}),
      new Error('the network fell over')
    ]

    const seen = new Set()
    for (const error of errors) {
      const refusal = claimRefusal(error)
      expect(refusal).toBeTruthy()
      seen.add(refusal.heading)
      for (const lang of ['no', 'en', 'de']) {
        // A key with no entry falls through to the key itself, which is how a missing sentence hides.
        expect(translations[lang][refusal.heading]).toBeTruthy()
        expect(translations[lang][refusal.body]).toBeTruthy()
        expect(translations[lang][refusal.body].length).toBeGreaterThan(40)
      }
      expect([null, CLAIM_ACTION_RETRY, CLAIM_ACTION_SIGN_IN, CLAIM_ACTION_SWITCH_ACCOUNT])
        .toContain(refusal.action)
    }

    // Not one generic sentence wearing sixteen hats: the distinct cases really are distinct.
    expect(seen.size).toBeGreaterThanOrEqual(11)
  })

  test('nothing on this page ever renders a bare "something went wrong"', () => {
    for (const lang of ['no', 'en', 'de']) {
      const keys = Object.keys(translations[lang]).filter(k => k.indexOf('meals_claim_') === 0)
      expect(keys.length).toBeGreaterThan(50)
      for (const key of keys) {
        expect(translations[lang][key]).not.toMatch(/^(noe gikk galt|something went wrong|etwas ist schiefgelaufen)\.?$/i)
      }
    }
  })
})

describe('the page is not an admin screen', () => {
  test('it mounts with no store-admin membership and never asks for one', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage()
    await settled()

    // No `adminIn` was provided by the mount at all — the shell that requires one is not in play.
    expect(wrapper.vm.$store.state.currentUser.adminIn).toBeUndefined()
    expect(wrapper.find('[data-test="preview"]').exists()).toBe(true)
  })

  test('it declares itself unindexable, because the address can carry a credential', () => {
    const wrapper = mountPage()
    const head = wrapper.vm.$options.head.call(wrapper.vm)
    expect(head.meta).toContainEqual({ hid: 'robots', name: 'robots', content: 'noindex, nofollow' })
  })

  test('the language is the reader\'s, not whichever operator last used this browser', async () => {
    setHash('#' + TOKEN)
    mockAnswers.CreateSession = SESSION
    const wrapper = mountPage({ locale: 'en' })
    await settled()

    expect(wrapper.text()).toContain(translations.en.meals_claim_unknowns_title)
    expect(wrapper.text()).not.toContain(translations.no.meals_claim_unknowns_title)
  })
})
