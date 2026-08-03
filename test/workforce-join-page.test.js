import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while a page import is not.
import JoinPage from '~/pages/workforce/join.vue'
import translations from '~/translations'

const mockCalls = []
let mockAnswers = {}

// The MODULE is mocked rather than an instance stubbed, because WHICH request this page issues — and
// with which token and which idempotency key — is a contract with the backend rather than a
// rendering choice, and it is the half a browser journey cannot inspect.
jest.mock('~/utils/workforce-me/me-client', () => {
  const record = name => (...args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (typeof answer === 'function') { return answer(...args) }
    return Promise.resolve(answer === undefined ? null : answer)
  }
  class MockMeService {}
  MockMeService.prototype.ClaimInvitation = record('ClaimInvitation')
  MockMeService.prototype.GetMemberships = record('GetMemberships')
  return { WorkforceMeService: MockMeService, default: MockMeService }
})

// eslint-disable-next-line import/order -- must follow the jest.mock above so the class is the real one.
const { WorkforceApiError } = jest.requireActual('~/utils/workforce/api-client')

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const no = key => translations.no[key]
const refuse = (status, body) => () => Promise.reject(new WorkforceApiError(status, body))

const TOKEN = 'wfinv_abc123def456'

const CLAIMED = {
  staffMemberId: 'sm-1',
  storeId: 42,
  workforcePersonId: 'p-1',
  personState: 'Claimed',
  capabilities: ['WorkforceSelf']
}

// The page reads `window.location.hash` in `mounted` and scrubs it. jsdom gives a real location and
// a real history, so both halves are exercised rather than stubbed.
function setHash (hash) {
  window.history.replaceState(null, '', '/workforce/join' + (hash || ''))
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
// than a constant, because half of what these tests assert is when the key stays the same and when
// it must not — a fixed value would satisfy both.
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

describe('the credential never reaches the URL', () => {
  test('a code in the fragment is taken into memory and scrubbed from the address bar', () => {
    setHash('#' + TOKEN)
    const wrapper = mountPage()

    expect(wrapper.vm.token).toBe(TOKEN)
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/workforce/join')
    // And nothing was CALLED. Unlike Meals, this module binds no invitation-session route, so there
    // is nothing to look a code up with — the page must not invent a read.
    expect(mockCalls).toEqual([])
  })

  test('`token=` in the fragment is accepted too, because a person building the link will write it', () => {
    setHash('#token=' + TOKEN)
    expect(mountPage().vm.token).toBe(TOKEN)
  })

  test('an empty fragment leaves the page on its paste screen', async () => {
    setHash('#')
    const wrapper = mountPage()
    expect(wrapper.vm.token).toBe('')
    // `ready` flips in `mounted`, so the first render is deliberately identical to the server's —
    // which is why this page needs no `client-only` wrapper. One tick, then the screen exists.
    await settled()
    expect(wrapper.find('[data-test="paste"]').exists()).toBe(true)
  })

  test('the page declares itself unindexable', () => {
    // A page reached with a bearer credential in its fragment must never be indexed.
    const vm = mountPage().vm
    const head = vm.$options.head.call(vm)
    expect(head.meta).toContainEqual({ hid: 'robots', name: 'robots', content: 'noindex, nofollow' })
  })
})

describe('pasting a code', () => {
  test('an empty field is refused without issuing anything', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.find('form').trigger('submit')
    await settled()

    expect(wrapper.find('[data-test="paste-empty"]').exists()).toBe(true)
    expect(mockCalls).toEqual([])
  })

  test('a pasted code is taken into memory and cleared from the field', async () => {
    // A shared phone keeps its form values; the code must not be sitting on screen behind every
    // later state.
    const wrapper = mountPage()
    await settled()
    await wrapper.setData({ pasted: '  ' + TOKEN + '  ' })
    wrapper.find('form').trigger('submit')
    await settled()

    expect(wrapper.vm.token).toBe(TOKEN)
    expect(wrapper.vm.pasted).toBe('')
  })

  test('an unauthenticated visitor is asked to sign in, never shown a fake preview', async () => {
    const wrapper = mountPage({ signedIn: false })
    await settled()
    await wrapper.setData({ pasted: TOKEN })
    wrapper.find('form').trigger('submit')
    await settled()

    expect(wrapper.find('[data-test="sign-in"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="confirm"]').exists()).toBe(false)
    expect(mockCalls).toEqual([])
  })
})

describe('claiming', () => {
  async function readyToClaim (options) {
    setHash('#' + TOKEN)
    const wrapper = mountPage(options)
    await settled()
    return wrapper
  }

  test('the claim sends the raw token and this visit\'s own key', async () => {
    mockAnswers.ClaimInvitation = CLAIMED
    const wrapper = await readyToClaim()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    expect(mockCalls).toEqual([['ClaimInvitation', TOKEN, 'idem-key-1']])
    expect(wrapper.find('[data-test="claimed"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(no('wfjoin_done_title'))
  })

  test('a repeat press REPLAYS under the same key rather than issuing a second command', async () => {
    // The command this route meets in the wild is a phone losing signal mid-request. A fresh key
    // would re-run the command against an invitation the first attempt already consumed, and the
    // caller would be told their own success does not exist.
    mockAnswers.ClaimInvitation = refuse(500, {})
    const wrapper = await readyToClaim()

    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    wrapper.find('[data-test="refusal-retry"]').trigger('click')
    await settled()

    const keys = mockCalls.filter(c => c[0] === 'ClaimInvitation').map(c => c[2])
    expect(keys).toEqual(['idem-key-1', 'idem-key-1'])
  })

  test('a claim-link conflict drops the key, because the server demands a fresh one', async () => {
    // The reservation under the original key stays Reserved for ever, so reusing it replays as
    // in-progress and can never succeed.
    mockAnswers.ClaimInvitation = refuse(409, {
      code: 'workforce.claim-link-conflict', retryable: true, retryWithFreshKey: true
    })
    const wrapper = await readyToClaim()

    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    wrapper.find('[data-test="refusal-retry"]').trigger('click')
    await settled()

    const keys = mockCalls.filter(c => c[0] === 'ClaimInvitation').map(c => c[2])
    expect(keys).toEqual(['idem-key-1', 'idem-key-2'])
  })

  test('the receipt prints the grants the claim did NOT widen', async () => {
    mockAnswers.ClaimInvitation = CLAIMED
    const wrapper = await readyToClaim()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    expect(wrapper.find('[data-test="claimed-grants"]').text()).toContain('WorkforceSelf')
    expect(wrapper.find('[data-test="go-to-my-shifts"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-selfservice"]').exists()).toBe(false)
  })

  test('a link with no self-service grant is a receipt AND a warning, not a link to an empty page', async () => {
    // A claim never adds capability, so an engagement created without `WorkforceSelf` produces a
    // linked login the worker page will greet with an empty screen.
    mockAnswers.ClaimInvitation = Object.assign({}, CLAIMED, { capabilities: [] })
    const wrapper = await readyToClaim()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    expect(wrapper.find('[data-test="claimed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-selfservice"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="go-to-my-shifts"]').exists()).toBe(false)
  })
})

describe('a refusal, kept as opaque as the surface that sent it', () => {
  async function refused (body, status) {
    setHash('#' + TOKEN)
    mockAnswers.ClaimInvitation = refuse(status || 404, body)
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    return wrapper
  }

  test('a spent code withdraws the claim button — a control that cannot succeed is worse than none', async () => {
    // Found by opening the page, not by a suite: the first browser run showed a live green "Løs inn
    // koden" underneath a red card explaining the code no longer works.
    const wrapper = await refused({ code: 'workforce.invitation-invalid' })

    expect(wrapper.find('[data-test="refusal"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="claim-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="confirm"]').exists()).toBe(false)
    // What IS still possible: a different code.
    expect(wrapper.find('[data-test="other-code-button"]').exists()).toBe(true)
  })

  test('the opaque refusal names all five causes and picks none', async () => {
    const wrapper = await refused({ code: 'workforce.invitation-invalid' })
    const text = wrapper.find('[data-test="refusal"]').text().replace(/\s+/g, ' ')
    expect(text).toContain(no('wfjoin_refuse_invalid_title'))
    expect(text).toContain(no('wfjoin_refuse_invalid_body'))
    // And no server prose beside it: its `detail` is a fixed string carrying nothing the sentence
    // does not, so printing it would imply the server said something about THIS code.
    expect(wrapper.find('[data-test="refusal-detail"]').exists()).toBe(false)
  })

  test('after a refusal the page shows the engagements the ACCOUNT holds, as evidence not diagnosis', async () => {
    // The only honest way to answer "have I already done this?" without asking the server a question
    // whose answer is deliberately opaque.
    mockAnswers.GetMemberships = [{ staffMemberId: 'sm-1', storeId: 42 }]
    const wrapper = await refused({ code: 'workforce.invitation-invalid' })

    expect(mockCalls.some(c => c[0] === 'GetMemberships')).toBe(true)
    expect(wrapper.find('[data-test="existing-access"]').exists()).toBe(true)
  })

  test('an account that holds nothing is shown nothing, never "you have none"', async () => {
    mockAnswers.GetMemberships = []
    const wrapper = await refused({ code: 'workforce.invitation-invalid' })
    expect(wrapper.find('[data-test="existing-access"]').exists()).toBe(false)
  })

  test('a failed membership read is not rendered as an empty account either', async () => {
    mockAnswers.GetMemberships = refuse(500, {})
    const wrapper = await refused({ code: 'workforce.invitation-invalid' })
    expect(wrapper.vm.existingMemberships).toBeNull()
    expect(wrapper.find('[data-test="existing-access"]').exists()).toBe(false)
  })

  test('a person-attach refusal offers no button, because the module has no route out of it', async () => {
    const wrapper = await refused({ code: 'workforce.person-attach-refused', retryable: false }, 409)

    expect(wrapper.find('[data-test="refusal"]').text()).toContain(no('wfjoin_refuse_attach_title'))
    expect(wrapper.find('[data-test="refusal-retry"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="claim-button"]').exists()).toBe(false)
  })

  test('a lost connection keeps the claim available, because it may never have arrived', async () => {
    mockAnswers.ClaimInvitation = () => Promise.reject(new TypeError('Failed to fetch'))
    setHash('#' + TOKEN)
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()

    expect(wrapper.find('[data-test="refusal-retry"]').exists()).toBe(true)
    expect(wrapper.vm.canClaim).toBe(true)
  })
})

describe('signing in inside the page', () => {
  test('the pasted code survives the login modal, because nothing navigates', async () => {
    const wrapper = mountPage({ signedIn: false })
    await settled()
    await wrapper.setData({ pasted: TOKEN })
    wrapper.find('form').trigger('submit')
    await settled()

    expect(wrapper.find('[data-test="sign-in-button"]').exists()).toBe(true)
    wrapper.vm.closeLogin(true)
    expect(wrapper.vm.token).toBe(TOKEN)
  })

  test('closing the modal drops the previous account\'s refusal', async () => {
    // A refusal earned by one account must never be left on screen next to another account's name.
    setHash('#' + TOKEN)
    mockAnswers.ClaimInvitation = refuse(404, { code: 'workforce.invitation-invalid' })
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-test="claim-button"]').trigger('click')
    await settled()
    expect(wrapper.vm.refused).not.toBeNull()

    wrapper.vm.closeLogin(true)
    expect(wrapper.vm.refused).toBeNull()
    expect(wrapper.vm.existingMemberships).toBeNull()
  })
})
