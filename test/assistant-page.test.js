import { shallowMount } from '@vue/test-utils'

// eslint-disable-next-line import/first -- the mock must be registered before the page is imported.
import AssistantPage from '~/pages/admin/assistant.vue'
import { AssistantApiError, CONFLICT_KIND_DISABLED } from '~/utils/assistant/api-client'

const calls = []
const script = {}

// The pure helpers (`pick`, `needsStoreChoice`, `describeConflict`) are the REAL ones — they are the
// thing the page's rendering decisions are made of, and stubbing them would leave these tests
// asserting against a second, friendlier implementation of the wire.
jest.mock('~/utils/assistant/api-client', () => {
  const actual = jest.requireActual('~/utils/assistant/api-client')
  return Object.assign({}, actual, {
    AssistantService: class {
      Ask (question, storeIds, languageCode) {
        calls.push(['Ask', question, storeIds, languageCode])
        return script.ask ? script.ask() : Promise.resolve({ Answer: 'et svar', Status: 'answered', StoreIds: storeIds })
      }

      Approve (id) {
        calls.push(['Approve', id])
        return script.approve ? script.approve() : Promise.resolve({ proposalId: id, status: 'executed' })
      }

      Reject (id) {
        calls.push(['Reject', id])
        return script.reject ? script.reject() : Promise.resolve({ proposalId: id, status: 'rejected' })
      }

      ListStagedActions () { return Promise.resolve([]) }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const TWO_STORES = [{ id: 1, name: 'Bryggen Bistro' }, { id: 2, name: 'Torget' }]

function mountPage (options) {
  const opts = options || {}
  const replaced = []
  return shallowMount(AssistantPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      $route: { path: '/admin/assistant', query: opts.query || {} },
      $router: { replace: (to) => { replaced.push(to); return Promise.resolve() }, push: () => Promise.resolve() },
      _coreInitializer: { bearerToken: 'tok' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: {
          adminLocale: opts.locale || 'no',
          currentUser: { id: 1, adminIn: opts.stores || TWO_STORES }
        }
      },
      _replaced: replaced
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MultiSelectDropdown: true,
      PendingActions: true
    }
  })
}

beforeEach(() => {
  calls.length = 0
  Object.keys(script).forEach(key => delete script[key])
})

describe('the store scope', () => {
  test('defaults to every store the admin administers', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })

  test('the explicit selection is what gets asked, never the question text', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ selectedStoreIds: [2], draft: 'hvor mye solgte Bryggen Bistro?' })
    wrapper.vm.submit()
    await settled()

    // The question names store 1 by name; the scope sent is the one the PICKER holds.
    expect(calls[0]).toEqual(['Ask', 'hvor mye solgte Bryggen Bistro?', [2], 'no'])
  })

  // `AIQueryBox` hard-coded `'no'`, so a German operator was answered in Norwegian.
  test('the language is the operator’s own admin locale', async () => {
    const wrapper = mountPage({ locale: 'de' })
    await settled()

    wrapper.setData({ draft: 'frage' })
    wrapper.vm.submit()
    await settled()

    expect(calls[0][3]).toBe('de')
  })
})

// ── OFFERED, NEVER APPLIED ───────────────────────────────────────────────────────────────────────
// The backend reports stores the QUESTION TEXT named separately from the scope it answered over,
// precisely so a sentence cannot choose which store a change lands on.
describe('the store suggestion', () => {
  test('a suggestion never moves the scope on its own', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ draft: 'hvordan går det på Torget?' })
    wrapper.vm.submit()
    await settled()

    expect(wrapper.find('[data-test="suggestion"]').exists()).toBe(true)
    // The scope is untouched until a human presses the chip.
    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })

  test('pressing the chip is what applies it', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="suggestion-apply"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedStoreIds).toEqual([2])
    expect(wrapper.find('[data-test="suggestion"]').exists()).toBe(false)
  })

  test('dismissing it leaves the scope alone', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="suggestion-dismiss"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })
})

// ── THE VENUE PICKER ─────────────────────────────────────────────────────────────────────────────
describe('when the turn needs one venue', () => {
  test('venue buttons are built from the response’s own scope, and re-ask with exactly one store', async () => {
    script.ask = () => Promise.resolve({
      Status: 'answered',
      Answer: 'Hvilken butikk gjelder det? Velg én av Bryggen Bistro, Torget, så forbereder jeg forslaget.',
      StoreIds: [1, 2],
      StoreNames: ['Bryggen Bistro', 'Torget']
    })
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ draft: 'øk prisen på alle pizzaer med 25 %' })
    wrapper.vm.submit()
    await settled()

    const picker = wrapper.find('[data-test="venue-picker"]')
    expect(picker.exists()).toBe(true)
    const buttons = picker.findAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons.at(1).text()).toBe('Torget')

    script.ask = () => Promise.resolve({ Answer: 'ok', Status: 'proposal_staged', StoreIds: [2] })
    buttons.at(1).trigger('click')
    await settled()

    // The SAME question, re-asked against one store.
    expect(calls[1]).toEqual(['Ask', 'øk prisen på alle pizzaer med 25 %', [2], 'no'])
  })

  test('an ordinary answer grows no buttons', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'hvor mye solgte vi?' })
    wrapper.vm.submit()
    await settled()

    expect(wrapper.find('[data-test="venue-picker"]').exists()).toBe(false)
  })
})

// ── THE ANSWER IS TEXT, NOT MARKUP ───────────────────────────────────────────────────────────────
// `$md()` is not used and must not be: this project's markdownit is configured `html: true`
// (nuxt.config.js:321-324), so HTML inside a model answer would be RENDERED. On a surface whose
// entire content is model output that is an XSS hole opened by configuration.
describe('how the model’s answer is rendered', () => {
  test('markup in an answer is shown as characters, not parsed', async () => {
    script.ask = () => Promise.resolve({
      Answer: '<img src=x onerror=alert(1)> og <b>fet</b>', Status: 'answered', StoreIds: [1]
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    const answer = wrapper.find('[data-test="answer"]')
    expect(answer.text()).toContain('<img src=x onerror=alert(1)>')
    expect(answer.element.querySelector('img')).toBeNull()
    expect(answer.element.querySelector('b')).toBeNull()
  })

  test('the composer says the assistant has no memory, because it has none', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="memory-note"]').text()).toBe('assistant_noMemory')
  })
})

// ── THE BASIS DRAWER ─────────────────────────────────────────────────────────────────────────────
describe('the basis drawer', () => {
  test('renders the fields the response carries, and omits the ones it does not', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1],
      StoreNames: ['Bryggen Bistro'],
      Assumptions: ['Uke 31 er lagt til grunn'],
      Warnings: ['To dager mangler data'],
      // `Sql` is ALWAYS null (the orchestrator nulls it unconditionally) and there is no Period on
      // the trace at all — it lives inside ToolArguments and is frequently absent.
      Trace: { Tool: 'sales_summary, menu_price_change', ToolRounds: 2, StopReason: 'model_finished', Model: 'gemini-3-flash-preview', Sql: null }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="basis-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    const basis = wrapper.find('[data-test="basis"]')
    expect(basis.text()).toContain('Uke 31 er lagt til grunn')
    expect(basis.text()).toContain('To dager mangler data')
    expect(basis.text()).toContain('sales_summary, menu_price_change')
    expect(basis.text()).toContain('Bryggen Bistro')
    // No period row: the trace carried none, and a blank row would claim one was measured.
    expect(basis.text()).not.toContain('assistant_basis_period')
  })

  test('a period is shown when the trace actually carries one', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1],
      Trace: { Tool: 'sales_summary', ToolRounds: 1, ToolArguments: [{ Name: 'sales_summary', Arguments: { Period: 'last_week' } }] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()
    wrapper.find('[data-test="basis-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="basis"]').text()).toContain('last_week')
  })
})

// ── DECIDING ON A CARD ───────────────────────────────────────────────────────────────────────────
describe('approving and rejecting from the thread', () => {
  const staged = {
    Answer: 'Jeg har forberedt en prisendring.',
    Status: 'proposal_staged',
    StoreIds: [1],
    Cards: [{ ProposalId: 'p-1', Title: 'Prisøkning', AffectedCount: 3, ChangeSet: [] }]
  }

  test('an approved card is replaced by what happened', async () => {
    script.ask = () => Promise.resolve(staged)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'øk prisene' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')
    await settled()

    expect(calls).toContainEqual(['Approve', 'p-1'])
    expect(wrapper.vm.thread[0].cards).toEqual([])
    expect(wrapper.vm.thread[0].decided).toBe('assistant_card_approved')
  })

  // Approving an already-executed row REPLAYS the recorded outcome rather than creating a second
  // one, and the merchant is told that is what happened.
  test('a replay says so instead of claiming a second change', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.resolve({ proposalId: 'p-1', status: 'executed', wasReplay: true })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].decided).toBe('assistant_card_approvedReplay')
  })

  // The kill switch is the ONE refusal where retrying later can succeed with the merchant doing
  // nothing, so removing the card would remove the thing they will approve in ten minutes.
  test('a kill-switch refusal KEEPS the card', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This kind of change is switched off for this store…', code: CONFLICT_KIND_DISABLED
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].cards.length).toBe(1)
    expect(wrapper.vm.thread[0].conflict.key).toBe('assistant_conflict_kindDisabled')
  })

  test('every other 409 removes it, because the row has already moved', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This proposal has expired — nothing was created.'
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].cards).toEqual([])
    expect(wrapper.vm.thread[0].conflict.key).toBe('assistant_conflict_unresolvable')
  })
})

// ── THE HANDOFF FROM THE STATISTICS BOX ──────────────────────────────────────────────────────────
describe('the ?q= handoff', () => {
  test('a question in the URL is asked once and then cleared from the URL', async () => {
    const wrapper = mountPage({ query: { q: 'hvor mye solgte vi?' } })
    await settled()

    expect(calls[0][0]).toBe('Ask')
    expect(calls[0][1]).toBe('hvor mye solgte vi?')
    // Cleared, so a reload does not silently re-ask a question already answered.
    expect(wrapper.vm._replaced).toContainEqual({ path: '/admin/assistant', query: {} })
  })

  test('the scope travels with it, so the answer is about the same stores the board was', async () => {
    mountPage({ query: { q: 'q', stores: '2' } })
    await settled()

    expect(calls[0][2]).toEqual([2])
  })

  // A store id in a URL is not a grant. The server re-checks it too, but a scope this admin does
  // not hold must not silently become the page's state either.
  test('a store the admin does not administer is dropped from the handoff', async () => {
    mountPage({ query: { q: 'q', stores: '99' } })
    await settled()

    expect(calls[0][2]).toEqual([1, 2])
  })

  test('no question in the URL asks nothing', async () => {
    mountPage()
    await settled()

    expect(calls).toEqual([])
  })
})
